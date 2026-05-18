'use strict';

/**
 * Bridge between the Homematic IP HCU Connect API and an Eufy E15/E18 mower
 * via the local Tuya v3.5 protocol.
 *
 * Message flow mirrors the Velux plugin (Connect API 1.0.1):
 *
 *   Startup:   ws OPEN -> PLUGIN_STATE_RESPONSE
 *              HCU  -> DISCOVER_REQUEST
 *              plugin -> DISCOVER_RESPONSE (1 SWITCH + 1 BATTERY)
 *              HCU  -> INCLUSION_EVENT
 *              plugin -> STATUS_EVENT (per included device)
 *
 *   Control:   HCU  -> CONTROL_REQUEST
 *              plugin -> CONTROL_RESPONSE(success, deviceId)
 *              plugin -> STATUS_EVENT (after the mower confirms)
 *
 *   Config:    HCU  -> CONFIG_TEMPLATE_REQUEST
 *              plugin -> CONFIG_TEMPLATE_RESPONSE
 *              HCU  -> CONFIG_UPDATE_REQUEST
 *              plugin -> CONFIG_UPDATE_RESPONSE(APPLIED|FAILED)
 *              plugin -> PLUGIN_STATE_RESPONSE (new readiness)
 */

const logger = require('./logger');
const { HcuClient } = require('./hcu-client');
const { EufyMowerClient } = require('./eufy-client');
const {
    deviceIdFor,
    parseDeviceId,
    toDevices,
    toStatus,
    toStatusEvents,
} = require('./device-mapper');
const cfg = require('./config');

class EufyMowerPlugin {
    constructor() {
        this.hcu = new HcuClient();
        this.mower = new EufyMowerClient();
        this.includedDevices = new Set(); // deviceIds accepted by the HCU
    }

    async start() {
        this._wireMower();
        this._wireHcu();
        this.hcu.start();
        this.mower.start().catch((err) => logger.error('Eufy start failed:', err));
    }

    async stop() {
        this.hcu.stop();
        await this.mower.stop();
    }

    _wireMower() {
        this.mower.on('connected', () => {
            logger.info('Eufy mower reachable.');
            this.hcu.sendPluginState(this._readiness());
            // Push current state for any devices the HCU has already included.
            this._emitStatusEvents();
        });
        this.mower.on('disconnected', () => {
            this.hcu.sendPluginState(this._readiness());
            this._emitStatusEvents(); // surface unreach=true via Maintenance
        });
        this.mower.on('stateChanged', () => this._emitStatusEvents());
    }

    _wireHcu() {
        this.hcu.on('open', () => {
            logger.info(`Plugin ${cfg.pluginId} connected to HCU.`);
            this.hcu.sendPluginState(this._readiness());
        });

        this.hcu.on('PLUGIN_STATE_REQUEST', (_body, env) => {
            const status = this._readiness();
            this.hcu.send(
                'PLUGIN_STATE_RESPONSE',
                {
                    pluginReadinessStatus: status,
                    friendlyName: {
                        de: 'Eufy Mähroboter',
                        en: 'Eufy Robot Mower',
                    },
                },
                env,
            );
        });

        this.hcu.on('DISCOVER_REQUEST', (_body, env) => {
            const state = this.mower.getState();
            const devices = toDevices(state);
            this.hcu.send('DISCOVER_RESPONSE', { success: true, devices }, env);
        });

        this.hcu.on('INCLUSION_EVENT', (body) => {
            const ids = body.deviceIds || [];
            ids.forEach((id) => this.includedDevices.add(id));
            logger.info(`HCU included ${ids.length} device(s); total ${this.includedDevices.size}`);
            this._emitStatusEvents();
        });

        this.hcu.on('EXCLUSION_EVENT', (body) => {
            (body.deviceIds || []).forEach((id) => this.includedDevices.delete(id));
            logger.info(`HCU excluded ${body.deviceIds ? body.deviceIds.length : 0} device(s)`);
        });

        this.hcu.on('STATUS_REQUEST', (body, env) => {
            const wanted = new Set(body.deviceIds || []);
            const state = this.mower.getState();
            const devices = toStatus(state).filter(
                (s) => wanted.size === 0 || wanted.has(s.deviceId),
            );
            this.hcu.send('STATUS_RESPONSE', { success: true, devices }, env);
        });

        this.hcu.on('CONTROL_REQUEST', (body, env) => this._handleControl(body, env));

        this.hcu.on('CONFIG_TEMPLATE_REQUEST', (body, env) =>
            this._sendConfigTemplate(env, (body && body.languageCode) || 'de'),
        );
        this.hcu.on('CONFIG_UPDATE_REQUEST', (body, env) => this._handleConfigUpdate(body, env));

        this.hcu.on('ERROR_RESPONSE', (body) => {
            logger.warn('HCU ERROR_RESPONSE:', body);
        });
    }

