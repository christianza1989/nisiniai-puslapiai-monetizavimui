"""An explicit partial-pool experiment, isolated from the ongoing full pipeline."""
import argparse
from contextlib import closing
import csv
import hashlib
import json
import math
from pathlib import Path
import signal
import sqlite3
import sys
import threading

import xlrd
import xlwt

from classifier import (AppError, CodexError, Options, Store, DEFAULT_INPUT, DEFAULT_OUTPUT,
                        CATEGORIES, MONETIZATION, RISKS, CSV_HEADERS, NAME_TYPES,
                        REASONING_EFFORT, VERSION, SCREEN_VERSION, extract_domains, signature_for,
                        ranked, priority, run_lock, _run, utc_now, _csv_cell)
from pipeline import atomic_json, read_cache

MODEL = 'gpt-6.1-sol'
TITLE = 'BANDOMASIS TOP 20 iš dalinio sąrašo'


def prepare(directory, source=DEFAULT_INPUT, main=DEFAULT_OUTPUT.parent, top_n=20,
            ranking_stage='strategy', reuse_previews=(), selected_domains=None):
    if not 1 <= top_n <= 10000 or ranking_stage not in ('screen','strategy'):
        raise AppError('TOP apimtis 1–10 000; reitingas screen arba strategy.')
    directory, source, main = Path(directory).resolve(), Path(source).resolve(), Path(main).resolve()
    # This folder must never own or overwrite the full-run state or its cache.
    if directory == main or directory in main.parents:
        raise AppError('Bandymui reikia atskiro išvesties katalogo.')
    directory.mkdir(parents=True, exist_ok=True)
    if (directory / 'selection.json').exists():
        raise AppError('Atranka jau užfiksuota; tęskite ją su --run.')
    extraction = extract_domains(source)
    screen_sig, strategy_sig = signature_for(MODEL, 'screen'), signature_for(MODEL, 'strategy')
    # The main cache is opened strictly read-only; both signatures come from one snapshot.
    with closing(sqlite3.connect((main / 'analysis.sqlite3').as_uri() + '?mode=ro', uri=True)) as conn:
        conn.execute('BEGIN')
        screen, strategies = {}, {}
        source_set = set(extraction.domains)
        for sig, domain, payload in conn.execute(
                'SELECT signature,domain,payload FROM analysis WHERE signature IN (?,?)',
                (screen_sig, strategy_sig)):
            if domain in source_set:
                (screen if sig == screen_sig else strategies)[domain] = json.loads(payload)
    reused_sources = [str(main)]
    for preview in reuse_previews:
        preview = Path(preview).resolve()
        previous = json.loads((preview/'selection.json').read_text(encoding='utf-8'))
        if (previous['strategy_signature'] != strategy_sig or previous['model'] != MODEL or
                previous['source']['source_sha256'] != extraction.stats['source_sha256']):
            raise AppError('Ankstesnio bandymo metodika arba šaltinis nesutampa.')
        for domain, item in read_cache(preview/'analysis.sqlite3',strategy_sig).items():
            if domain in source_set and (domain not in strategies or
                    item.get('analyzed_at','') > strategies[domain].get('analyzed_at','')):
                strategies[domain] = item
        reused_sources.append(str(preview))
    if selected_domains is not None:
        if (len(selected_domains)!=top_n or len(set(selected_domains))!=top_n or
                not set(selected_domains).issubset(screen)):
            raise AppError('Pasirinkti TOP domenai turi būti unikalūs ir jau įvertinti šiame šaltinyje.')
        selected = ranked([screen[domain] for domain in selected_domains])
    else:
        selected = ranked(screen.values())[:top_n]
    if len(selected) != top_n:
        raise AppError(f'Bandomajam TOP {top_n} reikia bent {top_n} pirminių vertinimų.')
    manifest = dict(scope='partial_pool_preview', title=f'BANDOMASIS TOP {top_n} iš dalinio sąrašo', created_at=utc_now(),
                    input=str(source), main_directory=str(main), source=extraction.stats,
                    pool_screened=len(screen), pool_total=len(extraction.domains), top_n=top_n,
                    ranking_stage=ranking_stage, strategy_sources=reused_sources,
                    model=MODEL, reasoning_effort=REASONING_EFFORT,
                    screening_signature=screen_sig, strategy_signature=strategy_sig,
                    domains=[item['domain'] for item in selected], screening=selected,
                    reused_strategy_domains=[item['domain'] for item in selected if item['domain'] in strategies])
    store = Store(directory / 'analysis.sqlite3')
    try:
        # Preserve original AI timestamps; copying is not another model evaluation.
        with store.connection:
            for domain in manifest['reused_strategy_domains']:
                item = strategies[domain]
                store.connection.execute('INSERT INTO analysis VALUES(?,?,?,?)',
                                        (strategy_sig, domain, json.dumps(item, ensure_ascii=False),
                                         item['analyzed_at']))
    finally:
        store.close()
    atomic_json(directory / 'selection.json', manifest)
    export_preview(directory, manifest, 'snapshot_ready' if ranking_stage=='screen' else 'prepared')
    return manifest


