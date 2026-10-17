# Pirkėjų paieškos bandymas

2026-10-15. `wellness-export`; [BUSINESS redakcija 1](BUSINESS.md). Dabartinis režimas `research_only` / `draft_only`, išorinis siuntimas išjungtas. Pirmiausia rengiama uždara demonstracija gamintojui. Ji nesuteikia prekybos ar kampanijos teisių. Naudoti esamą acquisition ir Task core, ne antrą pardavimų sistemą.

## Kam siūlome ir ką tikriname

Pirkėjas — nepriklausomo poilsio namelio, nedidelės sodybos ar glampingo sprendimą priimantis asmuo. Pirmas tyrimo segmentas — Nyderlandai, su aiškia galimybe keisti šalį pagal realų gamintojo pristatymą ir aptarnavimą. Kalba pirmam privačiam juodraščiui anglų; tikras kontaktas ir puslapis turi atitikti adresato poreikį.

Gamintojas yra tiekėjas / galimas komisinio mokėtojas pagal sutartį, ne galutinis mūsų prekės pirkėjas. Vietos įrengėjas arba apgyvendinimo konsultantas — atskiras partneris. Šių atsakymų nepriskirti klientų paklausai.

Vertė pirkėjui — pagal jo objektą parengtas trumpas poreikio aprašas ir tinkamos komplektacijos atranka. Kaina, terminas, tinkamumas intensyviam naudojimui ir atsakomybės grindžiamos tiekėjo patvirtinimu. Nežadėti padidėjusio užimtumo, konkrečios grąžos ar neatidėliotino pristatymo.

## Šaltiniai ir kvalifikavimas

| Kanalas | Ką leidžia nustatyti | Priėmimo riba |
| --- | --- | --- |
| Įmonės oficialus puslapis | Tikras objektas, šalis, veikla, viešai aprašytas atidarymas ar atnaujinimas, organizacijos kontaktas | Reikia originalaus URL ir peržiūros datos. Objekto tipas rodo tinkamumą, ne dabartinį pirkimo poreikį |
| Viešos Maps paieškos kandidatas per atrinktą Treg endpoint | Įmonės / vietos kandidatą ir galimą oficialų puslapį | Patikrinti šalį, adresą ir tikrą įmonę; leidimas rinkti ir naudoti duomenis vertinamas atskirai nuo API prieigos |
| Tikra mūsų svetainės užklausa | Konkretaus asmens išreikštą poreikį | Įrodyti patvarų saugojimą, paskirtį, pristatymą ir gavimą; sintetinį bandymą žymėti atskirai |
| Booking ar kitas rezervavimo portalas | Gali padėti žmogui atpažinti segmentą | Esamas Discovery reader turi Booking automatizavimo hold. Šio plano pagrindu jo neapeiti ir nepradėti portalų kontaktų rinkimo |

