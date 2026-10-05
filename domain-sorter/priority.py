"""Fast name-based queue for every candidate; never a substitute for AI or search data."""
import csv
from dataclasses import dataclass
from functools import lru_cache
import json
from pathlib import Path
import re
import unicodedata


# Relative queue preferences chosen for this portfolio, not measured search volumes/margins.
# Full words/inflections avoid promoting a made-up name merely because a stem occurs in it.
COMMERCIAL_GROUPS = [
    (92, 'pervezimas pervezimai pervezimo pervezimu transportavimas transportavimo kroviniu kraustymas kraustymo kraustymasis'),
    (91, 'santechnikas santechnikai santechnika santechnikos elektrikas elektrikai elektriko elektriku'),
    (91, 'miniekskavatoriai miniekskavatoriu ekskavatoriai ekskavatoriu kasimas kasimo grezimas grezimo'),
    (90, 'padangos padangu padangoms traktoriai traktoriu traktoriams sunkvezimiai sunkvezimiu sunkvezimiams'),
    (90, 'stogai stogu stogams stogas stogo stogdengiai stogdengiu dengimas dengimo'),
    (90, 'sildymas sildymo silumos siurbliai siurbliu siurblys katilai katilu boileriai boileriu kondicionieriai kondicionieriu'),
    (89, 'remontas remonto remontasvilniuje remontavimas remontavimo taisymas taisymo'),
    (89, 'langai langu langams durys duru durims vartai vartu tvoros tvoru tvora tvoroms'),
    (89, 'nuoma nuomos nuomai issinuomok nuomojame nuomojami'),
    (88, 'baldai baldu baldams virtuve virtuves virtuvems spintos spintu spinta'),
    (88, 'trinkeles trinkeliu grindys grindu grindims betonavimas betonavimo betonai betono'),
    (88, 'montavimas montavimo irengimas irengimo renovacija renovacijos rekonstrukcija rekonstrukcijos'),
    (87, 'saules elektrines elektriniu elektrine elektrinei baterijos bateriju akumuliatoriai akumuliatoriu'),
    (87, 'valymas valymo isvezimas isvezimo isvezame siuksles siuksliu atlieku atliekos'),
    (87, 'vestuves vestuviu vestuvems maitinimas maitinimo maistas maisto maistui'),
    (86, 'vertimas vertimo vertimai vertimu vertejas vertejai verteju'),
    (86, 'darbo darborubas rubai rubu rubams drabuziai drabuziu apranga aprangos aprangai'),
    (86, 'pamokos pamoku pamokoms mokymai mokymu kursai kursu repetitorius repetitoriai'),
    (86, 'kompiuteriai kompiuteriu kompiuteris kompiuterio telefonai telefonu telefonas telefono'),
    (86, 'apsauga apsaugos signalizacija signalizacijos kameros kameru kameras stebejimas stebejimo'),
    (85, 'fasadai fasadu apdaila apdailos plyteles plyteliu plytele dailylentes dailylenciu'),
    (85, 'statyba statybos statybai statybu statybininkai statybininku namai namu namas namo'),
    (85, 'laiptai laiptu tureklai tureklu terasos terasu terasai terasoms pavesines pavesiniu'),
    (85, 'zidiniai zidiniu zidinys zidinio krosneles krosneliu krosnele krosneles'),
    (85, 'garazai garazu garazas garazo angarai angaru sandeliai sandeliu'),
    (85, 'restauravimas restauravimo smeliavimas smeliavimo smeliuoju dazymas dazymo'),
    (85, 'krovimas krovimo kranai kranu keltuvai keltuvu pastoliai pastoliu'),
    (85, 'buhalterija buhalterijos buhalteris buhalteriai buhalterines apskaita apskaitos'),
    (84, 'programavimas programavimo svetaines svetainiu svetaine svetaines tinklapiai tinklapiu tinklapio'),
    (84, 'buitine buitines technika technikos spausdintuvas spausdintuvai spausdintuvu lazerinis spausdinimas spausdinimo'),
    (84, 'plovimas plovimo skalbimas skalbimo skalbykla skalbyklos skalbimas'),
    (83, 'sodyba sodybos sodybu sodyboms poilsis poilsio viesbuciai viesbuciu apartamentai apartamentu'),
    (83, 'keliones kelioniu kelione bilietai bilietu lektuvu lektuvai skrydziai skrydziu'),
    (83, 'limuzinai limuzinu automobiliai automobiliu automobiliams auto mikroautobusai mikroautobusu'),
    (83, 'turbinos turbinu stabdziai stabdziu duslintuvai duslintuvu ratlankiai ratlankiu servisas serviso'),
    (82, 'nagai nagu priauginimas priauginimo kirpimas kirpimo kirpykla kirpyklos kosmetika kosmetikos'),
    (82, 'fotografas fotografai fotografu fotografavimas fotografavimo fotosesija fotosesijos fotostudija fotostudijos'),
    (82, 'renginiai renginiu renginys sventes svenciu dekoracijos dekoraciju dekoravimas dekoravimo'),
    (82, 'geodezija geodezijos matavimai matavimu projektavimas projektavimo projektai projektu'),
    (82, 'vanduo vandens filtrai filtru filtras filtro nuotekos nuoteku kanalizacija kanalizacijos'),
    (82, 'logistika logistikos sandeliavimas sandeliavimo ekspedijavimas ekspedijavimo'),
    (81, 'dazasvydis dazasvydzio pabegimo kambarys kambariai kambariu pramogos pramogu'),
    (80, 'pirtis pirtys pirciu kubilas kubilai kubilu baseinas baseinai baseinu'),
    (80, 'vezimelis vezimeliai vezimeliu vezimukas vezimukai vezimuku zaislai zaislu'),
    (80, 'sportas sporto dviraciai dviraciu dviratis dviracio treniruotes treniruociu'),
    (80, 'gyvunai gyvunu sunys sunu suniu katinai katinu maistassunims aviganis'),
    (79, 'veja vejos vejai veju bortai bortu kiemas kiemo aplinka aplinkos aplinkai zeldinimas zeldinimo'),
    (78, 'dovanos dovanu dovana dovanoms geles geliu floristas floriste floristika floristikos'),
    (77, 'malkos malku briketai briketu kuras kuro granules granuliu'),
    (76, 'prekes prekiu prekyba prekybos parduotuve parduotuves tiekejas tiekejai tiekeju'),
    (75, 'bendradarbystes bendradarbyste coworking biurai biuru biuras biuro'),
    (68, 'batai batu rankines rankiniu papuosalai papuosalu kvepalai kvepalu'),
    (65, 'advokatas advokatai advokatu teisines teisine teisiniu sutartys sutarciu teise teises'),
    (62, 'paskola paskolos paskolu paskoloms kreditas kreditai kreditu draudimas draudimo finansai finansu'),
    (60, 'masazas masazai masazu gydymas gydymo odontologija odontologijos implantai implantu klinika klinikos'),
    (58, 'receptai receptu receptas recepto dieta dietos sveikata sveikatos'),
    (45, 'filmai filmu filmas kino muzika muzikos naujienos naujienu pazintys pazinciu'),
    (25, 'kazino casinos casino poker pokerio pokeris lošimai losimai losimu sex porno'),
]
QUALIFIERS = '''ir bei su be internetu internete online pigiai pigus pigios pigiu
profesionalus profesionalios profesionaliu greitas greiti greitos greitu greita
mediniai medines mediniu mediniam mediniams metaliniai metalines metaliniu
plastikiniai plastikines plastikiniu aliuminio stiklo odos odiniai odiniu
elektriniai elektrines elektriniu automatines automatiniu mobilus mobilios mobiliu
mazi mazos mazu dideli dideles dideliu nauji naujos nauju naudoti naudotos naudotu
vidaus lauko kiemo pramoniniai pramoniniu zemes ukio zemesukio parkavimo
lengvuju sunkiasvoriu vaikams vaiku moterims moteru vyrams vyru
anglu lietuviu vokieciu norvegu kalba kalbos kalbu kalboms 3d gsm
vilnius vilniaus vilniuje kaunas kauno kaune klaipeda klaipedos klaipedoje
siauliai siauliu siauliuose panevezys panevezio panevezyje alytus alytaus alytuje
marijampole marijampoles marijampoleje telsiai telsiu telsiuose taurage taurages taurageje
utena utenos utenoje mazeikiai mazeikiu mazeikiuose jonava jonavos jonavoje
kedainiai kedainiu kedainiuose silute silutes siluteje ukmerge ukmerges ukmergeje
palanga palangos palangoje druskininkai druskininku druskininkuose trakai traku trakuose
nida nidos nidoje juodkrante juodkrantes juodkranteje priekule priekules priekuleje
lietuvos lietuva lietuvoje lt'''.split()
POSSIBLE_BRAND_TOKENS = '''nike adidas volkswagen mercedes mustang cedral steam
google apple samsung iphone bmw audi tesla dotnuvos autogamma'''.split()


