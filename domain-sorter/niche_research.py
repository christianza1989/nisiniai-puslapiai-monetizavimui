"""Resumable, source-backed research of a fixed niche portfolio through Codex CLI."""
import argparse
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import signal
import sys
import threading
from urllib.parse import urlsplit

import xlrd
import xlwt

from classifier import (Store, AppError, DEFAULT_INPUT, CATEGORIES, extract_domains,
                        run_lock, utc_now, _csv_cell)
from codex_provider import CodexCLI, CodexError, DEFAULT_MODEL, REASONING_EFFORT
from pipeline import atomic_json, read_cache
from status import run_active

ROOT = Path(__file__).resolve().parent
VERSION = '2026-10-01-sol61-xhigh-research-v1'
PROMPT = (ROOT/'prompts/niche_research_v1.md').read_text(encoding='utf-8')
BUSINESS = (ROOT.parent/'SKILLS/niche-site-builder/references/business-validation.md').read_text(encoding='utf-8')


def text_schema(minimum=25, maximum=1200):
    return {'type':'string','minLength':minimum,'maxLength':maximum}


def obj(properties):
    return {'type':'object','properties':properties,'required':list(properties),'additionalProperties':False}


def array(items, minimum=1, maximum=8):
    return {'type':'array','items':items,'minItems':minimum,'maxItems':maximum}


SHORT = text_schema(5,400)
IDS = array(text_schema(2,8),1,6)
SOURCE = obj({'id':text_schema(2,8),'url':text_schema(10,600),'title':text_schema(5,180),
              'country':text_schema(2,80),'observed_on':text_schema(10,10),
              'used_for':SHORT,'limitation':SHORT})
COMPETITOR = obj({'name':text_schema(2,120),'country':text_schema(2,80),
                  'source_id':text_schema(2,8),'offer':text_schema(40,700),
                  'price_note':SHORT,'purchase_path':SHORT,'difference':text_schema(30,600)})
MODEL = obj({'id':text_schema(2,8),'name':text_schema(5,100),'payer':text_schema(30,500),
             'paid_result':text_schema(30,500),'collection_trigger':text_schema(30,500),
             'unit_economics':text_schema(50,900),'requirements':text_schema(40,700),
             'argument':text_schema(50,900),'source_ids':IDS})
RECORD = obj({'i':{'type':'integer'},'niche':text_schema(5,160),'summary':text_schema(100,800),
              'buyer':text_schema(70,900),'buying_intent':text_schema(90,1400),
              'lt_demand':text_schema(100,1500),'international':text_schema(90,1400),
              'competitors':array(COMPETITOR,3,6),'models':array(MODEL,3,4),
              'recommended_model_id':text_schema(2,8),'recommendation':text_schema(120,1200),
              'decision':{'type':'string','enum':['testuoti','salyginai_testuoti','atideti']},
              'economics':obj({'our_revenue':text_schema(60,1000),'costs':text_schema(80,1200),
                               'break_even':text_schema(60,1000),'sensitivity':text_schema(90,1400)}),
              'fulfillment':text_schema(120,1500),
              'experiment':obj({'offer':text_schema(80,1100),'fields':array(text_schema(5,100),3,8),
                                'current_capability':text_schema(70,1000),
                                'continue_rule':text_schema(90,1100),'stop_rule':text_schema(70,1000)}),
              'seo':array(obj({'query':text_schema(5,160),'intent':SHORT,'page':SHORT,'serp_note':SHORT}),3,5),
              'acquisition':text_schema(100,1200),'automation':text_schema(120,1500),
              'counter_evidence':text_schema(120,1500),'decision_reversal':text_schema(70,1000),
              'unknowns':array(text_schema(25,250),3,8),
              'scores':obj({key:{'type':'integer','minimum':0,'maximum':5} for key in ('keyword','payer','execution','test')}),
              'score_reasoning':text_schema(100,1400),'sources':array(SOURCE,4,8)})
SCHEMA = obj({'items':array(RECORD,1,1)})
SIGNATURE = hashlib.sha256(json.dumps([VERSION,DEFAULT_MODEL,REASONING_EFFORT,PROMPT,BUSINESS,SCHEMA],
                                     ensure_ascii=False,sort_keys=True).encode()).hexdigest()