[Landal 4ELW](https://www.landal.com/parks/berger-duinen/accommodations/4elw) — tik naudojimo atvejis, ne mūsų prospectas su patvirtinta pirkimo intencija. Jau turimas kubilas nebūtinai reiškia poreikį jį pirkti. Didelei grandinei reikia kito sprendimų ir tiekimo modelio, todėl pirmam bandymui ji neprioritetinė.

Papildoma [nedidelė oficialių puslapių imtis](BUYER_RESEARCH.md) išlaiko tikras peržiūros ribas: du perskaityti tinkamo segmento puslapiai, vienas neprieinamas straipsnis, nė vienos patvirtintos pirkimo intencijos. Prieštaringa atidarymo data ir neapibrėžtas „nauja“ nėra kvalifikuoto poreikio pakaitalas.

Kiekvienam būsimam tyrimo įrašui išsaugoti tik organizacijos pavadinimą, oficialų URL, šalį / vietą, konkretų poreikio signalą ir jo datą, viešą organizacijos kontaktavimo kelią bei atskirus `fit`, `intent`, `recency`, `contactability`, `fulfilment` sprendimus. Asmeninių el. paštų nespėti; pakankamai naudingo organizacijos kontakto nekeisti pertekliniu asmens praturtinimu. Duomenis laikyti privačiai, susieti su šiuo siteId ir numatyti peržiūrą / pašalinimą po bandymo.

Atmesti netinkamą šalį, neveikiantį objektą, buitinį poreikį už pasirinktos B2B apimties, tiekėjo neaptarnaujamą vietą ar neįgyvendinamą naudojimo scenarijų. Jei nežinomas kontaktavimo pagrindas arba tiekimo galimybė, aukštas tinkamumas jų nepakeičia.

## Agentų darbas bendroje komandoje

Koordinatorius priima tikslą ir prižiūri galiojančią pasiūlymo versiją. Tyrimo agentas renka ribotus šaltinių duomenis; atrankos agentas tikrina šalį, poreikį ir gaminio tinkamumą; pardavimo agentas ruošia konkretų projektinį atsakymą. Nepriklausoma peržiūra tikrina šaltinius, kalbą ir nepatvirtintus pažadus. Faktinis išsiuntimas turi atskirą priėmimą, šaltinių sąlygas, gavėjų ir siuntėjo autorizaciją bei transporto patikrą.

Tai planuojami to paties core vaidmenys. Šio dokumento sukūrimas jų neprijungia, nekalibruoja ir nesuteikia jiems naujų įrankių. Sukūrimo / kalibravimo metu taikomas esamas business-agent-calibration procesas, o aktyvios paieškos priėmimui — OUTBOUND_ACQUISITION ir daily-outbound. Naujų žinių neskelbti visiems agentams ar kitų gamintojų svetainėms automatiškai.

## Ribotas eksperimentas ir sustabdymas

Pirmas parengiamasis bandymas po reikalingų leidimų — iki 20 įmonių oficialių puslapių per 14 dienų; jokių masinio siuntimo prielaidų. Prieš mokamą duomenų gavimą reikia atskiro faktinio biudžeto. Pirmam tyrimui naudojami vieši šaltiniai ir katalogo dokumentacija, papildomų mokamų kvietimų limitas 0.

Kliento laiško juodraštis turės vieną realų signalą iš jo puslapio, trumpą tikslų pasiūlymą ir vieną klausimą dėl objekto poreikio. Jo dar nerašome fiktyviam adresatui ir nesiunčiame vien dėl viešai nurodyto kontakto. Gamintojo partnerystės juodraštis yra [atskirame tyrime](SUPPLIER_RESEARCH.md).

Matavimas: ištirtos įmonės ≠ kvalifikuotas poreikis ≠ gauta užklausa ≠ išsiųstas pasiūlymas ≠ apmokėtas / pristatytas gaminys. Kiekvienam įvykiui reikės tikro kvito, datos, siteId ir aktualios pasiūlymo versijos. Jei nėra patikimų gaminio sąlygų, tinkamo kanalo, teisių ar teigiamos ekonomikos, tęsti tik tyrimą arba keisti pasiūlymą. Atsisakymas stabdo rinkodarą ir negali būti pamirštas kuriant naują giją ar svetainę.

## Headless pavedimas ir faktinė nauja apimtis — 2026-10-18

Savininkas atskirai užsakė klientų paieškos ir el. pašto agentus be platformos UI
priklausomybės. Įgyvendinta canonical CLI rolėms, atskirai teksto peržiūrai ir
sintetiniam Case/MailMessage tęstinumui; [vykdymo eiga](HEADLESS-RUNBOOK.md).
Tai nekeičia BUSINESS faktų, neįjungia balso, viešo paleidimo ar siuntimo.

Atnaujinta 5 oficialių Nyderlandų apgyvendinimo puslapių imtis; visi 5 gauti bendru
skaitytuvu,5 publikuoti organizacijų kontaktai patikrinti šaltiniuose.2 kandidatams
parengti ir atskirai modelio bei autoriaus peržiūrėti konkretūs laiškai. Tikri
kontaktai, šaltinių kvitai ir visas tikslus tekstas saugomi privačiai runtime
artifacts/wellness-headless/BUYER-BATCH.md; į Git ar viešą paketą neperkeliami.
Nežinomas pirkimo poreikis, siuntimo teisė ir tiekimas lieka nepatvirtinti.
Išsiųsta 0, pristatyta 0, tikrų atsakymų 0, kvalifikuotų pirkimo poreikių 0.

Bendra eksperimentinė modelio riba 180 rezervuotų bandymų / 120 minučių nuo pirmo
kvietimo, gpt-6.1-sol/high, be automatinio kartojimo ar skaitiklio atstatymo.
Galutinė naudojimo ir scenarijų ataskaita pateikiama atskirai; sintetinis PASS
nėra dabartinės veikiančios kampanijos ar pardavimų įrodymas.
