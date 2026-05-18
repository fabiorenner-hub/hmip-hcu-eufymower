> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

# hmip-eufy-mower-plugin

📦 **[hmip-eufy-mower-plugin-1.0.0.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases/latest/download/hmip-eufy-mower-plugin-1.0.0.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

Homematic IP HCU Plugin, das einen **Eufy E15 / E18 Mähroboter** lokal über
das Tuya-Protokoll (v3.5) in die Homematic IP App bringt – ohne Cloud-Zugang,
ohne zusätzliche Bridge.

```
HMIP App  <- cloud ->  HCU  <- wss:9001 ->  hmip-eufy-mower-plugin
                                                 |
                                                 `-- TCP:6668 (Tuya v3.5)
                                                           -> Eufy Mäher
```

Der Mäher wird als zwei HMIP-Geräte gemeldet (die Connect API 1.0.1 hat
keinen eigenen *Mower*-Archetyp):

| HMIP Device | Rolle           | Features                        | Quelle              |
| ----------- | --------------- | ------------------------------- | ------------------- |
| `SWITCH`    | Mähen ein/aus   | `switchState`, `maintenance`    | DP1, DP2, DP118     |
| `BATTERY`   | Akku des Mähers | `batteryState`, `maintenance`   | DP8                 |

Die Zuordnung ist an das Home Assistant Projekt
[`jnicolaes/eufy-robomow-ha`](https://github.com/jnicolaes/eufy-robomow-ha)
angelehnt (DP-Map kommt von dort).

## Auf der HCU installieren

1. `hmip-eufy-mower-plugin-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases)
   herunterladen.
2. In HCUweb *Einstellungen → Entwicklermodus → Plugins → Installieren*
   öffnen und die Datei hochladen.
3. Die Plugin-Kachel öffnen → *Konfiguration* und ausfüllen:
   - **IP-Adresse** des Mähers (z. B. `192.168.1.80`)
   - **Tuya Device ID**
   - **Tuya Local Key**
   - **Anzeigename** (optional)
4. Speichern. Das Plugin verbindet sich mit dem Mäher. Nach wenigen Sekunden
   tauchen in der HMIP-App zwei Geräte im Posteingang auf:
   - ein **Schalter** zum Starten/Stoppen des Mähvorgangs
   - ein **Akku** mit Ladezustand

## Credentials besorgen

Das Plugin braucht die **Tuya Device ID** und den **Local Key** des Mähers.
Die bekommst du am bequemsten mit
[`eufy-clean-local-key-grabber`](https://github.com/Rjevski/eufy-clean-local-key-grabber)
einmalig per Eufy-Login. Alternativ aus `tinytuya wizard` oder direkt aus
der Tuya IoT Platform.

Zusätzlich brauchst du die **lokale IP-Adresse** des Mähers (aus der
DHCP-Liste des Routers oder der Eufy-App).

## Selbst die Installationsdatei bauen

Die HCU nimmt ein **ARM64-Container-Image** als `.tar.gz` entgegen.
Voraussetzung ist Docker Desktop (Windows/macOS) oder Docker Engine mit
`buildx` (Linux).

**Windows (PowerShell)**

```powershell
./build.ps1
```

**macOS / Linux**

```bash
chmod +x build.sh
./build.sh
```

Heraus kommt `hmip-eufy-mower-plugin-<version>.tar.gz`.

## Remote entwickeln (ohne Image-Build)

Wie beim Velux-Plugin kannst du das Plugin direkt auf deinem Rechner starten:

1. In HCUweb im Entwicklermodus *Connect API WebSocket freigeben* aktivieren
2. Auth-Token für die Plugin-ID `de.homematicip.plugin.eufymower` erzeugen
3. `.env` anlegen oder Variablen exportieren:

   ```env
   HMIP_HCU_HOST=hcu1-XXXX.local
   HMIP_HCU_AUTH_TOKEN=<dein-token>
   EUFY_HOST=192.168.1.80
   EUFY_DEVICE_ID=<device-id>
   EUFY_LOCAL_KEY=<local-key>
   EUFY_NAME=Rasenmäher
   LOG_LEVEL=debug
   ```

4. `npm install && npm run dev`

## Mapping-Details

| HMIP Feature                          | Tuya DP                          |
| ------------------------------------- | -------------------------------- |
| `switchState.on = true`               | DP1 = true *und* DP2 = false     |
| `setSwitchState(on)` → start/resume   | DP1 = true (oder DP2 = false)    |
| `setSwitchState(off)` → dock          | DP1 = false                      |
| `batteryState.batteryLevel`           | DP8 / 100                        |
| `maintenance.unreach`                 | Tuya TCP getrennt                |
| `maintenance.lowBat`                  | DP8 < 20                         |

Pause über HMIP-App ist aktuell nicht getrennt abgebildet – *off* geht
immer an die Ladestation. Ein separates Pause-Kommando lässt sich mit einem
zusätzlichen Toggle-Device nachrüsten, falls gewünscht.

## Bekannte Einschränkungen

- **Nur ein Mäher** pro Plugin-Instanz. Mehrere Mäher erfordern mehrere
  Plugin-Installationen mit unterschiedlichen Plugin-IDs.
- **Keine Cloud-Features** (Randabstand, Mähgeschwindigkeit, Zonen). Die
  Connect API hat dafür keine Features, und die Cloud-Schreibschicht des
  HA-Projekts ist sehr groß – bewusst ausgelassen, Fokus liegt auf lokaler
  Kontrolle.
- **Fehlerzustände** des Mähers (Hindernis, Alarm) werden derzeit nicht
  granular gemeldet – nur `unreach` via Maintenance, wenn die TCP-Verbindung
  weg ist.

## Lizenz

Apache-2.0