def normalize(value):
    value = ''.join(c for c in unicodedata.normalize('NFKD', value.lower())
                    if not unicodedata.combining(c))
    return re.sub('[^a-z0-9]', '', value)


@dataclass(frozen=True)
class NamePriority:
    domain: str
    score: float
    coverage: float
    weight: int
    matches: tuple
    signals: tuple


def rank_domain_names(domains, previous=()):
    """Rank every source member once. Prior AI supplies lexical clues, never final AI scores."""
    vocabulary = {}
    for weight, words in COMMERCIAL_GROUPS:
        for word in words.split():
            word = normalize(word)
            vocabulary[word] = max(weight, vocabulary.get(word, 0))
    for word in QUALIFIERS:
        vocabulary.setdefault(normalize(word), 0)
    # A broad topic or adjective alone is weaker than a complete product/service phrase.
    vocabulary.update({'darbo':72, 'namai':78, 'namu':75, 'namas':78, 'namo':75,
                       'statyba':82, 'statybos':82, 'saules':62, 'silumos':70,
                       'maistas':72, 'maisto':70, 'sporto':65, 'sportas':65,
                       'buitine':50, 'buitines':50, 'lazerinis':55, 'prekes':60,
                       'prekiu':60, 'technika':72, 'technikos':70})
    cautions = {}
    for item in previous:
        domain = item['domain']
        if item.get('r') == 'brand' or item.get('f') == 'brand':
            cautions[domain] = 'brand'
        elif item.get('c') == 'unclear':
            cautions.setdefault(domain, 'unclear')
        elif item.get('r') in ('regulated', 'gambling', 'adult'):
            cautions.setdefault(domain, item['r'])
        if (item.get('f') == 'keyword' and item.get('r') == 'none' and
                item.get('k', 0) >= 4 and item.get('q', 0) >= 85):
            phrase = normalize(item.get('t', ''))
            if 4 <= len(phrase) <= 50:
                vocabulary.setdefault(phrase, 78)
            for word in item.get('t', '').split():
                token = normalize(word)
                if len(token) >= 5:
                    vocabulary.setdefault(token, 74)
    by_first = {}
    for token, weight in vocabulary.items():
        by_first.setdefault(token[0], []).append((token, weight))
    for tokens in by_first.values():
        tokens.sort(key=lambda item: (-len(item[0]), -item[1], item[0]))

    def evaluate(domain):
        raw_label, suffix = domain.rsplit('.', 1)
        try:
            raw_label = raw_label.encode('ascii').decode('idna')
        except (UnicodeError, UnicodeEncodeError):
            pass
        label = normalize(raw_label)

        @lru_cache(None)
        def split_at(index):
            if index == len(label):
                return 0, 0, ()
            best = split_at(index + 1)
            for token, weight in by_first.get(label[index], ()):
                if label.startswith(token, index):
                    covered, maximum, parts = split_at(index + len(token))
                    candidate = covered + len(token), max(maximum, weight), ((token, weight),) + parts
                    if candidate[:2] > best[:2]:
                        best = candidate
            return best

        covered, weight, parts = split_at(0)
        commercial = tuple(token for token, value in parts if value)
        ratio = covered / max(len(label), 1)
        signals = []
        if commercial:
            if covered == len(label):
                score = weight + (8 if len(parts) == 1 else 5)
                signals.append('Visos dalys atpažintos žodyne; yra komercinis raktažodis')
            else:
                score = weight * (0.30 + 0.70 * ratio) - 12
                signals.append('Komercinė dalis su neatpažintu priedu')
                if ratio < 0.55:
                    score = min(score, 35)
        else:
            score = 5 if len(label) >= 4 else 0
            signals.append('Komercinis raktažodis žodyne neatpažintas')
        digits = re.sub('3d|5g', '', label)
        if any(character.isdigit() for character in digits):
            score = min(score, 45)
            signals.append('Skaitinis priedas; tikrą produkto žymėjimą įvertins AI')
        caution = cautions.get(domain)
        if caution == 'brand' or any(token in label for token in POSSIBLE_BRAND_TOKENS):
            score = min(score, 25)
            signals.append('Galimo svetimo ženklo požymis; teisės netikrintos')
        elif caution == 'unclear':
            score = min(score, 15)
            signals.append('Ankstesnė semantika neaiški')
        elif caution in ('regulated', 'gambling', 'adult'):
            score = min(score, 65 if caution == 'regulated' else 40)
            signals.append('Ankstesnio vertinimo sudėtingesnio starto požymis')
        if suffix != 'lt':
            score -= 5
            signals.append('Ne .lt auditorijos prielaida')
        if len(label) > 40:
            score -= 5
            signals.append('Labai ilgas pavadinimas')
        return NamePriority(domain, round(max(0, min(99, score)), 1), round(ratio, 4),
                            weight, commercial, tuple(signals))

    result = [evaluate(domain) for domain in domains]
    return sorted(result, key=lambda item: (-item.score, -item.weight, -item.coverage,
                                           len(item.domain), item.domain))


