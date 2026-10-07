import argparse
import asyncio
import json
import time
from datetime import UTC, datetime

import uvicorn

from .config import Config
from .contracts import Profile
from .server import create_app
from .service import Service
from .store import Store


def seed(store, config):
    if "phonebridger" not in store.sites():
        profile = Profile(site_id="phonebridger", canonical="https://phonebridger.com",
                          queries=['"Android" "keyboard" "PC" lang:en -is:retweet',
                                   '(PhoneBridger OR DeskDock) lang:en -is:retweet'],
                          allowed_urls=["https://phonebridger.com"], experiment_id="x-phonebridger-20261007")
        store.update_profile(profile.model_dump(), 0, "Owner requested first PhoneBridger channel")
    if (config.data / "actor-probe.json").exists():
        data = json.loads((config.data / "actor-probe.json").read_text(encoding="utf-8"))["response"].get("data", {})
        current = store.profile("phonebridger")
        if data.get("id") and not current["profile"]["actor_id"]:
            store.update_profile({**current["profile"], "actor_id": data["id"], "actor_handle": data["username"],
                                  "actor_verified_at": time.time(), "credential_hash": store.credential_hash(config.token)},
                                  current["revision"], "Actual earlier authenticated actor probe")


async def main(args, config, store):
    service = Service(store, config)
    if args.command == "tick":
        print(json.dumps(await service.run_once(args.site)))
    elif args.command == "day":
        print(json.dumps(service.schedule_day(args.site)))
    elif args.command == "probe":
        # A command-specific ceiling, restored afterwards; no long-running allowance is inferred.
        old, budget = store.profile(args.site), store.budgets()
        store.update_profile({**old["profile"], "enabled": True, "paused": False, "live_read": True,
                              "daily_cap_micro": 250_000, "monthly_cap_micro": 250_000},
                             old["revision"], "Owner requested bounded capability tests")
        store.budgets(250_000, 250_000)
        try:
            result = await service.bind_actor(args.site)
            p = result["profile"]
            receipt = await service.paid(args.site, "research", {"query": p["queries"][0]}, "research-probe", "research-probe-" + str(int(time.time())))
            print(json.dumps({"actor_handle": p["actor_handle"], "search_status": receipt.status,
                              "search_resources": len(receipt.body.get("data", [])), "charged_micro": receipt.charged_micro}))
        finally:
            current = store.profile(args.site)
            original = {**old["profile"], **{k: current["profile"][k] for k in
                        ("actor_id", "actor_handle", "actor_verified_at", "credential_hash")}}
            store.update_profile(original, current["revision"], "Restore mode after bounded capability test")
            store.budgets(budget["daily"], budget["monthly"])
    elif args.command == "worker":
        while True:
            for site in store.sites():
                p = store.profile(site)["profile"]
                if p["enabled"] and not p["paused"]:
                    service.schedule_day(site)
                    await service.run_once(site)
            store.record("_coordinator", "heartbeat", "worker", {"at": datetime.now(UTC).isoformat()})
            await asyncio.sleep(60)


def run():
    parser = argparse.ArgumentParser(description="Private Treg Xbot coordinator")
    parser.add_argument("command", choices=["init", "serve", "day", "tick", "probe", "worker"])
    parser.add_argument("--site", default="phonebridger")
    parser.add_argument("--port", type=int, default=8893)
    args = parser.parse_args()
    config = Config.private()
    store = Store(config.data / "xbot.sqlite")
    seed(store, config)
    if args.command == "serve":
        uvicorn.run(create_app(config, store), host="127.0.0.1", port=args.port, access_log=False)
    elif args.command == "init":
        print(json.dumps({"sites": store.sites(), "live": False, "operator_key_file": str(config.data / ".operator-key")}))
    else:
        asyncio.run(main(args, config, store))


if __name__ == "__main__":
    run()
