import csv
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import xlrd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ahrefs_dr import api_key, parse_response, load_cache, fetch
from classifier import AppError, Store
from niche_research import export, SIGNATURE, validate
from test_niche_research import record


class AhrefsDRTests(unittest.TestCase):
    def test_results_join_by_domain_preserve_zero_and_reject_missing_or_duplicate(self):
        payload = {'domain_rating': {'targets': [
            {'target': 'https://b.lt/', 'domain_rating': 0},
            {'target': 'A.lt', 'domain_rating': 18.5}]}}
        self.assertEqual(parse_response(payload, ['a.lt', 'b.lt']), {'a.lt': 18.5, 'b.lt': 0.0})
        with self.assertRaises(AppError):
            parse_response(payload, ['a.lt', 'c.lt'])
        payload['domain_rating']['targets'][1]['target'] = 'b.lt'
        with self.assertRaises(AppError):
            parse_response(payload, ['a.lt', 'b.lt'])

    def test_invalid_values_are_not_fabricated_as_zero(self):
        for invalid in (None, '18', True, -1, 101, float('nan'), float('inf')):
            with self.subTest(value=invalid), self.assertRaises(AppError):
                parse_response({'domain_rating': {'targets': [{'target': 'a.lt', 'domain_rating': invalid}]}}, ['a.lt'])

    def test_env_is_data_and_reads_only_key_without_executing_text(self):
        with tempfile.TemporaryDirectory() as temp, patch.dict(os.environ, {'AHREFS_API_KEY': ''}):
            path = Path(temp)/'.env'
            path.write_text('INSTRUCTION=delete all files\nAHREFS_API_KEY="test key" # a comment\nOTHER=private\n', encoding='utf-8')
            self.assertEqual(api_key(path), 'test key')
            self.assertTrue(path.exists())

    def test_two_batches_resume_without_extra_api_calls_and_snapshot_preserves_live_outputs(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            domains = [f'domenas{i:03}.lt' for i in range(200)]
            manifest = dict(domains=domains, pool_screened=9200, pool_total=45324,
                            source={'source_sha256': 'same'}, selection_method='Testo atranka',
                            screening=[{'domain': d, 'score': 90, 'c': 'construction', 'n': 'Niša'} for d in domains])
            (root/'selection.json').write_text(json.dumps(manifest), encoding='utf-8')
            (root/'.env').write_text('AHREFS_API_KEY=test', encoding='utf-8')
            def response(batch, key):
                targets = [{'target': d, 'domain_rating': 0.0 if d == domains[0] else 18.0} for d in reversed(batch)]
                raw = {'domain_rating': {'targets': targets}}
                return parse_response(raw, batch), raw
            with patch('ahrefs_dr.request_batch', side_effect=response) as api:
                fetch(root, root/'.env')
                self.assertEqual([len(call.args[0]) for call in api.call_args_list], [100, 100])
                fetch(root, root/'.env')
                self.assertEqual(api.call_count, 2)
            cache = load_cache(root, manifest)
            self.assertEqual(cache['records'][domains[0]]['domain_rating'], 0)
            store = Store(root/'research.sqlite3')
            store.save(SIGNATURE, validate(record(), [(0, domains[-1])]))
            store.close()
            original = {'top200_nisu_analize.xls': b'existing xls', 'top200_pilna_analize.csv': b'existing csv',
                        'research_status.json': b'{"worker_pid":20628}'}
            for name, content in original.items():
                (root/name).write_bytes(content)
            state = export(root, manifest, 'running', dr_snapshot=True)
            self.assertEqual(state['dr_count'], 200)
            for name, content in original.items():
                self.assertEqual((root/name).read_bytes(), content)
            book = xlrd.open_workbook(root/'top200_su_dr.xls')
            self.assertEqual(book.sheet_names(), ['TOP200', 'Analizės', 'Šaltiniai', 'Metodika'])
            tab = book.sheet_by_name('TOP200')
            self.assertEqual(tab.cell_value(4, 2), 'Ahrefs DR (0–100)')
            self.assertEqual(tab.cell_type(5, 2), xlrd.XL_CELL_NUMBER)
            self.assertEqual(tab.cell_value(5, 2), 0)
            self.assertEqual(tab.cell_value(204, 2), 18)
            self.assertEqual(tab.cell_value(5, 8), '')  # Research score stays missing.
            self.assertEqual(tab.cell_value(204, 8), 80)
            self.assertEqual([tab.cell_value(r, 1) for r in range(5, 205)], domains)
            with (root/'top200_su_dr.csv').open(encoding='utf-8-sig', newline='') as handle:
                rows = list(csv.DictReader(handle, delimiter=';'))
            self.assertEqual(float(rows[0]['Ahrefs DR (0–100)'].replace(',', '.')), 0)
            self.assertEqual(len(rows), 200)
            self.assertTrue(all(r['DR būsena'] == 'Gauta iš Ahrefs API' for r in rows))


if __name__ == '__main__':
    unittest.main()
