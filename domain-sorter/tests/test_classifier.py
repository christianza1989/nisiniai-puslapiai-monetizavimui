import errno
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

import xlrd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classifier import (extract_domains, normalize_domain, validate_items, potential_score,
                        ranked, write_xls, Options, run, Store, AppError, signature_for, HEADERS)
from codex_provider import safe_environment, CodexCLI, DEFAULT_MODEL, REASONING_EFFORT


def item(i=0, category='auto', **updates):
    result = dict(i=i, c=category, n='Automobilių padangos', m='leads',
                  k=5, d=5, v=4, s=3, b=4, q=100, r='none', f='keyword', a=5,
                  t='padangos', u='Vairuotojas renkasi tinkamas padangas.',
                  p='Padangų pasirinkimo gidas ir poreikio forma.',
                  e='Partneris mokėtų už tinkamą pirkėjo užklausą.', z='Partnerių komisiniai už pirkimą.',
                  h='Matuoti konkretaus dydžio ir termino užklausas.', l='Partnerio marža ir tiekimas nežinomi.',
                  w='Aiškus komercinis raktažodis ir keli monetizavimo keliai.')
    result.update(updates)
    if result['c'] == 'unclear' or result['m'] == 'unclear':
        result.update(f='unclear', a=0, t='', u='', p='', e='', z='', h='')
    return result


class ClassifierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'raw.txt'

    def tearDown(self):
        self.temp.cleanup()

    def test_extract_idn_duplicate_numeric_and_vendor_noise(self):
        self.source.write_text('Padangos.LT\t\n9\t235.7 K\t2025\n'
                               'padangos.lt\nhttps://www.STATYBA.lt/path?q=1\n'
                               'žemė.lt\ninfo@kontaktai.lt\n127.0.0.1\n'
                               'bad_domain.lt\n-bad.lt\nExpiredDomains.net\n'
                               '2023-03-18\tSeo.Domains\t399 USD\n', encoding='utf-8')
        e = extract_domains(self.source)
        self.assertEqual(e.domains, ['padangos.lt', 'statyba.lt', 'xn--em-9ma32b.lt'])
        self.assertEqual(e.occurrences['padangos.lt'], 2)
        self.assertEqual(e.stats['duplicates_removed'], 1)
        self.assertEqual(e.stats['excluded_source_mentions'], 2)

    def test_invalid_hosts_are_not_partially_accepted(self):
        self.source.write_text('bad_domain.lt\n-bad.lt\n' + 'a' * 64 + '.lt\nfoo..lt\n', encoding='utf-8')
        self.assertEqual(extract_domains(self.source).domains, [])

    def test_complete_ids_required_no_duplicates_or_extra_fields(self):
        batch = [(0, 'padangos.lt'), (1, 'statyba.lt')]
        for items in ([item()], [item(), item()], [item(), item(3)],
                      [item(extra='x'), item(1)], [item(k=6), item(1)]):
            with self.subTest(items=items), self.assertRaises(AppError):
                validate_items({'items': items}, batch)
        result = validate_items({'items': [item(1), item()]}, batch)
        self.assertEqual({x['domain'] for x in result}, {'padangos.lt', 'statyba.lt'})

    def test_keyword_ranking_and_unclear_cap(self):
        clear = validate_items({'items': [item()]}, [(0, 'padangos.lt')])[0]
        brand = validate_items({'items': [item(k=1, q=30, d=1, v=1, s=1, b=1, c='unclear', m='unclear')]}, [(0, 'qxz.lt')])[0]
        self.assertGreater(clear['score'], brand['score'])
        self.assertEqual(ranked([brand, clear])[0]['domain'], 'padangos.lt')
        self.assertLessEqual(potential_score(item(c='unclear')), 25)
        self.assertAlmostEqual(clear['score'], 88.0)

    def test_xls_genuine_binary_all_domains_numeric_ranking_blank_dr(self):
        self.source.write_text('qxz.lt\npadangos.lt\nstatyba.lt\n', encoding='utf-8')
        e = extract_domains(self.source)
        analyses = {x['domain']: x for x in validate_items({'items': [item(0, k=0, q=10, c='unclear', m='unclear'), item(1)]}, [(0, 'qxz.lt'), (1, 'padangos.lt')])}
        path = self.root / 'result.xls'
        write_xls(path, e, analyses, {'model': 'test'})
        self.assertEqual(path.read_bytes()[:8], bytes.fromhex('D0CF11E0A1B11AE1'))
        book = xlrd.open_workbook(path, formatting_info=True)
        self.assertEqual(book.sheet_names(), ['Reitingas', 'Kategorijos', 'Nišos', 'Pagal kategorijas', 'Laukia AI', 'Idėjos', 'Metodika'])
        sheet = book.sheet_by_name('Reitingas')
        self.assertEqual(sheet.nrows, 7)
        self.assertEqual(sheet.ncols, len(HEADERS))
        self.assertEqual(sheet.cell_value(5, 1), 'padangos.lt')
        self.assertEqual(sheet.cell_type(5, 4), xlrd.XL_CELL_NUMBER)
        self.assertEqual(sheet.cell_value(5, 2), 'Automobiliai ir transportas')
        pending = book.sheet_by_name('Laukia AI')
        self.assertEqual(pending.cell_value(5, 0), 'statyba.lt')
        self.assertEqual(pending.cell_value(5, 1), 'Laukia Codex vertinimo')
        self.assertIn('ANALIZĖ NEBAIGTA', sheet.cell_value(2, 0))
        self.assertEqual(sheet.cell_value(5, 15), '')
        self.assertEqual(sheet.cell_value(5, 17), 'Dar nematuota')
        categories = book.sheet_by_name('Kategorijos')
        self.assertEqual(sum(categories.cell_value(row, 1) for row in range(5, categories.nrows)), 2)
        ideas = book.sheet_by_name('Idėjos')
        self.assertEqual(ideas.cell_value(5, 0), 'padangos.lt')
        self.assertEqual(ideas.cell_value(5, 3), analyses['padangos.lt']['p'])

    def test_modified_brand_and_regulated_names_cannot_inflate_priority(self):
        cases = [item(0), item(1, f='modified'), item(2, f='brand', r='brand'),
                 item(3, r='regulated')]
        rows = validate_items({'items': cases}, list(enumerate(['padangos.lt', 'padangos247.lt', 'brand.lt', 'paskolos.lt'])))
        self.assertGreater(rows[0]['score'], rows[1]['score'])
        self.assertEqual(rows[1]['k'], 3)
        self.assertEqual(rows[2]['k'], 1)
        self.assertLessEqual(rows[2]['score'], 35)
        self.assertEqual(rows[3]['a'], 3)
        self.assertAlmostEqual(rows[3]['score'], rows[0]['score'] * .82, places=1)

    def test_unclear_names_cannot_receive_invented_strategy(self):
        unclear = item(c='unclear', m='unclear')
        unclear['p'] = 'Pastatyk automobilių dalių katalogą.'
        with self.assertRaisesRegex(AppError, 'išgalvojo'):
            validate_items({'items': [unclear]}, [(0, 'qxz.lt')])

    def test_resume_and_export_only_never_launch_cli(self):
        self.source.write_text('padangos.lt\n', encoding='utf-8')
        out = self.root / 'result.xls'
        store = Store(self.root / 'analysis.sqlite3')
        store.save(signature_for('test'), validate_items({'items': [item()]}, [(0, 'padangos.lt')]))
        store.close()
        with patch('classifier.CodexCLI', side_effect=AssertionError('Must not launch')):
            meta = run(Options(input=self.source, output=out, model='test'), report=lambda _: None)
        self.assertEqual(meta['status'], 'complete')
        self.assertEqual(meta['categorized'], 1)

    def test_disk_full_xls_preserves_previous_file_and_cleans_partial_export(self):
        self.source.write_text('padangos.lt\n', encoding='utf-8')
        extraction = extract_domains(self.source)
        output = self.root / 'result.xls'
        output.write_bytes(b'previous workbook')

        def disk_full(temporary):
            Path(temporary).write_bytes(b'partial workbook')
            raise OSError(errno.ENOSPC, 'No space left on device')

        with patch('classifier.xlwt.Workbook.save', side_effect=disk_full):
            with self.assertRaisesRegex(AppError, 'nepakanka vietos'):
                write_xls(output, extraction, {}, {'model': 'test'})
        self.assertEqual(output.read_bytes(), b'previous workbook')
        self.assertFalse(output.with_name(output.name + '.tmp').exists())

    def test_xls_failure_does_not_lose_ai_results_and_records_export_error(self):
        self.source.write_text('padangos.lt\nstatyba.lt\n', encoding='utf-8')
        output = self.root / 'result.xls'
        info = {'model': 'test', 'input': 10, 'output': 10, 'cost': 0,
                'cost_source': 'test', 'id': ''}

        def classify(batch):
            items = validate_items({'items': [item(i) for i, _ in batch]}, batch)
            return items, info, None

        reports = []
        with patch('classifier.CodexCLI') as cli, patch(
                'classifier.write_xls', side_effect=AppError('XLS eksportui diske nepakanka vietos.')):
            cli.return_value.classify.side_effect = classify
            with self.assertRaisesRegex(AppError, 'nepakanka vietos'):
                run(Options(input=self.source, output=output, model='test', batch_size=1, workers=1),
                    report=reports.append)
            self.assertEqual(cli.return_value.classify.call_count, 2)
        summary = json.loads((self.root / 'run_summary.json').read_text(encoding='utf-8'))
        self.assertEqual(summary['categorized'], 2)
        self.assertEqual(summary['status'], 'complete')
        self.assertIn('XLS:', summary['export_errors'][0])
        self.assertTrue(any('Analizė tęsiama' in message for message in reports))
        with patch('classifier.CodexCLI', side_effect=AssertionError('Must resume without AI')):
            result = run(Options(input=self.source, output=output, model='test', export_only=True),
                         report=lambda _: None)
        self.assertEqual(result['categorized'], 2)
        self.assertEqual(result['export_errors'], [])
        self.assertEqual(xlrd.open_workbook(output).sheet_by_name('Reitingas').nrows, 7)

    def test_child_does_not_receive_project_api_keys(self):
        with patch.dict(os.environ, {'OPENROUTER_API_KEY': 'secret1', 'AHREFS_API_KEY': 'secret2', 'OPENAI_API_KEY': 'secret3'}):
            safe = safe_environment()
        self.assertNotIn('OPENROUTER_API_KEY', safe)
        self.assertNotIn('AHREFS_API_KEY', safe)
        self.assertNotIn('OPENAI_API_KEY', safe)

    def test_requested_model_and_effort_are_explicit_in_every_command(self):
        with patch('codex_provider.command_prefix', return_value=['codex']):
            client = CodexCLI(DEFAULT_MODEL, {}, '', {}, lambda *_: [], threading.Event())
        command = client.build_command(self.root, self.root / 'schema.json', self.root / 'answer.json')
        self.assertEqual(command[command.index('--model') + 1], 'gpt-6.1-sol')
        self.assertIn('model_reasoning_effort="xhigh"', command)
        self.assertEqual(REASONING_EFFORT, 'xhigh')
        self.assertIn('--ignore-user-config', command)
        self.assertEqual(command[-1], '-')

    def test_cache_lock_prevents_second_writer(self):
        self.source.write_text('padangos.lt\n', encoding='utf-8')
        lock = (self.root / '.run.lock').open('w+b')
        lock.write(b'0')
        lock.flush()
        lock.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(AppError, 'jau vyksta darbas'):
                run(Options(input=self.source, output=self.root / 'result.xls', extract_only=True), report=lambda _: None)
        finally:
            lock.close()


if __name__ == '__main__':
    unittest.main()
