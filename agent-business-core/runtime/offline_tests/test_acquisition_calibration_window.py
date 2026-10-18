"""Admission uses the whole corpus, including unselected protected evidence."""
from copy import deepcopy
from datetime import UTC, datetime, timedelta

import pytest
from test_acquisition_native_chain import inputs

from pinet_core.acquisition.agent_role_calibration import validate_execution_window
from pinet_core.acquisition.model_observation import safe_code
from pinet_core.tasks.codex import RunnerError

NOW = datetime(2026, 10, 18, 19, 59, tzinfo=UTC)
UNTIL = NOW + timedelta(hours=1)


def frozen():
    data, _ = inputs()
    return {"campaign": data["campaign"], "cases": [
        {"id": "known-one", "split": "train", "prospect": data["prospect"],
         "recipient": data["recipient"], "persona": "Ask a known requirements question.",
         "expected_initial": "draft_ready", "expected_classifications": ["question"]},
        {"id": "held-one", "split": "holdout", "prospect": deepcopy(data["prospect"]),
         "recipient": data["recipient"], "persona": "Keep this fixture distinct.",
         "expected_initial": "draft_ready", "expected_classifications": ["question"]}]}


def test_full_window_acceptance_preserves_all_bytes_equivalent_data():
    value = frozen()
    original = deepcopy(value)
    assert validate_execution_window(value, now=NOW, until=UNTIL) is None
    assert value == original


@pytest.mark.parametrize("part", ["campaign", "fact", "unselected_holdout_evidence"])
@pytest.mark.parametrize("delta", [-1, 0])
def test_every_expiry_must_be_strictly_after_admitted_deadline(part, delta):
    value = frozen()
    short = (UNTIL + timedelta(seconds=delta)).isoformat()
    if part == "campaign":
        value["campaign"]["expires_at"] = short
    elif part == "fact":
        value["campaign"]["facts"][0]["expires_at"] = short
    else:
        value["cases"][1]["prospect"]["evidence"][0]["expires_at"] = short
    original = deepcopy(value)
    with pytest.raises(RunnerError, match="^agent_role_calibration_window_too_short$"):
        validate_execution_window(value, now=NOW, until=UNTIL)
    assert value == original


@pytest.mark.parametrize("now,until", [(NOW, NOW), (UNTIL, NOW),
    (NOW.replace(tzinfo=None), UNTIL), (NOW, UNTIL.replace(tzinfo=None)), (NOW, "later")])
def test_invalid_or_elapsed_window_is_safe_and_does_not_export_private_text(now, until):
    with pytest.raises(RunnerError, match="^agent_role_calibration_window_too_short$"):
        validate_execution_window(frozen(), now=now, until=until)
    assert safe_code("agent_role_calibration_window_too_short") == "agent_role_calibration_window_too_short"
    assert safe_code("private hidden content") == "guard_error_unclassified"
