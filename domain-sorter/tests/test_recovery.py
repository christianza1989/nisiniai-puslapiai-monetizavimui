import csv
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from classifier import Options, Store, run, response_schema, validate_items, signature_for
from codex_provider import CodexError, validate_with_recovery
from test_classifier import item


def raw(index, **overrides):
    value = item(index, **overrides)
    return {key:value[key] for key in response_schema('screen')['properties']['items']['items']['required']}


def validator(response, batch):
    return validate_items(response,batch,'screen')


class RecoveryTests(unittest.TestCase):
    def test_valid_members_survive_one_invalid_field_and_keep_correct_association(self):
        batch = [(0,'padangos.lt'),(1,'bad.lt'),(2,'statyba.lt')]
        response = {'items':[raw(0),raw(1,w='X'*161),raw(2)]}
        accepted, reason = validate_with_recovery(response,batch,validator)
        self.assertIsNotNone(reason)
        self.assertEqual([value['domain'] for value in accepted],['padangos.lt','statyba.lt'])

    def test_duplicate_unknown_and_boolean_ids_are_never_recovered(self):
        batch = [(0,'bad.lt'),(1,'padangos.lt')]
        response = {'items':[raw(0),raw(0),raw(1),raw(99),raw(False)]}
        accepted, reason = validate_with_recovery(response,batch,validator)
        self.assertIsNotNone(reason)
        self.assertEqual([value['domain'] for value in accepted],['padangos.lt'])

    def test_missing_id_stays_pending_and_unexpected_wrapper_is_rejected(self):
        batch = [(0,'padangos.lt'),(1,'statyba.lt')]
        accepted, reason = validate_with_recovery({'items':[raw(0)]},batch,validator)
        self.assertEqual([value['domain'] for value in accepted],['padangos.lt'])
        self.assertIsNotNone(reason)
        accepted, reason = validate_with_recovery({'items':[raw(0)],'extra':'instruction'},batch,validator)
        self.assertEqual(accepted,[])
        self.assertIsNotNone(reason)

    def test_partial_recovery_does_not_retry_valid_domains_and_resume_only_retries_bad_one(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root/'raw.txt'
            source.write_text('bad.lt\npadangos.lt\nstatyba.lt\nstogai.lt\nlangai.lt\n',encoding='utf-8')
            calls = []
            info = {'model':'test','input':1,'output':1,'cost':0,'cost_source':'test','id':'',
                    'failure_kind':'validation'}
            def classify(batch):
                calls.extend(domain for _,domain in batch)
                response = {'items':[raw(index,w='X'*161) if domain=='bad.lt' else raw(index)
                                     for index,domain in batch]}
                accepted, reason = validate_with_recovery(response,batch,validator)
                return accepted,info,reason
            options = Options(input=source,output=root/'result.xls',model='test',stage='screen',
                              batch_size=100,workers=1)
            with patch('classifier.CodexCLI') as cli:
                cli.return_value.classify.side_effect = classify
                result = run(options,report=lambda _:None)
            self.assertEqual(result['status'],'partial')
            self.assertEqual(result['categorized'],4)
            self.assertEqual([value['domain'] for value in result['deferred_domains']],['bad.lt'])
            for domain in ('padangos.lt','statyba.lt','stogai.lt','langai.lt'):
                self.assertEqual(calls.count(domain),1)
            with (root/'domenai_laukia_ai.csv').open(encoding='utf-8-sig',newline='') as handle:
                pending = list(csv.DictReader(handle,delimiter=';'))
            self.assertEqual([row['Domenas'] for row in pending],['bad.lt'])
            store = Store(root/'analysis.sqlite3')
            self.assertNotIn('bad.lt',store.load(signature_for('test','screen')))
            store.close()
            resumed = []
            def repaired(batch):
                resumed.extend(domain for _,domain in batch)
                return validator({'items':[raw(index) for index,_ in batch]},batch),info,None
            with patch('classifier.CodexCLI') as cli:
                cli.return_value.classify.side_effect = repaired
                result = run(options,report=lambda _:None)
            self.assertEqual(result['status'],'complete')
            self.assertEqual(resumed,['bad.lt'])

    def test_repeated_whole_group_failure_is_isolated_beyond_two_splits(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root/'raw.txt'
            domains = ['bad.lt']+[f'good{index}.lt' for index in range(15)]
            source.write_text('\n'.join(domains)+'\n',encoding='utf-8')
            info = {'model':'test','input':1,'output':1,'cost':0,'cost_source':'test','id':'',
                    'failure_kind':'validation'}
            def classify(batch):
                if any(domain=='bad.lt' for _,domain in batch):
                    return [],info,'Invalid whole response'
                return validator({'items':[raw(index) for index,_ in batch]},batch),info,None
            with patch('classifier.CodexCLI') as cli:
                cli.return_value.classify.side_effect = classify
                result = run(Options(input=source,output=root/'result.xls',model='test',stage='screen',
                                     batch_size=100,workers=1),report=lambda _:None)
            self.assertEqual(result['categorized'],15)
            self.assertEqual(result['status'],'partial')
            self.assertEqual(len(result['deferred_domains']),1)

    def test_usage_limit_still_stops_instead_of_deferring_every_domain(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            source=root/'raw.txt'
            source.write_text('padangos.lt\nstatyba.lt\n',encoding='utf-8')
            info={'model':'test','input':0,'output':0,'cost':0,'cost_source':'test','id':''}
            with patch('classifier.CodexCLI') as cli:
                cli.return_value.classify.return_value=([],info,'Pasiektas Codex naudojimo limitas.')
                with self.assertRaises(CodexError):
                    run(Options(input=source,output=root/'result.xls',model='test',stage='screen',
                                batch_size=1,workers=1),report=lambda _:None)
                self.assertEqual(cli.return_value.classify.call_count,1)


if __name__=='__main__':
    unittest.main()
