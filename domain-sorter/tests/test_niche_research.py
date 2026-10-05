import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

import xlrd

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from classifier import AppError, Store
from codex_provider import CodexCLI
from niche_research import SCHEMA, SIGNATURE, validate, export, research_queue, research_one, refresh_manifest, dispatch_slots
from prioritize_top200 import apply as apply_priority
from select_top200 import niche_key


def sample(schema):
    kind = schema['type']
    if kind=='object':
        return {key:sample(value) for key,value in schema['properties'].items()}
    if kind=='array':
        return [sample(schema['items']) for _ in range(schema['minItems'])]
    if kind=='integer':
        return 4
    if 'enum' in schema:
        return schema['enum'][0]
    return ('Tyrimo prielaida ir patikrinimo paaiškinimas. '*50)[:max(schema.get('minLength',0),100)][:schema.get('maxLength',1000)]


def record():
    raw = sample(SCHEMA)
    value = raw['items'][0]
    value['i'] = 0
    for index,source in enumerate(value['sources'],1):
        source.update(id=f'S{index}',url=f'https://example{index}.com/offer',observed_on='2026-10-01')
    for index,competitor in enumerate(value['competitors'],1):
        competitor.update(country='LT' if index<3 else 'GB',source_id=f'S{index}')
    for index,model in enumerate(value['models'],1):
        model.update(id=f'M{index}',source_ids=['S1','S3'])
    value['recommended_model_id'] = 'M1'
    value['lt_demand'] += ' [S1]'
    return raw


