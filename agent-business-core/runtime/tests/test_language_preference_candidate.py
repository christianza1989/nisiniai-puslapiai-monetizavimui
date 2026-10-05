import importlib.util
from pathlib import Path

import pytest

from pinet_core.customer_language import select
from pinet_core.language_preference import preference

path = Path(__file__).resolve().parents[1]/'scripts/language_preference_candidate.py'
spec = importlib.util.spec_from_file_location('isolated_language_candidate', path)
candidate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidate)


@pytest.mark.parametrize('text,expected', [
    ('Katalogas anglų kalba, bet mano klausimas apie pristatymą.', None),
    ('Tik ne angliškai, prašau.', None),
    ('The manual is in German; I need help choosing two tyres.', None),
    ('Please answer in English.', 'en'),
    ('Prašau viską atsiųsti angliškai.', 'en'),
    ('Please reply in Lithuanian.', 'lt'),
    ('The manual is in German; please reply in English.', 'en'),
    ('Do not answer in English; please reply in Lithuanian.', 'lt'),
    ('Angliskai, prasau.', 'en'),
    ('English please.', 'en'),
    ('English', 'en'),
    ('Nereikia atsakyti angliškai.', None),
    ('I do not know the size, please reply in English.', 'en'),
    ("Please don't reply in English.", None),
    ('Nereikia katalogo, prašau atsakykite angliškai.', 'en'),
    ('Bitte antworten Sie auf Deutsch.', 'de'),
    ('Proszę odpowiedzieć po polsku.', 'pl'),
    ('Lūdzu atbildiet latviski.', 'lv'),
    ('Palun vastake eesti keeles.', 'et'),
    ('Пожалуйста, отвечайте на русском.', 'ru'),
    ('Bitte nicht auf Deutsch.', None),
    ('Пожалуйста, не отвечайте на русском.', None),
])
def test_candidate_distinguishes_language_mentions_and_preferences(text, expected):
    assert candidate.preference(text) == expected
    assert preference(text) == expected


@pytest.mark.parametrize('text,expected', [
    ('Katalogas anglų kalba, bet mano klausimas apie pristatymą.', 'lt'),
    ('Tik ne angliškai, prašau.', 'lt'),
    ('The manual is in German; I need help choosing two tyres.', 'en'),
    ('Please answer in English.', 'en'),
])
def test_promoted_selector_rejects_language_mentions(text, expected):
    prior = {'code': expected, 'source': 'offline_text_detection', 'event_id': 'earlier'}
    assert select(text, 'current', prior)['code'] == expected
