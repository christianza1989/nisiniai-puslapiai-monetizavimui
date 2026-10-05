"""Conservative explicit reply-language requests, separate from language mentions."""
import re
import unicodedata

ALIASES = {
    'english': 'en', 'lithuanian': 'lt', 'german': 'de', 'polish': 'pl',
    'latvian': 'lv', 'estonian': 'et', 'russian': 'ru', 'angliskai': 'en',
    'lietuviskai': 'lt', 'vokiskai': 'de', 'lenkiskai': 'pl', 'latviskai': 'lv',
    'estiskai': 'et', 'rusiskai': 'ru', 'anglu kalba': 'en', 'lietuviu kalba': 'lt',
    'deutsch': 'de', 'polsku': 'pl', 'latviski': 'lv', 'eesti keeles': 'et',
    'на русском': 'ru', 'по-русски': 'ru',
}
REQUEST = re.compile(r'\b(?:please|reply|answer|respond|speak|continue|write|send|communicate|'
    r'prefer|prasau|atsak\w*|rasy\w*|kalbe\w*|bendrau\w*|atsi\w*|pageidau\w*|norec\w*|'
    r'bitte|antwort\w*|schreib\w*|sprech\w*|prosze|odpow\w*|pisz\w*|'
    r'ludzu|atbild\w*|rakst\w*|palun|vasta\w*|kirjuta\w*|'
    r'пожалуиста|отвеча\w*|ответ\w*|пиши\w*|говор\w*)\b')
NEGATIVE = re.compile(r"\b(?:not|no|never|don['’]t|ne|nenoriu|nereikia|nekalbek\w*|nerasy\w*|neatsak\w*|nicht|nie|mitte|не)\b")


def preference(text):
    normalized = ''.join(c for c in unicodedata.normalize('NFKD', text.casefold())
        if not unicodedata.combining(c))
    pattern = r'\b(?:'+'|'.join(re.escape(word) for word in ALIASES)+r')\b'
    selected = None
    for match in re.finditer(pattern, normalized):
        # A mentioned manual/catalogue language is not a requested reply language.
        left = re.split(r'[.;!?\n]', normalized[:match.start()])[-1][-100:]
        clause = re.split(r'[.;!?\n]', normalized[match.end():])[0]
        short_request = len(re.findall(r'\w+', left+match.group()+clause)) <= 5 and (
            re.search(r'\b(?:please|prasau|bitte|prosze|ludzu|palun|пожалуиста)\b', clause)
            or normalized.strip(' .!?') == match.group())
        requests = list(REQUEST.finditer(left))
        negation_scope = left[max(0, requests[-1].start()-18):] if requests else left
        if NEGATIVE.search(negation_scope):
            continue
        if REQUEST.search(left) or short_request:
            selected = ALIASES[match.group()]
    return selected