def check(value, schema, path='reply'):
    kind = schema['type']
    if kind=='object':
        if not isinstance(value,dict) or set(value)!=set(schema['required']):
            raise AppError(f'{path}: trūksta laukų arba pateikta papildomų.')
        for key, child in schema['properties'].items():
            check(value[key],child,path+'.'+key)
    elif kind=='array':
        if not isinstance(value,list) or not schema['minItems']<=len(value)<=schema['maxItems']:
            raise AppError(f'{path}: netinkamas elementų skaičius.')
        for index,item in enumerate(value):
            check(item,schema['items'],f'{path}[{index}]')
    elif kind=='string':
        if not isinstance(value,str) or not schema.get('minLength',0)<=len(value.strip())<=schema.get('maxLength',100000):
            raise AppError(f'{path}: per trumpas / per ilgas tekstas.')
        if 'enum' in schema and value not in schema['enum']:
            raise AppError(f'{path}: nežinoma reikšmė.')
    elif kind=='integer':
        if type(value) is not int or not schema.get('minimum',-1e10)<=value<=schema.get('maximum',1e10):
            raise AppError(f'{path}: netinkamas sveikasis skaičius.')


def validate(response,batch):
    check(response,SCHEMA)
    record = response['items'][0]
    if len(batch)!=1 or record['i']!=batch[0][0]:
        raise AppError('Tyrimo ID neatitinka domeno.')
    sources = {source['id']:source for source in record['sources']}
    if len(sources)!=len(record['sources']):
        raise AppError('Šaltinių ID kartojasi.')
    if len({source['url'] for source in sources.values()})<4:
        raise AppError('Reikia bent keturių skirtingų šaltinių puslapių.')
    for source in sources.values():
        parsed = urlsplit(source['url'])
        if (parsed.scheme not in ('http','https') or not parsed.hostname or '.' not in parsed.hostname or
                parsed.username or parsed.password or re.fullmatch(r'[\d.]+',parsed.hostname)):
            raise AppError('Šaltinio URL turi būti viešas pirminis puslapis.')
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',source['observed_on']):
            raise AppError('Šaltinio patikrinimo data netaisyklinga.')
    competitors = record['competitors']
    local = sum(plain_country(item['country']) in ('lt','lietuva','lithuania') for item in competitors)
    foreign = len(competitors)-local
    if local<2 or foreign<1:
        raise AppError('Reikia bent dviejų Lietuvos ir vieno užsienio pasiūlymo.')
    if any(item['source_id'] not in sources for item in competitors):
        raise AppError('Konkurento šaltinis neatsekamas.')
    model_ids = {item['id'] for item in record['models']}
    if len(model_ids)!=len(record['models']) or record['recommended_model_id'] not in model_ids:
        raise AppError('Rekomenduojamo pajamų modelio ID netaisyklingas.')
    if any(not set(item['source_ids']).issubset(sources) for item in record['models']):
        raise AppError('Pajamų modelio šaltiniai neatsekami.')
    cited = set(re.findall(r'\[(S\d+)\]',json.dumps(record,ensure_ascii=False)))
    if not cited or not cited.issubset(sources):
        raise AppError('Faktų nuorodos netaisyklingos arba jų nėra.')
    record = {key:value for key,value in record.items() if key!='i'}
    record['domain'] = batch[0][1]
    weights = {'keyword':25,'payer':30,'execution':25,'test':20}
    record['score'] = round(sum(record['scores'][key]*weight/5 for key,weight in weights.items()),1)
    # A weak/no payer or unavailable execution cannot be a top-rated business.
    if record['scores']['payer']<=2 or record['scores']['execution']<=1 or record['decision']=='atideti':
        record['score'] = min(record['score'],60)
    record['research_version'] = VERSION
    return [record]


def plain_country(value):
    return value.strip().lower()


