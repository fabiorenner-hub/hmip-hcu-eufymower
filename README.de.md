> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-eufy-mower-plugin Symbolbild" width="128" height="128"/>
</p>

# hmip-eufy-mower-plugin

📦 **[hmip-eufy-mower-plugin-1.1.2.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases/latest/download/hmip-eufy-mower-plugin-1.1.2.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-eufymower>

Homematic IP HCU Plugin, das **Eufy E15/E18 Mähroboter** über das lokale
Tuya-v3.5-Protokoll in die HMIP-App bringt — komplett ohne Cloud.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie
hält bei mir die Lichter an, während ich weitere HCU-Plugins baue:
[Spenden via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Auf der HCU installieren

1. Aktuelle `hmip-eufy-mower-plugin-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases) holen.
2. In HCUweb *Entwicklermodus → Plugins → Aus Datei installieren* öffnen und hochladen.
3. Plugin-Kachel öffnen → *Konfiguration* und ausfüllen:
   - **Mäher-IP**, **Device ID**, **Local Key** (optional: Anzeigename)
4. Speichern. Der Mäher erscheint als SWITCH-Gerät im HMIP-Posteingang.

## Selbst bauen

```powershell
./build.ps1   # Windows
```

```bash
chmod +x build.sh
./build.sh    # macOS / Linux
```

## Voraussetzungen auf der HCU

- Homematic IP HCU1 mit Firmware **1.4.7 oder neuer**
- Entwicklermodus aktiviert

## Herausgeber

Herausgegeben von **Fabio Renner**.

## Lizenz

Apache-2.0
