"""Choose a diverse commercial research portfolio from the frozen screening pool."""
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import sys
import unicodedata

from classifier import DEFAULT_INPUT, DEFAULT_OUTPUT, extract_domains, signature_for, ranked
from pipeline import read_cache, atomic_json
from preview_top import prepare, MODEL


def plain(value):
    return ''.join(c for c in unicodedata.normalize('NFKD',value.lower()) if not unicodedata.combining(c))


ALIASES = [
    (r'pastoli', 'pastoliu-nuoma'),
    (r'antkap|kapu paminkl', 'kapu-paminklai'),
    (r'geliu.*prekyb|geles.*puokst|geliu puokst', 'geliu-puokstes'),
    (r'maistas renginiams|vestuviu maitin|svenciu maitin|renginiu maitin', 'renginiu-maitinimas'),
    (r'pir(ci|t).*nuom|nuom.*pir', 'pirciu-nuoma'),
    (r'kubilu nuom|mobiliu kubilu', 'kubilu-nuoma'),
    (r'apgyvendinim|apartamentu nuom|nameliu nuom|butu nuom|kambariu nuom', 'trumpalaikis-apgyvendinimas'),
    (r'namu apsaug|apsaugos signaliz', 'namu-signalizacija'),
    (r'prekes.*gyvun|prekes.*augint', 'augintiniu-prekes'),
    (r'misko darbu|miskininkystes paslaug', 'misko-darbai'),
    (r'domen.*registr|verslo domen', 'domenai-verslui'),
    (r'fotografavimas ir filmavimas|vestuviu fotograf', 'vestuviu-foto-video'),
    (r'elektronin.*parduotu.*kur|e[ .-]*parduotu.*kur|paruost.*elektronin', 'e-parduotuviu-kurimas'),
    (r'(interneto|internetiniu|internetines).*svetain.*kur|svetain.*kur|interneto.*puslapi.*kur|paruost.*interneto', 'svetainiu-kurimas'),
    (r'svetain.*(prieziur|administrav)', 'svetainiu-prieziura'),
    (r'kompiuter.*prieziur|it pagalb|it prieziur', 'kompiuteriu-prieziura'),
    (r'(namu|busto|butu|gyvenamu).*valym|namu tvarkym', 'namu-valymas'),
    (r'biuru valym|verslo patalpu valym|komerciniu patalpu valym', 'verslo-patalpu-valymas'),
    (r'aplinkos tvarkym|gerbuvio darb', 'aplinkos-tvarkymas'),
    (r'apzeldinim|zeldynu.*ireng', 'apzeldinimas'),
    (r'tvor.*(ireng|montav|gamyb)|metalin.*tvor', 'tvoru-irengimas'),
    (r'autoservis|automobiliu remont', 'bendras-autoservisas'),
    (r'tralo paslaug|automobiliu pervezim', 'automobiliu-pervezimas'),
    (r'kroviniu gabenim|kroviniu pervezim', 'kroviniu-pervezimas'),
    (r'kemperiu nuom|kemperiai$', 'kemperiu-nuoma'),
    (r'gyvunu maist|augintiniu maist|sunu maist', 'sunu-maistas'),
    (r'plienin.*stog|plienin.*stogo dang', 'plienine-stogo-danga'),
    (r'tinkavimo (darb|paslaug)', 'tinkavimo-darbai'),
    (r'betono grezim', 'betono-grezimas'),
    (r'laiptu turekl|tureklu gamyb', 'laiptu-tureklai'),
    (r'fotograf.*filmav|fotografija ir filmav', 'foto-ir-video'),
    (r'depiliac|epiliac|plauku salinim', 'depiliacija'),
    (r'namu statyb|karkasiniu namu statyb', 'namu-statyba'),
    (r'smulku.*namu remont|busto remonto paslaug', 'smulkus-namu-remontai'),
    (r'kolektyvu aprang|reklamin.*aprang|darbo drabuz', 'darbo-ir-imoniu-apranga'),
    (r'stogu irengim|stogu keitim|stogdeng', 'stogu-irengimas'),
    (r'korepetitor|matematikos mokym', 'korepetitoriai'),
    (r'anglu kalb.*pamok|anglu kalb.*mokym|anglu kalb.*kurs', 'anglu-kalbos-mokymai'),
]


