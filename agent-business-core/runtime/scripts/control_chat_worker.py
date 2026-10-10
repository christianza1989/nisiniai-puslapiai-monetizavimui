"""Separate operator-only local worker. No public worker RPC or customer account pool."""
import argparse
import asyncio

from pinet_core.config import settings
from pinet_core.tasks.worker import execute_once, loop

parser = argparse.ArgumentParser()
parser.add_argument("--once", action="store_true")
args = parser.parse_args()
cfg = settings()
if cfg.environment != "local" or not cfg.chat_enabled or not cfg.chat_runner_enabled:
    raise SystemExit("Local operator chat worker is disabled")
asyncio.run(execute_once() if args.once else loop())
