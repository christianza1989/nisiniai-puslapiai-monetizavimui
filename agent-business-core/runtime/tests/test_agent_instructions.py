import pytest

from pinet_core.agent_instructions import compose
from pinet_core.employee_scores import Observation, leaderboard


def test_roles_and_niches_compose_without_foreign_instructions():
    tyre = compose('traktoriupadangos', 'conversation')
    web = compose('greitossvetaines', 'conversation')
    assert tyre.hash != web.hash
    assert '420/85 R28' in tyre.prompt and 'traktoriupadangos.lt' not in web.prompt
    assert 'AI darbuotojo' in tyre.prompt
    for role in ['conversation', 'sales', 'supplier', 'quality']:
        for site in ['traktoriupadangos', 'greitossvetaines']:
            release = compose(site, role)
            assert release.sources and len(release.hash) == 64
    with pytest.raises(ValueError):
        compose('../../.env', 'conversation')


def test_awards_do_not_count_simulated_revenue_or_self_reported_wins():
    def record(agent, case, synthetic=False, verified=True, critical=False, profit='15'):
        return Observation(agent, case, '2026-10', synthetic, verified, 100, 100, None, profit, True, critical)
    events = [record('honest', str(i)) for i in range(5)] + [record('unsafe', str(i), critical=i == 0) for i in range(6)]
    events += [record('fictional', '1', verified=False), record('simulated', '1', synthetic=True)]
    scores = leaderboard(events, '2026-10')
    assert scores[0]['agent_id'] == 'honest' and scores[0]['eligible']
    assert scores[0]['csat_observations'] == 0 and scores[0]['contribution_eur'] == '75'
    assert not scores[1]['eligible']
    assert {row['agent_id'] for row in scores} == {'honest', 'unsafe'}
    assert leaderboard(events, '2026-10', calibration=True)[0]['agent_id'] == 'simulated'
    with pytest.raises(ValueError, match='duplicate'):
        leaderboard([events[0], events[0]], '2026-10')
