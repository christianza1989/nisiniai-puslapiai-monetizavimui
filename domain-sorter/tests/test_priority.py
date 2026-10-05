import csv
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from priority import rank_domain_names, write_priority


class PriorityTests(unittest.TestCase):
    def test_all_domains_once_strong_natural_words_before_modifications_and_unknowns(self):
        source = ['qxz.lt','propadangos.lt','padangos24.lt','padangostraktoriams.lt',
                  'padangos.lt','pervezimasvilniuje.lt','nikepadangos.lt','3dspausdinimas.lt']
        result = rank_domain_names(source)
        scores = {item.domain:item.score for item in result}
        self.assertEqual(len(result),len(source))
        self.assertEqual({item.domain for item in result},set(source))
        self.assertGreater(scores['padangos.lt'],scores['propadangos.lt'])
        self.assertGreater(scores['padangostraktoriams.lt'],scores['padangos24.lt'])
        self.assertGreater(scores['pervezimasvilniuje.lt'],scores['padangos24.lt'])
        self.assertGreater(scores['3dspausdinimas.lt'],75)
        self.assertLessEqual(scores['nikepadangos.lt'],25)
        self.assertEqual(result[-1].domain,'qxz.lt')
        self.assertEqual(result,rank_domain_names(list(reversed(source))))

    def test_previous_semantics_help_lexicon_but_do_not_import_ai_score(self):
        source = ['pianinuderinimas.lt','markespianinai.lt']
        clues = [{'domain':'pianinuderinimas.lt','f':'keyword','c':'music','r':'none',
                  'k':5,'q':100,'t':'pianinų derinimas','score':12},
                 {'domain':'markespianinai.lt','f':'keyword','c':'music','r':'brand',
                  'k':5,'q':100,'t':'pianinai','score':100}]
        result = rank_domain_names(source,clues)
        self.assertEqual(result[0].domain,'pianinuderinimas.lt')
        self.assertGreater(result[0].score,75)
        self.assertNotEqual(result[0].score,12)
        self.assertLessEqual(result[1].score,25)

    def test_queue_export_is_a_separate_order_not_the_ai_result(self):
        priorities = rank_domain_names(['qxz.lt','padangos.lt'])
        with tempfile.TemporaryDirectory() as directory:
            path = write_priority(directory,priorities,'source',screened=['padangos.lt'])
            self.assertTrue(path.read_bytes().startswith(b'\xef\xbb\xbf'))
            with path.open(encoding='utf-8-sig',newline='') as handle:
                rows = list(csv.DictReader(handle,delimiter=';'))
            self.assertEqual([row['Domenas'] for row in rows],['padangos.lt','qxz.lt'])
            self.assertIn('Eilės balas (heuristinis)',rows[0])
            self.assertNotIn('Potencialas (0–100)',rows[0])
            self.assertEqual(rows[0]['AI būsena sukuriant eilę'],'Jau įvertintas')
            self.assertEqual(rows[1]['AI būsena sukuriant eilę'],'Laukia AI')


if __name__=='__main__':
    unittest.main()
