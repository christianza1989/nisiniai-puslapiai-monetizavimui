"""Actual entrypoint inventory: all maintained customer content routes are mounted."""
from pinet_core.api import app
from pinet_core.content_completion.routes import router
from pinet_core.control_api import app as portable_app
from pinet_core.customer_text.routes import router as text_router


def test_full_api_mounts_maintained_customer_completion_routes():
    # FastAPI may keep included routers lazy in app.routes; OpenAPI expands them.
    actual = {(path, frozenset(method.upper() for method in value))
              for path, value in app.openapi()["paths"].items()}
    expected = {(r.path, frozenset(r.methods or ())) for r in router.routes if hasattr(r, "methods")}
    assert expected and expected <= actual


def test_both_entrypoints_mount_typed_customer_text_without_removing_existing_routes():
    expected = {(r.path, method) for r in text_router.routes if hasattr(r, "methods")
        for method in r.methods or ()}
    for application in (app, portable_app):
        actual = {(path, method.upper())
            for path, value in application.openapi()["paths"].items() for method in value}
        assert expected and expected <= actual
        for route in text_router.routes:
            if hasattr(route, "response_model"):
                assert route.response_model is not None
