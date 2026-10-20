"""Construction graph policy. No transport or inferred transitions."""
import hashlib
import json

VERSION = 'original-variant-structure-only-v1'


def structural(field):
    return field.rsplit('.', 1)[0].endswith(('_OPTIONS', '_DIMENSIONS'))


def state_key(state):
    # FINISHES must remain part of identity: construction can change them
    # implicitly. Merging those states would lose real dependencies/PBR.
    tracked = {k: v for k, v in state['properties'].items()
               if k.rsplit('.', 1)[0].endswith(('_OPTIONS', '_DIMENSIONS', '_FINISHES'))}
    signature = {'article': state['baseArticle'],
                 'properties': {k: {p: v.get(p) for p in ('value', 'visible', 'editable')} for k, v in tracked.items()},
                 'choices': {k: [(v['value'], v.get('selectable', True)) for v in values]
                             for k, values in state['choices'].items() if k in tracked}}
    return hashlib.sha256(json.dumps(signature, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def frontier(state):
    edges, unresolved = [], []
    for field, prop in state['properties'].items():
        if not structural(field) or not prop.get('visible') or not prop.get('editable'):
            continue
        if field not in state['choices']:
            unresolved.append({'field': field, 'reason': 'NO_PROVEN_FINITE_DOMAIN', 'value': prop.get('value')})
            continue
        seen = set()
        for option in state['choices'][field]:
            value = option['value']
            if option.get('selectable', True) and value != prop.get('value') and value not in seen:
                edges.append((field, value))
                seen.add(value)
    return edges, unresolved


def require_transition(state, field, value):
    if not structural(field):
        raise ValueError('FINISHES_OR_NONCONSTRUCTION_SETTER_FORBIDDEN')
    if (field, value) not in frontier(state)[0]:
        raise ValueError('NOT_AN_OBSERVED_SELECTABLE_CONSTRUCTION_VALUE')


def finish_changes(before, after):
    keys = set(before['properties']) | set(after['properties'])
    return {k: {'before': before['properties'].get(k, {}).get('value'),
                'after': after['properties'].get(k, {}).get('value')}
            for k in sorted(keys) if k.rsplit('.', 1)[0].endswith('_FINISHES')
            and before['properties'].get(k, {}).get('value') != after['properties'].get(k, {}).get('value')}


def closure(checkpoint, states):
    missing, dimensions = [], []
    if not checkpoint.get('initial') or checkpoint['initial'] not in states:
        return {'closed': False, 'missingInitial': True, 'missingEdges': [], 'unresolvedDimensions': []}
    measured = {(e['from'], e['field'], e['requested']) for e in checkpoint['edges']
                if e.get('measured') is True and e.get('to') in states and e.get('wireProof')}
    reachable = {checkpoint['initial']}
    while True:
        discovered = {e['to'] for e in checkpoint['edges'] if e['from'] in reachable
                      and e.get('measured') is True and e.get('wireProof') and e.get('to') in states}
        if discovered <= reachable:
            break
        reachable |= discovered
    for key in sorted(reachable):
        state = states[key]
        if key != state_key(state):
            raise ValueError('SOURCE_STATE_IDENTITY_CHANGED')
        edges, unresolved = frontier(state)
        dimensions.extend(dict(state=key, **v) for v in unresolved)
        missing.extend({'from': key, 'field': f, 'requested': v} for f, v in edges if (key, f, v) not in measured)
    forbidden = [e for e in checkpoint['edges'] if not structural(e['field'])]
    return {'closed': not (missing or dimensions or forbidden), 'reachableStates': len(reachable),
            'missingEdges': missing, 'unresolvedDimensions': dimensions, 'forbiddenEdges': forbidden,
            'acceptance': False, 'note': 'Graph closure alone is not geometry/PBR/runtime/text acceptance.'}
