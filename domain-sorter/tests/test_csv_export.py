import csv
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classifier import extract_domains, validate_items, write_csv, Store, signature_for
from export_csv import export_snapshot
from test_classifier import item


class CSVExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        self.source = self.directory / 'raw.txt'
        self.source.write_text('qxz.lt\npadangos.lt\nstatyba.lt\n', encoding='utf-8')
        self.extraction = extract_domains(self.source)
        self.items = validate_items({'items': [item(0, c='unclear', m='unclear', k=0, q=10),
                                               item(1, w='Aišku; marža, "niša"\n=ne formulė.')]},
                                    [(0, 'qxz.lt'), (1, 'padangos.lt')])
        self.analyses = {x['domain']: x for x in self.items}
        self.meta = {'model': 'test', 'signature': 'test', 'status': 'running'}

    def tearDown(self):
        self.temp.cleanup()

    def read(self, name):
        with (self.directory / name).open(encoding='utf-8-sig', newline='') as handle:
            return list(csv.DictReader(handle, delimiter=';'))

    def test_round_trip_ranking_groups_pending_and_literal_text(self):
        status = write_csv(self.directory, self.extraction, self.analyses, self.meta)
        rows = self.read('domenai_reitingas.csv')
        self.assertEqual([r['Domenas'] for r in rows], ['padangos.lt', 'qxz.lt'])
        self.assertEqual(rows[0]['Pagrindimas'], self.items[1]['w'])
        self.assertEqual(rows[0]['Kategorija'], 'Automobiliai ir transportas')
        self.assertEqual(float(rows[0]['Potencialas (0–100)'].replace(',', '.')), self.items[1]['score'])
        grouped = self.read('domenai_pagal_kategorijas.csv')
        pending = self.read('domenai_laukia_ai.csv')
        self.assertEqual({r['Domenas'] for r in grouped}, {r['Domenas'] for r in rows})
        self.assertEqual([r['Domenas'] for r in pending], ['statyba.lt'])
        self.assertEqual(status['categorized'] + status['pending'], 3)
        for name, digest in status['files_sha256'].items():
            self.assertTrue((self.directory / name).read_bytes().startswith(b'\xef\xbb\xbf'))
            self.assertEqual(hashlib.sha256((self.directory / name).read_bytes()).hexdigest(), digest)

    def test_formula_like_ai_text_is_literal_and_stale_snapshot_cannot_overwrite(self):
        self.analyses['padangos.lt']['w'] = '  =HYPERLINK("https://example.invalid")'
        write_csv(self.directory, self.extraction, self.analyses, self.meta)
        path = self.directory / 'domenai_reitingas.csv'
        before = path.read_bytes()
        self.assertTrue(self.read(path.name)[0]['Pagrindimas'].startswith("'"))
        write_csv(self.directory, self.extraction, {}, self.meta)
        self.assertEqual(path.read_bytes(), before)

    def test_snapshot_exports_during_classifier_lock_without_ai_or_db_writes(self):
        store = Store(self.directory / 'analysis.sqlite3')
        store.save(signature_for('test'), self.items)
        store.close()
        lock = (self.directory / '.run.lock').open('w+b')
        lock.write(b'0')
        lock.flush()
        lock.seek(0)
        if sys.platform == 'win32':
            import msvcrt
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        before = (self.directory / 'analysis.sqlite3').read_bytes()
        try:
            with patch('classifier.CodexCLI', side_effect=AssertionError('CSV must not call AI')):
                result = export_snapshot(self.source, self.directory, 'test')
            self.assertEqual(result['categorized'], 2)
            self.assertEqual((self.directory / 'analysis.sqlite3').read_bytes(), before)
        finally:
            lock.close()


if __name__ == '__main__':
    unittest.main()
