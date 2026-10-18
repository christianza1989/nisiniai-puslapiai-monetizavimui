"""Private metadata-only guard observations cannot serialize model/private input."""
import json
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from pinet_core.acquisition import model_observation as observation
from pinet_core.config import settings


def packet():
    return {"task_id": str(uuid4()), "run_id": str(uuid4()), "source_revision": "a"*40,
        "phase": "heartbeat", "code": "lease_expired", "now": datetime(2026, 10, 18, tzinfo=UTC)}


def enable(monkeypatch, tmp_path):
    monkeypatch.setattr(settings(), "acquisition_model_guard_observation_enabled", True)
    monkeypatch.setattr(observation, "ROOT", tmp_path/"observations")


def test_diagnostics_default_off_has_no_files(monkeypatch, tmp_path):
    monkeypatch.setattr(settings(), "acquisition_model_guard_observation_enabled", False)
    monkeypatch.setattr(observation, "ROOT", tmp_path/"observations")
    observation.record(**packet())
    assert not observation.ROOT.exists()


def test_guard_cause_is_immutable_and_original_role_error_stays_separate(monkeypatch, tmp_path):
    enable(monkeypatch, tmp_path)
    value = packet()
    observation.record(**value)
    first = next(observation.ROOT.glob("*/*.json"))
    original = first.read_bytes()
    observation.record(**{**value, "code": "authority_denied"})
    assert first.read_bytes() == original
    observation.record(**{**value, "phase": "role_execution", "role": "reviewer", "code": "run_timeout",
        "prior_failure": "provider_error", "usage_known": False})
    rows = [json.loads(path.read_text()) for path in observation.ROOT.glob("*/*.json")]
    assert {row["code"] for row in rows} == {"lease_expired", "run_timeout"}
    assert next(row for row in rows if row["code"] == "run_timeout")["prior_failure"] == "provider_error"


def test_unrecognized_diagnostic_values_never_escape(monkeypatch, tmp_path):
    enable(monkeypatch, tmp_path)
    marker = "private-train-persona-and-label-must-not-print"
    observation.record(**{**packet(), "code": marker, "prior_failure": marker,
        "deadline": marker, "usage_known": {"private": marker}})
    path = next(observation.ROOT.glob("*/*.json"))
    assert marker not in path.read_text()
    row = json.loads(path.read_text())
    assert row["code"] == row["prior_failure"] == "guard_error_unclassified"
    assert row["usage_known"] is row["authority_deadline"] is None


@pytest.mark.parametrize("change", [{"task_id": "../foreign"}, {"run_id": "invalid"},
    {"source_revision": "secret"}, {"phase": "arbitrary-phase"}, {"role": "arbitrary-role"}])
def test_guard_diagnostics_have_fixed_bounded_identity(monkeypatch, tmp_path, change):
    enable(monkeypatch, tmp_path)
    observation.record(**{**packet(), **change})
    assert not observation.ROOT.exists()


def test_diagnostic_disk_failure_cannot_replace_actual_guard(monkeypatch, tmp_path):
    enable(monkeypatch, tmp_path)
    observation.ROOT.write_text("existing-file")
    observation.record(**packet())
    assert observation.ROOT.read_text() == "existing-file"
