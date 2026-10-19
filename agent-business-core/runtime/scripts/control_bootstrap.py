"""Private explicit operator manifest -> local registry. Does not print credentials or mappings."""
import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from pinet_core.config import settings
from pinet_core.control.bootstrap import bootstrap


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--allow-new-businesses", action="store_true",
                        help="Only for a dedicated empty local pilot database; never a shared registry migration.")
    args = parser.parse_args()
    cfg = settings()
    if cfg.environment != "local" or not cfg.control_enabled:
        raise ValueError("local_control_disabled")
    manifest_path = Path(args.manifest).resolve()
    value = json.loads(manifest_path.read_text(encoding="utf-8"))
    credentials = json.loads((manifest_path.parent / value.pop("credential_file")).read_text(encoding="utf-8"))
    engine = create_async_engine(cfg.admin_database_url)
    try:
        async with AsyncSession(engine) as tx, tx.begin():
            receipt = await bootstrap(tx, environment=cfg.environment, username=credentials["username"],
                                      password=credentials["password"], allow_new_businesses=args.allow_new_businesses,
                                      **value)
        (manifest_path.parent / "bootstrap-receipt.private.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    finally:
        await engine.dispose()
    print(f"Local explicit registry ready: {len(receipt['business_ids'])} registrations; channels remain disabled.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        raise SystemExit("Bootstrap failed; no credentials printed. Inspect sanitized private configuration.") from None
