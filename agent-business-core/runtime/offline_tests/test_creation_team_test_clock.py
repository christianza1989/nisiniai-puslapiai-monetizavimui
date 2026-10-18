"""The shared synthetic PG role runner observes each canonical profile clock."""
import pytest
from test_creation_team import runner

from pinet_core.config import settings
from pinet_core.creation import deadlines
from pinet_core.creation import execution_profiles as profiles


@pytest.mark.parametrize('profile', [profiles.DEFAULT, profiles.SOL_HIGH])
@pytest.mark.parametrize('case', ['within', 'over', 'unauthorized'])
async def test_synthetic_role_runner_keeps_canonical_profile_and_authority_bounds(monkeypatch, profile, case):
    cfg = settings()
    monkeypatch.setattr(cfg, 'creation_execution_profile', profile)
    monkeypatch.setattr(cfg, 'creation_runner_seconds', 180)
    monkeypatch.setattr(cfg, 'environment', 'test-qa-clock')
    monkeypatch.setattr(cfg, 'control_mode', 'local')
    bound = deadlines.job_seconds(profile)
    assert bound == (360 if profile == profiles.DEFAULT else 900)
    calls = []
    async def authorized():
        return case != 'unauthorized'
    operation = runner(calls)
    seconds = bound + .01 if case == 'over' else bound
    if case == 'within':
        value, _ = await operation({}, authorized, role='creator', seconds=seconds)
        assert value['business_name'] and calls == ['creator']
    else:
        with pytest.raises(AssertionError):
            await operation({}, authorized, role='creator', seconds=seconds)
        assert calls == []