    _readiness() {
        if (!cfg.mower.host || !cfg.mower.deviceId || !cfg.mower.localKey) {
            return 'CONFIG_REQUIRED';
        }
        if (!this.mower.connected) return 'ERROR';
        return 'READY';
    }

    _emitStatusEvents() {
        const state = this.mower.getState();
        const events = toStatusEvents(state);
        for (const ev of events) {
            if (!this.includedDevices.has(ev.deviceId)) {
                logger.debug(`Skipping STATUS_EVENT for non-included ${ev.deviceId}`);
                continue;
            }
            logger.info(
                `STATUS_EVENT -> ${ev.deviceId} (${ev.features.map((f) => f.type).join(',')})`,
            );
            this.hcu.send('STATUS_EVENT', ev);
        }
    }

    async _handleControl(body, env) {
        const { deviceId, features, path } = body;
        const role = parseDeviceId(deviceId);
        if (!role) {
            return this._controlError(env, deviceId, 'UNKNOWN_DEVICE', `Unknown device ${deviceId}`);
        }

        // Only the SWITCH device accepts control.
        if (role !== 'switch') {
            return this._controlError(
                env,
                deviceId,
                'INVALID_REQUEST',
                'This device is read-only',
            );
        }

        try {
            const sw = (features || []).find((f) => f.type === 'switchState');
            const toggle = path && path.endsWith('/toggleSwitchState');

            if (toggle) {
                if (this.mower.activity === 'MOWING') {
                    await this.mower.pauseMowing();
                } else {
                    await this.mower.startMowing();
                }
            } else if (sw && typeof sw.on === 'boolean') {
                if (sw.on) {
                    await this.mower.startMowing();
                } else {
                    // "off" in HMIP == dock for a mower.
                    await this.mower.dock();
                }
            } else {
                return this._controlError(env, deviceId, 'INVALID_REQUEST', 'No supported control payload');
            }

            this.hcu.send('CONTROL_RESPONSE', { success: true, deviceId }, env);
        } catch (err) {
            logger.error(`Control failed for ${deviceId}:`, err);
            this._controlError(env, deviceId, 'INTERNAL_ERROR', err.message || 'unknown');
        }
    }

    _controlError(env, deviceId, key, message) {
        this.hcu.send(
            'CONTROL_RESPONSE',
            {
                success: false,
                deviceId,
                error: { code: key, message },
            },
            env,
        );
    }

