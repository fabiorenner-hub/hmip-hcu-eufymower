> ðŸ‡¬ðŸ‡§ English | [ðŸ‡©ðŸ‡ª Deutsch](README.de.md)

<p align="center">
  <img src="icon.svg" alt="hmip-eufy-mower-plugin icon" width="128" height="128"/>
</p>

# hmip-eufy-mower-plugin

ðŸ“¦ **[Download hmip-eufy-mower-plugin-1.1.1.tar.gz](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases/latest/download/hmip-eufy-mower-plugin-1.1.1.tar.gz)** â€” install via HCUweb â†’ *Developer mode â†’ Plugins â†’ Install from file*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-eufymower>

Homematic IP HCU plugin that bridges **Eufy E15/E18 robotic lawn mowers**
into the HMIP app via the local Tuya v3.5 protocol â€” no cloud required.

## Support

If this plugin is useful to you, please consider a small donation — it helps
me keep the lights on while building more HCU plugins:
[Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Install on your HCU

The HCU accepts an ARM64 container image as a `.tar.gz`.

1. Download the latest `hmip-eufy-mower-plugin-<version>.tar.gz` from
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-eufymower/releases).
2. In HCUweb open *Settings â†’ Developer mode â†’ Plugins â†’ Install from file*
   and upload the file.
3. Open the plugin tile â†’ *Configuration* and fill in:
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

The output is `hmip-eufy-mower-plugin-<version>.tar.gz`.

## HCU requirements

- HCU1 with firmware 1.4.7+
- Developer mode enabled

## Author

Issued by **Fabio Renner**.

## License

Apache-2.0
