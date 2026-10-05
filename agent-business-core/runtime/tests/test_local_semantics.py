from pinet_core.local_semantics import evaluate


def data():
    return {'knowledge': {'site_id': 'greitossvetaines', 'deployment_id': 'approved',
        'knowledge_revision': 1, 'canonical_host': 'greitossvetaines.lt', 'pages': []},
        'evidence': [{'id': 'client', 'speaker': 'client', 'text': 'Prašau sąrašo.'}],
        'need': {}, 'coverage': 'complete', 'release_hash': 'release', 'language_hint': None,
        'timeline': [], 'contact_channels': ['email'], 'actual_core_followup': None}


class Lab:
    def __init__(self, reject_once=False):
        self.calls, self.usage, self.timeout_recoveries = 0, [], []
        self.reject_once = reject_once
        self.inputs = []

    async def ask(self, schema, instruction, payload):
        self.calls += 1
        self.inputs.append(payload)
        if 'approved' in schema.model_fields:
            bad = self.reject_once and self.calls == 2
            return schema(approved=not bad, unsupported_claims=['unsupported action'] if bad else [])
        if 'summary' in schema.model_fields:
            return schema(summary='Poreikis', requested_next_step='Paruošti sąrašą', missing_information=[],
                evidence_event_ids=['client'], subject='Jūsų pasiruošimo sąrašas',
                body='Sveiki. Turėkite tikrų darbų nuotraukas ir paslaugų sąrašą. MB Pinet')
        return schema(outcome='needs_review', issues=['Email missed requested checklist'],
            evidence_event_ids=['client'], improvement_hint='Include the agreed comparison criteria in the email.',
            root_cause='communication', suggested_scope='clarification')


async def test_local_analysis_corrects_rejected_draft_and_binds_review():
    lab = Lab(reject_once=True)
    result = await evaluate('analysis', data(), lab)
    assert result['cli_calls'] == 4
    assert len(result['followup_corrections']) == 1
    assert result['validated_followup']['review']['approved'] is True
    assert result['validated_followup']['evidence_ids'] == ['client']
    assert lab.inputs[2]['corrections'][0]['issues'] == ['unsupported action']


async def test_local_quality_receives_actual_email_without_contact_value():
    payload = data()
    payload['actual_core_followup'] = {'body': 'Sveiki. Bendrinė santrauka.'}
    lab = Lab()
    result = await evaluate('quality', payload, lab)
    assert result['issues'] == ['Email missed requested checklist']
    assert lab.inputs[0]['actual_core_followup'] == payload['actual_core_followup']
    assert lab.inputs[0]['contact_channels'] == ['email']
    assert result['release_hash'] == 'release'
