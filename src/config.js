'use strict';

/**
 * Central configuration. The same image runs both remotely (dev) and
 * installed on the HCU. Defaults follow the Connect API container
 * contract (docs 4.2 "Container environment").
 *
 * Auth token precedence:
 *   1. /TOKEN file (present when running as installed plugin)
 *   2. HMIP_HCU_AUTH_TOKEN env var (for remote development)
 *
 * Mower settings persistence:
 *   Values entered via the HCU config UI are stored to
 *   ${EUFY_DATA_DIR:-/data}/config.json so they survive plugin restarts.
 */
const fs = require('fs');
const path = require('path');

const PLUGIN_ID = process.env.HMIP_PLUGIN_ID || 'de.homematicip.plugin.eufymower';

function readTokenFile(p) {
    try {
        return fs.readFileSync(p, 'utf8').trim();
    } catch (_) {
        return '';
    }
}

const tokenFromFile = readTokenFile('/TOKEN');
const authToken = tokenFromFile || process.env.HMIP_HCU_AUTH_TOKEN || '';

const isInstalled = Boolean(tokenFromFile);
const defaultHost = isInstalled ? 'host.containers.internal' : 'hcu1.local';

const DATA_DIR = process.env.EUFY_DATA_DIR || '/data';
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function loadPersisted() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(raw) || {};
        }
    } catch (err) {
        console.warn('[config] could not load persisted config:', err.message);
    }
    return {};
}

const persisted = loadPersisted();

// Single-mower configuration. Multi-mower setups can be added later by
// switching `mower` into an array; the plugin logic already iterates.
const mower = {
    name: persisted.name || process.env.EUFY_NAME || 'Eufy Mower',
    host: persisted.host || process.env.EUFY_HOST || '',
    deviceId: persisted.deviceId || process.env.EUFY_DEVICE_ID || '',
    localKey: persisted.localKey || process.env.EUFY_LOCAL_KEY || '',
    pollIntervalMs: Number(process.env.EUFY_POLL_INTERVAL_MS || 10000),
    reconnectDelayMs: 10000,
};

function saveMower() {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(
            CONFIG_FILE,
            JSON.stringify(
                {
                    name: mower.name,
                    host: mower.host,
                    deviceId: mower.deviceId,
                    localKey: mower.localKey,
                },
                null,
                2,
            ),
            { mode: 0o600 },
        );
        return true;
    } catch (err) {
        console.warn('[config] could not persist mower config:', err.message);
        return false;
    }
}

module.exports = {
    pluginId: PLUGIN_ID,
    isInstalled,

    hcu: {
        host: process.env.HMIP_HCU_HOST || defaultHost,
        port: Number(process.env.HMIP_HCU_PORT || 9001),
        authToken,
        reconnectDelayMs: 5000,
    },

    mower,
    saveMower,

    log: {
        level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
    },
};
