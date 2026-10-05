import csv
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

import xlrd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classifier import (Options, Store, AppError, response_schema, validate_items, signature_for)
from pipeline import run_pipeline
from export_csv import export_snapshot
from status import run_active
from test_classifier import item


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'raw.txt'
        self.source.write_text('miniekskavatoriai.lt\nqxz.lt\npadangos.lt\nstatyba.lt\n', encoding='utf-8')
        self.output = self.root / 'result.xls'
        self.calls = []

    def tearDown(self):
        self.temp.cleanup()

    def raw_item(self, i, domain, stage):
        if domain == 'qxz.lt':
            raw = item(i, c='unclear', m='unclear', k=0, d=0, v=0, s=0, b=0, q=0)
        else:
            raw = item(i, v=5 if domain == 'miniekskavatoriai.lt' else 4,
                       s=5 if domain == 'miniekskavatoriai.lt' else 3,
                       k=4 if domain == 'statyba.lt' else 5)
        required = response_schema(stage)['properties']['items']['items']['required']
        return {key: raw[key] for key in required}

    def fake_factory(self, stop_after_screen=False, mutate_source=False):
        parent = self
        class FakeCLI:
            def __init__(self, model, schema, prompt, catalog, validator, stop, timeout):
                self.stage = 'strategy' if 'p' in schema['properties']['items']['items']['required'] else 'screen'
                self.validator, self.stop = validator, stop
            def preflight(self):
                pass
            def classify(self, batch):
                parent.calls.append((self.stage, [domain for _, domain in batch]))
                items = self.validator({'items': [parent.raw_item(i, domain, self.stage) for i, domain in batch]}, batch)
                if self.stage == 'screen' and stop_after_screen:
                    self.stop.set()
                if self.stage == 'screen' and mutate_source:
                    parent.source.write_text('changed.lt\n', encoding='utf-8')
                return items, {'model':'test', 'input':1, 'output':1, 'cost':0, 'cost_source':'test', 'id':''}, None
        return FakeCLI

    def options(self, **overrides):
        return Options(input=self.source, output=self.output, model='test', batch_size=100, workers=1, **overrides)

    def test_all_screened_then_top_only_strategies_reuse_cache_and_distinct_exports(self):
        store = Store(self.root/'analysis.sqlite3')
        store.save(signature_for('test'), validate_items({'items':[self.raw_item(0,'miniekskavatoriai.lt','strategy')]}, [(0,'miniekskavatoriai.lt')]))
        store.close()
        with patch('classifier.CodexCLI', self.fake_factory()):
            result = run_pipeline(self.options(), report=lambda _:None, top_n=2)
        self.assertEqual(result['status'], 'complete')
        self.assertEqual(result['categorized'], 4)
        self.assertEqual(result['strategy_categorized'], 2)
        self.assertEqual(self.calls, [('screen',['miniekskavatoriai.lt','padangos.lt','statyba.lt','qxz.lt']), ('strategy',['padangos.lt'])])
        plan = json.loads((self.root/'shortlist.json').read_text(encoding='utf-8'))
        self.assertEqual(plan['domains'], ['miniekskavatoriai.lt','padangos.lt'])
        with (self.root/'domenai_reitingas.csv').open(encoding='utf-8-sig', newline='') as handle:
            primary = list(csv.DictReader(handle,delimiter=';'))
        with (self.root/'finalists/domenai_reitingas.csv').open(encoding='utf-8-sig',newline='') as handle:
            finalists = list(csv.DictReader(handle,delimiter=';'))
        self.assertEqual(len(primary),4)
        self.assertNotIn('Pirmos svetainės idėja', primary[0])
        self.assertTrue(all(row['Vertinimo etapas']=='Pirminė atranka' for row in primary))
        self.assertTrue(all(row['Pirmos svetainės idėja'] for row in finalists))
        self.assertEqual({row['Domenas'] for row in finalists},set(plan['domains']))
        with (self.root/'domenai_ai_eile.csv').open(encoding='utf-8-sig',newline='') as handle:
            queue = list(csv.DictReader(handle,delimiter=';'))
        self.assertEqual([row['Domenas'] for row in queue],
                         ['miniekskavatoriai.lt','padangos.lt','statyba.lt','qxz.lt'])
        self.assertNotIn('Idėjos',xlrd.open_workbook(self.output).sheet_names())
        self.assertIn('Idėjos',xlrd.open_workbook(self.root/'finalists/domenai_finalistai.xls').sheet_names())
        with patch('classifier.CodexCLI', side_effect=AssertionError('Resume must not call AI')):
            resumed = run_pipeline(self.options(), report=lambda _:None, top_n=2)
        self.assertEqual(resumed['status'],'complete')
        export_snapshot(self.source,self.root,'test')
        exported = export_snapshot(self.source,self.root/'finalists','test')
        self.assertEqual(exported['total'],2)

    def test_pipeline_keeps_one_os_lock_during_both_stages_and_export_calls_no_ai(self):
        locks = []
        def report(message):
            if message.startswith(('Atranka:', 'Strategijos:', 'Pirminė atranka baigta.')):
                locks.append(run_active(self.root))
        with patch('classifier.CodexCLI',self.fake_factory()):
            run_pipeline(self.options(),report=report,top_n=2)
        self.assertTrue(locks)
        self.assertTrue(all(locks))
        self.assertFalse(run_active(self.root))
        with patch('classifier.CodexCLI',side_effect=AssertionError('Export must not call AI')):
            result = run_pipeline(self.options(export_only=True),report=lambda _:None,top_n=2)
        self.assertEqual(result['status'],'complete')
        self.assertEqual(result['strategy_categorized'],2)

    def test_interrupted_screening_does_not_start_strategies(self):
        with patch('classifier.CodexCLI',self.fake_factory(stop_after_screen=True)):
            result = run_pipeline(self.options(),report=lambda _:None,top_n=2)
        self.assertEqual(result['status'],'stopped')
        self.assertEqual(result['strategy_total'],0)
        self.assertFalse((self.root/'shortlist.json').exists())
        self.assertEqual(len(self.calls),1)

    def test_limited_screening_does_not_rank_a_partial_pool_as_finalists(self):
        with patch('classifier.CodexCLI',self.fake_factory()):
            result = run_pipeline(self.options(limit=2),report=lambda _:None,top_n=2)
        self.assertEqual(result['categorized'],2)
        self.assertEqual(result['status'],'partial')
        self.assertFalse((self.root/'shortlist.json').exists())

    def test_changed_source_blocks_stage_handoff(self):
        with patch('classifier.CodexCLI',self.fake_factory(mutate_source=True)):
            with self.assertRaisesRegex(AppError,'Šaltinis pakeistas'):
                run_pipeline(self.options(),report=lambda _:None,top_n=2)
        self.assertTrue(all(stage=='screen' for stage,_ in self.calls))

    def test_screen_schema_rejects_full_plans_and_fabricated_keyword_for_unclear_name(self):
        raw = self.raw_item(0,'qxz.lt','screen')
        raw['t'] = 'padangos'
        with self.assertRaisesRegex(AppError,'išgalvojo'):
            validate_items({'items':[raw]},[(0,'qxz.lt')],'screen')
        raw = self.raw_item(0,'padangos.lt','screen')
        raw['p'] = 'Ilgas planas.'
        with self.assertRaises(AppError):
            validate_items({'items':[raw]},[(0,'padangos.lt')],'screen')


if __name__=='__main__':
    unittest.main()
