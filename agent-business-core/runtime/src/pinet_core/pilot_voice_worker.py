"""Explicit bounded browser pilot; never sets or bypasses production M0 verification."""
from livekit.agents import cli

from .config import settings
from .voice_worker import configure_worker_cli, pilot_server

if __name__ == '__main__':
    if not settings().voice_pilot_ready:
        raise RuntimeError('Explicit pilot sites, WSS provider and bounded budget required')
    configure_worker_cli(pilot_server, 'pinet-pilot-consultant')
    cli.run_app(pilot_server)
