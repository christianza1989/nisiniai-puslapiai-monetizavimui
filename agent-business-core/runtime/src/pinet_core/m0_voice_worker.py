"""Private audio acceptance worker; does not register the public consultant."""
from livekit.agents import cli

from .config import settings
from .voice_worker import configure_worker_cli, probe_server

if __name__ == "__main__":
    cfg = settings()
    if not cfg.m0_probe_enabled or not cfg.voice_provider_ready:
        raise RuntimeError("Private M0 credentials and bounded budget required")
    configure_worker_cli(probe_server, "pinet-m0-consultant")
    cli.run_app(probe_server)
