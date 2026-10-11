# Tik nurodytų kalbos laukų pataisymas

Privatus helper `creation/language_patch.py` sprendžia konkretų atvejį: vieno svetimo žodžio taisymas neturi perrašyti viso verslo juodraščio ir pakeisti kitų prielaidų. Tai kūrėjo korekcijos adapterio dalis, ne naujas agentas, eilė ar priėmimo vartų pakaitalas. Šis source paketas neprijungia provider ar runtime.

`context(candidate, verified_critic)` priima jau kanoninį `CreatorDraft` JSON ir serverio jau patikrintą kritiko išvadą su tos versijos stebėjimų kvitais. Helper pats nesuteikia kvitams autoriteto. Jis dar kartą patikrina schemą, tikslaus juodraščio SHA, `private_draft`, raundą ir privalomas išvadas. `revise` tinka tik kai kiekviena privaloma išvada yra `required` / `language`, kiekvienai yra tikras palaikomas STRING laukas, ir nėra kitų rūšių FAIL. Siūlomos pastabos nėra privalomos pataisos. Kvito nuoroda gali lydėti lauko nuorodą; vien kvito nuorodos nepakanka. Nežinoma ar netinkama privalomo lauko nuoroda grąžina `None`, todėl vykdytojas pasilieka viso kūrėjo kelią.

Leidžiama iki 8 skirtingų teksto laukų, pvz. `draft:/research/6/finding`, `draft:/assumptions/1`, verslo/puslapio/sekcijos ir plano tekstas. Tikri vardai bei įrankių / šaltinių pavadinimai, URL, ID, mėnesiai, šaltinių paieškos užklausos, ryšių adresai ir techninės enum reikšmės nėra pataisomi laukai. Dalinis nekeičiamos reikšmės kontekstas pateikia iki 4 trumpų kaimyninių reikšmių su truncation žyma bei kliento/mokamo rezultato/pasiūlymo kontekstą. Visa modelio konteksto apimtis iki 32 KiB; perpildymas taip pat grąžina `None`. Originalas nekinta.

API:

```python
bound = language_patch.context(candidate, verified_critic)  # dict | None
policy, instruction_sha256 = language_patch.instructions()  # tuple[str, str]
schema = language_patch.output_schema(bound)                # dict
replacement = language_patch.apply(candidate, verified_critic, response)  # dict
```

`instructions()` įkelia tik griežtą LT pataisymo policy ir actual kanoninį `SKILLS/niche-content-planner/references/language-quality.md`; grąžina tikslų įkelto teksto SHA. Trūkstamas / tuščias / per didelis / nekoduojamas failas stabdo su `instructions_unavailable`. Visos verslo instrukcijos turi būti įkeltos ankstesniame to paties source-bound darbo kūrėjo bandyme; helper neįrodo, kad taip įvyko.

Provider išvestis turi tik šiuos laukus:

```json
{
  "candidate_sha256": "tikslus bound.candidate_sha256",
  "critic_sha256": "tikslus bound.critic_sha256",
  "edits": [{"field": "draft:/research/6/finding", "value": "Visas pataisytas lauko tekstas."}]
}
```

Schema suriša abu SHA su const, laukus su tiksliu enum ir pataisų skaičių su visu leidžiamų laukų kiekiu. `apply` perskaičiuoja autoritetingą kontekstą, reikalauja abiejų SHA bei visos unikalios laukų aibės ir taiko tik tuos tekstus `deepcopy` kopijoje. Reikšmė turi būti ne tuščias NFC tekstas be valdymo simbolių, iki 2500 rašmenų; galutiniai tikri laukų ilgio ir viso `CreatorDraft` grafų vartai gali būti griežtesni. Joks praleistas default ar nesusijęs URL normalizavimas neleidžiamas. Netinkama išvestis sukelia `output_invalid`. Net nesėkminga pataisa originalo nekeičia.

Vien struktūros PASS neįrodo, kad agentas išsaugojo visą faktinę prasmę ar ištaisė kalbą. Pataisytą visą juodraštį vykdytojas privalo iš naujo tikrinti nepriklausomu kalbos vartų helper, nauju kritiku ir koordinatoriumi. Faktai, sąlygos, skaičiai ir nežinomybės lieka tų patikrų dalis. Helper nesuteikia editorial / F1 / launch / publikavimo PASS. Vykdytojas rezervuoja kvotą prieš provider, užtikrina dabartinę prieigą, atšaukimą, bendrą deadline ir esamų 2 raundų / 6 call ribą; šis pure helper papildomo raundo nesukuria.

Offline testai naudoja aiškiai sintetinius šaltinių kandidatus ir patikrina vieno žodžio pataisą, identiškus kitus laukus, abu pasenusius SHA, mišrias kvitų nuorodas, visą target union, dublius / trūkstamus / nežinomus / netekstinius / nesaugius taikinius, tikrą lauko ribą, Unicode NFC, fallback ir nepriklausomai atmetamą svetimos kalbos pataisą. Provider, DB ir kliento priėmimas lieka root integracijos patikra.
