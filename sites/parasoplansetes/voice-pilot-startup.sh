#!/usr/bin/env bash
# SFU-only acceptance pilot. No database, customer records, SMTP or Gemini keys.
set -euo pipefail
umask 077
install -d -m 700 /opt/pinet-voice-pilot
cd /opt/pinet-voice-pilot
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates openssl iptables
curl --fail --silent --show-error --location https://github.com/livekit/livekit/releases/download/v1.13.9/livekit_1.13.9_linux_amd64.tar.gz -o livekit.tar.gz
printf '%s  %s\n' '0b7fa208b662d09cfdeae8c06cf4c481aead0556086558b48250501e2e2d6e20' livekit.tar.gz | sha256sum -c -
tar -xzf livekit.tar.gz livekit-server
install -m 755 livekit-server /usr/local/bin/livekit-server
curl --fail --silent --show-error --location https://github.com/cloudflare/cloudflared/releases/download/2026.10.0/cloudflared-linux-amd64 -o cloudflared
printf '%s  %s\n' 'd33ff2d14475178d2012c2c56beba87389ac5ded27649519f198a7d3134a99db' cloudflared | sha256sum -c -
install -m 755 cloudflared /usr/local/bin/cloudflared
# Bound pilot network egress as well as its two-hour Compute Engine lifetime.
# When the shared quota is exhausted all external output fails closed.
iptables -A OUTPUT ! -o lo -m quota --quota 104857600 -j ACCEPT
iptables -A OUTPUT ! -o lo -j DROP
if [ ! -f credentials.env ]; then
  pilot_key="$(openssl rand -hex 12)"
  pilot_secret="$(openssl rand -hex 32)"
  printf 'PINET_LIVEKIT_API_KEY=%s\nPINET_LIVEKIT_API_SECRET=%s\n' "$pilot_key" "$pilot_secret" > credentials.env
fi
source credentials.env
cat > livekit.yaml <<EOF
port: 7880
bind_addresses: ["0.0.0.0"]
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
keys:
  ${PINET_LIVEKIT_API_KEY}: ${PINET_LIVEKIT_API_SECRET}
logging:
  level: info
EOF
chmod 600 credentials.env livekit.yaml
cat > /etc/systemd/system/pinet-livekit-pilot.service <<'EOF'
[Unit]
Description=Pinet SFU-only voice acceptance pilot
After=network-online.target
Wants=network-online.target
[Service]
ExecStart=/usr/local/bin/livekit-server --config /opt/pinet-voice-pilot/livekit.yaml
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/pinet-livekit-signaling.service <<'EOF'
[Unit]
Description=Temporary TLS signaling for the SFU pilot
After=network-online.target pinet-livekit-pilot.service
Wants=network-online.target pinet-livekit-pilot.service
[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:7880 --no-autoupdate --protocol http2
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
StandardOutput=append:/opt/pinet-voice-pilot/signaling.log
StandardError=append:/opt/pinet-voice-pilot/signaling.log
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now pinet-livekit-pilot pinet-livekit-signaling
# VM lifetime is enforced by Compute Engine's max-run-duration, not this script.
