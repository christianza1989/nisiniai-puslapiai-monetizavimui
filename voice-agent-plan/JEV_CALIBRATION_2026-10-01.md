# Jev ON/OFF ir porinis kalibravimas, 2026-10-01

Savininko užduotis: tęsti core taisymą, naudoti TypeSafe Jev ir leisti palyginti sistemą su juo bei be jo. Ankstesnio tinklo rato nuliniai Jev kvietimai išsaugoti senojoje ataskaitoje. Šis dokumentas aprašo naują įgyvendinimą; kampanijos būsena ir tikslūs rezultatai skaitomi iš generuojamos suvestinės, o ne laikomi užbaigtais iš anksto.

## Veikiantis valdymas

Vietinis bendro pašto valdiklis: `http://127.0.0.1:8840/operator/mail-ui`. Prisijungus operatoriui ir pasirinkus verslą, jungiklis „Jev pagalba šiam verslui“ keičia tik tos nišos `BusinessPolicy.jev_enabled`. Numatytasis režimas OFF. `GET/PUT /operator/sites/{siteId}/routing` naudoja operatoriaus autentifikaciją, `base_revision`, politikos istoriją ir serverio nišos ribas. Vienalaikis pasenęs pakeitimas atmetamas. Balso, SMTP ir kitų nišų politikos nekeičiamos.

OFF neinicijuoja naujų Jev kvietimų ir neperduoda ankstesnio hint. Jau pradėtas išorinis kvietimas gali baigtis po išjungimo, tačiau jo atsakymas atmetamas. ON leidžia foninį ketinimo įvertinimą po patvaraus kliento teksto įrašo. Įvykio priėmimas nelaukia Jev. Pagrindinis agentas gauna tik jau paruoštą, dar aktualią rekomendaciją; nepradedamas papildomas sinchroninis laukimas.

Rekomendacija yra duomenys: ketinimas, siūlomas vaidmuo ir leidžiamų įrankių ID. Ji nesuteikia vykdymo teisių, nesiunčia laiškų ir nesukuria užsakymų. `apply:false` žymi šią ribą, nors tekstinis agentas rekomendaciją gali perskaityti. Įkėlimas nėra įrodymas, kad modelis jos laikėsi. Vaidmens ID kol kas neįkelia viso atskiro specialisto prompto. Tikras Gemini balso darbuotojas šiame palyginime nedalyvauja. Adapteris dar atmeta tikro kliento duomenų kanalą (`real_data_channel_not_activated`); ON leidžia šį autorizuotą vietinį tekstinį palyginimą, bet savaime nenuima tikro kanalo ar M0 vartų.

Aktualumą riboja niša, pokalbis, epoch, paskutinis kliento įvykis, poreikio revizija ir politikos revizija. Kliento pataisa, nauja replika, išjungimas ar užbaigtas pokalbis panaikina senos rekomendacijos taikymą. Tai gali sumažinti panaudotų hint skaičių; suvestinė atskirai pateikia API kvietimus ir modeliui perduotas rekomendacijas.

## Provideris ir sąnaudų ribos

