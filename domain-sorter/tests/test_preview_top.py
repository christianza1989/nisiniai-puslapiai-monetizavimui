import csv
import json
from pathlib import Path
import sys
import tempfile
import unittest

import xlrd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classifier import Store, AppError, signature_for
from pipeline import read_cache
from preview_top import prepare, export_preview, MODEL


class PreviewTopTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.main = self.root/'main'
        self.main.mkdir()
        self.output = self.root/'main/preview'
        self.source = self.root/'input.txt'
        self.domains = [f'domenas{i:02}.lt' for i in range(25)]
        self.source.write_text('\n'.join(self.domains),encoding='utf-8')
        self.screen_sig = signature_for(MODEL,'screen')
        self.strategy_sig = signature_for(MODEL,'strategy')
        self.store = Store(self.main/'analysis.sqlite3')
        for i, domain in enumerate(self.domains[:22] + ['outside.lt']):
            item = dict(domain=domain,score=100-i,q=90,c='construction',n='Niša',
                        m='leads',r='none',w='Hipotezė',t='raktažodis',f='keyword',a=5,
                        k=5,d=5,v=5,s=5,b=5)
            self.store.save(self.screen_sig,[item])
        # Strategy scores differ from screening; old timestamps must survive copying.
        for domain, score in [(self.domains[0],60),(self.domains[1],85)]:
            raw = self.store.load(self.screen_sig)[domain]
            item = {**raw, 'score':score, **{key:f'{key}: hipotezė' for key in ('u','p','e','z','h','l')}}
            self.store.save(self.strategy_sig,[item])
        self.store.close()

    def tearDown(self):
        self.temp.cleanup()

    def test_snapshot_excludes_pending_and_non_source_records_preserves_main_and_timestamps(self):
        before = read_cache(self.main/'analysis.sqlite3',self.strategy_sig)
        manifest = prepare(self.output,self.source,self.main)
        self.assertEqual(manifest['pool_screened'],22)
        self.assertEqual(manifest['pool_total'],25)
        self.assertEqual(manifest['domains'],self.domains[:20])
        self.assertNotIn('outside.lt',manifest['domains'])
        self.assertEqual(before,read_cache(self.main/'analysis.sqlite3',self.strategy_sig))
        copied = read_cache(self.output/'analysis.sqlite3',self.strategy_sig)
        self.assertEqual(before,copied)
        self.assertFalse((self.main/'run_summary.json').exists())
        with self.assertRaisesRegex(AppError,'užfiksuota'):
            prepare(self.output,self.source,self.main)
        with self.assertRaisesRegex(AppError,'atskiro'):
            prepare(self.main,self.source,self.main)

    def test_detailed_rank_is_distinct_pending_scores_blank_and_csv_xls_match(self):
        manifest = prepare(self.output,self.source,self.main)
        state = export_preview(self.output,manifest,'running')
        self.assertEqual(state['categorized'],2)
        book = xlrd.open_workbook(self.output/'top20_bandomasis.xls')
        tab = book.sheet_by_name('TOP20')
        self.assertIn('dalinio sąrašo',tab.cell_value(0,0))
        self.assertEqual(tab.cell_value(5,1),self.domains[1])
        self.assertEqual(tab.cell_value(5,2),99)
        self.assertEqual(tab.cell_value(5,3),85)
        self.assertEqual(tab.cell_value(7,0),'')
        self.assertEqual(tab.cell_value(7,3),'')
        self.assertEqual(book.sheet_by_name('Idėjos').nrows,7)
        with (self.output/'top20_bandomasis.csv').open(encoding='utf-8-sig',newline='') as handle:
            rows = list(csv.DictReader(handle,delimiter=';'))
        self.assertEqual(len(rows),20)
        self.assertEqual(rows[0]['Domenas'],self.domains[1])
        self.assertEqual(rows[2]['Potencialas (0–100)'],'')
        self.assertEqual(rows[2]['Pirmos svetainės idėja'],'')
        self.assertEqual(rows[2]['Vertinimo etapas'],'Laukia išsamios analizės')


if __name__=='__main__':
    unittest.main()
