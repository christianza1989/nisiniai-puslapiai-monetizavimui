"""Pinned CLI arguments/UTF8, current catalog pricing and actual result shape."""

import hashlib
import json
from unittest.mock import AsyncMock

import pytest

from pinet_core.acquisition.discovery import DiscoveryQuery
from pinet_core.acquisition.discovery_treg import ENDPOINT, TregGoogle, catalog_price, normalized


def catalog(usd=0.0009):
    return {
        "endpoint": {
            "id": ENDPOINT,
            "method": "POST",
            "cost": {"usd": usd, "currency": "USD", "type": "per_success"},
        }
    }


def response():
    return {
        "result": {
            "output": {
                "data": {
                    "results": [
                        {
                            "link": "https://lodging.example.com/",
                            "title": "Große Häuser",
                            "snippet": "Private Sauna",
                        }
                    ]
                }
            }
        },
        "_treg": {"http_status": 200, "charged_micro": 500, "call_id": "known-call"},
    }


@pytest.mark.parametrize("value", [None, 0, -1, 0.00101])
def test_unpriced_or_above_ceiling_catalog_is_denied(value):
    with pytest.raises(ValueError, match="discovery_catalog_price_not_admitted"):
        catalog_price(catalog(value), 1000)


def test_observed_cli_receipt_keeps_cost_and_unicode():
    data = normalized(response())
    assert data["cost_micro"] == 500 and data["status"] == 200
    assert data["results"][0]["title"] == "Große Häuser" and data["provider_receipt"] == response()
    wrong = response()
    wrong["_treg"]["charged_micro"] = True
    with pytest.raises(ValueError, match="discovery_provider_receipt_invalid"):
        normalized(wrong)


@pytest.mark.asyncio
async def test_price_check_precedes_the_only_fixed_endpoint_call():
    backend = TregGoogle("unused", "a" * 64, "known-team")
    backend.cli = AsyncMock(side_effect=[catalog(), response()])
    query = DiscoveryQuery(id="one", text="Bauernhof Urlaub", country="DE", language="de")
    data = await backend(query, "known-request", 1000)
    assert data["catalog_expected_cost_micro"] == 900
    assert backend.cli.await_args_list[0].args == ("catalog", "get", ENDPOINT)
    args = backend.cli.await_args_list[1].args
    assert args[:4] == ("call", ENDPOINT, "--method", "POST")
    assert args[-2:] == ("--header", "Idempotency-Key: known-request")
    backend.cli = AsyncMock(return_value=catalog(0.002))
    with pytest.raises(ValueError):
        await backend(query, "other-request", 1000)
    assert backend.cli.await_count == 1


@pytest.mark.asyncio
async def test_windows_cli_explicit_utf8_and_pinned_executable(monkeypatch, tmp_path):
    executable = tmp_path / "known-cli.exe"
    executable.write_bytes(b"inert executable fixture; never run")
    checksum = hashlib.sha256(executable.read_bytes()).hexdigest()
    process = type(
        "Process",
        (),
        {
            "returncode": 0,
            "communicate": AsyncMock(
                return_value=(json.dumps(response(), ensure_ascii=False).encode("utf-8"), b"")
            ),
        },
    )()
    start = AsyncMock(return_value=process)
    monkeypatch.setattr("asyncio.create_subprocess_exec", start)
    backend = TregGoogle(executable, checksum, "known-team")
    result = await backend.cli("catalog", "get", ENDPOINT)
    assert result == response() and start.await_count == 1
    args = start.await_args.args
    assert args[:4] == (str(executable), "--org", "known-team", "--json")
    assert start.await_args.kwargs["env"]["PYTHONIOENCODING"] == "utf-8"
    assert start.await_args.kwargs["env"]["PYTHONUTF8"] == "1"
    executable.write_bytes(b"changed")
    with pytest.raises(ValueError, match="pinned_discovery_cli_required"):
        await backend.cli("catalog", "get", ENDPOINT)
    assert start.await_count == 1
