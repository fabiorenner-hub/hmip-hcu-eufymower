# HCU plugin image. Must be linux/arm64 and carry the metadata label.
FROM --platform=linux/arm64 ghcr.io/homematicip/alpine-node-simple:0.0.1

WORKDIR /app

COPY package.json .npmrc ./
COPY package-lock.jso[n] ./

RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

COPY src ./src

VOLUME ["/data"]

ENV NODE_ENV=production \
    HMIP_PLUGIN_ID=de.homematicip.plugin.eufymower \
    LOG_LEVEL=info

ENTRYPOINT ["node", "src/index.js"]

LABEL de.eq3.hmip.plugin.metadata="{\"pluginId\":\"de.homematicip.plugin.eufymower\",\"issuer\":\"Fabio Renner\",\"version\":\"1.1.0\",\"hcuMinVersion\":\"1.4.7\",\"scope\":\"LOCAL\",\"friendlyName\":{\"de\":\"Eufy Maehroboter\",\"en\":\"Eufy Robot Mower\"},\"description\":{\"de\":\"Bindet Eufy E15/E18 Maehroboter ueber das lokale Tuya-Protokoll in Homematic IP ein. GitHub: https://github.com/fabiorenner-hub/hmip-hcu-eufymower - Spenden via PayPal: https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C\",\"en\":\"Bridges Eufy E15/E18 robot mowers into Homematic IP via the local Tuya protocol. GitHub: https://github.com/fabiorenner-hub/hmip-hcu-eufymower - Donate via PayPal: https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C\"},\"settings\":[],\"changelog\":\"1.1.0 - Plugin icon, GitHub link and PayPal donation hint added to plugin metadata, README and HCU description.\\n1.0.0 - Initial public release. Local Tuya v3.5, start/pause/dock via SWITCH device, battery and maintenance features.\",\"logsEnabled\":true}"
