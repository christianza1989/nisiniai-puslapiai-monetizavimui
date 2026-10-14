"""Historical failure must remain observable without masking a deliberate current retry."""
from copy import deepcopy
from uuid import uuid4

import pytest
from test_workspace_pipeline_runner import SOURCE, pipeline, runner


def case(tmp_path, jobs):
    value = pipeline(tmp_path, lambda _: pytest.fail("unexpected HTTP dispatch"))
    value.discovery_snapshot = lambda _: ({"linked_creation_id": str(uuid4())}, None)
    value.creation_snapshot = lambda _: {"view": {"status": "draft_ready", "current_revision": 1},
        "content-work": {"items": jobs}, "foundation": {"agent_foundation_ready": False},
        "content": {"plan": [{"path": "/gidai/test/", "priority": "initial"}]},
        "content-completion": {"pages": [{"path": "/gidai/test/", "page_id": "p1", "state": "blocked"}]}}
    return value


def job(sequence, status, revision=1):
    return {"sequence": sequence, "page_id": "p1", "accepted_revision": revision,
        "status": status, "failure_code": "provider_error" if status == "failed" else None}


@pytest.mark.parametrize("jobs", [[job(2, "succeeded"), job(1, "failed")],
    [job(1, "failed"), job(2, "succeeded")], [job(2, "succeeded"), job(1, "failed", 2)]])
def test_successful_current_retry_reaches_real_native_quality_boundary(tmp_path, jobs):
    original = deepcopy(jobs)
    value = case(tmp_path, jobs)
    with pytest.raises(runner.PipelineError) as failure:
        value.run(discovery_id=str(uuid4()), message=None, source=SOURCE, mutate=True, timeout=1, poll=0)
    assert failure.value.code == "media_editorial_renderer_pending"
    assert value.state["operations"] == {} and jobs == original


def test_active_current_retry_observed_without_replaying_paid_request(tmp_path):
    value = case(tmp_path, [job(2, "running"), job(1, "failed")])
    assert value.run(discovery_id=str(uuid4()), message=None, source=SOURCE, mutate=False,
        timeout=1, poll=0) == "observed"
    assert value.state["operations"] == {}


def test_latest_failure_still_blocks_despite_older_success(tmp_path):
    value = case(tmp_path, [job(1, "succeeded"), job(2, "failed")])
    with pytest.raises(runner.PipelineError) as failure:
        value.run(discovery_id=str(uuid4()), message=None, source=SOURCE, mutate=True, timeout=1, poll=0)
    assert failure.value.code == "provider_error" and value.state["operations"] == {}
