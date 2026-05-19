> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

<p align="center">
  <img src="icon.svg" alt="hmip-eufy-mower-plugin icon" width="128" height="128"/>
</p>

# hmip-eufy-mower-plugin

📦 **[Download hmip-eufy-mower-plugin-1.1.2.tar.gz](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases/latest/download/hmip-eufy-mower-plugin-1.1.2.tar.gz)** — install via HCUweb → *Developer mode → Plugins → Install from file*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-eufymower>

Homematic IP HCU plugin that bridges **Eufy E15/E18 robotic lawn mowers**
into the HMIP app via the local Tuya v3.5 protocol — no cloud required.

## Support

If this plugin is useful to you, please consider a small donation — it helps
me keep the lights on while building more HCU plugins:
[Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Install on your HCU

1. Download the latest `hmip-eufy-mower-plugin-<version>.tar.gz` from the
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases).
2. In HCUweb open *Developer mode → Plugins → Install from file* and upload it.
3. Open the plugin tile → *Configuration* and fill in:
   - **Mower IP**, **Device ID**, **Local key** (and optionally a friendly name)
4. Save. The mower appears as a SWITCH device in the HMIP inbox.

## Build it yourself

```powershell
./build.ps1   # Windows
```

```bash
chmod +x build.sh
./build.sh    # macOS / Linux
```

## HCU requirements

- Homematic IP HCU1 with firmware **1.4.7 or newer**
- Developer mode enabled

## Author

Issued by **Fabio Renner**.

### Third-party components

- [`tuyapi`](https://github.com/codetheweb/tuyapi) by codetheweb and contributors — Tuya v3.5 local protocol implementation (MIT).
- Eufy and the E15/E18 robotic lawn mowers are products of Anker Innovations; this plugin is not affiliated with or endorsed by Anker / Eufy.
- Built against the [Homematic IP Connect API 1.0.1](https://github.com/homematicip/connect-api) by eQ-3.

## License

Apache-2.0