Realus `POST https://openrouter.ai/api/alpha/decisions`, `typesafe/jev-1.13`. Remtasi [oficialia Jev naudojimo dokumentacija](https://openrouter.ai/blog/tutorials/how-to-use-jev/) ir [OpenRouter paaiškinimu](https://openrouter.ai/blog/insights/what-is-jev/), taip pat savininko L2 integracijos perskaitytu pavyzdžiu. Esamas raktas perskaitytas iš privataus L2 konfigūracijoje nurodyto failo ir įrašytas tik į privatų runtime `.env`; šaltinis nepakeistas. Rakto nėra modelių įvestyse, naršyklėje ar ataskaitose.

Routeris gauna ribotą paskutinės kliento frazės ir dviejų ankstesnių frazių kontekstą. El. pašto adresai, telefonai ir sąskaitų numeriai minimizuojami. Tai nėra visų galimų asmens duomenų anonimizavimo garantija. Kandidatų sąrašas ir įrankių leidimai ateina iš serverio. Tikimybių schema, baigtinės reikšmės ir kandidatų narystė tikrinamos; confidence nėra išmatuotas aptarnavimo sėkmės procentas.

Numatytos ribos vienam API procesui: 50 kvietimų, 150000 microUSD rezervavimo biudžetas, 1.5 s timeout, ne daugiau kaip 8 foniniai darbai. Dalinį neįrodytą spend dengia rezervas. Tai nėra patvari visų procesų paros apskaita; proceso restartas atnaujina šiuos limitus. Kiekvienos nišos režimas ir sprendimų kvitai patvarūs DB.

## Patikros iki porinio rato

- Tikras pirmasis kvietimas: `runtime/artifacts/jev-pilot/first-call.json`; šaltas client matavimas 2231 ms, 29 microUSD.
- Atskiras aiškiai pažymėtų ketinimų pilotas: 27/27 teisingų, 27 tikri kvietimai, 775 microUSD ($0.000775), p50 477 ms, p95 676 ms. `runtime/artifacts/jev-pilot/intent-benchmark/report.json`. Maža aiškių frazių imtis neįrodo plataus natūralaus dialogo tikslumo ar confidence kalibracijos.
- Python testai: 185 PASS, 223.71 s. Naujos patikros apima per-nišos ON/OFF, revizijos konfliktą, grįžimą nelaukiant blokuoto providerio, vėlyvo atsakymo atmetimą, kalbos tęstinumą ir tipizuotus poreikio argumentus.
- Tikras naršyklės valdiklis: operatoriaus prisijungimas, traktorių nišos ON, kitos nišos nepakitęs OFF, originalaus režimo atkūrimas. `runtime/artifacts/jev-pilot/ui.json`, `runtime/output/playwright/jev-toggle-on.png`. SMTP ir produkcinis balsas liko OFF.

Kalbos nustatymas vyksta serveryje su offline Lingua 2.2.0: LT/EN/DE/PL/LV/ET/RU, explicit preference ir abstain. Trumpa/neaiški frazė nekeičia turimos kalbos. Modelio confidence slenksčiai yra heuristika. Atskiras šalto proceso matavimas: import 7 ms, pirmas EN pasirinkimas 26.37 ms, LT 5.85 ms, explicit EN 0.11 ms (`language-latency.json`); tai trys frazės, ne viso kanalo p95. Angliškas fallback patikrintas; visų kitų kalbų rezerviniai šablonai ir tikras balso tarimas nėra sertifikuoti.

## Naujo porinio rato metodika

Šešios esamos nišos: akmenas, auksarankiams, greitossvetaines, laiptucentras, roletaiklaipedoje, traktoriupadangos. Kiekvienai 8 nauji dialogai, tas pats scenarijus vykdomas OFF ir ON: iš viso 48 unikalūs scenarijai, 96 planuoti vykdymai. Kategorijos: anglų kalba ir telefono langas, paieškos kriterijai be leidimo susisiekti, poreikio pataisa ir kontaktas dabar, ribotas biudžetas, techninis klausimas be kontakto, tiekėjo teiginys be užsakymo, apdovanojimo instrukcijos injekcija ir nesaugus trumpinys.

Naudojamas tas pats esamas tekstinis core kanalas: tikri pokalbio įvykiai DB, serverio įrankiai, kontakto lango ACK ir pateikimo sutartis, post-call jobs, nepriklausoma laiško peržiūra ir kokybės vertinimas. Kliento archetipas ir vertinimo etiketės agentui neperduodamos. Laiškai išsaugomi `.eml` klientui rodomu formatu; šis ratas jų nesiunčia SMTP. Tai Codex tekstinis adapteris; STT, TTS, Gemini Live, žmogaus pertraukimo ir garsinio kanalo elgesio įrodymas atskiras.

Šių taisymų ir kalibracijos intervencijas atliko operatorius/Codex šioje sesijoje: struktūruoti tool argumentai, serverio kalba, laiško atitiktis prašytam kontekstui, kontakto atsisakymo chronologija ir Jev fono jungtis. Tai nėra įrodymas, kad agentai patys saugiai pakeitė production skills. Prieš pirmą naujo rato vykdymą ištaisytas vien tik fixture atsisakymo laiko metaduomuo: nepanaudotas `network-v3` išsaugotas, vykdomas `network-v3b`. Jokie šio rato rezultatai tuo metu dar nebuvo matyti.

Instrukcijų, adapterio kodo ir dependency lock hash užfiksuoti `runtime/artifacts/network-calibration/network-20261001-v3-paired/frozen-contract.json`. Abiejų režimų eiliškumas subalansuotas tarp nišų. Tuning pagal pradėto rato atsakymus neleidžiamas. Vienas vykdymas scenarijui/režimui nepašalina pagrindinio modelio atsitiktinumo ir nėra statistinio pranašumo įrodymas. Originalūs FAIL ir nesėkmės priežastys išsaugomos; regresijos po pataisų turi atskirą versiją.

Rezultatai: [generuojama porinė ataskaita](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-v3-paired/REPORT.md), [dialogų ir laiškų suvestinė](../agent-business-core/runtime/artifacts/network-calibration/network-20261001-v3-paired/index.html). Ji aiškiai rodo nebaigtą kampaniją, kol neužbaigti visi vykdymai. CLI tokenai pateikiami atskirai, jų kaina doleriais nepatvirtinta. Jev kaina remiasi providerio kvitais; jo delsa nėra viso atsakymo delsa.

## Naujos nišos ir paleidimas

`miniekskavatoriai.lt` į šį užfiksuotą šešių nišų ratą neįtraukta. Pradžioje jos auditas buvo UNREVIEWED; vėlesnė svetainės sesijos ataskaita (13:14 UTC) pateikė 12 patvirtintų puslapių ir local 67/71, tačiau `gateReady=false`: R2/S2 tikras 200% didinimas ir U2/U3 naujo pašto pristatymas dar neįrodyti. Tai ne local-ready ar domain-ready deklaracija. Dabartinė verslo kryptis — planinės tranšėjos su operatoriumi poreikio registracija Kaune/Kauno rajone, be rezervacijos, vykdytojų, tarifų ar pajėgumo garantijos. Neimportuoti neegzistuojantys faktai. Patvirtinus nišos priėmimą ir kontaktų kelią, naudojamas tas pats core registras, atskiras profilis ir instrukcijos.

Šis palyginimas neįjungia realaus balso, nesudarinėja sandorių, nesiunčia tiekėjams ir neįrodo pajamų. Mažo intent piloto 27/27 nėra pagrindas automatiškai įjungti Jev visiems verslams. Per-nišos numatytasis OFF išsaugomas iki pagrįsto palyginimo sprendimo.

## Baigto rato išvada

Visi 96 planuoti vykdymai atlikti. Originalus OFF 41/48, ON 44/48. Iš 11 nepraėjusių vykdymų 8 yra CLI timeout ir 3 kokybės vartų nesėkmės. 41 scenarijuje, kuriame abu režimai turėjo pilną balų įvertinimą, OFF 39/41 ir ON 40/41 (`scored-pairs-only.json`). Vieno stokastinio vykdymo skirtumas neįrodo Jev priežastinio pagerėjimo. Nei klaidos, nei vertinimo slenksčiai nepaslėpti.

ON inicijavo 96 providerio kvietimus; OFF — 0. Išsaugoti 90 patikrinamų sprendimų kvitų; jų p50 666.5 ms, p95 945 ms, žinoma kaina 2710 microUSD ($0.002710). Šešių kvietimų kvitai neįtraukti, nes atitinkami scenarijai nutrūko iki jų išsaugojimo report'e ir testinė DB buvo išvalyta. Jų kaina nepatvirtinta ir nėra prilyginta nuliui. Modeliui perduoti 8 hint paketai. Ne visi paruošti hint liko aktualūs po poreikio revizijų, o perdavimas neįrodo modelio paklusimo. Kitoje iteracijoje reikia patvaresnio failure trace ir lane-specific aktualumo bandymo; šio rato vartai dėl to nesušvelninti.

Instrukcijų ir atrinktų šaltinių hash prieš vėlesnes pataisas patikrinti ir išsaugoti `freeze-verified-at-completion.json`. Šis užbaigimo kvitas ir originalūs dialogų report'ai fiksuoja palyginimo versiją. Vėlesnio runtime hash neatitikimas nėra pagrindas perrašyti to rato PASS/FAIL; regeneravus helperį po v4 pataisų dabartinis kodas natūraliai skiriasi nuo užfiksuoto kodo.

Sprendimas: Jev valdymas įgyvendintas, tačiau visoms šešioms nišoms paliktas OFF. Ketinimų pilotas sėkmingas, o visa aptarnavimo nauda dar neįrodyta. Tai leidžia operatoriui toliau lyginti konkrečią nišą ir paprastai grįžti prie baseline.

## Pataisos po užbaigimo, atskira v4 versija

Pirmoje kalbos diagnostikoje 3/4 pasirinkimų buvo netinkami: katalogo / instrukcijos kalba ir neigiama „ne angliškai“ frazė klaidingai prilyginti kliento kalbos pageidavimui. Po porinio rato užbaigimo aktyvuotas atskirai paruoštas `language_preference.py`: request ir negation kontekstas, diakritinių ir ASCII variantų atpažinimas, įprasti DE/PL/LV/ET/RU pageidavimai. Kandidato 22 request patikros ir 4 viso selector regresijos išsaugotos; tai heuristika, ne tobulas visų formuluočių semantinis supratimas.

Įdėtas pasirenkamas vienas CLI timeout retry. Jis kartoja tik nužudytą modelio užklausą, kuri neturi įrankių, ir nesukelia pakartotinio core veiksmo. Schema, netikėto įrankio ar leidimo klaidos nekartojamos. Bandymų skaičiaus limitas lieka, nesėkmingo bandymo neįrodyta tokenų kaina išlieka nežinoma. Numatytasis retry 0; atkūrimo bandymas aiškiai pasirenka 1.

Visa Python patikra po šių pataisų: **213 PASS, 228.85 s**. Naujas atskiras septynių žinomų timeout scenarijų vykdymas baigtas **7/7 PASS**, saugomas `network-20261001-v4-recovery/`; jis yra regresija, ne naujas blind rezultatas, ir nepakeičia 96 vykdymų balų. Šiame pakartotiniame rate panaudoti **2 realūs riboti timeout retry**, po jų gauti atsakymai; nesėkmingų bandymų tokenų sąnaudos neįrodytos. Riboto kartojimo vartus taip pat patvirtino kontroliuoti testai. Kokybės rubric kandidatas (`receipt-rubric-candidate/report.json`) praėjo tik 2/4 kontrolinių patikrų ir **neaktyvuotas**. Tai operatoriaus atliktos ir pažymėtos pataisos, ne autonominės production skill promotion įrodymas.

Vietinė API health OK, visi šeši Jev režimai OFF, balsas/SMTP/M0 OFF po savų API/jobs procesų perkrovimo (`runtime-final.json`). Kitų sesijų procesai, svetainės ir šaltiniai nepakeisti.

## ON/OFF pakartotinė patikra, 2026-10-02

Vėlesnis [aptarnavimo pataisų ratas](AGENT_CALIBRATION_2026-10-02.md) atskirai patikrino tris žinomas kokybės nesėkmes (3/3) ir šešis naujus scenarijus (6/6), po to siaurą natūralumo kandidatą (2/2). Tai nepakeičia šio dokumento originalių porinių balų ir nėra naujas ON/OFF pranašumo matavimas.

Savininko ON/OFF reikalavimas išsaugotas: kiekvienos nišos jungiklis operatoriaus mail-ui, revizijos ir grįžimas prie režimo OFF. Šiandien tikslinė 28 testų patikra praėjo (6,92 s), įskaitant per-nišos ON/OFF, autentifikaciją, revizijos konfliktą, kliento įrašo priėmimą nelaukiant providerio ir po išjungimo atėjusio atsakymo atmetimą. Patikra taip pat apėmė instrukcijas / tiekėjų lab; tai nėra 28 atskiri Jev verslo scenarijai. Tikras vietinės API read-only patikrinimas: health OK, voice_ready=false, visos šešios routing politikos OFF; [būsenos kvitas](../agent-business-core/runtime/artifacts/jev-pilot/onoff-readonly-20261002.json). Politikos nekeistos, papildomi Jev providerio kvietimai šiame patikrinime neatlikti. Ankstesnio 96 vykdymų palyginimo rezultatai neperrašyti.
