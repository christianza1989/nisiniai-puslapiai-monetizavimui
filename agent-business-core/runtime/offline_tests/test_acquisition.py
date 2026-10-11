import json
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx

from pinet_core.acquisition.contracts import Assessment, Campaign, Prospect, Review
from pinet_core.acquisition.engine import daily, gates, prepare
from pinet_core.acquisition.instructions import compose
from pinet_core.acquisition.sources import retrieve

NOW = datetime(2026, 10, 9, 12, tzinfo=UTC)


def fixture():
    future, past = NOW + timedelta(days=10), NOW - timedelta(days=1)
    campaign = Campaign(site_id='synthetic-medical', campaign_id='offline', sector='medical_equipment',
        mode='draft_only', enabled=True, segments=['clinic'], countries=['LT'], expires_at=future,
        facts=[{'id': 'product', 'text': 'Tiekiame modelį TEST laboratorijoms.',
                'source': 'synthetic-approved-catalogue', 'expires_at': future}])
    prospect = Prospect(site_id=campaign.site_id, organization_key='example.test', name='Testinė įstaiga',
        role='buyer', segment='clinic', country='LT', evidence=[{'id': 'need',
            'url': 'https://example.test/pirkimas', 'fact': 'Ieškoma laboratorijos įrangos.',
            'checked_at': past, 'expires_at': future, 'use_allowed': True}])
    return campaign, prospect


class FakeLab:
    def __init__(self, bad=False, fail=False):
        self.calls, self.bad, self.fail = 0, bad, fail

    async def ask(self, schema, instruction, data):
        self.calls += 1
        if self.fail:
            raise TimeoutError('synthetic')
        if schema is Assessment:
            return Assessment(fit='yes', intent='explicit', reasons='Konkretus pirkimas',
                evidence_ids=['need'], next_action='draft', subject='Apie laboratorijos įrangą',
                body='Kokią specifikaciją planuojate?', offer_fact_ids=['product'])
        return Review(factual=not self.bad, relevant=True, one_clear_next_step=True,
            no_unverified_promises=True, no_source_instructions=True, reason='Synthetic evaluator')


