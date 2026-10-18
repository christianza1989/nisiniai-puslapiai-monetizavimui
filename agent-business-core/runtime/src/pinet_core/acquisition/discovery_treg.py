"""One pinned Treg CLI Google provider; existing CLI owns its credentials.

No generic executable, shell, routed paid waterfall or automatic retry. The
current documented fixed price is checked before each admitted search. The
provider's actual charge remains authoritative; a catalogue is not a billing cap.
"""

import asyncio
import hashlib
import json
import os
from decimal import ROUND_CEILING, Decimal
from pathlib import Path

ENDPOINT = "anyapi.google.serp.organic"


def catalog_price(data, ceiling):
    try:
        endpoint = data["endpoint"]
        cost = endpoint["cost"]
        price = int((Decimal(str(cost["usd"])) * 1_000_000).to_integral_value(rounding=ROUND_CEILING))
        if (
            endpoint["id"] != ENDPOINT
            or endpoint["method"] != "POST"
            or cost["type"] not in {"per_call", "per_success"}
            or cost["currency"] != "USD"
            or cost.get("per", 1) != 1
            or not 0 < price <= ceiling
        ):
            raise ValueError()
        return price
    except (KeyError, TypeError, ArithmeticError, ValueError):
        raise ValueError("discovery_catalog_price_not_admitted") from None


def normalized(data):
    try:
        metadata, result = data["_treg"], data["result"]
        amount, status = metadata["charged_micro"], metadata["http_status"]
        call_id = metadata["call_id"]
        if (
            type(amount) is not int
            or amount < 0
            or type(status) is not int
            or not isinstance(call_id, str)
            or not 1 <= len(call_id) <= 120
        ):
            raise ValueError()
        rows = result["output"]["data"]["results"] if status == 200 else []
        if not isinstance(rows, list) or len(rows) > 10:
            raise ValueError()
        return {
            "call_id": call_id,
            "status": status,
            "cost_micro": amount,
            "results": [
                {"url": row["link"], "title": row.get("title") or "", "snippet": row.get("snippet") or ""}
                for row in rows
            ],
            "provider_receipt": data,
        }
    except (KeyError, TypeError, ValueError):
        raise ValueError("discovery_provider_receipt_invalid") from None


class TregGoogle:
    def __init__(self, executable, sha256, organization):
        self.executable = Path(executable)
        self.sha256, self.organization = sha256, organization

    async def cli(self, *args):
        if (
            not self.executable.is_absolute()
            or not self.executable.is_file()
            or any(p.is_symlink() for p in (self.executable, *self.executable.parents))
            or hashlib.sha256(self.executable.read_bytes()).hexdigest() != self.sha256
        ):
            raise ValueError("pinned_discovery_cli_required")
        env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
        process = await asyncio.create_subprocess_exec(
            str(self.executable),
            "--org",
            self.organization,
            "--json",
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        try:
            async with asyncio.timeout(60):
                output, _ = await process.communicate()
            if process.returncode != 0 or len(output) > 2_000_000:
                raise ValueError("discovery_cli_incomplete_no_retry")
            return json.loads(output.decode("utf-8"))
        except (UnicodeError, json.JSONDecodeError):
            raise ValueError("discovery_cli_json_invalid") from None
        finally:
            if process.returncode is None:
                process.kill()
                await process.wait()

    async def __call__(self, query, request_id, ceiling):
        price = await self.cli("catalog", "get", ENDPOINT)
        expected = catalog_price(price, ceiling)
        body = {
            "query": query.text,
            "gl": query.country.lower(),
            "hl": query.language,
            "limit": 10,
            "page": 1,
        }
        result = await self.cli(
            "call",
            ENDPOINT,
            "--method",
            "POST",
            "--data",
            json.dumps(body),
            "--header",
            "Idempotency-Key: " + request_id,
        )
        return {
            **normalized(result),
            "catalog_expected_cost_micro": expected,
            "catalog_sha256": hashlib.sha256(json.dumps(price, sort_keys=True).encode()).hexdigest(),
        }
