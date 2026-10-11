import argparse
import asyncio
import json
from datetime import UTC, datetime

import uvicorn

from .config import Config
from .contracts import Profile
from .server import create_app
from .service import Service
from .store import Conflict, Store


def seed(store, config, site=None, canonical=None):
    if site and canonical and site not in store.sites():
        profile = Profile(site_id=site, canonical=canonical)
        store.update_profile(profile.model_dump(), 0, "Explicit disabled local profile; no niche activation")


async def main(args, config, store):
    service = Service(store, config)
    if args.command == "tick":
        print(json.dumps(await service.run_once(args.site)))
    elif args.command == "day":
        print(json.dumps(service.schedule_day(args.site)))
    elif args.command == "probe":
        # Existing current policy/budget only. Historical testing approval is not renewed here.
        result = await service.bind_actor(args.site)
        print(json.dumps({"actor_id": result["profile"]["actor_id"], "verified": True}))
    elif args.command == "worker":
        for _ in range(args.cycles):
            for site in store.sites():
                p = store.profile(site)["profile"]
                if p["enabled"] and not p["paused"]:
                    if config.codex_enabled:
                        service.schedule_day(site)
                    await service.run_once(site)
            store.record("_coordinator", "heartbeat", "worker", {"at": datetime.now(UTC).isoformat()})
            await asyncio.sleep(args.interval)


def run():
    parser = argparse.ArgumentParser(description="Private Treg Xbot coordinator")
    parser.add_argument("command", choices=["init", "serve", "day", "tick", "probe", "worker"])
    parser.add_argument("--site")
    parser.add_argument("--canonical")
    parser.add_argument("--cycles", type=int, default=780)
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--port", type=int, default=8893)
    args = parser.parse_args()
    config = Config.private()
    store = Store(config.data / "xbot.sqlite")
    if not 1 <= args.cycles <= 1440 or not 10 <= args.interval <= 3600:
        parser.error("bounded worker cycles/interval required")
    if args.command in {"day", "tick", "probe"} and not args.site:
        parser.error("--site required")
    seed(store, config, args.site, args.canonical)
    if args.command == "serve":
        uvicorn.run(create_app(config, store), host="127.0.0.1", port=args.port, access_log=False)
    elif args.command == "init":
        print(
            json.dumps({"sites": store.sites(), "live": False, "operator_key_file": str(config.data / ".operator-key")})
        )
    else:
        try:
            asyncio.run(main(args, config, store))
        except (Conflict, ValueError) as error:
            print(
                json.dumps(
                    {"state": "blocked", "reason": str(error) if isinstance(error, Conflict) else type(error).__name__}
                )
            )
            raise SystemExit(1) from None


if __name__ == "__main__":
    run()
