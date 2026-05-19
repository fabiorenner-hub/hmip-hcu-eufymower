> [ðŸ‡¬ðŸ‡§ English](README.md) | ðŸ‡©ðŸ‡ª Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-eufy-mower-plugin Symbolbild" width="128" height="128"/>
</p>

# hmip-eufy-mower-plugin

ðŸ“¦ **[hmip-eufy-mower-plugin-1.1.1.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases/latest/download/hmip-eufy-mower-plugin-1.1.1.tar.gz)** â€” Installation in HCUweb Ã¼ber *Entwicklermodus â†’ Plugins â†’ Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-eufymower>

Homematic IP HCU Plugin, das **Eufy E15/E18 MÃ¤hroboter** Ã¼ber das lokale
Tuya-v3.5-Protokoll in die HMIP-App bringt â€” komplett ohne Cloud.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie
hält bei mir die Lichter an, während ich weitere HCU-Plugins baue:
[Spenden via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Auf der HCU installieren

Die HCU nimmt ein ARM64-Container-Image als `.tar.gz` entgegen.

1. Aktuellste `hmip-eufy-mower-plugin-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases) holen.
2. In HCUweb *Einstellungen â†’ Entwicklermodus â†’ Plugins â†’ Aus Datei installieren*
   Ã¶ffnen und hochladen.
3. Plugin-Kachel Ã¶ffnen â†’ *Konfiguration* und ausfÃ¼llen:
   - **MÃ¤her-IP**, **Device ID**, **Local Key** (optional: Anzeigename)
4. Speichern. Der MÃ¤her erscheint als SWITCH-GerÃ¤t im HMIP-Posteingang.

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
