"""Isolated dev port, no shared dist rebuild or existing process termination."""
import argparse
import os
import subprocess
from pathlib import Path

from dotenv import dotenv_values

from pinet_core.config import settings
from pinet_core.profiles import PROFILES

cfg = settings()
parser = argparse.ArgumentParser(description='Own site preview with private edge credential only')
parser.add_argument('--site', choices=sorted(PROFILES), default='traktoriupadangos')
parser.add_argument('--port', type=int, default=5187)
args = parser.parse_args()
if not 1024 <= args.port <= 65535:
    raise ValueError('invalid_preview_port')
site = args.site
host = PROFILES[site].canonical_host
environment = 'voice' if site == 'traktoriupadangos' else 'voice-' + site
root = Path(os.environ.get("PINET_PUBLIC_CORE_PATH") or dotenv_values(".env").get("PINET_PUBLIC_CORE_PATH")
            or Path(__file__).resolve().parents[4] / "dovanos-memorycasting")
# Dedicated ignored Cloudflare environment: no generic .dev.vars or SMTP secrets are loaded.
private = root / ('.dev.vars.' + environment)
private.write_text(f"VOICE_WIDGET_ENABLED=1\nVOICE_CORE_URL={cfg.core_url}\n"
                   f"VOICE_EDGE_SECRET={cfg.edge_secret}\nNICHE_DEV_SITE_ID={site}\nVOICE_SITE_IDS={site}\n"
                   f"CHAT_WIDGET_ENABLED={int(cfg.chat_enabled and site in cfg.chat_sites)}\nCHAT_SITE_IDS={site if site in cfg.chat_sites else ''}\n"
                   "LEAD_SMTP_ENABLED=0\n", encoding="utf-8")
env = {**os.environ, "NICHE_DEV_SITE_ID": site, "VOICE_WIDGET_ENABLED": "1", "VOICE_SITE_IDS": site,
       "CHAT_WIDGET_ENABLED": str(int(cfg.chat_enabled and site in cfg.chat_sites)), "CHAT_SITE_IDS": site if site in cfg.chat_sites else '',
       "VOICE_PREVIEW_PORT": str(args.port), "CLOUDFLARE_ENV": environment,
       "__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS": host,
       "VOICE_CORE_URL": cfg.core_url, "VOICE_EDGE_SECRET": cfg.edge_secret,
       "LEAD_EMAIL_ENABLED": "0", "LEAD_SMTP_ENABLED": "0"}
subprocess.run(["node", "scripts/voice-preview.mjs"], cwd=root, env=env, check=True)