    _sendConfigTemplate(env, languageCode) {
        const de = String(languageCode || 'de').toLowerCase().startsWith('de');
        const t = (deText, enText) => (de ? deText : enText);

        this.hcu.send(
            'CONFIG_TEMPLATE_RESPONSE',
            {
                groups: {
                    connection: {
                        friendlyName: t('Verbindung', 'Connection'),
                        description: t(
                            'Lokale Verbindungsdaten zum Eufy Mähroboter (über Tuya).',
                            'Local connection details for the Eufy mower (via Tuya).',
                        ),
                        order: 1,
                    },
                    identity: {
                        friendlyName: t('Anzeige', 'Display'),
                        description: t('Wie soll der Mähroboter in der HMIP-App heißen?', 'Display name in the HMIP app.'),
                        order: 2,
                    },
                },
                properties: {
                    EUFY_HOST: {
                        dataType: 'STRING',
                        friendlyName: t('IP-Adresse des Mähroboters', 'Mower IP address'),
                        description: t(
                            'IP-Adresse des Mähroboters im lokalen WLAN (aus dem Router oder der Eufy-App).',
                            'Local IP address of the mower (from your router or the Eufy app).',
                        ),
                        minimumLength: 3,
                        maximumLength: 255,
                        currentValue: cfg.mower.host,
                        required: true,
                        groupId: 'connection',
                        order: 1,
                    },
                    EUFY_DEVICE_ID: {
                        dataType: 'STRING',
                        friendlyName: t('Tuya Device ID', 'Tuya device ID'),
                        description: t(
                            'Die Tuya-Device-ID des Mähroboters (z.B. aus eufy-clean-local-key-grabber).',
                            'Tuya device ID of the mower (e.g. from eufy-clean-local-key-grabber).',
                        ),
                        minimumLength: 5,
                        maximumLength: 64,
                        currentValue: cfg.mower.deviceId,
                        required: true,
                        groupId: 'connection',
                        order: 2,
                    },
                    EUFY_LOCAL_KEY: {
                        dataType: 'PASSWORD',
                        friendlyName: t('Tuya Local Key', 'Tuya local key'),
                        description: t(
                            'Der Local Key des Mähroboters (16 Zeichen). Siehe eufy-clean-local-key-grabber.',
                            'The 16-character local key of the mower. See eufy-clean-local-key-grabber.',
                        ),
                        minimumLength: 8,
                        maximumLength: 64,
                        required: true,
                        groupId: 'connection',
                        order: 3,
                    },
                    EUFY_NAME: {
                        dataType: 'STRING',
                        friendlyName: t('Anzeigename', 'Display name'),
                        description: t(
                            'Name des Mähroboters in der HMIP-App.',
                            'Mower display name in the HMIP app.',
                        ),
                        minimumLength: 1,
                        maximumLength: 64,
                        currentValue: cfg.mower.name,
                        required: false,
                        groupId: 'identity',
                        order: 1,
                    },
                },
            },
            env,
        );
    }

    async _handleConfigUpdate(body, env) {
        try {
            const raw = body.properties || {};
            const get = (key) => {
                if (raw == null) return undefined;
                const v = raw[key];
                if (v && typeof v === 'object' && 'currentValue' in v) return v.currentValue;
                return v;
            };

            const host = get('EUFY_HOST');
            const deviceId = get('EUFY_DEVICE_ID');
            const localKey = get('EUFY_LOCAL_KEY');
            const name = get('EUFY_NAME');

            if (host !== undefined) cfg.mower.host = String(host || '').trim();
            if (deviceId !== undefined) cfg.mower.deviceId = String(deviceId || '').trim();
            if (localKey !== undefined && localKey !== null && localKey !== '') {
                cfg.mower.localKey = String(localKey).trim();
            }
            if (name !== undefined) cfg.mower.name = String(name || '').trim() || cfg.mower.name;

            if (!cfg.mower.host || !cfg.mower.deviceId || !cfg.mower.localKey) {
                this.hcu.send(
                    'CONFIG_UPDATE_RESPONSE',
                    {
                        status: 'FAILED',
                        message: 'IP-Adresse, Device ID und Local Key müssen gesetzt sein.',
                    },
                    env,
                );
                return;
            }

            cfg.saveMower();

            try {
                await this.mower.stop();
            } catch (stopErr) {
                logger.warn(
                    'Eufy stop during config update failed (ignored):',
                    stopErr && stopErr.message ? stopErr.message : stopErr,
                );
            }

            try {
                await this.mower.start();
                this.hcu.send('CONFIG_UPDATE_RESPONSE', { status: 'APPLIED' }, env);
            } catch (connectErr) {
                logger.error('Eufy connect failed after config update:', connectErr);
                this.hcu.send(
                    'CONFIG_UPDATE_RESPONSE',
                    {
                        status: 'FAILED',
                        message:
                            'Konfiguration gespeichert, aber Verbindung zum Mähroboter fehlgeschlagen: ' +
                            (connectErr.message || 'unbekannter Fehler'),
                    },
                    env,
                );
            }

            this.hcu.sendPluginState(this._readiness());
        } catch (err) {
            logger.error('Config update failed:', err);
            this.hcu.send('CONFIG_UPDATE_RESPONSE', { status: 'FAILED', message: err.message }, env);
        }
    }
}

module.exports = { EufyMowerPlugin };
