"""Retrieval must select the requested approved page, not a verbose neighbour."""
from types import SimpleNamespace

import pytest

from pinet_core import knowledge
from pinet_core.contracts import KnowledgeQuery
from pinet_core.models import utcnow


def page(identity, title, text='Synthetic approved example.'):
    return {'id': identity, 'title': title, 'text': text,
            'url': 'https://source.example/' + identity,
            'revision_hash': identity * 64, 'projection_hash': 'f' * 64}


async def resolve(monkeypatch, pages, query, revoked=()):
    async def current(_):
        return SimpleNamespace(refreshed_at=utcnow(), revision=1,
            payload={'knowledge': {'pages': pages, 'deployment_id': 'synthetic'}, 'revoked': list(revoked)})
    monkeypatch.setattr(knowledge, 'current', current)
    return await knowledge.resolve(None, KnowledgeQuery(query=query))


@pytest.mark.parametrize('model', ['4.3', '5.0', '10.0', 'NG 10'])
async def test_named_model_beats_generic_word_overlap(monkeypatch, model):
    pages = [page('a', 'StepOver naturaSign Pad Classic',
                  'Patikrinkite dabartinį patvirtintą StepOver duraSign modelio puslapį dokumentą '
                  'įrenginio ekrane programinės įrangos dokumento peržiūros skaitomumo sąlygos ribojimai.'),
             page('b', 'Kaip pasirinkti parašo planšetę', 'StepOver duraSign Pad ir dokumento peržiūra.'),
             page('c', 'StepOver duraSign Pad ' + model)]
    output = await resolve(monkeypatch, pages,
        'Patikrinkite dabartinį patvirtintą StepOver duraSign Pad ' + model +
        ' modelio puslapį: dokumentą įrenginio ekrane, programinės įrangos ir skaitomumo sąlygos.')
    assert output['sources'][0]['id'] == 'c'


@pytest.mark.parametrize('requested,other', [('5.0', '10.0'), ('4.3', '5.0'), ('10.0', 'NG 10')])
async def test_model_numbers_are_not_substring_matches(monkeypatch, requested, other):
    output = await resolve(monkeypatch,
        [page('a', 'StepOver duraSign Pad ' + other, 'duraSign Pad dokumentas ekranas'),
         page('b', 'StepOver duraSign Pad ' + requested)], 'duraSign Pad ' + requested)
    assert output['sources'][0]['id'] == 'b'


@pytest.mark.parametrize('identifier', ['b', 'https://source.example/b'])
async def test_explicit_approved_identifier_overrides_description(monkeypatch, identifier):
    output = await resolve(monkeypatch,
        [page('a', 'Other model', 'Other model details and comparison'), page('b', 'Requested model')],
        identifier + ' Other model details and comparison')
    assert output['sources'][0]['id'] == 'b'


async def test_exact_retrieval_cannot_restore_a_revoked_page(monkeypatch):
    item = page('b', 'Requested model')
    output = await resolve(monkeypatch, [item], item['url'], revoked=[item['revision_hash']])
    assert output['status'] == 'no_match' and output['sources'] == []


@pytest.mark.parametrize('title', ['Traktorių padangos 540/65 R28', 'Granito laiptai',
                                  'Mini ekskavatoriaus nuoma', 'Roletų matavimas'])
async def test_title_lookup_is_generic_across_niches(monkeypatch, title):
    output = await resolve(monkeypatch,
        [page('a', 'Bendras gidas', title + ' papildomi bendri žodžiai'), page('b', title)],
        title + ' papildomi bendri žodžiai')
    assert output['sources'][0]['id'] == 'b'
