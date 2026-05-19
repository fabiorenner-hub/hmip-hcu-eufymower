> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-eufy-mower-plugin Symbolbild" width="128" height="128"/>
</p>

# hmip-eufy-mower-plugin

📦 **[hmip-eufy-mower-plugin-1.1.0.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases/latest/download/hmip-eufy-mower-plugin-1.1.0.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-eufymower>

Homematic IP HCU Plugin, das **Eufy E15/E18 Mähroboter** über das lokale
Tuya-v3.5-Protokoll in die HMIP-App bringt — komplett ohne Cloud.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie hilft
mir, weitere HCU-Plugins zu bauen und zu pflegen.

<form action="https://www.paypal.com/donate" method="post" target="_top"><input type="hidden" name="hosted_button_id" value="JPZRATUUHRT5C" /><input type="image" src="https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Spenden mit dem PayPal-Button" /><img alt="" border="0" src="https://www.paypal.com/de_DE/i/scr/pixel.gif" width="1" height="1" /></form>

## Auf der HCU installieren

Die HCU nimmt ein ARM64-Container-Image als `.tar.gz` entgegen.

1. Aktuellste `hmip-eufy-mower-plugin-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases) holen.
2. In HCUweb *Einstellungen → Entwicklermodus → Plugins → Aus Datei installieren*
   öffnen und hochladen.
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

Heraus kommt `hmip-eufy-mower-plugin-<version>.tar.gz`.

## Voraussetzungen auf der HCU

- HCU1 mit Firmware 1.4.7+
- Entwicklermodus aktiviert

## Herausgeber

Herausgegeben von **Fabio Renner**.

## Lizenz

Apache-2.0
