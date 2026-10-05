import asyncio
import copy

import httpx
import pytest

from pinet_core.jev_router import INTENTS, JevShadow, Snapshot, decode, request


def state(tools=('knowledge.resolve',)):
    return Snapshot('akmenas', 3, 2, 'Mano email owner@example.com, telefonas +370 600 00000. Reikia granito.',
        'Anksčiau norėjau marmuro.', tools, True)


def answer(intent='specification'):
    return {'id': 'provider-1', 'answers': {'intent': {'type': 'choice', 'choice': intent,
        'probabilities': {key: int(key == intent) for key in INTENTS}, 'confidence': 0.95},
        'corrects_prior_specification': {'type': 'noul', 'noul': 0.99}}, 'usage': {'cost': 0.000042}}


def test_minimization_and_hints_do_not_expand_authority():
    body = request(state())
    assert 'owner@example.com' not in str(body) and '+370 600 00000' not in str(body)
    result = decode(answer(), state(), 3, 2)
    assert result['suggested_tools'] == ['knowledge.resolve'] and not result['apply']
    assert not result['threshold_verified']
    assert decode(answer(), state(), 4, 2)['status'] == 'dropped_stale_snapshot'
    assert decode(answer(), state(), 3, 3)['status'] == 'dropped_stale_snapshot'


@pytest.mark.parametrize('change', ['unknown_intent', 'nan', 'incomplete', 'wrong_noul', 'bad_sum'])
def test_invalid_provider_decisions_fail_closed(change):
    payload = copy.deepcopy(answer())
    if change == 'unknown_intent':
        payload['answers']['intent']['choice'] = 'send_all_contacts'
    elif change == 'nan':
        payload['answers']['intent']['confidence'] = float('nan')
    elif change == 'incomplete':
        payload['answers']['intent']['probabilities'].pop('unclear')
    elif change == 'bad_sum':
        payload['answers']['intent']['probabilities']['unclear'] = 1
    else:
        payload['answers']['corrects_prior_specification']['noul'] = True
    with pytest.raises(ValueError):
        decode(payload, state(), 3, 2)


async def test_optional_shadow_budget_timeout_and_live_data_gate():
    assert (await JevShadow().observe(state(), lambda: (3, 2)))['status'] == 'not_configured'
    async def handler(req):
        await asyncio.sleep(0.1)
        return httpx.Response(200, json=answer())
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        router = JevShadow(api_key='private-test-key', enabled=True, budget_microusd=3000,
            timeout_seconds=0.02, client=client)
        result = await router.observe(state(), lambda: (3, 2))
        assert result['status'] == 'unavailable' and result['reservation_retained']
        assert (await router.observe(state(), lambda: (3, 2)))['status'] == 'bounded_budget_exhausted'
        real = Snapshot(**{**state().__dict__, 'synthetic': False})
        assert (await router.observe(real, lambda: (3, 2)))['status'] == 'real_data_channel_not_activated'


async def test_success_records_usage_and_stale_results_are_never_applied():
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda req: httpx.Response(200, json=answer()))) as client:
        router = JevShadow(api_key='private-test-key', enabled=True, budget_microusd=3000, client=client)
        result = await router.observe(state(), lambda: (4, 2))
        assert result['status'] == 'dropped_stale_snapshot' and not result['apply']
        assert result['cost_microusd'] == 42 and router.remaining == 2958