def sections(item):
    yield 'Sprendimo santrauka',item['summary']
    yield 'Klientas ir mokamas rezultatas',item['buyer']
    yield 'Pirkimo ketinimas',item['buying_intent']
    yield 'Lietuvos rinka',item['lt_demand']
    yield 'Užsienio rinkos ir perkėlimas',item['international']
    for competitor in item['competitors']:
        yield f"Konkurentas: {competitor['name']} ({competitor['country']})", (
            f"{competitor['offer']} [{competitor['source_id']}]\nKaina: {competitor['price_note']}\n"
            f"Užklausos kelias: {competitor['purchase_path']}\nGalimybė mums: {competitor['difference']}")
    labels = {'payer':'Mokėtojas','paid_result':'Mokamas rezultatas','collection_trigger':'Kada gauname pajamas',
              'unit_economics':'Vieneto ekonomika','requirements':'Vykdymo reikalavimai','argument':'Už / prieš'}
    for model in item['models']:
        for key,label in labels.items():
            yield f"{model['id']} {model['name']}: {label}",model[key]
    yield 'Pasirinktas modelis ir pagrindimas',item['recommended_model_id']+' — '+item['recommendation']
    for key,label in {'our_revenue':'Mūsų pajamos','costs':'Sąnaudos','break_even':'Lūžio formulė','sensitivity':'Jautrumas'}.items():
        yield 'Ekonomika: '+label,item['economics'][key]
    yield 'Partneriai ir vykdymas',item['fulfillment']
    for key,label in {'offer':'Pirmos fazės pasiūlymas','current_capability':'Dabartinės galimybės',
                      'continue_rule':'Tęsti taisyklė','stop_rule':'Stabdyti taisyklė'}.items():
        yield label,item['experiment'][key]
    yield 'Tikros užklausos laukai','\n'.join(item['experiment']['fields'])
    for intent in item['seo']:
        yield 'SEO: '+intent['query'],f"{intent['intent']}\nPuslapis: {intent['page']}\nSERP: {intent['serp_note']}"
    yield 'Pirkėjų paieška',item['acquisition']
    yield 'Automatizavimas ir ribos',item['automation']
    yield 'Prieštaraujantys įrodymai',item['counter_evidence']
    yield 'Kas pakeistų pasirinkimą',item['decision_reversal']
    yield 'Nežinomybės','\n'.join(item['unknowns'])
    yield 'Analitiko balo argumentai',item['score_reasoning']


def write_report(directory,item):
    sources = {source['id']:source for source in item['sources']}
    def citations(value):
        return re.sub(r'\[(S\d+)\](?!\()',lambda match:f"[{match[1]}]({sources[match[1]]['url']})" if match[1] in sources else match[0],value)
    lines = [f"# {item['domain']} — {item['niche']}",
             f"\nTyrimas: {item['analyzed_at']} | {DEFAULT_MODEL} / {REASONING_EFFORT} | {VERSION}",
             f"\nAnalitiko balas: {item['score']}/100. Sprendimas: {item['decision']}. "
             'Tai rinkos tyrimas ir hipotezė, ne savininko realios paklausos ar pelno patvirtinimas. DR ir domeno istorija nematuoti.']
    for label,value in sections(item):
        lines.extend(['\n## '+label,'\n'+citations(value)])
    lines.append('\n## Šaltinių registras')
    for source in item['sources']:
        lines.append(f"\n- [{source['id']}: {source['title']}]({source['url']}) — {source['country']}, "
                     f"tikrinta {source['observed_on']}. {source['used_for']} Ribos: {source['limitation']}")
    reports = directory/'analizes'
    reports.mkdir(exist_ok=True)
    path = reports/(item['domain'].replace('.','-')+'.md')
    temporary = path.with_suffix('.md.tmp')
    temporary.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    temporary.replace(path)
    return path


