"""Private finite discovery from a pinned operator plan. Does not enable a worker."""

import argparse
import asyncio
import hashlib
import json
import subprocess
from pathlib import Path

from pinet_core.acquisition.discovery import DiscoveryPlan, discover
from pinet_core.acquisition.discovery_treg import TregGoogle


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--plan-sha256", required=True)
    parser.add_argument("--treg-executable", type=Path, required=True)
    parser.add_argument("--treg-sha256", required=True)
    args = parser.parse_args()
    if (
        not args.plan.is_absolute()
        or not args.plan.is_file()
        or any(p.is_symlink() for p in (args.plan, *args.plan.parents))
        or args.plan.stat().st_size > 100000
    ):
        raise ValueError("pinned_private_discovery_plan_required")
    raw = args.plan.read_bytes()
    if hashlib.sha256(raw).hexdigest() != args.plan_sha256:
        raise ValueError("discovery_plan_changed")
    plan = DiscoveryPlan.model_validate_json(raw)
    root = Path(__file__).resolve().parents[3]
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    if (
        actual != plan.execution_source_revision
        or subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True).strip()
    ):
        raise ValueError("clean_pinned_discovery_source_required")
    directory = (
        Path(__file__).resolve().parents[1]
        / "artifacts/acquisition-discovery"
        / plan.site_id
        / str(plan.run_id)
    )
    backend = TregGoogle(args.treg_executable, args.treg_sha256, plan.treg_organization)
    result = await discover(plan, directory, backend)
    print(json.dumps(result))


if __name__ == "__main__":
    asyncio.run(main())
