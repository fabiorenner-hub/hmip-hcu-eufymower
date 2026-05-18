'use strict';

/**
 * Maps the Eufy mower state to Homematic IP Connect API structures.
 *
 * HMIP's Connect API 1.0.1 has no dedicated "mower" DeviceType, so we expose
 * each mower as two devices:
 *
 *   1. a SWITCH  — the mowing toggle (on = mowing, off = docked/paused).
 *      Features: switchState, maintenance (to surface connection/error state).
 *   2. a BATTERY — the on-board battery.
 *      Features: batteryState, maintenance.
 *
 * DeviceId must be a UUID v4 (HCU/iOS app rejects non-UUIDs and the device
 * stays stuck at "Verbindung wird hergestellt"). We derive deterministic
 * UUIDs from sha256(`${pluginId}:eufy:${slot}:${role}`) so they survive
 * restarts.
 */

const crypto = require('crypto');
const { pluginId, mower: mowerCfg } = require('./config');

// The plugin currently handles a single mower (slot "main"). Multi-mower
// support would loop over slots; the UUID scheme is already future-proof.
const SLOT = 'main';

const uuidToRole = new Map(); // uuid -> 'switch' | 'battery'

function computeUuid(slot, role) {
    const h = crypto
        .createHash('sha256')
        .update(`${pluginId}:eufy:${slot}:${role}`)
        .digest('hex');
    return (
        h.slice(0, 8) +
        '-' +
        h.slice(8, 12) +
        '-' +
        '4' + h.slice(13, 16) +
        '-' +
        'a' + h.slice(17, 20) +
        '-' +
        h.slice(20, 32)
    );
}

function deviceIdFor(role) {
    const uuid = computeUuid(SLOT, role);
    uuidToRole.set(uuid, role);
    return uuid;
}

function parseDeviceId(deviceId) {
    return uuidToRole.get(deviceId) || null;
}

function maintenanceFeature(state) {
    // The Maintenance feature carries a boolean "unreach" + optional "lowBat".
    // We map a disconnected Tuya session to unreach=true and a battery level
    // below 20 % to lowBat=true.
    const lowBat =
        typeof state.battery === 'number' && state.battery < 20 ? true : false;
    return {
        type: 'maintenance',
        unreach: !state.connected,
        lowBat,
    };
}

function buildSwitchFeatures(state) {
    // "MOWING" maps to on=true; every other activity (DOCKED, PAUSED,
    // RETURNING) maps to off=false so the tile in HMIP reflects whether the
    // motor is actually cutting grass right now.
    const on = state.activity === 'MOWING';
    return [
        { type: 'switchState', on },
        maintenanceFeature(state),
    ];
}

function buildBatteryFeatures(state) {
    const pct = typeof state.battery === 'number' ? state.battery : undefined;
    const batteryState = {
        type: 'batteryState',
        batteryLevel: typeof pct === 'number' ? Math.max(0, Math.min(1, pct / 100)) : 0,
    };
    return [batteryState, maintenanceFeature(state)];
}

function friendlyName() {
    return mowerCfg.name || 'Eufy Mähroboter';
}

function switchDevice(state) {
    return {
        deviceId: deviceIdFor('switch'),
        deviceType: 'SWITCH',
        firmwareVersion: '1.0.0',
        modelType: 'Eufy Robot Mower',
        friendlyName: friendlyName(),
        features: buildSwitchFeatures(state),
    };
}

function batteryDevice(state) {
    return {
        deviceId: deviceIdFor('battery'),
        deviceType: 'BATTERY',
        firmwareVersion: '1.0.0',
        modelType: 'Eufy Robot Mower Battery',
        friendlyName: `${friendlyName()} Akku`,
        features: buildBatteryFeatures(state),
    };
}

function toDevices(state) {
    return [switchDevice(state), batteryDevice(state)];
}

function toStatus(state) {
    return [
        {
            deviceId: deviceIdFor('switch'),
            deviceType: 'SWITCH',
            features: buildSwitchFeatures(state),
        },
        {
            deviceId: deviceIdFor('battery'),
            deviceType: 'BATTERY',
            features: buildBatteryFeatures(state),
        },
    ];
}

function toStatusEvents(state) {
    return [
        {
            deviceId: deviceIdFor('switch'),
            features: buildSwitchFeatures(state),
        },
        {
            deviceId: deviceIdFor('battery'),
            features: buildBatteryFeatures(state),
        },
    ];
}

module.exports = {
    SLOT,
    deviceIdFor,
    parseDeviceId,
    toDevices,
    toStatus,
    toStatusEvents,
};
