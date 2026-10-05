"""Isolated dev port, no shared dist rebuild or existing process termination."""
import os
import subprocess
from pathlib import Path

from pinet_core.config import settings

cfg = settings()
root = Path(os.environ.get("PINET_PUBLIC_CORE_PATH", "C:/Users/lenovo/Documents/dovanos-memorycasting"))
# Dedicated ignored Cloudflare environment: no generic .dev.vars or SMTP secrets are loaded.
private = root / ".dev.vars.voice"
private.write_text(f"VOICE_WIDGET_ENABLED=1\nVOICE_CORE_URL=http://127.0.0.1:8840\n"
                   f"VOICE_EDGE_SECRET={cfg.edge_secret}\nNICHE_DEV_SITE_ID=traktoriupadangos\n"
                   "LEAD_SMTP_ENABLED=0\n", encoding="utf-8")
env = {**os.environ, "NICHE_DEV_SITE_ID": "traktoriupadangos", "VOICE_WIDGET_ENABLED": "1",
       "CLOUDFLARE_ENV": "voice",
       "__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS": "traktoriupadangos.lt",
       "VOICE_CORE_URL": "http://127.0.0.1:8840", "VOICE_EDGE_SECRET": cfg.edge_secret,
       "LEAD_EMAIL_ENABLED": "0", "LEAD_SMTP_ENABLED": "0"}
subprocess.run(["node", "scripts/voice-preview.mjs"], cwd=root, env=env, check=True)
