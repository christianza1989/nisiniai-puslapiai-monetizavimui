"""Source-only approved continuation policy; no provider or operational state."""
import hashlib
from uuid import uuid4

import pytest

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.site_build import service, worker


def test_durable_ids_are_same_for_replay_and_distinct_for_real_changes():
    cid = str(uuid4())
    page = "page-" + "a" * 24
    assert service.request_id(cid, 1, page) == service.request_id(cid, 1, page)
    assert len({service.request_id(cid, 1, page), service.request_id(cid, 2, page),
                service.request_id(cid, 1, "page-" + "b" * 24),
                service.request_id(str(uuid4()), 1, page)}) == 4


def test_plan_order_and_priority_are_not_replaced_by_fixed_content_cadence(monkeypatch):
    payload = {"content_plan": [
        {"path":"/gidai/pagrindas/","priority":"initial"},
        {"path":"/gidai/veliau/","priority":"later"},
        {"path":"/gidai/pasirinkimas/","priority":"initial"}]}
    monkeypatch.setattr(service, "normalize", lambda value:value)
    mapping = [{"path":item["path"],"pageId":"page-"+hashlib.sha256(item["path"].encode()).hexdigest()[:24]}
               for item in payload["content_plan"]]
    assert service.initial_pages(payload, {"pageMappings":mapping}) == [mapping[0]["pageId"],mapping[2]["pageId"]]
    mapping[0]["pageId"] = "page-"+"f"*24
    with pytest.raises(ControlError, match="invalid_content_source"):
        service.initial_pages(payload, {"pageMappings":mapping})


def test_empty_initial_tasks_cannot_be_reported_as_a_ready_website():
    result = service.observation(str(uuid4()),"page_quality","blocked",completed=0,total=0)
    assert result["foundation_status"] == result["public_launch"] == "UNVERIFIED"
    assert result["channel_activation"] == "not_performed"


def test_continuation_is_disabled_by_default_and_production_is_not_an_admission(monkeypatch):
    monkeypatch.setattr(settings(),"site_build_enabled",False)
    with pytest.raises(ControlError):
        service.enabled()
    monkeypatch.setattr(settings(),"site_build_enabled",True)
    monkeypatch.setattr(settings(),"environment","production")
    with pytest.raises(ControlError):
        service.enabled()


@pytest.mark.asyncio
@pytest.mark.parametrize("phase,state", [("initial_content","blocked"),("initial_content","failed"),
                                      ("business_draft","failed"),("initial_content","running"),
                                      ("page_quality","blocked")])
async def test_blocked_failed_and_running_cases_do_not_start_another_provider(monkeypatch,phase,state):
    cid = str(uuid4())
    async def advance(_):
        return service.observation(cid,phase,state)
    async def forbidden(**kwargs):
        pytest.fail("A failed or pending case cannot dispatch another provider")
    monkeypatch.setattr(service,"advance",advance)
    monkeypatch.setattr(worker.creations,"execute_once",forbidden)
    monkeypatch.setattr(worker.guides,"execute_once",forbidden)
    assert not (await worker.tick(cid))["executed"]
