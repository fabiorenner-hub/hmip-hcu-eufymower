'use strict';

// Smoke test: requires all modules, validates shapes against Connect API spec.
// Not shipped in the production image (excluded via .dockerignore).

process.env.EUFY_DATA_DIR = require('os').tmpdir();
process.env.EUFY_NAME = 'Rasi';

const { EufyMowerPlugin } = require('./src/plugin');
const {
    toDevices,
    toStatus,
    toStatusEvents,
    parseDeviceId,
    deviceIdFor,
} = require('./src/device-mapper');
const { deriveActivity } = require('./src/eufy-client');

console.log('--- require OK ---');

// Activity derivation sanity.
const cases = [
    [{}, 'DOCKED'],
    [{ 1: true, 2: false, 118: 0 }, 'MOWING'],
    [{ 1: true, 2: false, 118: 30 }, 'RETURNING'],
    [{ 1: true, 2: false, 118: 100 }, 'MOWING'], // docked mid-session, DP1 still active
    [{ 1: true, 2: true }, 'PAUSED'],
    [{ 1: false }, 'DOCKED'],
];
for (const [dps, expected] of cases) {
    const got = deriveActivity(dps);
    if (got !== expected) {
        throw new Error(`deriveActivity(${JSON.stringify(dps)}) = ${got}, expected ${expected}`);
    }
}

const state = {
    activity: 'MOWING',
    battery: 42,
    signalRaw: 55,
    progress: 10,
    network: 'Wifi',
    connected: true,
};

const devs = toDevices(state);
const sta = toStatus(state);
const evts = toStatusEvents(state);

console.log('toDevices =>', JSON.stringify(devs, null, 2));
console.log('toStatus =>', JSON.stringify(sta));
console.log('toStatusEvents =>', JSON.stringify(evts));

if (devs.length !== 2) throw new Error('expected 2 devices');

const sw = devs.find((d) => d.deviceType === 'SWITCH');
const bat = devs.find((d) => d.deviceType === 'BATTERY');
if (!sw || !bat) throw new Error('missing SWITCH or BATTERY device');

// UUID v4 check
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRe.test(sw.deviceId)) throw new Error('SWITCH deviceId not UUID v4');
if (!uuidRe.test(bat.deviceId)) throw new Error('BATTERY deviceId not UUID v4');

// Reverse lookup
if (parseDeviceId(sw.deviceId) !== 'switch') throw new Error('switch reverse lookup failed');
if (parseDeviceId(bat.deviceId) !== 'battery') throw new Error('battery reverse lookup failed');

// Feature presence
const hasType = (arr, t) => arr.some((f) => f.type === t);
if (!hasType(sw.features, 'switchState')) throw new Error('SWITCH missing switchState');
if (!hasType(sw.features, 'maintenance')) throw new Error('SWITCH missing maintenance');
if (!hasType(bat.features, 'batteryState')) throw new Error('BATTERY missing batteryState');
if (!hasType(bat.features, 'maintenance')) throw new Error('BATTERY missing maintenance');

// switchState.on true while MOWING
const swFeat = sw.features.find((f) => f.type === 'switchState');
if (swFeat.on !== true) throw new Error('switchState.on should be true during MOWING');

// batteryState.batteryLevel in 0..1
const batFeat = bat.features.find((f) => f.type === 'batteryState');
if (Math.abs(batFeat.batteryLevel - 0.42) > 0.001)
    throw new Error('batteryLevel wrong: ' + batFeat.batteryLevel);

// StatusEvent body must not carry deviceType (§6.3.10)
for (const ev of evts) {
    if (ev.deviceType) throw new Error('StatusEvent should not carry deviceType');
}

// lowBat true when battery<20
const lowState = { ...state, battery: 10 };
const lowDev = toStatus(lowState).find((d) => d.deviceType === 'BATTERY');
const lowMaint = lowDev.features.find((f) => f.type === 'maintenance');
if (!lowMaint.lowBat) throw new Error('lowBat not raised at 10%');

// unreach true when disconnected
const offState = { ...state, connected: false };
const offDev = toStatus(offState).find((d) => d.deviceType === 'SWITCH');
const offMaint = offDev.features.find((f) => f.type === 'maintenance');
if (!offMaint.unreach) throw new Error('unreach not raised when disconnected');

// Plugin readiness smoke check — no Eufy config means CONFIG_REQUIRED.
const plugin = new EufyMowerPlugin();
// We don't start it; just call the readiness helper via the public surface.
// (It is internal, so we just assert the module imports without throwing.)

console.log('--- all checks passed ---');
