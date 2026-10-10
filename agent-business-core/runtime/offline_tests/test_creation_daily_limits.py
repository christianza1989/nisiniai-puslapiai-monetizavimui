"""Optional daily ceilings do not replace charged accounting or execution authority."""
import pytest
from pydantic import ValidationError

from pinet_core.config import Settings, settings
from pinet_core.content_work import service as guide
from pinet_core.creation import service


@pytest.mark.parametrize("own_limit,total_limit,own,total,blocked", [
    (0, 0, 200, 500, False),
    (0, 3, 100, 2, False),
    (0, 3, 100, 3, True),
    (3, 0, 2, 100, False),
    (3, 0, 3, 100, True),
    (100, 1000, 21, 101, False),
    (100, 1000, 100, 101, True),
])
def test_independent_disabled_or_positive_daily_ceilings(monkeypatch, own_limit, total_limit, own, total, blocked):
    monkeypatch.setattr(settings(), "creation_daily_limit", own_limit)
    monkeypatch.setattr(settings(), "creation_global_daily_limit", total_limit)
    assert service.daily_limit_reached(own, total) is blocked


@pytest.mark.parametrize("limit", [0, 200])
def test_creation_and_guide_accept_same_ceiling_configuration(monkeypatch, limit):
    cfg = settings()
    for key, value in {"creation_enabled": True, "creation_runner_enabled": True, "customer_enabled": True,
            "creation_daily_limit": limit, "creation_global_daily_limit": limit, "control_mode": "local",
            "environment": "test-call-ceiling", "creation_runner_seconds": 180,
            "control_source_revision": "a" * 40}.items():
        monkeypatch.setattr(cfg, key, value)
    service.admission_enabled()
    guide.enabled()


@pytest.mark.parametrize("field", ["creation_daily_limit", "creation_global_daily_limit"])
def test_negative_daily_ceiling_is_invalid(field):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{field: -1})
