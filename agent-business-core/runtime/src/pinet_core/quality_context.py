"""Trusted receipt projections and independent root-cause attribution."""
from typing import Literal

from pydantic import Field

from .contracts import Strict
from .evidence_output import bound_schema


def contact_states(data):
    saved, shown, states = set(), set(), []
    for event in data.get('timeline', []):
        if event['kind'] in {'contact_ready', 'contact_corrected'}:
            saved.add(event['channel'])
        elif event['kind'] == 'ui_ack' and event['state'] == 'shown':
            shown.add(event['request_id'])
        elif event['kind'] == 'agent_transcript':
            states.append({'agent_event_id': event['id'], 'channels_saved_before_reply': sorted(saved),
                'form_shown_before_reply': bool(shown)})
    return states


CONTACT_INSTRUCTION = (
    '\ncontact_states are computed by the server from chronological receipts. They take precedence '
    'over guesses from wording. A saved email channel before an agent reply supports acknowledging '
    'receipt of the ADDRESS. "Received your email" can refer to that address, not an incoming message '
    'or delivered outgoing email. Do not report missing contact submission when this receipt exists. '
    'A shown form alone never proves a saved contact, and a later receipt cannot justify an earlier reply.')


class Attribution(Strict):
    root_cause: Literal['communication', 'knowledge', 'tool', 'transport', 'transcription', 'unknown']
    suggested_scope: Literal['clarification', 'turn_taking', 'contact_invitation'] | None
    evidence_event_ids: list[str] = Field(max_length=40)
    explanation: str = Field(max_length=1000)


async def attribute(lab, result, data):
    if result.get('root_cause') != 'knowledge' or not result.get('issues'):
        return result
    assessment = await lab.ask(bound_schema(Attribution, data),
        'Independently classify the cause of the already reported defect. Do not change its score, '
        'outcome or issues. Knowledge means approved sources are missing, incorrect or insufficient '
        'and require editorial correction. Communication means the assistant invented a requirement, '
        'number or claim despite adequate approved information; that calls for a behavior change, '
        'not publication of a new business fact. Tool failures belong to tool/transport. Use only '
        'supplied transcript evidence IDs. If knowledge is genuinely missing, keep knowledge and no scope.',
        {'quality': result, 'knowledge': data['knowledge'], 'evidence': data['evidence'],
            'need': data['need'], 'contact_states': contact_states(data),
            'actual_core_followup': data.get('actual_core_followup')})
    return {**result, 'model_assessment': result, 'root_cause': assessment.root_cause,
        'suggested_scope': assessment.suggested_scope,
        'root_cause_attribution': assessment.model_dump()}
