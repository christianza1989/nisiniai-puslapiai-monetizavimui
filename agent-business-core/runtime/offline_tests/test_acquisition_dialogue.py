import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from pinet_core.acquisition.contracts import Assessment, Campaign, Review
from pinet_core.acquisition.dialogue import ReplyDecision, prepare_reply, reply_blocks
from pinet_core.acquisition.dialogue_corpus import corpus
from pinet_core.acquisition.dialogue_lab import (
    DialogueGrade,
    LabCase,
    RecipientTurn,
    SharedBudget,
    diverse_subset,
    run_case,
    validate_synthetic,
)
from pinet_core.acquisition.engine import gates


class FakeLab:
    def __init__(self, classification='refusal', event='reply', bad_grade=False):
        self.calls, self.inputs = 0, []
        self.classification, self.event, self.bad_grade = classification, event, bad_grade

    async def ask(self, schema, instruction, data):
        self.calls += 1
        self.inputs.append(data)
        if schema is Assessment:
            return Assessment(fit='yes', intent='possible', reasons='Tikra testinė paslauga',
                evidence_ids=['public'], next_action='draft', subject='Kvietimas',
                body='Siūlome nemokamą testinį profilį. Jei neaktualu, praneškite.', offer_fact_ids=['pilot'])
        if schema is Review:
            return Review(factual=True, relevant=True, one_clear_next_step=True,
                no_unverified_promises=True, no_source_instructions=True, reason='Testinė peržiūra')
        if schema is RecipientTurn:
            return RecipientTurn(event=self.event, body='Prašau daugiau nerašyti.' if self.event == 'reply' else '',
                                 finished=False)
        if schema is ReplyDecision:
            action = 'stop' if self.classification in {'refusal', 'complaint'} else 'hold'
            return ReplyDecision(classification=self.classification, action=action, subject='', body='',
                                 offer_fact_ids=[], reason='Testinis sustabdymas')
        return DialogueGrade(factual=not self.bad_grade, appropriate=True, respects_stop=True,
            follows_corrected_need=True, no_false_activation=True, reason='Testinis vertintojas')


def fixture(archetype='refusal'):
    data = corpus()
    case = next(c for c in data['cases'] if c['id'] == f'{archetype}-nails-company')
    return Campaign.model_validate(data['campaign']), LabCase.model_validate(case), datetime.fromisoformat(data['now'])