class ResearchTests(unittest.TestCase):
    def test_success_cap_reserves_active_calls_and_replaces_failed_attempts(self):
        self.assertEqual(dispatch_slots(44,0,4,50),4)
        self.assertEqual(dispatch_slots(45,3,4,50),1)
        self.assertEqual(dispatch_slots(48,2,4,50),0)
        self.assertEqual(dispatch_slots(49,1,4,50),0)
        self.assertEqual(dispatch_slots(50,0,4,50),0)
        # A failed active request releases its reservation without counting as a success.
        self.assertEqual(dispatch_slots(48,1,4,50),1)
        self.assertEqual(dispatch_slots(199,0,4),4)
        self.assertEqual(dispatch_slots(51,0,4,50),0)

    def test_priority_revision_preserves_portfolio_cache_identity_and_initial_order(self):
        domains = [f'domenas{i:03}.lt' for i in range(200)]
        manifest = {'domains':domains,'screening':[{'domain':d,'i':i%100} for i,d in enumerate(domains)],
                    'selection_details':{d:{'research_priority':i+1,'reason':'original'} for i,d in enumerate(domains)}}
        text = '\n'.join(d+'\tAiškus užsakymo ketinimas; ekonomika ir vykdymas dar tik hipotezės.' for d in reversed(domains))
        result = apply_priority(manifest,text)
        self.assertEqual(result['domains'],list(reversed(domains)))
        self.assertEqual(result['initial_top200_order'],domains)
        self.assertEqual(manifest['domains'],domains)
        self.assertEqual(research_queue(result,{domains[-1]:{}},1),[(98,domains[-2],0)])
        self.assertEqual(result['selection_details'][domains[-1]]['initial_research_priority'],200)
        with self.assertRaises(AppError):
            apply_priority(manifest,text.replace(domains[0],'outside.lt'))

    def test_live_priority_refresh_allows_reorder_and_rejects_source_or_portfolio_change(self):
        with tempfile.TemporaryDirectory() as temporary:
            manifest = {'domains':['a.lt','b.lt'],'source':{'source_sha256':'same'},'cache_directory':'cache'}
            path = Path(temporary)/'selection.json'
            updated = {**manifest,'domains':['b.lt','a.lt']}
            path.write_text(json.dumps(updated),encoding='utf-8')
            self.assertEqual(refresh_manifest(temporary,manifest)['domains'],['b.lt','a.lt'])
            updated['source'] = {'source_sha256':'other'}
            path.write_text(json.dumps(updated),encoding='utf-8')
            with self.assertRaises(AppError):
                refresh_manifest(temporary,manifest)
            updated['source'] = manifest['source']
            updated['domains'] = ['b.lt','outside.lt']
            path.write_text(json.dumps(updated),encoding='utf-8')
            with self.assertRaises(AppError):
                refresh_manifest(temporary,manifest)

    def test_old_context_ids_cannot_conflict_with_requested_research_id(self):
        manifest = {'screening':[{'i':18,'domain':'first.lt'}],'cache_directory':'.','strategy_signature':'old'}
        with patch('niche_research.read_cache',return_value={'first.lt':{'i':99,'domain':'first.lt'}}), patch('niche_research.CodexCLI') as cli:
            research_one(18,'first.lt',manifest,threading.Event())
            context = cli.call_args.args[3]
            self.assertEqual(context['requested_id'],18)
            self.assertNotIn('i',context['candidate'])
            self.assertNotIn('i',context['previous_name_only_hypothesis'])
            cli.return_value.classify.assert_called_once_with([(18,'first.lt')])

    def test_limit_is_applied_after_priority_and_source_ids_are_preserved(self):
        manifest = {'domains':['second.lt','first.lt'],
                    'screening':[{'domain':'second.lt','i':18},{'domain':'first.lt','i':500}],
                    'selection_details':{'second.lt':{'research_priority':2},'first.lt':{'research_priority':1}}}
        self.assertEqual(research_queue(manifest,{},1),[(500,'first.lt',0)])
        self.assertEqual(research_queue(manifest,{'first.lt':{}},1),[(18,'second.lt',0)])
        manifest['screening'][1]['i'] = 18
        self.assertEqual(research_queue(manifest,{}),[(18,'first.lt',0),(18,'second.lt',0)])

    def test_live_web_is_explicit_only_and_shell_remains_disabled(self):
        base = CodexCLI('gpt-6.1-sol',SCHEMA,'',{},validate,threading.Event())
        research = CodexCLI('gpt-6.1-sol',SCHEMA,'',{},validate,threading.Event(),allow_web=True)
        args = ('root','schema','answer')
        self.assertIn('web_search="disabled"',base.build_command(*args))
        command = research.build_command(*args)
        self.assertIn('web_search="live"',command)
        self.assertIn('shell_tool',command)
        self.assertIn('read-only',command)
        self.assertIn('multi_agent',command)

    def test_source_links_identity_local_foreign_and_weak_payer_cap(self):
        raw = record()
        valid = validate(raw,[(0,'domenas.lt')])[0]
        self.assertEqual(valid['domain'],'domenas.lt')
        self.assertEqual(valid['score'],80)
        raw['items'][0]['scores']['payer'] = 2
        self.assertEqual(validate(raw,[(0,'domenas.lt')])[0]['score'],60)
        raw['items'][0]['models'][0]['source_ids'] = ['S99']
        with self.assertRaisesRegex(AppError,'neatsekami'):
            validate(raw,[(0,'domenas.lt')])
        raw = record()
        raw['items'][0]['competitors'][2]['country'] = 'LT'
        with self.assertRaisesRegex(AppError,'užsienio'):
            validate(raw,[(0,'domenas.lt')])
        raw = record()
        raw['items'][0]['i'] = True
        with self.assertRaises(AppError):
            validate(raw,[(0,'domenas.lt')])

    def test_partial_saved_exports_cover_all_200_without_invented_research_scores(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            domains = [f'domenas{i:03}.lt' for i in range(200)]
            manifest = dict(domains=domains,pool_screened=9200,pool_total=45324,
                            source={'source_sha256':'source-hash'},selection_method='Testo atranka',
                            screening=[{'domain':domain,'score':90,'c':'construction','n':'Niša'} for domain in domains])
            store = Store(directory/'research.sqlite3')
            item = validate(record(),[(0,domains[-1])])[0]
            item['web_calls'] = 6
            item['recommendation'] = 'Šaltinis [S1](https://example1.com/offer) jau su nuoroda.'
            store.save(SIGNATURE,[item])
            store.close()
            state = export(directory,manifest,'partial')
            self.assertEqual((state['categorized'],state['pending']),(1,199))
            book = xlrd.open_workbook(directory/'top200_nisu_analize.xls')
            tab = book.sheet_by_name('TOP200')
            self.assertEqual(tab.nrows,205)
            self.assertEqual(tab.cell_value(4,2),'Kategorija')
            self.assertEqual(tab.cell_value(5,0),1)
            self.assertEqual(tab.cell_value(5,1),domains[0])
            self.assertEqual(tab.cell_value(204,0),200)
            self.assertEqual(tab.cell_value(204,1),domains[-1])
            self.assertEqual(tab.cell_value(204,7),80)
            self.assertEqual(tab.cell_value(5,7),'')
            self.assertEqual(tab.cell_value(5,12),'')
            self.assertIn('NEBAIGTA',tab.cell_value(1,0))
            self.assertEqual(book.sheet_by_name('Šaltiniai').nrows,9)
            report = directory/'analizes/domenas199-lt.md'
            self.assertIn('[S1](https://example1.com/offer)',report.read_text(encoding='utf-8'))
            self.assertNotIn('](https://example1.com/offer)(https://example1.com/offer)',report.read_text(encoding='utf-8'))

    def test_niche_aliases_do_not_waste_research_on_same_offer(self):
        for a,b in [('Pastolių nuoma','Pastoliai'),('Švenčių maitinimas','Vestuvių maitinimas'),
                    ('Tvorų montavimas','Metalinių tvorų gamyba')]:
            self.assertEqual(niche_key({'n':a}),niche_key({'n':b}))


if __name__=='__main__':
    unittest.main()
