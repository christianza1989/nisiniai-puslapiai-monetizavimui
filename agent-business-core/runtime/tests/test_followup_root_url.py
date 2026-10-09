"""An approved homepage with an omitted slash must not erase a reviewed letter."""
import pytest

from pinet_core.followup_projection import bind, verified_result


def projected(url, approved='https://parasoplansetes.lt/'):
    data = {'knowledge': {'deployment_id': 'approved', 'knowledge_revision': 1,
        'canonical_host': 'parasoplansetes.lt', 'pages': [
            {'id': 'home', 'url': approved, 'revision_hash': 'a'*64, 'projection_hash': 'b'*64}]},
        'evidence': [{'id': 'client'}], 'test': True}
    body = 'Sveiki. Pateikiame prašytus komplekto kriterijus. MB Pinet\n' + url
    value = bind(data, 'StepOver komplekto kriterijai', body,
        {'approved': True, 'unsupported_claims': []}, 'codex_cli_text_lab')
    return verified_result(data, {'validated_followup': value})


@pytest.mark.parametrize('url', ['https://parasoplansetes.lt', 'https://parasoplansetes.lt/'])
def test_both_root_spellings_keep_reviewed_letter_and_approved_reference(url):
    result = projected(url)
    assert result is not None and result['validation'] == 'server_bound_model_facts_review'
    assert result['body'].endswith(url)
    assert result['source_refs'][0]['url'] == 'https://parasoplansetes.lt/'


@pytest.mark.parametrize('url', ['http://parasoplansetes.lt', 'https://foreign.example/',
    'https://parasoplansetes.lt/unapproved', 'https://parasoplansetes.lt?redirect=foreign',
    'https://parasoplansetes.lt#unapproved', 'https://user@parasoplansetes.lt',
    'https://parasoplansetes.lt:8443', 'https://parasoplansetes.lt.evil.example/'])
def test_root_alias_does_not_grant_other_urls(url):
    assert projected(url) is None


def test_homepage_cannot_be_invented_when_only_a_guide_is_approved():
    assert projected('https://parasoplansetes.lt', approved='https://parasoplansetes.lt/gidas') is None
