"""Small observable dialogue invariants; never infer consent from model text."""
import re
from decimal import Decimal

REENTER = re.compile(r'galite.{0,20}įvesti|įveskite.{0,35}(?:pašt|telefon)|'
    r'(?:you can|please) (?:now )?(?:enter|provide|submit).{0,45}(?:email|phone|contact)|'
    r'enter your (?:email|phone)|you can enter (?:it|them)\b', re.I)
NEGATED = re.compile(r'nebereikia|nereikia.{0,25}įvesti|do not|don.t|no need|will not ask', re.I)
PHOTO_COUNT = re.compile(r'\b(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)\s+'
    r'(?:(?:strong|clear|real|good|work|kokybišk\w*|tikr\w*|aišk\w*|ger\w*)\s+){0,2}'
    r'(?:photos?\b|images?\b|nuotrauk\w*)', re.I)


def findings(data):
    saved, issues = set(), []
    for event in data.get('timeline', []):
        if event['kind'] in {'contact_ready', 'contact_corrected'}:
            saved.add(event['channel'])
        if event['kind'] != 'agent_transcript' or not saved:
            continue
        for text in re.split(r'[.!?]\s+|\n+', event['text']):
            if not REENTER.search(text) or NEGATED.search(text):
                continue
            mentions = set()
            if re.search(r'pašt|email|e-mail', text, re.I):
                mentions.add('email')
            if re.search(r'telefon|phone', text, re.I):
                mentions.add('phone')
            if not mentions or mentions & saved:
                issues.append({'code': 'saved_contact_reinvited', 'evidence_event_id': event['id'],
                    'description': 'Agent invited entry of a contact already saved before this reply.'})
    # This niche publishes a single starting package reference. Do not derive a
    # general product/service minimum from unrelated guide/example prices.
    if data.get('knowledge', {}).get('site_id') == 'greitossvetaines':
        def normalized(number):
            return re.sub(r'\s+', '', number).replace('–', '-')
        supported = {normalized(number) for text in
            [p['text'] for p in data['knowledge'].get('pages', [])] +
            [e['text'] for e in data.get('evidence', []) if e['speaker'] == 'client']
            for number in PHOTO_COUNT.findall(text)}
        for event in data.get('evidence', []):
            if event['speaker'] != 'agent':
                continue
            for line in event['text'].splitlines():
                required = re.search(r'\bneed(?:ed)?\b|required|requirements|\bmust\b|at least|reikia|prival|būtina', line, re.I)
                excluded = re.search(r'optional|optionally|not needed|not required|do not need|don.t need|no need|nereikia|nebūtina', line, re.I)
                if required and not excluded and any(normalized(n) not in supported for n in PHOTO_COUNT.findall(line)):
                    issues.append({'code': 'unsupported_preparation_photo_requirement', 'evidence_event_id': event['id'],
                        'description': 'Assistant imposed a numeric photo requirement absent from approved sources and client evidence.'})
                    break
        budget = data.get('need', {}).get('budget', {}).get('value', '')
        match = re.fullmatch(r'\s*(\d+(?:[.,]\d+)?)\s*(?:€|eurų|EUR|euros?)\s*', budget, re.I)
        floors = {Decimal(x.replace(',', '.')) for page in data['knowledge'].get('pages', [])
            for x in re.findall(r'\bnuo\s+(\d+(?:[.,]\d+)?)\s*€', page['text'], re.I)}
        requests = [e for e in data.get('evidence', []) if e['speaker'] == 'client' and
            any(re.search(r'galutin.{0,15}kain|final.{0,15}price|biudžet.{0,20}užteks|budget.{0,20}enough', text, re.I)
                and not re.search(r'neprašau|nereikia|nenoriu|do not|don.t|no need', text, re.I)
                for text in re.split(r'[.!?]\s+|\n+|,', e['text']))]
        if match and len(floors) == 1 and requests:
            floor = next(iter(floors))
            if Decimal(match[1].replace(',', '.')) < floor:
                number = format(floor, 'f').rstrip('0').rstrip('.') if '.' in format(floor, 'f') else str(floor)
                clarified = any(re.search(r'(?<!\d)' + re.escape(number) + r'\s*(?:€|EUR|eurų)', e['text'], re.I)
                    for e in data['evidence'] if e['speaker'] == 'agent')
                if not clarified:
                    issues.append({'code': 'published_starting_reference_not_clarified',
                        'evidence_event_id': requests[-1]['id'], 'approved_starting_reference_eur': str(floor),
                        'description': 'Client budget is below the approved published starting reference, '
                            'but a requested price discussion did not clarify that reference.'})
    return issues


def reconcile(result, data):
    observed = findings(data)
    if not observed:
        return result
    refs = list(dict.fromkeys(result.get('evidence_event_ids', []) + [x['evidence_event_id'] for x in observed]))
    return {**result, 'model_assessment': result, 'outcome': 'needs_review',
        'issues': list(dict.fromkeys(result.get('issues', []) + [x['description'] for x in observed])),
        'root_cause': 'communication', 'suggested_scope': 'contact_invitation' if any(
            x['code'] == 'saved_contact_reinvited' for x in observed) else 'clarification',
        'improvement_hint': (result.get('improvement_hint') if result.get('issues') and result.get('root_cause') == 'communication' else '') or
            ('Acknowledge the already saved channel; do not invite the customer to enter that contact again.'
                if any(x['code'] == 'saved_contact_reinvited' for x in observed) else
                'Use approved preparation requirements; do not impose numeric photo minima or ranges absent from sources. '
                'Distinguish optional gallery expansion from what is needed to start.'
                if any(x['code'] == 'unsupported_preparation_photo_requirement' for x in observed) else
                'Retrieve current approved starting-package information before comparing a client budget or discussing price.'),
        'evidence_event_ids': refs, 'observable_guards': observed}
