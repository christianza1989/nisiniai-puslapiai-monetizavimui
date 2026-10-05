from pinet_core.quality_context import attribute, contact_states


def test_server_receipts_distinguish_shown_saved_and_future_contact():
    data = {'timeline': [{'kind': 'agent_transcript', 'id': 'before'},
        {'kind': 'ui_ack', 'state': 'shown', 'request_id': 'popup'},
        {'kind': 'agent_transcript', 'id': 'shown'},
        {'kind': 'contact_ready', 'channel': 'email'},
        {'kind': 'agent_transcript', 'id': 'saved'},
        {'kind': 'contact_ready', 'channel': 'phone'}]}
    assert contact_states(data) == [
        {'agent_event_id': 'before', 'channels_saved_before_reply': [], 'form_shown_before_reply': False},
        {'agent_event_id': 'shown', 'channels_saved_before_reply': [], 'form_shown_before_reply': True},
        {'agent_event_id': 'saved', 'channels_saved_before_reply': ['email'], 'form_shown_before_reply': True}]


async def test_cause_adjudication_routes_behavior_without_hiding_the_original_failure():
    class Lab:
        async def ask(self, schema, instruction, data):
            return schema(root_cause='communication', suggested_scope='clarification',
                evidence_event_ids=['agent'], explanation='Source already supplies sufficient preparation information.')
    raw = {'outcome': 'needs_review', 'issues': ['Invented photo minimum'], 'root_cause': 'knowledge',
        'suggested_scope': 'clarification', 'improvement_hint': 'Use current approved preparation requirements.',
        'evidence_event_ids': ['agent']}
    data = {'knowledge': {}, 'evidence': [{'id': 'agent', 'speaker': 'agent', 'text': 'You need twenty photos.'}], 'need': {}}
    actual = await attribute(Lab(), raw, data)
    assert actual['root_cause'] == 'communication'
    assert actual['outcome'] == raw['outcome'] and actual['issues'] == raw['issues']
    assert actual['model_assessment'] == raw


async def test_real_missing_sources_remain_editorial_review():
    class Lab:
        async def ask(self, schema, instruction, data):
            return schema(root_cause='knowledge', suggested_scope=None,
                evidence_event_ids=['client'], explanation='No approved source contains this fact.')
    raw = {'outcome': 'needs_review', 'issues': ['Missing approved fact'], 'root_cause': 'knowledge'}
    data = {'knowledge': {'pages': []}, 'evidence': [{'id': 'client', 'speaker': 'client', 'text': 'Do you stock this model?'}], 'need': {}}
    actual = await attribute(Lab(), raw, data)
    assert actual['root_cause'] == 'knowledge' and actual['suggested_scope'] is None