def export(directory,manifest,status,failures=None,dr_snapshot=False):
    directory = Path(directory)
    manifest = refresh_manifest(directory,manifest)
    from ahrefs_dr import load_cache, ENDPOINT, DOCUMENTATION, LICENSE
    dr_cache = load_cache(directory,manifest)
    dr_records = dr_cache.get('records',{})
    all_items = read_cache(directory/'research.sqlite3',SIGNATURE)
    ordered = [domain for _,domain,_ in research_queue(manifest,{})] if manifest.get('priority_method') else manifest['domains']
    complete = [all_items[d] for d in ordered if d in all_items]
    pending = [d for d in manifest['domains'] if d not in all_items]
    selected = {item['domain']:item for item in manifest['screening']}
    places = {domain:i for i,domain in enumerate(manifest.get('initial_top200_order',manifest['domains']),1)}
    headers = ['Tyrimo prioritetas 1–200','Domenas','Kategorija','Niša','Pirminis balas','Tyrimo balas',
               'Geriausias pajamų modelis','Kas mokėtų mums','Sprendimas','Pilnos analizės būsena',
               'Šaltinių skaičius','Pilna analizė (MD)','Pradinė atrankos vieta','Kodėl atrinkta',
               'Tyrimo santrauka','Svarbiausia ekonomikos nežinomybė','AI modelis','Tyrimo data UTC','DR būsena','Potencialo grupė',
               'Ahrefs DR (0–100)','DR tikrinimo data UTC','DR šaltinis']
    rows, detail_rows, source_rows = [], [], []
    for position,domain in enumerate(ordered,1):
        first,item = selected[domain],all_items.get(domain)
        report = ((directory/'analizes'/(domain.replace('.','-')+'.md')) if dr_snapshot else write_report(directory,item)) if item else None
        model = next(model for model in item['models'] if model['id']==item['recommended_model_id']) if item else None
        detail = manifest.get('selection_details',{}).get(domain,{})
        reason = detail.get('priority_reason',detail.get('reason',''))
        dr = dr_records.get(domain,{})
        dr_ok = dr.get('status')=='ok'
        rows.append([position,domain,CATEGORIES[first['c']],item['niche'] if item else first['n'],
                     first['score'],item['score'] if item else None,model['name'] if model else '',
                     model['payer'] if model else '',{'testuoti':'Testuoti','salyginai_testuoti':'Sąlyginai testuoti','atideti':'Atidėti'}[item['decision']] if item else '',
                     'Atliktas rinkos tyrimas' if item else 'Laukia pilnos analizės',len(item['sources']) if item else None,
                     str(report.resolve()) if report else '',places[domain],reason,
                     item['summary'] if item else '',item['economics']['break_even'] if item else '',
                     DEFAULT_MODEL+' / '+REASONING_EFFORT,item.get('analyzed_at','') if item else '',
                     'Gauta iš Ahrefs API' if dr_ok else 'Dar nematuota',detail.get('potential_tier',''),
                     dr['domain_rating'] if dr_ok else None,dr.get('checked_at','') if dr_ok else '',
                     ENDPOINT if dr_ok else ''])
        if item:
            detail_rows.extend([[domain,label,value] for label,value in sections(item)])
            source_rows.extend([[domain,source['id'],source['title'],source['country'],source['url'],
                                source['observed_on'],source['used_for'],source['limitation']] for source in item['sources']])
    csv_path = directory/('top200_su_dr.csv' if dr_snapshot else 'top200_pilna_analize.csv')
    temporary = csv_path.with_suffix('.csv.tmp')
    csv_order = ([0,1,20]+[i for i in range(len(headers)) if i not in (0,1,20)]) if dr_records else list(range(len(headers)))
    with temporary.open('w',encoding='utf-8-sig',newline='') as handle:
        writer = csv.writer(handle,delimiter=';')
        writer.writerow([headers[i] for i in csv_order])
        writer.writerows([_csv_cell(row[i]) for i in csv_order] for row in rows)
    temporary.replace(csv_path)
    book = xlwt.Workbook(encoding='utf-8')
    body = xlwt.easyxf('font: name Arial, height 200; alignment: vert top, wrap on;')
    number = xlwt.easyxf('font: name Arial, height 200; alignment: vert top, horiz right;',num_format_str='0.0')
    integer = xlwt.easyxf('font: name Arial, height 200; alignment: vert top, horiz right;',num_format_str='0')
    head = xlwt.easyxf('font: name Arial, height 200, bold on, colour white; pattern: pattern solid, fore_colour dark_blue; alignment: vert center, wrap on;')
    title = xlwt.easyxf('font: name Arial, height 280, bold on; alignment: vert center;')
    note_style = xlwt.easyxf('font: name Arial, height 200, italic on; alignment: vert center, wrap on;')
    dr_count = sum(dr_records.get(domain,{}).get('status')=='ok' for domain in ordered)
    note = f"200 kandidatų iš {manifest['pool_screened']:,} / {manifest['pool_total']:,} įvertintų domenų. Pilnas rinkos tyrimas {len(complete)}/200. {'NEBAIGTA. ' if pending else ''}Ahrefs DR gautas {dr_count}/200. Reali savininko paklausa dar nematuota."

    def sheet(name,labels,widths,data,sheet_note):
        tab = book.add_sheet(name)
        tab.show_grid = False
        tab.write_merge(0,0,0,len(labels)-1,'TOP 200 — nišų ir monetizacijos rinkos tyrimas',title)
        tab.row(0).height = 480
        tab.write_merge(1,1,0,len(labels)-1,sheet_note,note_style)
        tab.row(1).height = 800
        tab.write_merge(2,2,0,len(labels)-1,f'{DEFAULT_MODEL} / {REASONING_EFFORT} | Eksportas UTC: {utc_now()}',note_style)
        tab.row(2).height = 500
        for col,label in enumerate(labels):
            tab.write(4,col,label,head)
            tab.col(col).width = int(widths[col]*256)
        tab.row(4).height = 850
        for row,values in enumerate(data,5):
            # Readable source IDs in cells; direct URLs live in the source tab
            # and clickable citations remain in the full Markdown reports.
            values = [re.sub(r'\[(S\d+)\]\([^\s)]+\)',r'[\1]',value) if isinstance(value,str) else value for value in values]
            lines = max(sum(max(1,math.ceil(len(line)/max(1,widths[col]-3))) for line in str(value or '').split('\n'))
                        for col,value in enumerate(values))
            tab.row(row).height = min(8000,max(600,(lines+1)*260))
            for col,value in enumerate(values):
                tab.write(row,col,'' if value is None else value,
                          integer if isinstance(value,int) else number if isinstance(value,float) else body)
        tab.set_panes_frozen(True)
        tab.set_horz_split_pos(5)
        tab.set_vert_split_pos(2 if name=='TOP200' else 1)

    # Main answer compact; complete material belongs to the analysis and source tabs.
    indices = [0,1,2,3,19,13,4,5,6,7,8,9,10]
    widths = [12,36,27,33,27,64,11,11,38,48,23,27,12]
    if dr_records:
        indices.insert(2,20)
        widths.insert(2,12)
        indices.extend([18,21])
        widths.extend([27,27])
    sheet('TOP200',[headers[i] for i in indices],widths,
          [[row[i] for i in indices] for row in rows],note)
    sheet('Analizės',['Domenas','Analizės dalis','Išvada'],[38,54,150],detail_rows,
          f'Visos pilnos išvados tik {len(complete)} ištirtų nišų. Kiti kandidatai laukia; hipotetinės pajamos atskirtos nuo šaltinių faktų.')
    sheet('Šaltiniai',['Domenas','ID','Šaltinis','Rinka','URL','Tikrinimo data','Ką pagrindžia','Prieigos / įrodymų ribos'],
          [38,8,45,18,80,18,60,60],source_rows,'Pirminiai puslapiai, naudoti Codex tyrime; pasiūlymų egzistavimas neįrodo mūsų tiekėjo sutarties ar paklausos.')
    facts = [['Apimtis',note],['Šaltinio SHA-256',manifest['source']['source_sha256']],
             ['Atrankos metodas',manifest.get('selection_method','')],
             ['Tyrimo versija',VERSION],['Tyrimo parašas',SIGNATURE],
             ['Tyrimo balas','Analitiko politika: keyword25/payer30/execution25/test20, kiekvienas 0–5. Jei payer≤2, execution≤1 arba atidėti, balas≤60. Tai nėra statistinė paklausos ar pelno tikimybė.'],
             ['Eiliškumas',manifest.get('priority_method','Visi kandidatai pagal užfiksuotą atrankos tvarką. Baigti tyrimai neperkeliami į viršų.')],
             ['Prioriteto data',manifest.get('priority_updated_at','')],
             ['Prioriteto SHA-256',manifest.get('priority_sha256','')],
             ['Tikri rinkos faktai','Bent du LT ir vienas užsienio konkurentas/alternatyva, bent keturi pirminiai šaltiniai, 3–4 palyginti pajamų modeliai. Šaltinių reikšmę vertino AI; pirmos fazės BUSINESS sprendimas dar reikalaus savo aktualios patikros.'],
             ['Realūs verslo faktai','Partnerystės, paslaugos pajėgumas, mūsų marža, tikras srautas ir užklausos, istorija ir registravimo būsena nepatvirtinti.'],
             ['Pagrindinė analizė','45 324 domenų pirminis procesas sustabdytas savininko prašymu; šis darbas tiria tik atrinktus 200.'],
             ['Būsena',status],['Nepavykę tyrimai',str(len(failures or []))],
             ['Tęstinumas','Kiekviena baigta analizė saugoma atskiroje SQLite ir Markdown. Tęsiant kartojami tik neužbaigti kandidatai.']]
    if dr_records:
        facts.extend([['Ahrefs DR',f'Domain Rating by Ahrefs — https://ahrefs.com/ . API rezultatai {dr_count}/200; tikrinta UTC {dr_cache.get("updated_at","")}.'],
                      ['DR apibrėžimas','Santykinis domeno nuorodų profilio stiprumas logaritminėje 0–100 skalėje. DR 0 yra tikra API reikšmė; negautas DR paliekamas tuščias. DR savaime negarantuoja Google pozicijų.'],
                      ['DR API šaltinis',ENDPOINT],['DR API dokumentacija',DOCUMENTATION],['DR duomenų licencija',LICENSE]])
    sheet('Metodika',['Rodiklis','Reikšmė'],[36,150],facts,note)
    xls_path = directory/('top200_su_dr.xls' if dr_snapshot else 'top200_nisu_analize.xls')
    temporary = xls_path.with_suffix('.xls.tmp')
    book.save(str(temporary))
    temporary.replace(xls_path)
    saved = xlrd.open_workbook(xls_path)
    tab = saved.sheet_by_name('TOP200')
    exported = [tab.cell_value(row,1) for row in range(5,tab.nrows)]
    if exported!=ordered or len(set(exported))!=200:
        raise AppError('Tyrimo XLS neapima tiksliai 200 unikalių atrinktų domenų.')
    with csv_path.open(encoding='utf-8-sig',newline='') as handle:
        csv_rows = list(csv.DictReader(handle,delimiter=';'))
    if [row['Domenas'] for row in csv_rows]!=ordered:
        raise AppError('Tyrimo CSV ir XLS domenai nesutampa.')
    if any(tab.cell_value(row,indices.index(5))!='' for row,domain in enumerate(ordered,5) if domain not in all_items):
        raise AppError('Neištirtas kandidatas turi išgalvotą tyrimo balą.')
    if dr_records:
        for row,domain in enumerate(ordered,5):
            expected = dr_records.get(domain,{})
            actual = tab.cell_value(row,indices.index(20))
            if actual != (expected['domain_rating'] if expected.get('status')=='ok' else ''):
                raise AppError('Eksportuotas DR nesutampa su Ahrefs API rezultatu.')
    state = dict(status=status,categorized=len(complete),total=200,pending=len(pending),
                 model=DEFAULT_MODEL,reasoning_effort=REASONING_EFFORT,signature=SIGNATURE,
                 updated_at=utc_now(),source_sha256=manifest['source']['source_sha256'],
                 pool_screened=manifest['pool_screened'],worker_pid=__import__('os').getpid(),
                 web_calls=sum(item.get('web_calls',0) for item in complete),failures=failures or [],
                 priority_updated_at=manifest.get('priority_updated_at'),
                 priority_sha256=manifest.get('priority_sha256'),
                 dr_count=dr_count,dr_updated_at=dr_cache.get('updated_at'),
                 files_sha256={path.name:hashlib.sha256(path.read_bytes()).hexdigest() for path in (csv_path,xls_path)})
    atomic_json(directory/('top200_dr_status.json' if dr_snapshot else 'research_status.json'),state)
    return state