def write_priority(directory, priorities, source_sha256, screened=()):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / 'domenai_ai_eile.csv'
    temporary = path.with_name(path.name+'.tmp')
    done = set(screened)
    with temporary.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.writer(handle, delimiter=';')
        writer.writerow(['Vieta eilėje', 'Domenas', 'Eilės balas (heuristinis)',
                         'Atpažintos komercinės dalys', 'Pavadinimo požymiai', 'AI būsena sukuriant eilę'])
        for position, item in enumerate(priorities, 1):
            writer.writerow([position, item.domain, f'{item.score:.1f}'.replace('.', ','),
                             ', '.join(item.matches), '; '.join(item.signals),
                             'Jau įvertintas' if item.domain in done else 'Laukia AI'])
    temporary.replace(path)
    definition = {'source_sha256':source_sha256, 'total':len(priorities),
                  'method':'Vietinis pavadinimo žodynas, natūralios frazės, priedai ir ankstesnės semantinės užuominos',
                  'limits':'Eilės balas nėra AI galutinis balas, išmatuota paklausa, marža, DR ar Google pozicija.',
                  'already_screened':len(done), 'ai_calls':0}
    metadata = directory / 'priority_status.json'
    temporary = metadata.with_name(metadata.name+'.tmp')
    temporary.write_text(json.dumps(definition,ensure_ascii=False,indent=2),encoding='utf-8')
    temporary.replace(metadata)
    return path
