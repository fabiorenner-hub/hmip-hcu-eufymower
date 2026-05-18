'use strict';

/**
 * Thin wrapper around TuyAPI for an Eufy E15/E18 robotic mower. Keeps a
 * persistent local connection (Tuya v3.5 on port 6668) and exposes a
 * small command API plus `stateChanged` events.
 *
 * Data-point map (confirmed by the jnicolaes/eufy-robomow-ha HA integration
 * via live monitoring; we only consume the ones that map cleanly onto
 * Homematic IP's Connect API feature set):
 *
 *   DP 1   bool  task active (True = mowing/returning/paused session)
 *   DP 2   bool  paused (only meaningful while DP1=True)
 *   DP 8   int   battery %
 *   DP 109 int   WiFi signal raw (~50 => -50 dBm)
 *   DP 118 int   progress 0..100
 *                   0      idle or mowing
 *                   1..99  returning to base
 *                   100    docked / fully done
 *   DP 134 str   "Wifi" | "Cellular"
 *
 * HMIP maps this onto two devices per mower:
 *   - a SWITCH (on = mowing, off = docked/paused) with a Maintenance feature
 *   - a BATTERY with the battery level and a Maintenance feature.
 *
 * Both devices share the same Tuya connection; this class only exposes the
 * raw state and translates high-level commands (start / pause / dock) into
 * the appropriate DP writes.
 */

const { EventEmitter } = require('events');
const TuyAPI = require('tuyapi');

const logger = require('./logger');
const { mower: mowerCfg } = require('./config');

const RETURNING_THRESHOLD = 5; // DP118 >= this while DP1 active => RETURNING

/**
 * Derive a high-level activity label from the Tuya DP snapshot.
 * Mirrors the exact logic used in the HA integration so behaviour is
 * consistent with what users see in the Eufy app.
 */
function deriveActivity(dps) {
    const task = dps['1'];
    const paused = dps['2'];
    const progress = Number(dps['118']);

    if (!task) return 'DOCKED';
    if (paused) return 'PAUSED';
    if (Number.isFinite(progress) && progress >= RETURNING_THRESHOLD && progress < 100) {
        return 'RETURNING';
    }
    return 'MOWING';
}

class EufyMowerClient extends EventEmitter {
    constructor() {
        super();
        this.connected = false;
        this.dps = {};           // most recent raw DP snapshot
        this.activity = 'DOCKED';
        this.lastError = null;
        this._device = null;
        this._pollTimer = null;
        this._reconnectTimer = null;
        this._stopping = false;
    }

    async start() {
        this._stopping = false;
        await this._connect();
    }

    async stop() {
        this._stopping = true;
        this._clearTimers();
        if (this._device) {
            try {
                this._device.disconnect();
            } catch (_) {
                // ignore
            }
            this._device.removeAllListeners();
            this._device = null;
        }
        this.connected = false;
    }

    async _connect() {
        if (!mowerCfg.deviceId || !mowerCfg.localKey || !mowerCfg.host) {
            logger.warn('Eufy mower not fully configured yet (deviceId/localKey/host), waiting.');
            return;
        }

        logger.info(`Connecting to Eufy mower at ${mowerCfg.host} (id ${mowerCfg.deviceId.slice(0, 6)}…)`);

        const device = new TuyAPI({
            id: mowerCfg.deviceId,
            key: mowerCfg.localKey,
            ip: mowerCfg.host,
            version: '3.5',
            nullPayloadOnJSONError: true,
            issueRefreshOnConnect: true,
        });

        device.on('connected', () => {
            this.connected = true;
            this.lastError = null;
            logger.info('Tuya TCP connected.');
            this.emit('connected');
        });

        device.on('disconnected', () => {
            logger.warn('Tuya TCP disconnected.');
            this.connected = false;
            this.emit('disconnected');
            this._scheduleReconnect();
        });

        device.on('error', (err) => {
            logger.warn('Tuya error:', err && err.message ? err.message : err);
            this.lastError = err && err.message ? err.message : String(err);
        });

        device.on('data', (data) => this._onData(data));
        device.on('dp-refresh', (data) => this._onData(data));
        device.on('heartbeat', () => logger.debug('Tuya heartbeat'));

        this._device = device;

        try {
            await device.find({ timeout: 5 });
            await device.connect();
            // Explicit refresh pulls in the full DPS set; useful after a
            // reconnect when the normal data stream is still warming up.
            try {
                await device.refresh({ schema: true });
            } catch (e) {
                logger.debug('Initial refresh failed (ignored):', e.message);
            }
            this._schedulePoll();
        } catch (err) {
            logger.error('Tuya connect failed:', err && err.message ? err.message : err);
            this.connected = false;
            this.lastError = err && err.message ? err.message : String(err);
            this._scheduleReconnect();
        }
    }

    _schedulePoll() {
        this._clearTimers();
        const interval = Math.max(5000, Number(mowerCfg.pollIntervalMs) || 10000);
        this._pollTimer = setInterval(() => {
            if (!this._device || !this.connected) return;
            this._device.refresh({ schema: true }).catch((e) => {
                logger.debug('Refresh failed:', e.message);
            });
        }, interval);
    }

    _scheduleReconnect() {
        if (this._stopping || this._reconnectTimer) return;
        this._reconnectTimer = setTimeout(async () => {
            this._reconnectTimer = null;
            if (this._device) {
                try {
                    this._device.disconnect();
                } catch (_) {
                    // ignore
                }
                this._device.removeAllListeners();
                this._device = null;
            }
            await this._connect();
        }, mowerCfg.reconnectDelayMs);
    }

    _clearTimers() {
        if (this._pollTimer) clearInterval(this._pollTimer);
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        this._pollTimer = null;
        this._reconnectTimer = null;
    }

    _onData(data) {
        if (!data || !data.dps) return;
        const before = JSON.stringify({
            dps: this.dps,
            activity: this.activity,
        });
        Object.assign(this.dps, data.dps);
        this.activity = deriveActivity(this.dps);
        const after = JSON.stringify({
            dps: this.dps,
            activity: this.activity,
        });
        if (before === after) return;
        logger.debug(`Eufy state -> ${this.activity}`, this.dps);
        this.emit('stateChanged', this.getState());
    }

    getState() {
        const battery = Number(this.dps['8']);
        const signal = Number(this.dps['109']);
        const progress = Number(this.dps['118']);
        return {
            activity: this.activity,
            battery: Number.isFinite(battery) ? Math.max(0, Math.min(100, battery)) : undefined,
            signalRaw: Number.isFinite(signal) ? signal : undefined,
            progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : undefined,
            network: typeof this.dps['134'] === 'string' ? this.dps['134'] : undefined,
            connected: this.connected,
        };
    }

    async _setDp(dp, value) {
        if (!this._device || !this.connected) throw new Error('Eufy mower not connected');
        logger.info(`Eufy DP ${dp} <- ${value}`);
        await this._device.set({ dps: dp, set: value });
    }

    /** Begin/resume a mowing session. */
    async startMowing() {
        // If the session is paused, unpausing is DP2=false; otherwise DP1=true starts fresh.
        if (this.dps['1'] && this.dps['2']) {
            await this._setDp(2, false);
        } else {
            await this._setDp(1, true);
        }
    }

    /** Pause the ongoing session. Only meaningful while mowing. */
    async pauseMowing() {
        await this._setDp(2, true);
    }

    /** Return to the docking station. */
    async dock() {
        await this._setDp(1, false);
    }
}

module.exports = { EufyMowerClient, deriveActivity };