def research_one(index,domain,manifest,stop):
    first = next(item for item in manifest['screening'] if item['domain']==domain)
    short = read_cache(Path(manifest['cache_directory'])/'analysis.sqlite3',manifest['strategy_signature']).get(domain)
    context = {'research_date':utc_now()[:10],'requested_id':index,
               'candidate':{key:value for key,value in first.items() if key!='i'},
               'previous_name_only_hypothesis':{key:value for key,value in short.items() if key!='i'} if short else None,
               'selection_reason':manifest.get('selection_details',{}).get(domain)}
    client = CodexCLI(DEFAULT_MODEL,SCHEMA,PROMPT+'\n\nProjekto business-validation sutartis:\n'+BUSINESS,
                      context,validate,stop,timeout=1800,allow_web=True)
    return client.classify([(index,domain)])


def research_queue(manifest,prior,limit=0):
    order = manifest.get('selection_details',{})
    pending = [domain for domain in manifest['domains'] if domain not in prior]
    pending.sort(key=lambda domain:order.get(domain,{}).get('research_priority',manifest['domains'].index(domain)))
    if limit:
        pending = pending[:limit]
    # Use the source ID already present in the candidate/context, rather than a
    # second TOP200 ordinal that can conflict with it in the model's reply.
    ids = {item['domain']:item['i'] for item in manifest['screening']}
    # Screening IDs are local to their original 100-domain batch. Repetition
    # across jobs is valid because each research call contains exactly one domain.
    return [(ids[domain],domain,0) for domain in pending]


