"""Local midnight must not make a still-valid UTC offer look expired."""

from datetime import UTC, datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from pinet_core.acquisition.agent_role_contract import RoleRequest
from pinet_core.acquisition.runtime_clock import model_context
from pinet_core.tasks.codex import RunnerError


def test_local_midnight_preserves_actual_utc_day_and_future_expiry():
    local = datetime(2026, 10, 19, 0, 20, tzinfo=timezone(timedelta(hours=3)))
    expiry = datetime(2026, 10, 18, 23, 30, tzinfo=UTC)
    packet = model_context(local, local + timedelta(minutes=40))
    checked = datetime.fromisoformat(packet["checked_at_utc"])
    assert local.date() > expiry.date()
    assert checked == datetime(2026, 10, 18, 21, 20, tzinfo=UTC) < expiry
    assert packet["execution_deadline_utc"] == "2026-10-18T22:00:00+00:00"


@pytest.mark.parametrize("checked,deadline", [
    (datetime(2026, 10, 18), datetime(2026, 10, 19, tzinfo=UTC)),
    (datetime(2026, 10, 18, tzinfo=UTC), datetime(2026, 10, 19)),
    (datetime(2026, 10, 18, tzinfo=UTC), datetime(2026, 10, 18, tzinfo=UTC)),
    (datetime(2026, 10, 19, tzinfo=UTC), datetime(2026, 10, 18, tzinfo=UTC)),
    (None, datetime(2026, 10, 19, tzinfo=UTC)),
])
def test_untrusted_or_elapsed_clock_is_not_sent_to_model(checked, deadline):
    with pytest.raises(RunnerError, match="agent_role_runtime_clock_unavailable"):
        model_context(checked, deadline)


def test_request_cannot_supply_its_own_runtime_clock():
    from test_acquisition_business_projection import value

    request = value().model_dump(mode="json")
    request["runtime_time"] = {"checked_at_utc": "2099-01-01T00:00:00Z"}
    with pytest.raises(ValidationError):
        RoleRequest.model_validate(request)
