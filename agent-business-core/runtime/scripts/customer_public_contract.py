"""Canonical local customer and separately approved public project wire contracts."""
import json
from pathlib import Path

from control_chat_contract import nullable, obj, ref


def common():
    return {"Error": obj({"code": {"type": "string"}, "message": {"type": "string"},
                          "request_id": {"type": "string", "format": "uuid"}})}


def document(title, version, schemas, actions, *, private):
    uid = {"type": "string", "format": "uuid"}
    paths = {}
    for method, path, operation, data, code, request, authenticated in actions:
        parameters = [{"in": "path", "name": p[1:-1], "required": True,
                       "schema": uid if p.endswith("_id}") else {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]{0,79}$"}}
                      for p in path.split("/") if p.startswith("{")]
        if data == "Session":
            response = data
        else:
            response = data + "Envelope"
            schemas[response] = obj({"contract_version": {"const": version},
                "environment": {"enum": ["local", "test"]}, "source_revision": {"type": "string"},
                "observed_at": {"type": "string", "format": "date-time"}, "request_id": uid, "data": ref(data)})
        entry = {"operationId": operation, "security": [{"CoreSession": []}] if authenticated else [],
            "parameters": parameters, "responses": {str(code): {"description": "Committed safe projection",
                "content": {"application/json": {"schema": ref(response)}}},
                **{str(c): {"description": reason, "content": {"application/json": {"schema": ref("Error")}}}
                   for c, reason in [(400, "Invalid request or token"), (401, "Invalid credentials/session"),
                       (403, "Local feature disabled or no current ownership"), (404, "No scoped/public object"),
                       (409, "Changed idempotency input"), (429, "Durable action limit"), (503, "Source unavailable")]}}}
        if request:
            entry["requestBody"] = {"required": True, "content": {"application/json": {"schema": ref(request)}}}
        paths[path] = {method: entry}
    return {"openapi": "3.1.0", "info": {"title": title, "version": "0.1.0",
        "description": "LOCAL development/testing only; default OFF. No external email/deployment/AI execution. "
            + ("Generic signup/recovery receipts; private development outbox hash-fragment links. Tokens single-use, "
               "hashed, verification30min/recovery15min. Reset revokes all current sessions, does not auto-login. "
               "Same core User/Session registry and current membership/grants; domain intake grants nothing." if private else
               "Separately allowlisted revision-approved records only, due publication and immediate revoke. "
               "Operational proof expires to unknown/stale. No private IDs/grants/chat/tasks/finance/leads. "
               "List is bounded100 entries; filters/search can apply to the complete published local inventory. "
               "All replies no-store; source errors are distinct from an empty list.")},
        "paths": paths, "components": {"securitySchemes": {"CoreSession": {"type": "http", "scheme": "bearer"}},
                                     "schemas": schemas}}


def customer():
    string = {"type": "string"}
    uid = {"type": "string", "format": "uuid"}
    stamp = {"type": "string", "format": "date-time"}
    email = {"type": "string", "format": "email", "maxLength": 254}
    password = {"type": "string", "minLength": 15, "maxLength": 256}
    token = {"type": "string", "pattern": "^[A-Za-z0-9_-]{43}$"}
    schemas = common()
    schemas.update({
        "RegisterInput": obj({"email": email, "password": password, "password_confirm": password,
            "display_name": {"type": "string", "minLength": 1, "maxLength": 100}, "privacy_accepted": {"const": True}}),
        "EmailInput": obj({"email": email}),
        "LoginInput": obj({"email": email, "password": {"type": "string", "minLength": 1, "maxLength": 256}}),
        "TokenInput": obj({"token": token}),
        "ResetInput": obj({"token": token, "password": password, "password_confirm": password}),
        "Accepted": obj({"status": {"const": "accepted"}, "delivery": {"const": "development_outbox"}}),
        "Verified": obj({"status": {"const": "verified"}, "next_action": {"const": "login"}}),
        "Reset": obj({"status": {"const": "password_reset"}, "next_action": {"const": "login"}}),
        "Session": obj({"access_token": {"type": "string", "pattern": "^[A-Za-z0-9_-]{64}$"},
                        "token_type": {"const": "Bearer"}, "expires_at": stamp}),
        "Portfolio": obj({"organization_id": uid, "portfolio_id": uid, "display_name": string}),
        "Me": obj({"user_id": uid, "email": email, "display_name": string, "email_verified": {"const": True},
            "portfolios": {"type": "array", "items": ref("Portfolio")},
            "capabilities": {"type": "array", "items": {"enum": ["portfolio.read", "business_intake.create"]}}}),
        "IntakeInput": obj({"portfolio_id": uid, "kind": {"enum": ["claim", "create"]},
            "display_name": {"type": "string", "minLength": 1, "maxLength": 100},
            "canonical_host": nullable({"type": "string", "maxLength": 253}),
            "description": {"type": "string", "minLength": 20, "maxLength": 1500}, "idempotency_key": uid}),
        "Intake": obj({"intake_id": uid, "portfolio_id": uid, "kind": {"enum": ["claim", "create"]},
            "display_name": string, "canonical_host": nullable(string), "description": string,
            "status": {"enum": ["awaiting_evidence", "awaiting_review", "approved", "rejected"]},
            "business_id": nullable(uid), "created_at": stamp, "updated_at": stamp,
            "decision_note": nullable(string)}),
        "Intakes": obj({"items": {"type": "array", "maxItems": 100, "items": ref("Intake")}}),
    })
    actions = [
        ("post", "/customer/v1/auth/register", "registerCustomer", "Accepted", 202, "RegisterInput", False),
        ("post", "/customer/v1/auth/resend-verification", "resendCustomerVerification", "Accepted", 202, "EmailInput", False),
        ("post", "/customer/v1/auth/verify-email", "verifyCustomerEmail", "Verified", 200, "TokenInput", False),
        ("post", "/customer/v1/auth/login", "loginCustomer", "Session", 200, "LoginInput", False),
        ("post", "/customer/v1/auth/request-recovery", "requestCustomerRecovery", "Accepted", 202, "EmailInput", False),
        ("post", "/customer/v1/auth/reset-password", "resetCustomerPassword", "Reset", 200, "ResetInput", False),
        ("get", "/customer/v1/me", "getCustomer", "Me", 200, None, True),
        ("post", "/customer/v1/business-intakes", "createCustomerBusinessIntake", "Intake", 202, "IntakeInput", True),
        ("get", "/customer/v1/business-intakes", "listCustomerBusinessIntakes", "Intakes", 200, None, True),
        ("get", "/customer/v1/business-intakes/{intake_id}", "getCustomerBusinessIntake", "Intake", 200, None, True),
    ]
    result = document("Verslomatika local customer account and intake", "customer.v1", schemas, actions, private=True)
    result["x-shared-session"] = {"logout": "/operator/v2/auth/logout", "portfolio": "portfolio.v1",
                                  "operator_planner_granted_on_signup": False}
    return result


def portfolio():
    string = {"type": "string"}
    stamp = {"type": "string", "format": "date-time"}
    schemas = common()
    schemas.update({
        "Automation": obj({"name": {"type": "string", "minLength": 1, "maxLength": 160},
            "status": {"enum": ["planned", "testing", "verified", "paused", "unknown", "stale"]},
            "checked_at": nullable(stamp), "expires_at": nullable(stamp)}),
        "Image": obj({"src": {"type": "string", "maxLength": 1024}, "alt": {"type": "string", "maxLength": 240},
            "width": {"type": "integer", "minimum": 1}, "height": {"type": "integer", "minimum": 1},
            "credit": nullable(string), "checked_at": stamp}),
        "Project": obj({"slug": {"type": "string", "pattern": "^[a-z0-9][a-z0-9-]{0,79}$"},
            "display_name": {"type": "string", "minLength": 1, "maxLength": 160},
            "canonical_host": {"type": "string", "maxLength": 253}, "sector": nullable(string),
            "relationship": {"enum": ["own_project", "permitted_client_case"]},
            "website_stage": {"enum": ["registered", "published", "unavailable", "unverified"]},
            "automation_stage": {"enum": ["planned", "testing", "installed", "verified", "paused", "unknown", "stale"]},
            "public_summary": {"type": "string", "minLength": 1, "maxLength": 1000},
            "public_automations": {"type": "array", "maxItems": 8, "items": ref("Automation")},
            "evidence_urls": {"type": "array", "maxItems": 8, "items": {"type": "string", "maxLength": 1024}},
            "checked_at": nullable(stamp), "published_at": stamp, "updated_at": stamp,
            "image": nullable(ref("Image")), "publication_approved": {"const": True},
            "approved_revision": {"type": "string", "pattern": "^[a-f0-9]{64}$"}}),
        "Projects": obj({"items": {"type": "array", "maxItems": 100, "items": ref("Project")},
                         "snapshot_id": {"type": "string", "pattern": "^[a-f0-9]{64}$"}}),
    })
    return document("Verslomatika allowlisted public business projects", "public_portfolio.v1", schemas, [
        ("get", "/public/v1/projects", "listPublicProjects", "Projects", 200, None, False),
        ("get", "/public/v1/projects/{slug}", "getPublicProject", "Project", 200, None, False)], private=False)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[3] / "docs/contracts"
    for name, build in (("verslomatika-customer", customer), ("verslomatika-public-portfolio", portfolio)):
        (root / (name + ".openapi.json")).write_text(json.dumps(build(), ensure_ascii=False, indent=2) + "\n", "utf-8")
    print("Generated customer.v1 and public_portfolio.v1 contracts; no runtime or publication enabled.")
