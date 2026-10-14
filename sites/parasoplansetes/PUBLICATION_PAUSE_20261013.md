# Publikavimo pauzė

Savininko nurodymas 2026-10-13: kol kas pristabdyti šios svetainės turinio straipsnių publikavimą. Galioja iki naujo savininko prašymo tęsti.

Gyvoje svetainėje įjungta publikavimo kalendoriaus pauzė: išlaikomi 24 iki pauzės paskelbti puslapiai, visi 22 būsimi puslapiai neatsiranda automatiškai net atėjus jų datai. Paketo turinys, patvirtintos revizijos, originalios datos ir medija išsaugoti, todėl juos galima panaudoti tęsiant darbą. Pauzė taikoma šios svetainės būsimiems turinio puslapiams, įskaitant suplanuotus produktų / programų aprašymus; jau matomi produktai ir straipsniai nepaslėpti.

## Veikiantis nustatymas

Viešame core `config/niche-network.json`:

```json
"publicationCutoffsBySite": {
  "parasoplansetes": "2026-10-13T19:26:19.387Z"
}
```

Bendras V1 `projectPublicPages` ir tiesioginis `isPublicNichePage` naudoja mažesnį iš tikro dabartinio laiko ir šios datos. Puslapių patvirtinimo tikrinimas išlieka. Ta pati projekcija taikoma HTML, vidinėms / tarp-domeninėms nuorodoms, medijai, sitemap, JSON-LD ir LLM išvestims. Tai yra publikavimo laiko riba, ne globalus serverio laikrodžio pakeitimas. Kitos svetainės neturi šio nustatymo ir tęsia savo kalendorių. Sugadinta nustatyta data uždaro publikavimą, o nenustatyta riba išlaiko ankstesnę elgseną.

Studijos verslo `stage` nepakeistas į paused: jis apibūdina svetainės / verslo būseną ir naudojamas tinklo ryšių patikrose, o ne sustabdo hosted publikavimo kalendorių. Nereikia keisti patvirtinto turinio ar fiktyviai peržiūrėti jo revizijų dėl šio operacinio nustatymo.

## Patikros

- Abiejų repo fresh main buvo HEAD protėviai; nuosavos šakos ir ankstesni darbai išsaugoti.
- 70 bendrų core testų PASS, atskira atnaujinta nuorodų ir pauzės 6 testų regresija PASS. Tikrintas esamų puslapių išlaikymas, būsimų puslapių / nuorodų paslėpimas po jų datos, kitų svetainių nepakitusi eiga, neteisinga data, approval/hash ribos ir pauzės nuėmimas izoliuotame teste.
- Typecheck / build / Wrangler dry-run PASS.
- Tikrame izoliuotame vietiniame Worker su 2035-01-01 laikrodžiu: 24 vieši ir 22 paslėpti puslapiai, 284 HTTP patikros PASS. Bendras rendered verifier: 268 HTTP patikros, 0 issues; patikrinti ir media / discovery / privatūs keliai.
- Gyvame `https://parasoplansetes.lt/`: 284 HTTP patikros PASS, 24 vieši ir 22 būsimi puslapiai. Vietinis būsimo laiko bandymas yra kalendoriaus pauzės veikimo įrodymas, ne būsimos live datos įvykimo teiginys.
- Viešo patvirtinto paketo SHA-256 liko `3bcd0d8400bc205274dd5d24d3b55b84d5631b215016c8a8cc2aedb298800b98`; turinys / datos / approval / media neperrašyti.

Įdiegta į esamą `parasoplansetes-preview` Worker, versija `27cfdbf8-701c-42b3-8552-54afb09a3744`. Naudotas `--keep-vars`; esami domenai, D1, indeksavimo / chat / voice / lead-email nustatymai nekeisti. QA fiksuoto laikrodžio failas pašalintas prieš diegimą. Papildomų išlaidų ar debesijos išteklių nėra.

Įrodymai: `output/parasoplansetes-publication-pause-20261013/`. Bendro patobulinimo įrašas: `upgrade-a0ca2f0e-8ab0-40c2-b42a-9f62e120347d`, source perduodamas esamuose PR46 / PR17. Tai nėra main merge ar visų kitų PC atnaujinimo įrodymas.

## Tęsimas

Iki savininko prašymo tęsti išlaikyti šios svetainės cutoff kiekvieno build / deploy metu. Jo nepašalinti atliekant nesusijusią teksto, dizaino ar core pataisą. Kitų PC naujas diegimas turi naudoti šią patikrintą source versiją ir nustatymą; nesujungtas PR dar nėra jų main dalis.

Gavus prašymą tęsti pirmiausia įvertinti, kurios suplanuotos datos jau praėjo, ir suderinti tęsiamo publikavimo eigą. Vien pašalinus ribą visi jau pavėluoti patvirtinti puslapiai taptų vieši iš karto. Jei datos keičiamos, tai vykdyti per įprastą studijos revizijų, tikros peržiūros ir laidos eigą. Pakartoti tikras HTML / nuorodų / medijos / discovery patikras ir įdiegti naują konfigūraciją. Istorinių leidinių ar šios pauzės įrodymų neperrašyti.