def refresh_manifest(directory,manifest):
    """Accept priority edits, while rejecting accidental source/portfolio changes."""
    path = Path(directory)/'selection.json'
    if not path.exists():
        return manifest
    updated = json.loads(path.read_text(encoding='utf-8'))
    if (len(updated['domains'])!=len(manifest['domains']) or set(updated['domains'])!=set(manifest['domains']) or
            updated['source']['source_sha256']!=manifest['source']['source_sha256']):
        raise AppError('Vykdymo metu galima keisti prioritetus, bet ne domenų rinkinį ar šaltinį.')
    if 'cache_directory' in manifest:
        updated['cache_directory'] = manifest['cache_directory']
    return updated


def dispatch_slots(saved_count,inflight_count,workers,stop_after_total=0):
    """Reserve one possible success per active call, preventing concurrent overrun."""
    slots = max(0,workers-inflight_count)
    if stop_after_total:
        slots = min(slots,max(0,stop_after_total-saved_count-inflight_count))
    return slots


def run(directory,workers=4,limit=0,stop_after_total=0):
    directory = Path(directory).resolve()
    manifest = json.loads((directory/'selection.json').read_text(encoding='utf-8'))
    if len(manifest['domains'])!=200 or len(set(manifest['domains']))!=200:
        raise AppError('Tyrimui reikia užfiksuotos 200 unikalių domenų atrankos.')
    if extract_domains(Path(manifest['input'])).stats['source_sha256']!=manifest['source']['source_sha256']:
        raise AppError('Domenų šaltinis po atrankos pasikeitė.')
    manifest['cache_directory'] = str(directory)
    stop = threading.Event()
    signal.signal(signal.SIGINT,lambda *_:stop.set())
    stop_path = directory/'.research.stop.request'
    with run_lock(directory):
        stop_path.unlink(missing_ok=True)
        store = Store(directory/'research.sqlite3')
        try:
            prior = store.load(SIGNATURE)
            saved_count = len([domain for domain in manifest['domains'] if domain in prior])
            queue = research_queue(manifest,prior,limit)
            if stop_after_total and saved_count>=stop_after_total:
                queue = []
            failures = []
            def progress(status):
                state = export(directory,manifest,status,failures)
                state.update(stop_after_total=stop_after_total or None,
                             run_baseline_count=len([domain for domain in manifest['domains'] if domain in prior]),
                             remaining_in_run=max(0,stop_after_total-state['categorized']) if stop_after_total else None)
                atomic_json(directory/'research_status.json',state)
                return state
            progress('running' if queue else 'complete' if saved_count==200 else 'limited')
            if not queue:
                return 0
            probe = CodexCLI(DEFAULT_MODEL,SCHEMA,PROMPT,{},validate,stop,allow_web=True)
            probe.preflight()
            print(f'Tiriama {len(queue)} likusių nišų, {workers} Codex CLI / web procesai. Pagrindinė atranka lieka sustabdyta.',flush=True)
            if stop_after_total:
                print(f'Savininko riba: iš viso {stop_after_total} pilnų analizių; dabar {saved_count}, liko iki ribos {max(0,stop_after_total-saved_count)}.',flush=True)
            inflight, fatal = {}, None
            with ThreadPoolExecutor(max_workers=workers) as executor:
                while queue or inflight:
                    if stop_path.exists():
                        stop.set()
                    manifest = refresh_manifest(directory,manifest)
                    # Queue order is rank order, not the source ID (which is local
                    # to the original screening batch). Keep retry attempts intact.
                    priorities = {domain:rank for rank,domain in enumerate(
                        [domain for _,domain,_ in research_queue(manifest,{})],1)}
                    queue.sort(key=lambda job:priorities[job[1]])
                    if stop_after_total and saved_count>=stop_after_total:
                        queue.clear()
                    while queue and dispatch_slots(saved_count,len(inflight),workers,stop_after_total)>0 and not stop.is_set():
                        index,domain,attempt = queue.pop(0)
                        print(f"Pradedamas prioritetas {priorities[domain]}/200: {domain}",flush=True)
                        inflight[executor.submit(research_one,index,domain,manifest,stop)] = (index,domain,attempt)
                    if not inflight:
                        break
                    done,_ = wait(inflight,timeout=0.5,return_when=FIRST_COMPLETED)
                    for future in done:
                        index,domain,attempt = inflight.pop(future)
                        try:
                            items,info,error = future.result()
                            store.record_call(SIGNATURE,info)
                            if error:
                                raise CodexError(error,retryable='limitas' not in error)
                            if len(items)!=1 or items[0]['domain']!=domain:
                                raise CodexError('Tyrimas neatitinka prašyto domeno.',True)
                            if not info.get('web_calls'):
                                raise CodexError('Nėra faktinių web_search įrankio įvykių; tyrimas nepriimamas.',True)
                            items[0]['web_calls'] = info['web_calls']
                            items[0]['web_actions'] = info['web_actions']
                            store.save(SIGNATURE,items)
                            saved_count += 1
                            state = progress('running')
                            print(f"Pilna analizė {state['categorized']}/200: {domain}; šaltiniai {len(items[0]['sources'])}; web {info['web_calls']}",flush=True)
                        except CodexError as exc:
                            if stop.is_set():
                                continue
                            if exc.retryable and attempt<2:
                                queue.append((index,domain,attempt+1))
                                print(f'Kartojamas {domain}: {exc}',flush=True)
                            elif not exc.retryable:
                                fatal = str(exc)
                                stop.set()
                                print('Tyrimas sustabdytas: '+str(exc),flush=True)
                            else:
                                failures.append({'domain':domain,'reason':str(exc)})
                                print(f'Atidėtas {domain}: {exc}',flush=True)
                        except Exception as exc:
                            fatal = f'{type(exc).__name__}: tyrimo išsaugojimo ar eksporto klaida.'
                            stop.set()
                            print(fatal,flush=True)
            count = len([d for d in manifest['domains'] if d in store.load(SIGNATURE)])
            status = 'complete' if count==200 else 'error' if fatal else 'stopped' if stop.is_set() else 'limited' if stop_after_total and count>=stop_after_total else 'partial'
            state = progress(status)
            print(json.dumps(state,ensure_ascii=False),flush=True)
            return 0 if status in ('complete','limited') else 2
        finally:
            store.close()


