"""One source-derived contract for business-owned agent configuration/import."""
import json
from pathlib import Path

from fastapi import FastAPI

from .business_routes import router


def document():
    app = FastAPI(title="Business customer agent attachment", version="business-customer-agents.v1")
    app.include_router(router)
    value = app.openapi()
    value["info"]["description"] = (
        "Current verified owner and exact reviewed business source. Existing immutable Agent/Config persistence; "
        "genuine external provenance, bounded UUID-idempotent import, optimistic revisions and explicit source "
        "adoption preserve stable Agent identity and historical configuration hashes. Imported calibration "
        "metadata is provenance only. No model allowance, module admission or live channel activation.")
    for path, methods in value["paths"].items():
        for method, operation in methods.items():
            operation["operationId"] = "businessAgent"+method.title()+"".join(part.title().replace("_", "")
                for part in path.split("/") if part)
            operation["security"] = [{"CoreSession": []}]
            operation["responses"].pop("422", None)
            for parameter in operation.get("parameters", []):
                if parameter["in"] == "path" and parameter["name"] != "revision":
                    parameter["schema"]["format"] = "uuid"
    value["components"]["securitySchemes"] = {"CoreSession": {"type": "http", "scheme": "bearer"}}
    for name in ("HTTPValidationError", "ValidationError"):
        value["components"]["schemas"].pop(name, None)
    return value


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(document(), ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
