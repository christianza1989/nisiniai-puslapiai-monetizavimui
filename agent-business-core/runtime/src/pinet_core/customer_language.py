"""Offline customer-language hints; uncertain/short text never changes a choice."""
import re
from functools import lru_cache

from lingua import Language, LanguageDetectorBuilder

from .language_preference import preference

LABELS = {'lt': 'Lithuanian', 'en': 'English', 'de': 'German', 'pl': 'Polish',
    'lv': 'Latvian', 'et': 'Estonian', 'ru': 'Russian'}


@lru_cache(maxsize=1)
def detector():
    return LanguageDetectorBuilder.from_languages(Language.LITHUANIAN, Language.ENGLISH,
        Language.GERMAN, Language.POLISH, Language.LATVIAN, Language.ESTONIAN, Language.RUSSIAN).build()


def select(text, event_id, previous=None):
    explicit = preference(text)
    if explicit:
        return {'code': explicit, 'source': 'explicit_customer_preference', 'event_id': event_id}
    if previous and previous.get('source') == 'explicit_customer_preference':
        return previous
    words = re.findall(r'[^\W\d_]+', text[:3000], re.UNICODE)
    if len(words) < 3 or sum(map(len, words)) < 15:
        return previous
    values = detector().compute_language_confidence_values(text[:3000])
    if len(values) < 2 or values[0].value < 0.70 or values[0].value - values[1].value < 0.35:
        return previous
    code = values[0].language.iso_code_639_1.name.lower()
    return {'code': code, 'source': 'offline_text_detection', 'event_id': event_id,
        'detector': 'lingua-2.2.0', 'confidence_score': round(values[0].value, 4)}


def instruction(hint):
    if not hint or hint.get('code') not in LABELS:
        return ''
    return '\nCurrent customer-language selection from server evidence: ' + LABELS[hint['code']] + (
        '. Write this reply in that language from the first sentence. The language of the business '
        'instructions and website does not select the response language. Preserve product markings and names.')