class DialogueTests(unittest.IsolatedAsyncioTestCase):
    def test_matrix_unique_and_broad(self):
        data = corpus()
        self.assertEqual(len(data['cases']), 400)
        self.assertEqual(len({c['id'] for c in data['cases']}), 400)
        self.assertFalse(data['blind_holdout'])

    def test_public_prospect_does_not_encode_archetype_labels(self):
        data = corpus()
        for case in data['cases']:
            archetype = case['id'].rsplit('-', 2)[0]
            # Case IDs/rubric stay in runner; public identifiers use neutral hashes.
            self.assertTrue(case['prospect']['organization_key'].startswith('org-'))
            self.assertNotIn(case['id'], json.dumps(case['prospect']))
            self.assertNotIn(archetype, case['recipient'])

    def test_provider_and_buyer_scope(self):
        campaign, case, now = fixture()
        self.assertFalse(gates(campaign, case.prospect, now))
        buyer_campaign = campaign.model_copy(update={'objective': 'product_sale'})
        self.assertIn('non_target_role', gates(buyer_campaign, case.prospect, now))

    def test_default_selection_covers_distinct_archetypes_and_contexts(self):
        cases = [LabCase.model_validate(case) for case in corpus()['cases']]
        selected = diverse_subset(cases, 6)
        self.assertEqual(len({case.archetype for case in selected}), 6)
        self.assertEqual(len({case.prospect.segment for case in selected}), 6)
        self.assertEqual(len({case.entity_context for case in selected}), 2)

    def test_external_recipient_and_source_rejected(self):
        campaign, case, _ = fixture()
        with self.assertRaisesRegex(ValueError, 'test_recipient'):
            validate_synthetic(campaign, case.model_copy(update={'recipient': 'lab@example.com'}))
        evidence = case.prospect.evidence[0].model_copy(update={'url': 'https://example.com'})
        prospect = case.prospect.model_copy(update={'evidence': [evidence]})
        with self.assertRaisesRegex(ValueError, 'test_evidence'):
            validate_synthetic(campaign, case.model_copy(update={'prospect': prospect}))

    def test_stop_cannot_contain_reply_or_offer_unknown(self):
        campaign, _, _ = fixture()
        decision = ReplyDecision(classification='refusal', action='reply', subject='Kvietimas', body='Dar kartą',
                                 offer_fact_ids=['unknown'], reason='Blogas sprendimas')
        self.assertEqual(set(reply_blocks(campaign, decision)), {'stop_required', 'unknown_offer_reference'})

    def test_shared_budget(self):
        budget = SharedBudget(1)
        budget.reserve()
        with self.assertRaises(RuntimeError):
            budget.reserve()

    def test_source_only_information_reply_and_invite_are_distinct(self):
        campaign, case, _ = fixture('privacy')
        decision = ReplyDecision(classification='question', action='reply', subject='Apie šaltinį',
            body='Veiklos faktas patikrintame šaltinyje; saugojimo tvarka nepatvirtinta.',
            offer_fact_ids=[], evidence_ids=['public'], reason='Informacinis atsakymas')
        self.assertFalse(reply_blocks(campaign, decision, case.prospect))
        invite = decision.model_copy(update={'action': 'invite'})
        self.assertIn('invite_offer_required', reply_blocks(campaign, invite, case.prospect))

    def test_foreign_source_reference_cannot_support_reply(self):
        campaign, case, _ = fixture('privacy')
        decision = ReplyDecision(classification='question', action='reply', subject='Apie šaltinį',
            body='Nepatvirtintas šaltinis.', offer_fact_ids=[], evidence_ids=['foreign'], reason='Blogas šaltinis')
        self.assertIn('unknown_evidence_reference', reply_blocks(campaign, decision, case.prospect))

    def test_requested_privacy_reply_preserves_optout_and_cannot_cite_offer(self):
        campaign, case, _ = fixture('privacy-optout')
        inbound = 'Daugiau reklamos nenoriu. Iš kur turite mano kontaktą?'
        decision = ReplyDecision(classification='refusal', action='privacy_reply', subject='Kontakto kilmė',
            body='Veiklos šaltinis patikrintas, tiksli adreso kilmė nežinoma.', evidence_ids=['public'],
            offer_fact_ids=[], privacy_request_quote='Iš kur turite mano kontaktą?', reason='Tik prašyta informacija')
        self.assertFalse(reply_blocks(campaign, decision, case.prospect, inbound))
        self.assertIn('privacy_request_evidence_required', reply_blocks(campaign, decision, case.prospect, 'Neaktualu'))
        promotional = decision.model_copy(update={'offer_fact_ids': ['pilot']})
        self.assertIn('privacy_reply_must_be_source_only', reply_blocks(campaign, promotional, case.prospect, inbound))

    def test_cli_protected_corpus_seal_before_any_model_call(self):
        data = corpus()
        data['cases'] = data['cases'][:1]
        data['cases'][0]['split'] = 'holdout'
        with tempfile.TemporaryDirectory() as directory:
            input_path, seal = Path(directory) / 'private.json', Path(directory) / 'seal.json'
            input_path.write_text(json.dumps(data), encoding='utf-8')
            seal.write_text(json.dumps({'corpus_sha256': hashlib.sha256(input_path.read_bytes()).hexdigest()}),
                            encoding='utf-8')
            runtime = Path(__file__).resolve().parents[1]
            command = [sys.executable, str(runtime / 'scripts/acquisition_dialogue_lab.py'),
                       '--corpus', str(input_path), '--seal', str(seal), '--list']
            result = subprocess.run(command, capture_output=True, text=True, timeout=20, cwd=runtime)
            self.assertEqual(result.returncode, 0, result.stderr)
            input_path.write_text(json.dumps(data) + '\n', encoding='utf-8')
            result = subprocess.run(command, capture_output=True, text=True, timeout=20, cwd=runtime)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('protected_corpus_changed', result.stderr)

    async def test_refusal_captures_once_no_label_leak_no_poststop_calls(self):
        campaign, case, now = fixture()
        agent, persona, evaluator = FakeLab(), FakeLab(), FakeLab()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'case'
            row = await run_case(campaign, case, agent, persona, evaluator, root, now)
            self.assertTrue(row['passed'])
            self.assertEqual(len(list(root.glob('*.eml'))), 1)
            self.assertEqual(agent.calls, 3)
            self.assertTrue(any(e['kind'] == 'post_stop_guard' for e in row['events'] if 'kind' in e))
            for data in agent.inputs:
                self.assertNotIn('persona', data)
                self.assertNotIn('case', data)
                self.assertNotIn('expected_classifications', data)

    async def test_no_consent_never_capture(self):
        campaign, case, now = fixture('personal-no-consent')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'case'
            row = await run_case(campaign, case, FakeLab(), FakeLab(), FakeLab(), root, now)
            self.assertTrue(row['passed'])
            self.assertFalse(list(root.glob('*.eml')))

    async def test_silence_has_no_followup(self):
        campaign, case, now = fixture('silence')
        agent = FakeLab()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'case'
            row = await run_case(campaign, case, agent, FakeLab(event='silence'), FakeLab(), root, now)
            self.assertTrue(row['passed'])
            self.assertEqual(agent.calls, 2)
            self.assertEqual(len(list(root.glob('*.eml'))), 1)

    async def test_evaluator_failure_retained(self):
        campaign, case, now = fixture()
        with tempfile.TemporaryDirectory() as directory:
            row = await run_case(campaign, case, FakeLab(), FakeLab(), FakeLab(bad_grade=True),
                                 Path(directory) / 'case', now)
            self.assertFalse(row['passed'])
            self.assertEqual(row['failure'], 'dialogue_quality_or_classification')

    async def test_label_mismatch_stays_fail_and_identifies_oracle_investigation(self):
        campaign, case, now = fixture('privacy')
        with tempfile.TemporaryDirectory() as directory:
            row = await run_case(campaign, case, FakeLab(), FakeLab(), FakeLab(),
                                 Path(directory) / 'case', now)
            self.assertFalse(row['passed'])
            self.assertEqual(row['failure'], 'scenario_expectation_mismatch')

    async def test_suppression_and_expired_facts_no_calls(self):
        campaign, case, now = fixture()
        lab = FakeLab()
        result = await prepare_reply(campaign, case.prospect, [], lab, now, suppressed=True)
        self.assertEqual(result['state'], 'stop')
        campaign = campaign.model_copy(update={'expires_at': now})
        result = await prepare_reply(campaign, case.prospect, [], lab, now)
        self.assertEqual(result['state'], 'blocked')
        self.assertEqual(lab.calls, 0)

    def test_unknown_publication_privacy_handoff_is_bound_and_has_no_outbound(self):
        campaign, case, _ = fixture('privacy-optout')
        inbound = 'Prisijungimo nesvarstysime. Ar mūsų pavadinimas paskelbtas? Jei taip, pašalinkite.'
        decision = ReplyDecision(classification='refusal', action='privacy_handoff', subject='', body='',
            offer_fact_ids=[], privacy_request_quote='Ar mūsų pavadinimas paskelbtas? Jei taip, pašalinkite.',
            reason='Publikavimo būsena nepatvirtinta; būtinas operatorius, ne atlikto veiksmo pažadas')
        self.assertFalse(reply_blocks(campaign, decision, case.prospect, inbound))
        self.assertIn('privacy_request_evidence_required',
                      reply_blocks(campaign, decision, case.prospect, 'Neaktualu'))
        for change in ({'body':'Pašalinome.'}, {'subject':'Patvirtiname'},
                       {'offer_fact_ids':['pilot']}, {'evidence_ids':['public']}):
            with self.subTest(change=change):
                self.assertIn('privacy_handoff_must_have_no_outbound',
                    reply_blocks(campaign, decision.model_copy(update=change), case.prospect, inbound))
        self.assertIn('privacy_handoff_classification_required', reply_blocks(campaign,
            decision.model_copy(update={'classification':'interest'}), case.prospect, inbound))

    async def test_blocked_privacy_reply_still_requires_marketing_suppression(self):
        campaign, case, now = fixture('privacy-optout')
        inbound = 'Nenoriu prisijungti. Patikrinkite ar mano pavadinimas paskelbtas.'

        class UnsupportedPrivacy(FakeLab):
            async def ask(self, schema, instruction, data):
                self.calls += 1
                return ReplyDecision(classification='refusal', action='privacy_reply',
                    subject='Apie publikavimą', body='Neturime patvirtintų duomenų apie publikavimą.',
                    offer_fact_ids=[], evidence_ids=[], privacy_request_quote=inbound,
                    reason='Atkurta tikro modelio nesėkmė')

        result = await prepare_reply(campaign, case.prospect, [{'role':'recipient','body':inbound}],
                                     UnsupportedPrivacy(), now)
        self.assertEqual(result['state'], 'blocked')
        self.assertIn('privacy_reply_must_be_source_only', result['reasons'])
        self.assertTrue(result['marketing_suppression_required'])
        self.assertFalse(result['external_sent'])

    async def test_privacy_handoff_captures_no_reply_and_stop_guard_runs_without_model(self):
        campaign, case, now = fixture('privacy-optout')
        request = 'Daugiau nerašykite. Ar mano pavadinimas viešinamas? Jei taip, pašalinkite.'

        class HandoffLab(FakeLab):
            async def ask(self, schema, instruction, data):
                if schema is ReplyDecision:
                    self.calls += 1
                    return ReplyDecision(classification='refusal', action='privacy_handoff',
                        subject='',body='',offer_fact_ids=[], privacy_request_quote=request,
                        reason='Reikia patikrinti nežinomą operacinę būseną')
                return await super().ask(schema, instruction, data)

        class RequestPersona(FakeLab):
            async def ask(self, schema, instruction, data):
                self.calls += 1
                return RecipientTurn(event='reply',body=request,finished=True)

        agent = HandoffLab()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'case'
            row = await run_case(campaign,case,agent,RequestPersona(),FakeLab(),root,now)
            self.assertTrue(row['passed'])
            self.assertEqual(len(list(root.glob('*.eml'))),1)
            self.assertEqual(agent.calls,3)
            handoff = next(e for e in row['events'] if e.get('kind')=='privacy_handoff_required')
            self.assertEqual(handoff['request_quote'],request)
            self.assertFalse(handoff['handoff_executed'])
            self.assertTrue(any(e.get('kind')=='suppressed' for e in row['events']))
            guard = next(e for e in row['events'] if e.get('kind')=='post_stop_guard')
            self.assertEqual(guard['state'],'stop')

    async def test_informational_privacy_handoff_holds_without_inventing_optout(self):
        campaign, case, now = fixture('privacy')
        request = 'Ar mano pavadinimas jau paskelbtas jūsų platformoje?'

        class QuestionHandoff(FakeLab):
            async def ask(self,schema,instruction,data):
                self.calls += 1
                return ReplyDecision(classification='question',action='privacy_handoff',
                    subject='',body='',offer_fact_ids=[],privacy_request_quote=request,
                    reason='Operacinė būsena nežinoma, reikia operatoriaus patikros')

        result = await prepare_reply(campaign,case.prospect,[{'role':'recipient','body':request}],
                                     QuestionHandoff(),now)
        self.assertEqual(result['state'],'privacy_handoff')
        self.assertTrue(result['marketing_hold_required'])
        self.assertFalse(result['marketing_suppression_required'])

    async def test_lab_retains_suppression_when_privacy_reply_is_blocked(self):
        campaign,case,now=fixture('privacy-optout')
        request='Daugiau nerašykite. Patikrinkite mano pavadinimo publikavimą.'

        class BlockedReply(FakeLab):
            async def ask(self,schema,instruction,data):
                if schema is ReplyDecision:
                    self.calls+=1
                    return ReplyDecision(classification='refusal',action='privacy_reply',
                        subject='Apie būseną',body='Būsena nežinoma.',offer_fact_ids=[],
                        evidence_ids=[],privacy_request_quote=request,reason='Originali blocked situacija')
                return await super().ask(schema,instruction,data)

        class RequestPersona(FakeLab):
            async def ask(self,schema,instruction,data):
                self.calls+=1
                return RecipientTurn(event='reply',body=request,finished=True)

        agent=BlockedReply()
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'case'
            row=await run_case(campaign,case,agent,RequestPersona(),FakeLab(),root,now)
            self.assertFalse(row['passed'])
            self.assertEqual(row['state'],'incomplete')
            self.assertEqual(len(list(root.glob('*.eml'))),1)
            self.assertEqual(agent.calls,3)
            self.assertTrue(any(e.get('kind')=='suppressed' for e in row['events']))
            self.assertTrue(any(e.get('kind')=='post_stop_guard' for e in row['events']))

    async def test_retained_refusal_or_complaint_cannot_be_reset_to_new_for_reply(self):
        campaign,case,now=fixture()
        for status in ('refused','complaint'):
            with self.subTest(status=status):
                lab=FakeLab()
                result=await prepare_reply(campaign,case.prospect.model_copy(update={'status':status}),
                    [{'role':'recipient','body':'Pakartotinis ankstesnio laiško gavimas.'}],lab,now)
                self.assertEqual(result['state'],'stop')
                self.assertEqual(lab.calls,0)
                self.assertTrue(result['marketing_suppression_required'])

    def test_conditional_future_contact_requires_bound_quote_and_no_outbound(self):
        campaign,case,_=fixture()
        inbound='Galite parašyti kai turėsite patvirtintas kainas ir komisinius.'
        decision=ReplyDecision(classification='interest',action='hold',subject='',body='',
            offer_fact_ids=[],resume_condition_quote=inbound,reason='Sąlyginis ateities kontaktas')
        self.assertFalse(reply_blocks(campaign,decision,case.prospect,inbound))
        for quote in ('','Svetimas prašymas'):
            with self.subTest(quote=quote):
                self.assertIn('resume_condition_evidence_required',reply_blocks(campaign,
                    decision.model_copy(update={'resume_condition_quote':quote}),case.prospect,inbound))
        self.assertIn('conditional_hold_must_not_claim_outbound_facts',reply_blocks(campaign,
            decision.model_copy(update={'offer_fact_ids':['pilot']}),case.prospect,inbound))
        self.assertIn('stopped_sequence_has_text',reply_blocks(campaign,
            decision.model_copy(update={'body':'Dar kartą kviečiame.'}),case.prospect,inbound))
        self.assertIn('unexpected_resume_condition_quote',reply_blocks(campaign,
            decision.model_copy(update={'action':'stop'}),case.prospect,inbound))

    async def test_conditional_hold_records_exact_condition_and_captures_no_reply(self):
        campaign,case,now=fixture('price')
        case=case.model_copy(update={'expected_classifications':['interest']})
        request='Galite parašyti tik kai turėsite patvirtintas kainas ir komisinius.'

        class HoldLab(FakeLab):
            async def ask(self,schema,instruction,data):
                if schema is ReplyDecision:
                    self.calls+=1
                    return ReplyDecision(classification='interest',action='hold',subject='',body='',
                        offer_fact_ids=[],resume_condition_quote=request,reason='Sąlyginis leidimas')
                return await super().ask(schema,instruction,data)

        class RequestPersona(FakeLab):
            async def ask(self,schema,instruction,data):
                self.calls+=1
                return RecipientTurn(event='reply',body=request,finished=True)

        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'case'
            row=await run_case(campaign,case,HoldLab(),RequestPersona(),FakeLab(),root,now)
            self.assertTrue(row['passed'])
            self.assertEqual(len(list(root.glob('*.eml'))),1)
            held=next(e for e in row['events'] if e.get('kind')=='held')
            self.assertEqual(held['resume_condition_quote'],request)
            self.assertFalse(held['resume_authorized'])
            response=next(e for e in row['events'] if e.get('kind')=='reply_decision')
            self.assertTrue(response['marketing_hold_required'])


if __name__ == '__main__':
    unittest.main()