def main():
    sys.stdout.reconfigure(encoding='utf-8',errors='replace',line_buffering=True)
    parser = argparse.ArgumentParser(description='Pilnas atrinktų TOP200 nišų rinkos ir monetizacijos tyrimas.')
    parser.add_argument('--directory',type=Path,required=True)
    parser.add_argument('--workers',type=int,choices=range(1,5),default=4)
    parser.add_argument('--limit',type=int,default=0)
    parser.add_argument('--stop-after-total',type=int,choices=range(0,201),default=0,
                        help='Sustoti pasiekus šį bendrą patikrintų analizių skaičių; 0 — be ribos.')
    parser.add_argument('--status',action='store_true')
    parser.add_argument('--export-only',action='store_true')
    args = parser.parse_args()
    try:
        if args.status:
            state = json.loads((args.directory/'research_status.json').read_text(encoding='utf-8'))
            state['process_active'] = run_active(args.directory)
            if state['status']=='running' and not state['process_active']:
                state['status']='interrupted'
            print(json.dumps(state,ensure_ascii=False,indent=2))
            return 0
        if args.export_only:
            manifest = json.loads((args.directory/'selection.json').read_text(encoding='utf-8'))
            export(args.directory,manifest,'prepared')
            return 0
        return run(args.directory,args.workers,args.limit,args.stop_after_total)
    except (AppError,CodexError,OSError,ValueError) as exc:
        print('Klaida: '+str(exc),file=sys.stderr)
        return 1


if __name__=='__main__':
    raise SystemExit(main())