def niche_key(item):
    name = plain(item['n'])
    name = re.sub(r'\b(vilniuje|vilnius|kaune|kaunas|klaipedoje|klaipeda|siauliuose|siauliai|panevezyje|alytaus|dzukijoje)\b','',name)
    name = re.sub(r'\s+',' ',name).strip()
    for pattern, key in ALIASES:
        if re.search(pattern,name):
            return key
    name = re.sub(r'\b(paslaugos|paslauga|darbai|prekyba)\b','',name)
    return re.sub(r'[^a-z0-9]+','-',name).strip('-')


def portfolio_value(item, previous):
    value = item['score'] + (3 if item['f']=='keyword' else 0)
    if item['m'] in ('leads','digital','service'):
        value += 2
    if item['c'] in ('business','tech','industry'):
        value += 2
    if re.search(r'prieziur|nuom|administrav|apskait',plain(item['n'])):
        value += 2
    if re.search(r'pigiau|pigus|pigios',item['domain']):
        value -= 3
    detailed = previous.get(item['domain'])
    if detailed and detailed['score']<70:
        value -= 5
    return value


def select(directory):
    directory = Path(directory)
    source = extract_domains(DEFAULT_INPUT)
    source_domains = set(source.domains)
    screen = read_cache(DEFAULT_OUTPUT.parent/'analysis.sqlite3',signature_for(MODEL,'screen'))
    previous = read_cache(DEFAULT_OUTPUT.parent/'analysis.sqlite3',signature_for(MODEL,'strategy'))
    old_preview = DEFAULT_OUTPUT.parent/'top20-test-20261001'
    if old_preview.exists():
        previous.update(read_cache(old_preview/'analysis.sqlite3',signature_for(MODEL,'strategy')))
    candidates = [item for domain,item in screen.items() if domain in source_domains and
                  item['score']>=70 and item['q']>=75 and item['a']>=3 and
                  item['f'] in ('keyword','modified') and item['r'] not in ('brand','adult','gambling')]
    groups = defaultdict(list)
    for item in candidates:
        groups[niche_key(item)].append(item)
    representatives = []
    for key, group in groups.items():
        best = sorted(group,key=lambda item:(-portfolio_value(item,previous),-item['q'],len(item['domain']),item['domain']))[0]
        representatives.append((key,best))
    chosen, counts = [], Counter()
    while len(chosen)<200 and representatives:
        # Diminishing priority per category, not forced representation of weak niches.
        eligible = [(key,item) for key,item in representatives if counts[item['c']]<35]
        if not eligible:
            raise RuntimeError('Nepakanka skirtingų tinkamų nišų su kategorijų limitu.')
        key,best = sorted(eligible,key=lambda pair:(-(portfolio_value(pair[1],previous)-counts[pair[1]['c']]*0.7),
                                                   -pair[1]['q'],len(pair[1]['domain']),pair[1]['domain']))[0]
        chosen.append((key,best))
        counts[best['c']] += 1
        representatives.remove((key,best))
    if len(chosen)!=200:
        raise RuntimeError('Nepakanka 200 tinkamų nišų.')
    manifest = prepare(directory,top_n=200,ranking_stage='screen',
                       reuse_previews=[old_preview] if old_preview.exists() else [],
                       selected_domains=[item['domain'] for _,item in chosen])
    selection_details = {item['domain']:{'niche_key':key,'research_priority':index,
                         'selection_value_heuristic':portfolio_value(item,previous),
                         'reason':'Aiškus komercinis pavadinimas, tinkamas pirmos fazės paklausos testui; vienas šios suvienodintos nišos atstovas.',
                         'alternative_domains':[other['domain'] for other in ranked(groups[key]) if other['domain']!=item['domain']][:5]}
                         for index,(key,item) in enumerate(chosen,1)}
    manifest.update(selection_details=selection_details,eligible_count=len(candidates),
                    eligible_niches=len(groups),category_counts=dict(counts),
                    selection_method='Vienas suvienodintos nišos atstovas; score>=70, q>=75, a>=3, keyword/modified; vertinimas + komercinis/periodinis tinkamumas; kategorijos papildomų kandidatų prioritetas mažėja po 0,7, max35 vienoje kategorijoje. Tai analitiko atrankos politika, ne išmatuotos rinkos dydis.')
    atomic_json(directory/'selection.json',manifest)
    print(json.dumps({'selected':200,'pool':manifest['pool_screened'],'eligible_niches':len(groups),
                      'categories':dict(counts),'rows':[f"{item['domain']} | {item['score']} | {item['n']}" for item in manifest['screening']]},
                     ensure_ascii=False,indent=2))


if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    select(sys.argv[1])
