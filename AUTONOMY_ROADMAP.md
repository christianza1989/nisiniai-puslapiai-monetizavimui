# Autonominis nišinių svetainių turinio ciklas

Atnaujinta 2026-09-30. Savininkas nurodo nišą ir tikslą; agentai patys tiria ketinimus, parenka savitą pasiūlymo hipotezę, planuoja, rašo, tikrina, skelbia ir matuoja. Kalendorius yra **agento darbo rezultatų ir išimčių vaizdas**, ne savininko pildomas darbų sąrašas. Kiekvienas domenas turi atskirus faktus, kontaktus, šaltinius, užklausas ir metrikas.

## Būsenos ir išėjimo sąlygos

Planavimo, rašymo ir redakcinės patikros metodiką apibrėžia [bendras nišų skill](SKILLS/niche-content-planner/SKILL.md). Studija instrukcijas įkelia į kiekvieną Codex CLI darbą, išsaugo jų kontrolinę sumą ir vienai partijai naudoja nekintantį instrukcijų vaizdą. Skill neįgyvendina toliau nurodytų trūkstamų patikros bei publikavimo etapų savaime.

| Etapas | Automatinis darbas | Patikrinama išėjimo sąlyga |
|---|---|---|
| Nišos žvalgyba | Konkurentų ir paieškos ketinimų tyrimas, pasiūlymo hipotezė | Šaltinių data, unikalus pasiūlymas, faktų ir prielaidų atskyrimas `sites/<siteId>.md` |
| Šešių mėnesių planas | Sezoniniai ir nuolatiniai klausimai, klasteriai, datos, pagrindiniai URL, vidinių nuorodų grafas | Vienas atskiras klausimas kiekvienam URL; nėra sinonimų ar miestų puslapių vien dėl apimties |
| Juodraščiai ir medija | Codex CLI tekstas, ImageGen iliustracijos, pirmieji ryšiai ir šaltinių kandidatai | Privati `noindex` peržiūra; kilmė, alt tekstas, faktų klausimų sąrašas |
| Faktų patikra | Atverti pirminius šaltinius, išskirti teiginius, palyginti su aktualiais dokumentais, taisyti arba šalinti nepagrįstą teiginį | Kiekvienam reikšmingam išoriniam teiginiui yra tinkamas šaltinis ir `checkedAt`; verslo pažadai remiasi patvirtintais domeno faktais |
| Publikavimo vartai | Tikrinti URL unikalumą, nuorodų taikinius, kontaktą, formą, privatumo tekstą, mediją ir nepakeistos versijos hash; kurti paketą ir diegti | Patvirtintas paketas; tik tada `publishAt` gali įjungti URL; nepraėję puslapiai lieka privatūs |
| Stebėsena ir sprendimas | Atskiro domeno GSC, srauto, užklausų ir pristatymo rodiklių stebėsena; eksperimento korekcijos | 60–90 dienų po indeksavimo sprendimas vystyti, keisti pasiūlymą, laikyti arba parduoti |

Agentas turi pats bandyti išspręsti trūkstamą faktą: rasti pirminį šaltinį, pakoreguoti teiginį arba jo atsisakyti. Jei negali įrodyti tikro tiekėjo, atsargų, paslaugos pajėgumo, kainos, kontakto veikimo ar techninio tinkamumo, jis **nelaiko prielaidos faktu**. Tokia išimtis lieka privačiame plane ir neblokuoja kitų domenų ar saugių informacinių temų. Publikavimo data dėl to gali būti perkelta; praleista data nėra leidimas paskelbti nepilną tekstą.

## Įgyvendinimo eilė

1. **Veikia dabar:** bendra 20 domenų vietinė studija; vienas veiksmas planui ir juodraščių partijai; savitas šešių mėnesių kalendorius; klasteriai, vidinių ir išorinių nuorodų kandidatai; privati peržiūra; patvirtintos versijos ir laiko bei domeno filtras viešame core. `traktoriupadangos.lt` turi 11 privačių juodraščių, o `auksarankiams.lt` – 12 privačių sezoninio plano puslapių. Dabartinis automatinis ciklas baigiasi juodraščiais.
2. **Toliau:** patvari darbų eilė su etapų žymėmis ir automatiniais pakartojimais po pertrūkio; periodinis agento paleidimas kiekvienam domenui be rankinio kalendoriaus pildymo. Šaltinių rinkimo ir teiginių patikros agentas saugo įrodymų žurnalą (`url`, `retrievedAt`, teiginys, susijęs puslapis, rezultatas). Nepraėjęs teiginys taisomas arba šalinamas. Išoriniam šaltiniui neužtenka vien veikiančio URL. Techninės lentelės ir saugos faktai turi galiojimo peržiūros datą.
3. **Tada:** automatinis redakcinis QA ir patvirtinimas tik kai faktų sąrašas tuščias, šaltiniai įrodyti, nuorodų taikiniai tuo metu vieši, veikia kontaktai ir užklausų išsaugojimas. Paketą importuoti bei diegti su testais; ateities `publishAt` įjungiami be cron tik po to diegimo. Nepraėję straipsniai lieka išimčių eilėje.
4. **Galiausiai:** automatinis atskiro domeno matavimas, 60–90 dienų eksperimentų sprendimai, turinio atnaujinimas pagal realius klausimus ir tik paklausą įrodžiusioms nišoms tiekėjų, atsakymų bei kitų verslo procesų integracijos.

Mygtukai studijoje yra atsarginiai operatoriaus valdikliai; planavimo ir rašymo darbas neperkeliamas savininkui. Dabartinis rankinis šaltinių patvirtinimas ir paketo importas yra **įgyvendinimo spraga**, o ne galutinis darbo modelis. Nežinomi domeno nuosavybės, komercinio pajėgumo ir pašto pristatymo faktai turi būti tikrinami realiais signalais; agentas jų negali patvirtinti vien savo tekstu.

## Matavimas

Paieškos parodymai ir paspaudimai, lankytojai, formos serverio įrašai, faktiškai gauti laiškai ir atsiliepti skambučiai yra skirtingi rodikliai. `mailto:` arba `tel:` paspaudimas nėra gauta užklausa. Kiekvienos nišos rezultatus laikyti atskirai. SEO/GEO išvestys ir Lighthouse balai yra techninės patikros, ne pozicijų pažadas.

## Įgyvendintas bendras inkrementas — 2026-10-05

[CONTENT_CORE.md](CONTENT_CORE.md) įgyvendina policy/DST, daugia-partį V1 planavimą ir juodraščius, ryšių finalizavimą, review įrodymus, atomic reviewed batch ir nekintamą release. Tai visų nišų funkcijos, ne Madbeauty kopija. Šaltinių/pixels/rendered tikrinimą ir built-in ImageGen atlieka agentas; JSON CLI pats sustoja ties juodraščiais. Public import/build/deployment, V2 generator ir specifiniai CTA adapteriai lieka atskiri realūs darbai. Senų įrašų naujas review neatliktas šiuo bibliotekos pakeitimu.
