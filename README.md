> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

# hmip-eufy-mower-plugin

Homematic IP HCU plugin that brings a **Eufy E15 / E18 robotic lawn mower**
into the HMIP app, locally over the Tuya v3.5 protocol — no cloud account, no
extra bridge required.

```
HMIP App  <- cloud ->  HCU  <- wss:9001 ->  hmip-eufy-mower-plugin
                                                 |
                                                 `-- TCP:6668 (Tuya v3.5)
                                                           -> Eufy mower
```

The mower is reported as **two** HMIP devices, since the Connect API 1.0.1
has no dedicated *mower* archetype:

| HMIP device | Role            | Features                       | Source              |
| ----------- | --------------- | ------------------------------ | ------------------- |
| `SWITCH`    | Mowing on/off   | `switchState`, `maintenance`   | DP1, DP2, DP118     |
| `BATTERY`   | Mower battery   | `batteryState`, `maintenance`  | DP8                 |

The DP map is borrowed from the Home Assistant project
[`jnicolaes/eufy-robomow-ha`](https://github.com/jnicolaes/eufy-robomow-ha).

## Install on your HCU

1. Download `hmip-eufy-mower-plugin-<version>.tar.gz` from the
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases).
2. In HCUweb open *Settings → Developer mode → Plugins → Install* and upload
   the file.
3. Open the plugin tile → *Configuration* and fill in:
   - **IP address** of the mower (e.g. `192.168.1.80`)
   - **Tuya Device ID**
   - **Tuya Local Key**
   - **Display name** (optional)
4. Save. The plugin connects to the mower. After a few seconds two devices
   appear in the HMIP app's inbox: a switch to start/stop mowing, and a
   battery showing the charge level.

## Get the Tuya credentials

You need the **Tuya Device ID** and the **Local Key** of the mower.
The easiest way is
[`eufy-clean-local-key-grabber`](https://github.com/Rjevski/eufy-clean-local-key-grabber)
with your Eufy login (one-time). Alternatives are `tinytuya wizard` or the
Tuya IoT Platform.

You also need the **local IP address** of the mower (from your router's DHCP
list or the Eufy app).

## Build the install file yourself

The HCU accepts an **ARM64 container image** as a `.tar.gz`. You need
Docker Desktop (Windows/macOS) or Docker Engine + buildx (Linux).

**Windows (PowerShell)**

```powershell
./build.ps1
```

**macOS / Linux**

```bash
chmod +x build.sh
./build.sh
```

This produces `hmip-eufy-mower-plugin-<version>.tar.gz`.

## Develop without an image build

Like the Velux plugin, you can run this on your laptop directly:

1. In HCUweb (Developer mode) enable *Connect API WebSocket*
2. Generate an auth token for plugin id `de.homematicip.plugin.eufymower`
3. Create `.env` or export the variables:

   ```env
   HMIP_HCU_HOST=hcu1-XXXX.local
   HMIP_HCU_AUTH_TOKEN=<your-token>
   EUFY_HOST=192.168.1.80
   EUFY_DEVICE_ID=<device-id>
   EUFY_LOCAL_KEY=<local-key>
   EUFY_NAME=Lawn mower
   LOG_LEVEL=debug
   ```

4. `npm install && npm run dev`

## Mapping details

| HMIP feature                          | Tuya DP                          |
| ------------------------------------- | -------------------------------- |
| `switchState.on = true`               | DP1 = true *and* DP2 = false     |
| `setSwitchState(on)` → start/resume   | DP1 = true (or DP2 = false)      |
| `setSwitchState(off)` → dock          | DP1 = false                      |
| `batteryState.batteryLevel`           | DP8 / 100                        |
| `maintenance.unreach`                 | Tuya TCP disconnected            |
| `maintenance.lowBat`                  | DP8 < 20                         |

The HMIP app's *off* always sends the mower to the dock — pause is not
exposed separately. A separate pause toggle device can be added if needed.

## Known limitations

- **One mower per plugin instance.** Multiple mowers require multiple plugin
  installations with different plugin ids.
- **No cloud features** (edge clearance, mowing speed, zones). The Connect
  API has no features for that, and the cloud-write layer of the HA project
  is large — intentionally left out, the focus here is local control.
- **Error states** of the mower (obstacle, alarm) are not granularly
  reported. Only `unreach` via maintenance, when the TCP connection drops.

## License

Apache-2.0