def export_preview(directory, manifest, status):
    directory = Path(directory)
    strategies = read_cache(directory / 'analysis.sqlite3', manifest['strategy_signature'])
    screen = {item['domain']: item for item in manifest['screening']}
    top_n = manifest['top_n']
    screening_rank = manifest.get('ranking_stage') == 'screen'
    title_text = manifest.get('title',TITLE)
    # Completed detailed rows lead; pending rows retain their screening order, no invented scores.
    detailed = ranked([strategies[d] for d in manifest['domains'] if d in strategies])
    domains = (manifest['domains'] if screening_rank else
               [item['domain'] for item in detailed] + [d for d in manifest['domains'] if d not in strategies])
    done = len(detailed)
    note = (f"Atrinkta iš {manifest['pool_screened']:,} / {manifest['pool_total']:,} pirminių vertinimų. "
            f"Pirminis reitingas {top_n}/{top_n}; išsamios strategijos {done}/{top_n}. "
            "Tai laikina atranka, ne galutinis visų domenų TOP. DR nematuotas.")
    header = ['Vieta pagal pirminį balą' if screening_rank else 'Vieta po išsamios analizės',
              'Domenas', 'Pirminis balas', 'Išsamus balas',
              'Kategorija', 'Niša', 'Monetizavimo būdas', 'Išsamios analizės būsena']
    overview, ideas, csv_rows = [], [], []
    screen_places = {d: i for i, d in enumerate(manifest['domains'], 1)}
    for position, domain in enumerate(domains, 1):
        first, detailed_item = screen[domain], strategies.get(domain)
        item = first if screening_rank else detailed_item or first
        overview.append([position if screening_rank or detailed_item else None, domain, first['score'],
                         detailed_item['score'] if detailed_item else None,
                         CATEGORIES[item['c']], item['n'], MONETIZATION[item['m']],
                         'Įvertinta išsamiai' if detailed_item else 'Laukia išsamios analizės'])
        if detailed_item:
            ideas.append([domain, detailed_item['u'] + '\n\nSvetainė: ' + detailed_item['p'], detailed_item['e'],
                          detailed_item['z'], detailed_item['h'] + '\n\nKliūtis: ' + detailed_item['l']])
        csv_rows.append([position if screening_rank or detailed_item else '', domain, CATEGORIES[item['c']], item['n'],
                         first['score'] if screening_rank else detailed_item['score'] if detailed_item else '',
                         priority(item['score']) if screening_rank or detailed_item else '', MONETIZATION[item['m']],
                         item['w'], RISKS[item['r']], item['q'], MODEL, item.get('analyzed_at', ''),
                         item['t'], *[detailed_item[key] if detailed_item else '' for key in ('u','p','e','z','h','l')],
                         NAME_TYPES[item['f']], item['a'], SCREEN_VERSION if screening_rank else VERSION if detailed_item else '',
                         'Pirminė atranka' if screening_rank else 'Išsami strategija' if detailed_item else 'Laukia išsamios analizės',
                         first['score'], screen_places[domain],
                         *([detailed_item['score'] if detailed_item else '',
                            'Išsami strategija yra' if detailed_item else 'Išsamios strategijos dar nėra'] if screening_rank else [])])
    csv_path = directory / f'top{top_n}_bandomasis.csv'
    tmp = csv_path.with_suffix('.csv.tmp')
    with tmp.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.writer(handle, delimiter=';')
        writer.writerow(CSV_HEADERS + ['Pirminis balas', 'Vieta pirminėje atrankoje'] +
                        (['Išsamus balas','Išsamios strategijos būsena'] if screening_rank else []))
        writer.writerows([_csv_cell(cell) for cell in row] for row in csv_rows)
    tmp.replace(csv_path)
    book = xlwt.Workbook(encoding='utf-8')
    body = xlwt.easyxf('font: name Arial, height 200; alignment: vert top, wrap on;')
    number = xlwt.easyxf('font: name Arial, height 200; alignment: vert top, horiz right;', num_format_str='0.0')
    integer = xlwt.easyxf('font: name Arial, height 200; alignment: vert top, horiz right;', num_format_str='0')
    heading = xlwt.easyxf('font: name Arial, height 200, bold on, colour white; pattern: pattern solid, fore_colour dark_blue; alignment: vert center, wrap on;')
    title = xlwt.easyxf('font: name Arial, height 280, bold on; alignment: vert center;')
    italic = xlwt.easyxf('font: name Arial, height 200, italic on; alignment: wrap on, vert center;')

    def sheet(name, headings, widths, records, sheet_note):
        tab = book.add_sheet(name)
        tab.show_grid = False
        tab.write_merge(0, 0, 0, len(headings)-1, title_text, title)
        tab.row(0).height = 460
        tab.write_merge(1, 1, 0, len(headings)-1, sheet_note, italic)
        tab.row(1).height = 800
        tab.write_merge(2, 2, 0, len(headings)-1,
                        f"{MODEL} / {REASONING_EFFORT} | Atranka UTC: {manifest['created_at']} | Eksportas UTC: {utc_now()}", italic)
        tab.row(2).height = 480
        for col, label in enumerate(headings):
            tab.write(4, col, label, heading)
            tab.col(col).width = int(widths[col]*256)
        tab.row(4).height = 850
        for row, values in enumerate(records, 5):
            lines = max(sum(max(1, math.ceil(len(line)/max(widths[col]-2, 1)))
                            for line in str(value or '').split('\n')) for col, value in enumerate(values))
            tab.row(row).height = min(7800, max(1000, (lines+1)*260))
            for col, value in enumerate(values):
                tab.write(row, col, '' if value is None else value,
                          integer if isinstance(value,int) else number if isinstance(value,float) else body)
        tab.set_panes_frozen(True)
        tab.set_horz_split_pos(5)
        tab.set_vert_split_pos(2 if name.startswith('TOP') else 1)
        return tab

    sheet(f'TOP{top_n}', header, [13,38,13,13,35,34,36,28], overview, note)
    sheet('Idėjos', ['Domenas', 'Klientas ir pirmos svetainės idėja', 'Kas mokėtų ir už ką',
                    'Alternatyvios pajamos', 'Paklausos testas ir kliūtis'],
          [38,66,58,58,68], ideas,
          f"Turimos išsamios strategijos {done}/{top_n}. Tik jų idėjos; rinkos tyrimas ir partnerių patvirtinimas dar neatlikti.")
    facts = [['Atrankos apimtis', f"Tik {manifest['pool_screened']} iki {manifest['created_at']} išsaugotų pirminių vertinimų, visas šaltinis {manifest['pool_total']} domenai."],
             ['Šaltinis', manifest['source']['source_file']],
             ['Šaltinio SHA-256', manifest['source']['source_sha256']],
             ['Atrankos taisyklė', 'Pirminis balas mažėjančiai, tada semantikos aiškumas mažėjančiai, vienodi rezultatai pagal domeną abėcėliškai. Tai gali sugrupuoti vienodo balo domenus abėcėlės pradžioje.'],
             ['Galutinis eiliškumas', 'Visi atrinkti domenai pagal tą patį pirminį balą. Išsamus balas yra atskiras ir nekeičia pirminės vietos.' if screening_rank else 'Tik išsamiai įvertinti domenai rikiuojami pagal išsamų balą. Laukiantys rodomi gale, su tuščiu išsamiu balu ir vieta.'],
             ['Modelis', f'{MODEL} / {REASONING_EFFORT}'],
             ['Pakartotinai panaudoti', f"{len(manifest['reused_strategy_domains'])} ankstesnių strategijų, originalios AI datos išlaikytos. Detalės tik turimų strategijų eilutėse."],
             ['Strategijų šaltiniai', '\n'.join(manifest.get('strategy_sources',[manifest['main_directory']]))],
             ['Pirminio vertinimo parašas', manifest['screening_signature']],
             ['Strategijos parašas', manifest['strategy_signature']],
             ['Išsami metodika', 'k30/d20/v25/s10/b15 × (0,5 + q/200) × starto koeficientas a0=0,55; a1=0,64; a2=0,73; a3=0,82; a4=0,91; a5=1. Modifikuotas raktažodis k≤3; brandas k≤1 ir balas≤35; reguliuojama niša a≤3.'],
             ['Ko dar nežinome', 'DR, backlink kokybė, domeno istorija, prieinamumas, prekių ženklai, paieškų kiekis, tikros kainos, maržos ir paklausa netikrinti. Balas nėra Google pozicijų ar pelno garantija.'],
             ['Pilno proceso būsena', 'Pagrindinis procesas ir jo DB nekeičiami. Šis testas neįjungia galutinio TOP1000 etapo.'],
             ['Būsenos reikšmė', f'{status}; pirminiai {top_n}/{top_n}, turimos strategijos {done}/{top_n}. snapshot_ready reiškia paruoštą turimų duomenų eksportą, ne visų išsamių strategijų sukūrimą.']]
    sheet('Metodika', ['Rodiklis', 'Reikšmė'], [36,125], facts, note)
    xls_path = directory / f'top{top_n}_bandomasis.xls'
    temporary = xls_path.with_suffix('.xls.tmp')
    book.save(str(temporary))
    temporary.replace(xls_path)
    # Independent saved-file reconciliation catches exports that silently omit candidates.
    saved = xlrd.open_workbook(xls_path)
    tab = saved.sheet_by_name(f'TOP{top_n}')
    exported_domains = [tab.cell_value(row,1) for row in range(5,tab.nrows)]
    if exported_domains != domains or len(set(exported_domains)) != top_n:
        raise AppError('TOP XLS domenų aprėptis neatitinka užfiksuotos atrankos.')
    with csv_path.open(encoding='utf-8-sig',newline='') as handle:
        rows = list(csv.DictReader(handle,delimiter=';'))
    if [row['Domenas'] for row in rows] != domains:
        raise AppError('TOP CSV ir XLS nesutampa.')
    completed_scores = [tab.cell_value(row,2 if screening_rank else 3)
                        for row in range(5,5+(top_n if screening_rank else done))]
    if completed_scores != sorted(completed_scores,reverse=True):
        raise AppError('TOP pasirinkto etapo balai nesurikiuoti.')
    if xls_path.read_bytes()[:8] != bytes.fromhex('D0CF11E0A1B11AE1'):
        raise AppError('TOP išvestis nėra tikras XLS.')
    state = dict(scope=manifest['scope'],status=status,categorized=top_n if screening_rank else done,total=top_n,
                 strategy_categorized=done,ranking_stage=manifest.get('ranking_stage','strategy'),
                 pool_screened=manifest['pool_screened'],pool_total=manifest['pool_total'],
                 model=MODEL,reasoning_effort=REASONING_EFFORT,updated_at=utc_now(),
                 verified_domains_unique=True,verified_csv_xls_match=True,
                 files={path.name:hashlib.sha256(path.read_bytes()).hexdigest() for path in (csv_path,xls_path)})
    atomic_json(directory/'preview_status.json',state)
    return state


