"""Meaningful local regressions for observed provider-filter failures; no raw SERP."""
import pytest

from pinet_core.acquisition.discovery_urls import review_discovery_urls


def test_acquisition_discovery_enforces_ignored_provider_exclusions():
    result = review_discovery_urls(['https://www.blocked.example.test/salon/',
        'https://blocked.example.test/', 'https://deep.sub.blocked.example.test/',
        'https://notblocked.example.test/', 'https://blocked.example.test.other.test/'],
        excluded_hosts=['blocked.example.test'])
    assert [row.state for row in result] == ['excluded'] * 3 + ['primary_read_required'] * 2
    assert all(row.url is None and row.reasons == ('excluded_domain',) for row in result[:3])
    assert all(not row.read_allowed and not row.qualified_provider for row in result)


def test_acquisition_discovery_source_rows_cannot_assert_query_city_or_fit():
    # A website on an Utenos-named street may actually be in Kaunas. The URL review
    # never promotes search-location or category assumptions into a Prospect.
    result = review_discovery_urls(['https://studio.example.test/utenos-gatve/'], excluded_hosts=[])
    assert result[0].state == 'primary_read_required'
    assert result[0].reasons == ('primary_evidence_and_read_policy_required',)
    assert not result[0].qualified_provider and not result[0].read_allowed


def test_acquisition_discovery_normalizes_idna_case_and_subdomains():
    result = review_discovery_urls(['https://WWW.BÜCHER.example.test./path'],
                                  excluded_hosts=['bücher.example.test'])
    assert result[0].hostname == 'www.xn--bcher-kva.example.test'
    assert result[0].reasons == ('excluded_domain',)


@pytest.mark.parametrize('value', ['http://salon.example.test/', 'https://salon.example.test:444/',
    'https://name:secret@salon.example.test/', 'https://salon.example.test/?token=secret',
    'https://127.0.0.1/', 'https://[::1]/', 'https://localhost/', '//salon.example.test/',
    'https://bad_host.example.test/', 'https://salon.example.test/\n', None])
def test_acquisition_discovery_unsafe_urls_are_not_fetch_targets(value):
    row = review_discovery_urls([value], excluded_hosts=[])[0]
    assert row.state == 'excluded' and row.url is None and not row.read_allowed
    assert 'secret' not in repr(row)


def test_acquisition_discovery_duplicate_fragment_retains_one_review_target():
    result = review_discovery_urls(['https://SALON.example.test:443/#first',
        'https://salon.example.test/#second', 'https://salon.example.test/services/'], excluded_hosts=[])
    assert result[0].url == 'https://salon.example.test/'
    assert result[1].reasons == ('duplicate_source_url',)
    assert result[2].url == 'https://salon.example.test/services/'


@pytest.mark.parametrize('policy', [['https://blocked.example.test'], ['localhost'], ['127.0.0.1'], [' bad.example.test']])
def test_acquisition_discovery_invalid_policy_fails_closed(policy):
    with pytest.raises(ValueError):
        review_discovery_urls(['https://salon.example.test/'], excluded_hosts=policy)


def test_acquisition_discovery_zero_results_and_bounds():
    assert review_discovery_urls([], excluded_hosts=[]) == ()
    with pytest.raises(ValueError, match='bounded_discovery_policy_required'):
        review_discovery_urls(['https://salon.example.test/'] * 2, excluded_hosts=[], max_results=1)
    with pytest.raises(ValueError, match='bounded_discovery_policy_required'):
        review_discovery_urls([], excluded_hosts=[], max_results=True)
