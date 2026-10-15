"""Canonical current owned native page plus authenticated revision-bound binary media."""
import json

from customer_public_contract import common, document

from pinet_core.content_completion.page_wire import PageView
from pinet_core.creation.adapter import ROOT


def contract():
    schemas = common()
    shape = PageView.model_json_schema(ref_template="#/components/schemas/{model}")
    schemas.update(shape.pop("$defs", {}))
    schemas["PageView"] = shape
    native = json.loads((ROOT / "content-studio/schemas/content-package.v2.schema.json").read_bytes())

    def references(value):
        if isinstance(value, list):
            return [references(item) for item in value]
        if isinstance(value, dict):
            return {key: ("#/components/schemas/Native_" + item.split("/")[-1]
                         if key == "$ref" and item.startswith("#/$defs/") else references(item))
                    for key, item in value.items()}
        return value

    for key, definition in native["$defs"].items():
        schemas["Native_" + key] = references(definition)
    schemas["Document"]["properties"]["body"]["items"] = {"$ref": "#/components/schemas/Native_block"}
    path = "/customer/v2/creations/{creation_id}/content-pages/{page_id}"
    value = document("Current owned private native page read", "content-page.v1", schemas,
        [("get", path, "getCustomerCurrentPage", "PageView", 200, None, True)], private=True)
    revision = {"in": "query", "name": "accepted_revision", "required": True,
                "schema": {"type": "integer", "minimum": 1, "maximum": 20}}
    page_id = {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]{1,79}$"}
    operation = value["paths"][path]["get"]
    operation["parameters"].append(revision)
    operation["parameters"][1]["schema"] = page_id
    operation["x-unknown-query-parameters"] = operation["x-duplicate-query-parameters"] = "rejected"
    schemas["PageViewEnvelope"]["properties"]["source_revision"]["pattern"] = "^[a-f0-9]{40}$"
    media_path = path + "/media/{asset_id}"
    value["paths"][media_path] = {"get": {"operationId": "getCustomerCurrentPageMedia",
        "security": [{"CoreSession": []}], "parameters": [
            {"in": "path", "name": "creation_id", "required": True, "schema": {"type": "string", "format": "uuid"}},
            {"in": "path", "name": "page_id", "required": True, "schema": page_id},
            {"in": "path", "name": "asset_id", "required": True, "schema": page_id}, revision,
            {"in": "query", "name": "expected_revision_sha256", "required": True,
             "schema": {"type": "string", "pattern": "^[a-f0-9]{64}$"}}],
        "x-unknown-query-parameters": "rejected", "x-duplicate-query-parameters": "rejected",
        "responses": {"200": {"description": "Authenticated current page asset; exact descriptor SHA/bytes, no-store/nosniff",
            "content": {mime: {"schema": {"type": "string", "format": "binary"}} for mime in ["image/webp", "image/avif"]}},
            **{key: response for key, response in operation["responses"].items() if key != "200"}}}}
    value["info"]["description"] = (
        "Read-only same current actor/session/Portfolio and exact accepted proof as content completion. "
        "Existing canonical native workflow reader supplies current body, page/context hashes and observed time. "
        "Original creator candidates and private_write_snapshot remain immutable and separate. "
        "Document body uses the shared native V2 block schema; no HTML/script renderer or arbitrary studio URL. "
        "Media descriptors exclude filesystem src, original input, prompt and rights metadata. "
        "Typed same-site page links resolve through document.links within this current owned inventory; "
        "external links are actionable only for exact verified current source URLs. Canonical network/commerce "
        "nodes remain lossless body data but render as non-actionable text; no cross-site resolver or purchase authority. "
        "document_sha256 is canonical SHA256 of the whitelisted document, distinct from full page revision SHA. "
        "Binary media is attached to this page, exact current revision, bytes and SHA; mismatched revision409, "
        "foreign/missing scope404 and corrupt adapter503. Auth/source/session are rechecked after subprocess. "
        "No provider calls, approval, release, Source/Profile or channel activation. Inherited workflow gates and language UNVERIFIED.")
    return value


if __name__ == "__main__":
    target = ROOT / "docs/contracts/verslomatika-customer-content-page.openapi.json"
    target.write_bytes((json.dumps(contract(), ensure_ascii=False, indent=2) + "\n").encode("utf8"))
    print("Canonical current page/media contract written")
