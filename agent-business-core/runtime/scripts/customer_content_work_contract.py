"""Canonical native content job/live projection wire; legacy content.v1 stays intake-only."""
import json
from pathlib import Path

from customer_public_contract import common, document

from pinet_core.content_work.wire import JobsView, JobView, StartGuide


def contract():
    schemas = common()
    for model in (StartGuide, JobView, JobsView):
        schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        schemas.update(schema.pop("$defs", {}))
        schemas[model.__name__] = schema
    # Describe native body bytes using the maintained V2 schema, never dict-shaped
    # pseudo blocks. Python admission delegates structural normalization to Node.
    native = json.loads((Path(__file__).resolve().parents[3] /
        "content-studio/schemas/content-package.v2.schema.json").read_text("utf-8"))
    def native_refs(value):
        if isinstance(value, dict):
            return {k: (v.replace("#/$defs/", "#/components/schemas/NativeV2_") if k == "$ref"
                        else native_refs(v)) for k, v in value.items()}
        if isinstance(value, list):
            return [native_refs(v) for v in value]
        return value
    for key in ("block", "inline", "target"):
        value = native["$defs"][key]
        if key == "target":
            value = {"oneOf": [branch for branch in value["oneOf"]
                              if branch["properties"]["kind"]["const"] in ("page", "external")]}
        schemas["NativeV2_" + key] = native_refs(value)
    schemas["NativeOutput"]["properties"]["body"]["items"] = {"$ref": "#/components/schemas/NativeV2_block"}
    prefix = "/customer/v2/creations/{creation_id}/content-work"
    value = document("Private native V2 GUIDE work", "content-work.v1", schemas, [
        ("post", prefix, "startCustomerGuideWork", "JobView", 202, "StartGuide", True),
        ("get", prefix, "listCustomerGuideWork", "JobsView", 200, None, True),
        ("get", prefix + "/{job_id}", "getCustomerGuideWork", "JobView", 200, None, True),
        ("post", prefix + "/{job_id}/cancel", "cancelCustomerGuideWork", "JobView", 200, None, True),
    ], private=True)
    value["info"]["description"] = ("Authenticated own current accepted creation revision and actual page planningBrief. "
        "Separate bounded native V2 GUIDE jobs, immutable exact candidate/critic/coordinator attempts and events; "
        "live job state, not an intake snapshot or live publication certificate. Two rounds, six actual calls and "
        "300-second maximum including prepare/validate/apply; no automatic job retry. Same shared provider mutex "
        "and charged customer/global daily attempt budget including old creation attempts. Read-only fixed CLI "
        "roles use the fixed Luna creator and Sol critic/coordinator execution profiles; historical Luna reviews "
        "remain readable. Migration0020 is required before any new queue/claim/reservation, and exact execution "
        "profiles are bound into role hashes and continuation. Roles cannot verify sources, media, approve or release; accepted text only writes a private canonical "
        "studio draft with current content/planning/site CAS. No raw trace/private filesystem path. "
        "source_verification/media_verification/approval remain not_performed and fullF1/launch UNVERIFIED. "
        "EventPayload.language_review_mode defaults to required for history. Explicit paused_local_pilot permits "
        "same-output language_quality UNVERIFIED/observed=false for private write only; all other FAIL, exact "
        "candidate/critic/coordinator identities and current native CAS remain enforced. No language certification. "
        "Legacy creation.v1/content.v1 wire bytes unchanged; team sidecar adds the same explicit mode.")
    for key, schema in schemas.items():
        if key.endswith("Envelope"):
            schema["properties"]["source_revision"]["pattern"] = "^[a-f0-9]{40}$"
    return value


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[3] / "docs/contracts/verslomatika-customer-content-work.openapi.json"
    target.write_bytes((json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("Canonical content-work contract written")