class AcquisitionTests(unittest.IsolatedAsyncioTestCase):
    async def test_independent_rejection(self):
        campaign, prospect = fixture()
        result = await prepare(campaign, prospect, FakeLab(bad=True), NOW)
        self.assertEqual(result['state'], 'blocked')
        self.assertFalse(result['external_sent'])

    async def test_gates_cannot_be_offset_by_fit(self):
        campaign, prospect = fixture()
        for change in [{'suppressed': True}, {'site_id': 'foreign'}, {'role': 'supplier'},
                       {'country': 'US'}, {'status': 'ooo'}, {'status': 'uncertain'},
                       {'status': 'replied'}, {'status': 'refused'}, {'status': 'complaint'},
                       {'status': 'bounce'}]:
            candidate = prospect.model_copy(update=change)
            lab = FakeLab()
            self.assertTrue(gates(campaign, candidate, NOW))
            self.assertEqual((await prepare(campaign, candidate, lab, NOW))['state'], 'blocked')
            self.assertEqual(lab.calls, 0)

    async def test_stale_and_future_sources_block(self):
        campaign, prospect = fixture()
        for change in [{'expires_at': NOW}, {'checked_at': NOW + timedelta(days=1)}, {'use_allowed': False}]:
            candidate = prospect.model_copy(update={'evidence': [prospect.evidence[0].model_copy(update=change)]})
            self.assertIn('source_unavailable_or_expired', gates(campaign, candidate, NOW))
        self.assertIn('offer_expired', gates(campaign.model_copy(update={'facts': [
            campaign.facts[0].model_copy(update={'expires_at': NOW})]}), prospect, NOW))

    async def test_daily_replay_and_cross_day_dedup(self):
        campaign, prospect = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root, lab = Path(directory), FakeLab()
            first = await daily(campaign, [prospect], lab, root, NOW)
            self.assertEqual(first['records'][0]['state'], 'draft_ready')
            self.assertEqual(first, await daily(campaign, [prospect], lab, root, NOW))
            self.assertEqual(lab.calls, 2)
            second = await daily(campaign, [prospect], lab, root, NOW + timedelta(days=1))
            self.assertEqual(second['records'][0]['state'], 'duplicate')
            self.assertEqual(lab.calls, 2)

    async def test_uncertain_not_retried_after_restart(self):
        campaign, prospect = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root, lab = Path(directory), FakeLab(fail=True)
            first = await daily(campaign, [prospect], lab, root, NOW)
            self.assertEqual(first['records'][0]['state'], 'uncertain')
            second = await daily(campaign, [prospect], lab, root, NOW)
            self.assertEqual(first, second)
            next_day = await daily(campaign, [prospect], lab, root, NOW + timedelta(days=1))
            self.assertEqual(next_day['records'][0]['state'], 'duplicate')
            self.assertEqual(lab.calls, 1)

    async def test_changed_daily_input_and_lock_fail_closed(self):
        campaign, prospect = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            await daily(campaign, [prospect], FakeLab(), root, NOW)
            with self.assertRaisesRegex(ValueError, 'daily_input_conflict'):
                await daily(campaign, [prospect.model_copy(update={'name': 'Changed'})], FakeLab(), root, NOW)
            lock = root / campaign.site_id / campaign.campaign_id / 'preparation.lock'
            lock.touch()
            with self.assertRaisesRegex(RuntimeError, 'already_running'):
                await daily(campaign, [prospect], FakeLab(), root, NOW)

    async def test_budget_and_audience_dedup(self):
        campaign, prospect = fixture()
        with tempfile.TemporaryDirectory() as directory:
            lab = FakeLab()
            result = await daily(campaign.model_copy(update={'max_model_calls': 1}), [prospect],
                                 lab, Path(directory), NOW)
            self.assertEqual(result['records'][0]['reasons'], ['daily_model_budget'])
            self.assertEqual(lab.calls, 0)
            with self.assertRaisesRegex(ValueError, 'duplicate_organization'):
                await daily(campaign, [prospect, prospect], lab, Path(directory), NOW)

    async def test_research_mode_rejects_draft(self):
        campaign, prospect = fixture()
        lab = FakeLab()
        result = await prepare(campaign.model_copy(update={'mode': 'research_only'}), prospect, lab, NOW)
        self.assertIn('draft_mode_required', result['reasons'])
        self.assertEqual(lab.calls, 1)

    async def test_timezone_day_and_pause(self):
        campaign, prospect = fixture()
        with tempfile.TemporaryDirectory() as directory:
            result = await daily(campaign, [prospect], FakeLab(), Path(directory),
                                 NOW.replace(hour=22, minute=30))
            self.assertEqual(result['day'], '2026-10-10')
            with self.assertRaisesRegex(ValueError, 'campaign_not_active'):
                await daily(campaign.model_copy(update={'paused': True}), [prospect],
                            FakeLab(), Path(directory), NOW)

    async def test_unknown_reference_rejected_before_reviewer(self):
        campaign, prospect = fixture()

        class BadReference(FakeLab):
            async def ask(self, schema, instruction, data):
                result = await super().ask(schema, instruction, data)
                return result.model_copy(update={'offer_fact_ids': ['fictional']})

        lab = BadReference()
        result = await prepare(campaign, prospect, lab, NOW)
        self.assertIn('unknown_offer_reference', result['reasons'])
        self.assertEqual(lab.calls, 1)

    async def test_source_adapter_is_scoped_and_does_not_follow_redirects(self):
        sources = [{'id': 'directory', 'site_id': 'synthetic-medical',
                    'url': 'https://example.test/directory', 'language': 'lt', 'read_allowed': True}]
        calls = []

        async def resolver(host):
            calls.append(host)

        async with httpx.AsyncClient(transport=httpx.MockTransport(
                lambda request: httpx.Response(302, headers={'location': 'https://private.test/'}))) as client:
            receipt = await retrieve('synthetic-medical', sources, client=client, resolver=resolver)
            self.assertEqual(receipt[0]['status'], 'unavailable')
            self.assertFalse(receipt[0]['supplier_contacted'])
            self.assertEqual(calls, ['example.test'])
            with self.assertRaisesRegex(ValueError, 'source_policy'):
                await retrieve('foreign', sources, client=client, resolver=resolver)
            with self.assertRaisesRegex(ValueError, 'source_policy'):
                await retrieve('synthetic-medical', [{**sources[0], 'read_allowed': False}],
                               client=client, resolver=resolver)

    def test_scoped_instruction_hash_and_path_rejection(self):
        self.assertNotEqual(compose()[1], compose('medical_equipment')[1])
        self.assertEqual(compose()[1], compose()[1])
        with self.assertRaises(ValueError):
            compose('../../.env')

    def test_no_live_mode_or_naive_timestamps(self):
        campaign, _ = fixture()
        data = campaign.model_dump(mode='json')
        data['mode'] = 'authorized_contact'
        with self.assertRaises(ValueError):
            Campaign.model_validate(data)
        data['mode'], data['expires_at'] = 'draft_only', '2026-10-10T12:00:00'
        with self.assertRaises(ValueError):
            Campaign.model_validate(data)

    def test_private_receipt_not_fake_received_lead(self):
        campaign, prospect = fixture()
        self.assertNotIn('email', json.dumps(prospect.model_dump(mode='json')))
        self.assertFalse(campaign.paused)


if __name__ == '__main__':
    unittest.main()
