"""Preserved screening taxonomy and explicit, conservative lexical hints."""

import re
import unicodedata

CATEGORIES = {
    "construction": "Statyba ir remontas",
    "home": "Namai, interjeras ir baldai",
    "energy": "Energetika, šildymas ir inžinerija",
    "property": "Nekilnojamasis turtas",
    "auto": "Automobiliai ir transportas",
    "finance": "Finansai, draudimas ir apskaita",
    "legal": "Teisinės paslaugos",
    "business": "Verslas ir B2B paslaugos",
    "tech": "IT, programinė įranga ir AI",
    "marketing": "Rinkodara, dizainas ir interneto svetainės",
    "health": "Sveikata, odontologija ir medicina",
    "beauty": "Grožis ir asmens priežiūra",
    "sport": "Sportas ir aktyvus laisvalaikis",
    "food": "Maistas, receptai ir gėrimai",
    "tourism": "Kelionės, turizmas ir apgyvendinimas",
    "events": "Renginiai, šventės ir vestuvės",
    "education": "Mokslas, mokymai ir kalbos",
    "jobs": "Darbas, karjera ir personalas",
    "family": "Vaikai, šeima ir tėvystė",
    "pets": "Gyvūnai ir veterinarija",
    "agriculture": "Žemės ūkis, sodas ir miškininkystė",
    "industry": "Pramonė, įranga ir gamyba",
    "logistics": "Logistika, sandėliavimas ir siuntos",
    "commerce": "Prekyba ir bendri parduotuvių vardai",
    "fashion": "Mada, drabužiai ir aksesuarai",
    "gifts": "Dovanos, rankdarbiai ir personalizacija",
    "electronics": "Elektronika ir buitinė technika",
    "cleaning": "Valymas ir buitinės paslaugos",
    "security": "Apsauga ir saugumas",
    "entertainment": "Pramogos, žaidimai ir hobiai",
    "media": "Medija, kultūra ir naujienos",
    "community": "Bendruomenės, miestai ir organizacijos",
    "adult": "Suaugusiųjų turinys ir pažintys",
    "gambling": "Azartiniai lošimai",
    "other": "Kita aiški niša",
    "unclear": "Neaiškūs arba tik prekės ženklo vardai",
    "unclassified": "Dar nesukategorizuota",
}

# These are navigation hints, not a new business valuation or classifier model.
# Domain-name inference needs >=6 letters and an unambiguous single category.
HINTS = {
    "construction": "statyba statybos remontas stogai stogu pastoliai trinkeles betonavimas laiptai fasadai tvoros",
    "home": "baldai baldu virtuves interjeras spintos ciuziniai uzuolaidos",
    "energy": "sildymas silumos katilai rekuperacija ventiliacija elektrines santechnika kondicionieriai",
    "property": "butai butu namunuoma nekilnojamasis brokeris butopirkimas",
    "auto": "automobiliai autoelektrikai autoservisas padangos ratlankiai duslintuvai automobilis autonuoma",
    "finance": "buhalterija apskaita draudimas paskolos kreditai finansai",
    "legal": "advokatas advokatai teisininkas teisininkai sutartys teisine",
    "business": "verslas imones konsultacijos administratore klientuvaldymas vertimai",
    "tech": "programavimas programine kompiuteriai serveriai dirbtinis intelektas software technology",
    "marketing": "svetaines svetainiu rinkodara marketingas reklama dizainas seo",
    "health": "odontologija dantys implantai klinika gydymas gydytojas medicina",
    "beauty": "kirpykla kosmetika depiliacija manikiuras pedikiuras visaziste grozis",
    "sport": "sportas dviraciai treniruotes krepsinis futbolas begimas",
    "food": "maistas receptai kepiniai konditerija kava arbata restoranai",
    "tourism": "keliones turizmas viesbutis viesbuciai apartamentai apgyvendinimas sodybos",
    "events": "vestuves renginiai sventes fotografas fotosesija dekoracijos",
    "education": "mokymai mokytojas mokytoja mokykla mokslas korepetitoriai pamokos kursai kalbos teacher tutor education learning",
    "jobs": "darbas karjera personalas vairuotojams darbuotojai",
    "family": "vaikai seima tevyste zaislai vezimeliai",
    "pets": "gyvunai augintiniai veterinarija sunims katems",
    "agriculture": "zemesukis traktoriai sodas miskininkyste medziuprieziura agroiranga",
    "industry": "pramone gamyba metalo stakles suvirinimas pjaustymas",
    "logistics": "logistika sandeliavimas siuntos kroviniu pervezimas ekspedijavimas",
    "commerce": "prekyba parduotuve prekes tiekejai",
    "fashion": "drabuziai apranga batai papuosalai rankines mada",
    "gifts": "dovanos dovana rankdarbiai personalizacija geliu",
    "electronics": "elektronika telefonai televizoriai spausdintuvai buitinetechnika",
    "cleaning": "valymas plovimas skalbykla valymo svara",
    "security": "apsauga signalizacija stebejimas kameros praejimokontrole",
    "entertainment": "pramogos zaidimai dazasvydis pabegimokambarys hobiai",
    "media": "naujienos kultura muzika filmai fotografija",
    "community": "bendruomene bendruomenes organizacija klubas",
    "adult": "suaugusiems erotika porno pazintys",
    "gambling": "kazino casino pokeris losimai gambling",
}


def folded(value: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", value.casefold())
                   if not unicodedata.combining(c))


def tokens(value: str) -> list[str]:
    return list(dict.fromkeys(re.findall(r"[a-z0-9]+", folded(value))))


def infer_category(domain: str) -> tuple[str, list[str]]:
    label = folded(domain.rsplit(".", 1)[0])
    matches = {key: [word for word in words.split() if len(word) >= 6 and word in label]
               for key, words in HINTS.items()}
    matches = {key: value for key, value in matches.items() if value}
    if len(matches) == 1:
        category = next(iter(matches))
        return category, matches[category][:8]
    return "unclassified", []


def niche_categories(value: str) -> dict[str, list[str]]:
    text = folded(value)
    words = tokens(value)
    result = {}
    for key, hints in HINTS.items():
        matched = [word for word in hints.split()
                   if word in words or (len(word) >= 5 and word in text)]
        # Category labels are useful to a customer who has already picked a niche.
        matched += [word for word in tokens(CATEGORIES[key]) if len(word) >= 5 and word in words]
        if matched:
            result[key] = list(dict.fromkeys(matched))[:8]
    return result
