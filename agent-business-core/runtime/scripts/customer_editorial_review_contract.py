"""Strict explicit native editorial actions, without runtime startup."""
import json
from pathlib import Path

from customer_public_contract import common

from pinet_core.creation.editorial_review import (
    CONTRACT,
    ApproveBatch,
    EditorialResultEnvelope,
    RecordReview,
)


def contract():
    schemas = common()
    for model in (RecordReview, ApproveBatch, EditorialResultEnvelope):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(schema.pop("$defs", {}))
        schemas[model.__name__] = schema
    paths = {}
    for suffix, operation, request in (("editorial-reviews", "recordCustomerEditorialReview", "RecordReview"),
            ("editorial-approvals", "approveCustomerEditorialBatch", "ApproveBatch")):
        paths["/customer/v2/creations/{creation_id}/" + suffix] = {"post": {
            "operationId": operation, "security": [{"CoreSession": []}],
            "parameters": [{"name": "creation_id", "in": "path", "required": True,
                "schema": {"type": "string", "format": "uuid"}}],
            "x-unknown-query-parameters": "rejected", "x-body-byte-limit": 131072,
            "requestBody": {"required": True, "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/" + request}}}},
            "responses": {str(code): {"description": "Committed safe result" if code == 200 else "Safe refusal",
                "content": {"application/json": {"schema": {"$ref": "#/components/schemas/" + (
                    "EditorialResultEnvelope" if code == 200 else "Error")}}}}
                for code in (200, 400, 401, 403, 404, 409, 503)}}}
    return {"openapi": "3.1.0", "info": {"title": "Native editorial review and atomic approval", "version": CONTRACT,
        "description": "Current authenticated owner/Session/S6/accepted candidate/source/host and idle Creation/GUIDE. "
            "Explicit revision-bound six-area evidence only; reviewer/actor comes from the real server user. "
            "Canonical model writers preserve fact/media/source/link/current-review/atomic-batch gates. "
            "Immutable operation receipts support exact replay; ambiguous dispatched writes fail closed. "
            "No generic commands, preparation authority expansion, fact clearing, independent release, deployment, "
            "model calls or invented review/PASS. Full-site and launch stay UNVERIFIED."},
        "paths": paths, "components": {"securitySchemes": {"CoreSession": {"type": "http", "scheme": "bearer"}},
            "schemas": schemas}}


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-editorial-review.openapi.json"
    target.write_text(json.dumps(contract(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Canonical native editorial contract written")
