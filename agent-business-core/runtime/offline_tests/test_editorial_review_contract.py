"""The two explicit wire actions match the actual maintained router."""
import json
import runpy
from pathlib import Path

from fastapi import FastAPI

from pinet_core.creation import editorial_review
from pinet_core.creation.editorial_review_routes import EditorialRoute, router


def test_standalone_contract_matches_routes_and_is_strict_without_generic_commands(monkeypatch):
    root = Path(__file__).resolve().parents[3]
    scripts = root / "agent-business-core/runtime/scripts"
    monkeypatch.syspath_prepend(str(scripts))
    contract = runpy.run_path(str(scripts / "customer_editorial_review_contract.py"))["contract"]()
    app = FastAPI()
    app.include_router(router)
    actual = app.openapi()
    assert len(contract["paths"]) == 2 and contract["info"]["version"] == editorial_review.CONTRACT
    for path, methods in contract["paths"].items():
        assert set(methods) == {"post"} == set(actual["paths"][path])
        expected = methods["post"]
        assert expected["requestBody"] == actual["paths"][path]["post"]["requestBody"]
        assert expected["responses"]["200"]["content"] == actual["paths"][path]["post"]["responses"]["200"]["content"]
        assert expected["x-body-byte-limit"] == EditorialRoute.body_limit == 131072
    for name in ("RecordReview", "ApproveBatch"):
        schema = contract["components"]["schemas"][name]
        assert schema["additionalProperties"] is False
        assert {"actor_id", "reviewer", "command", "action", "patch"}.isdisjoint(schema["properties"])
    snapshot = root / "docs/contracts/verslomatika-customer-editorial-review.openapi.json"
    assert json.loads(snapshot.read_text(encoding="utf-8")) == contract
