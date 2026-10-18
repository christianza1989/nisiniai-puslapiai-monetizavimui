"""Bounded explicit recovery inputs; the real lifecycle is covered on retained PG."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.mail_view.task_contract import Reauthorize
from pinet_core.mail_view.task_service import execution_identity


def request():
    return {
        "version": "mail-display-zero-dispatch-reauthorization.v1",
        "policy_id": str(uuid4()),
        "business_id": str(uuid4()),
        "authorizing_session_id": str(uuid4()),
        "execution_source_revision": "a" * 40,
        "model_execution_authorized": True,
        "maximum_calls": 3,
        "duration_seconds": 600,
        "mail_created_after": "2026-10-18T00:00:00Z",
        "jobs": [{"previous_task_id": str(uuid4()), "expected_source_sha256": "b" * 64} for _ in range(3)],
    }


def test_explicit_three_named_sources_and_separate_fresh_budget():
    value = Reauthorize.model_validate(request())
    assert value.maximum_calls == len(value.jobs) == 3


@pytest.mark.parametrize(
    "change", ["duplicate", "unnamed_capacity", "over_three", "implicit", "unversioned", "body"]
)
def test_rejects_ambiguous_or_wider_authority(change):
    value = request()
    if change == "duplicate":
        value["jobs"][1] = value["jobs"][0]
    elif change == "unnamed_capacity":
        value["maximum_calls"] = 2
    elif change == "over_three":
        value["jobs"].append({"previous_task_id": str(uuid4()), "expected_source_sha256": "b" * 64})
        value["maximum_calls"] = 4
    elif change == "implicit":
        value["model_execution_authorized"] = False
    elif change == "unversioned":
        del value["version"]
    else:
        value["jobs"][0]["body"] = "caller supplied content"
    with pytest.raises(ValidationError):
        Reauthorize.model_validate(value)


def test_existing_root_fingerprint_input_stays_exact_and_successor_is_distinct():
    from types import SimpleNamespace

    source = {"source_sha256": "a" * 64}
    assert execution_identity(SimpleNamespace(generation=0), source) is source
    recovered = execution_identity(SimpleNamespace(generation=1, previous_task_id="prior"), source)
    assert recovered == {**source, "previous_task_id": "prior", "generation": 1}