def run_preview(directory):
    directory = Path(directory).resolve()
    manifest = json.loads((directory/'selection.json').read_text(encoding='utf-8'))
    if extract_domains(Path(manifest['input'])).stats['source_sha256'] != manifest['source']['source_sha256']:
        raise AppError('Šaltinis pasikeitė po bandomosios atrankos.')
    if signature_for(MODEL,'strategy') != manifest['strategy_signature']:
        raise AppError('Strategijos metodika pasikeitė; senos atrankos nemaišome.')
    stop = threading.Event()
    signal.signal(signal.SIGINT,lambda *_:stop.set())
    work = directory/'work'
    with run_lock(directory):
        export_preview(directory,manifest,'running')
        last_state = None
        def report(message):
            print(message,flush=True)
            if message.startswith('AI: '):
                export_preview(directory,manifest,'running')
        try:
            result = _run(Options(input=Path(manifest['input']),output=work/'strategijos.xls',
                                  model=MODEL,batch_size=6,workers=2,stage='strategy',
                                  cache_file=directory/'analysis.sqlite3',selected_domains=manifest['domains'],
                                  owner_lock_directory=directory,stop_file=directory/'.stop.request'),
                          report=report,stop=stop)
            last_state = export_preview(directory,manifest,result['status'])
            print(json.dumps(last_state,ensure_ascii=False),flush=True)
            return 0 if result['status']=='complete' else 2
        except Exception:
            if last_state is None:
                export_preview(directory,manifest,'error')
            raise


def main():
    sys.stdout.reconfigure(encoding='utf-8',errors='replace',line_buffering=True)
    parser = argparse.ArgumentParser(description='Atskiras dalinio sąrašo TOP eksperimentas arba turimų duomenų eksportas.')
    parser.add_argument('--directory',type=Path,required=True)
    parser.add_argument('--run',action='store_true')
    parser.add_argument('--top',type=int,default=20)
    parser.add_argument('--rank-by',choices=['screen','strategy'],default='strategy')
    parser.add_argument('--reuse-preview',type=Path,action='append',default=[])
    args = parser.parse_args()
    try:
        if args.run:
            return run_preview(args.directory)
        manifest = prepare(args.directory,top_n=args.top,ranking_stage=args.rank_by,reuse_previews=args.reuse_preview)
        print(json.dumps({'directory':str(args.directory.resolve()),'pool_screened':manifest['pool_screened'],
                          'top_n':manifest['top_n'],'reused_strategy_count':len(manifest['reused_strategy_domains'])},
                         ensure_ascii=False,indent=2))
        return 0
    except (AppError,CodexError) as exc:
        print('Klaida: '+str(exc),file=sys.stderr)
        return 1


if __name__=='__main__':
    raise SystemExit(main())
