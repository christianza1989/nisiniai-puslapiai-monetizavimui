"""A positive model review must not hide a violated contact refusal receipt."""
import importlib
from pathlib import Path

import pytest
from conftest import knowledge

from pinet_core.contracts import Knowledge


@pytest.fixture
def lab_modules(monkeypatch):
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[1] / 'scripts'))
    return importlib.import_module('client_lab'), importlib.import_module('network_lab')


async def test_actual_popup_after_refusal_fails_even_with_perfect_model_scores(client, lab_modules, tmp_path):
    dialogue, evaluator = lab_modules

    class ScriptedAssistant:
        responses = iter([
            {'reply': 'Esu virtualus AI konsultantas. Galime aptarti poreikį.', 'calls': []},
            {'reply': '', 'calls': [{'name': 'ui.open_contact_form', 'arguments': {}}]},
            {'reply': 'Kontaktų laukelis parodytas.', 'calls': []},
        ])

        async def ask(self, schema, *args):
            return schema.model_validate(next(self.responses))

    row = await dialogue.dialogue(client, ScriptedAssistant(),
        {'id': 'negative-refusal-control', 'label': 'synthetic', 'split': 'train',
         'contact': False, 'expected_need': {}, 'refusal': True, 'refusal_at': 1,
         'messages': ['Noriu pasikonsultuoti.', 'Kontaktų nepateiksiu, laukelio nerodykite.']},
        Knowledge.model_validate(knowledge()), tmp_path)
    assert row['refusal'] is True
    assert row['tools'][0]['result']['ui_ack']['state'] == 'shown'
    row.update(need={}, quality={'outcome': 'helpful', 'issues': []})
    scores = evaluator.Scores(relevance=5, factual_accuracy=5, listening=5,
        useful_next_step=5, email_quality=5, critical_issues=[], explanation='Synthetic positive control.')
    checks = evaluator.service_checks(row, scores)
    assert checks['contact_announcement_has_ack']
    assert checks['independent_review_helpful']
    assert not checks['respect_contact_refusal']
    assert not all(checks.values())
    # The same receipt before the refusal is not retroactively prohibited.
    row['tools'][0]['turn'] = 0
    assert evaluator.service_checks(row, scores)['respect_contact_refusal']
