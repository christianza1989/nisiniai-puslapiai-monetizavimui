# Bendras nišų klientų paieškos procesas

2026-10-01. **Klientų paieškos realizacijos sutartis**, paremta [interneto tyrimu](research/client-acquisition-2026-10-01/RESEARCH.md). Prospecting ir kampanijų modulis dar neįgyvendintas. Kitos autorizuotos sesijos vietinis `agent-business-core/runtime/` jau turi case / pašto pagrindą ir ribotą žinomų gijų IMAP skaitytuvą; naujas acquisition modulis turi jį papildyti. Ši sutartis neįrodo production ar automatinio siuntimo. Naujos svetainės lieka pirmoje fazėje. Skaityti kartu su [MAIL_CORE](MAIL_CORE.md), [VOICE_CORE_INTEGRATION](VOICE_CORE_INTEGRATION.md), [runtime būsena](agent-business-core/runtime/README.md), konkretaus domeno BUSINESS ir aktualia operatoriaus / kontaktų konfigūracija.

## Paskirtis ir dabartinis pagrindas

**2026-10-09 atnaujinimas:** ankstesnis „dar neįgyvendintas“ aprašo 2026-10-01. Dabar įgyvendintas bounded kasdienio tyrimo/draft preparation runner, retrieval adapteris, medicininės įrangos instrukcijos ir kalibravimo korpusas: [OUTBOUND_ACQUISITION](agent-business-core/OUTBOUND_ACQUISITION.md). Gyvas discovery tiekėjas, PostgreSQL acquisition CRM, scheduler, suppression/outbox/inbound handoff ir išorinis siuntimas dar nepriimti. Istorinė „nelies­ti schemos / siuntimo“ tyrimo taisyklė nėra naujo autorizuoto core darbo draudimas; gyvas kontaktavimas vertinamas pagal konkrečią kampaniją ir kanalą.

SEO atveda ilgalaikį srautą. Aktyvios paieškos bandymai gali greičiau parodyti konkretų prekių / paslaugų poreikį. Atskirti galimus pirkėjus, mokėtojus už užklausą, vykdymo tiekėjus ir rekomendavimo partnerius. Jų atsakymai matuoja skirtingas hipotezes.

Patikrinta dabartinė realizacija viešame core: `drizzle/0004_niche_leads.sql` saugo `id`, `site_id`, `created_at`, `source_path`, `name`, `email`, `message`, `consent_at`, `status`. `app/niche/[siteId]/lead/route.ts` pirmiausia įrašo užklausą ir siunčia operatoriui per `lib/niche-mail.ts`. `source_path` yra puslapio kelias, o `consent_at` — dabartinės formos įrašo laukas; nė vienas nėra rinkodaros prenumeratos ar kampanijos atribucijos įrodymas. Studijos `src/` rasti turinio / medijos moduliai, ne pardavimų CRM.

2026-10-01 papildomai perskaityti agentų runtime `models.py`, `api.py`, `mail_reader.py`, `mailbox.py`, `sales.py`, `agent_instructions.py` ir `calibration.py`. Yra vienas site/business registras, Case / CaseSource / MailMessage, lead-import ir operatoriaus pašto API, žinomų gijų skaitytuvas bei testinio gavėjo pardavimo eiga. Production D1 reconciliation, viso inbox klasifikavimas, klientų paieškos eilė ir savikalibracijos promotion iš to neseka. Šiame audite šių API nevykdėme ir kitos sesijos testų skaičių nelaikome savo nauju PASS. [Bendras agentų / kalibravimo susiejimas](research/client-acquisition-2026-10-01/COORDINATION.md) fiksuoja patikrintą pagrindą ir dar derinamą handoff.

Šios sutarties metu neliesti schemos, migracijų, kontaktų, viešų paketų ar siuntimo. Būsimoje realizacijoje naudoti atskirus acquisition įrašus; prospectai niekada automatiškai netampa D1 gautomis užklausomis.

## Per-nišos planas

Facebook kanalo architektūra: [FB_ACQUISITION_PLAN](FB_ACQUISITION_PLAN.md), faktinis [grupių / Meta tyrimas](research/facebook-acquisition-2026-10-01/RESEARCH.md) ir [skill priedas](SKILLS/niche-client-acquisition/references/facebook.md). Vienas paskyros koordinatorius aptarnauja nišų darbų eilę; browser veiksmai vienai paskyrai nuoseklūs, oficialūs Page API pokalbiai turi atskirą per-thread tvarką. Asmeninių grupių naršymas / Messenger ir oficiali Page integracija yra skirtingi kanalai; pastarųjų teisių ar runtime egzistavimo iš šio plano neįrodome.

Laikyti privatų `sites/<siteId>/ACQUISITION.md`. Naujai svetainei tai trumpas BUSINESS dalį papildantis planas, ne privaloma nauja programinė platforma. Įrašyti:

- Pirkėją, mokamą rezultatą, mokėtoją ir patvirtintą dabartinį pasiūlymą; vykdymo nežinomybės lieka nežinomybėmis.
- Pirkėjo, partnerio ir tiekėjo segmentus atskirai; geografiją, kalbą, sezoną, atmetimo sąlygas.
- Ne daugiau kanalų, nei reikia bandymui: šaltinio URL, skaitymo / kaupimo / kontaktavimo sąlygas, signalą, jo šviežumą ir ribas.
- Koks tikras signalas laikomas tinkamu poreikiu: pvz., dydis / kiekis / laikas padangoms arba darbų sąrašas / vieta auksarankiams. Skaitymas ir paspaudimas nėra lygiaverčiai.
- Vieną pasiūlymą ir kitą veiksmą, vertingą adresatui net be mūsų sandorio: poreikio ruošinį, tikslų pastebėjimą, apimties palyginimą.
- Bandymo laiką / tyrimo ribą / kaštų lubas, kanalo atsekamumą, tęsti / keisti / stabdyti kriterijus.
- Kontaktavimo būseną ir jos pagrindą. Planas gali būti pilnas su `sending: off`, kai pasirinktas kanalas netinkamas ar dar neveikia.

Nekartoti gilaus rinkos tyrimo kasdien ar kiekvienam straipsniui. Pakartotinai tikrinti pasikeitusius komercinius faktus, kanalų taisykles, kainas ir signalų aktualumą.

## Agento eiga ir teisės

1. **Paieška:** leistinuose šaltiniuose rasti organizaciją ar konkretų poreikį. Patikrinti originalų puslapį / datą, atskirti paieškos kopiją nuo dabartinės būsenos. Prieigos klaida reiškia UNVERIFIED.
2. **Patikra:** struktūruoti tik pagrįstus faktus. Kontaktas turi realų šaltinį; adresų kombinacijų spėjimas ar MX įrašas nėra gavėjo patvirtinimas. Nenaudoti papildomų asmens duomenų, kurie nepadeda tikslui.
3. **Atranka:** laikyti atskiras dimensijas `fit`, `intent`, `recency`, `contactability`, `fulfilment`. Aukštas tinkamumas neatsveria siuntimo draudimo ar neįgyvendinamo pasiūlymo. AI tikrumas nėra kalibruota pirkimo tikimybė.
4. **Juodraštis:** vienas konkretus argumentas iš šaltinio, tiesa apie pasiūlymą, vienas veiksmas. Kainos, terminas ir pajėgumas tik iš patvirtintų faktų. Skaidrus poreikio bandymas negali apsimesti veikiančia parduotuve / meistrų tarnyba.
5. **Kontaktavimas:** vykdomas tik autorizuotoje kampanijoje, tinkamu kanalu ir per leistiną tiekėją. Vien mokslinio tyrimo, inbox prieigos, svetainės užduoties ar draft sukūrimo nepakanka siuntimui.
6. **Atsakymas:** iš tikro gauto laiško ištraukti poreikį, trūkstamą faktą ir kitą žingsnį. Atsisakymas, bounce, automatinis atsakymas ir konkreti užklausa turi skirtingas būsenas. Sustabdyti jau nereikalingą seką.
7. **Matavimas:** mokamas rezultatas ir grįžtantis klientas patvirtinami tik actual įrašais. Atskirti kanalų klientus nuo SEO ir bendrojo informacinio srauto.

Numatyti režimai: `research_only`, `draft_only`, vėliau atskirai `authorized_contact` ir `authorized_reply`. Šio tyrimo rezultatas yra `research_only` / instrukcija. Įprastų atrankos, teksto ir sąrašo pasirinkimų savininko neklausinėti. Aiški vienos kampanijos autorizacija su segmentu / faktų / kanalo / išlaidų ribomis gali leisti automatinius veiksmus jose be kiekvieno laiško patvirtinimo. Ji nepersineša į kitas nišas, naujus adresatus už ribų ar mokėjimus.

## Kontaktavimo vartai

Prieš siuntimą atskirai patikrinti šaltinio naudojimo teises, adresato / jurisdikcijos pagrindą, siuntimo tiekėjo taisykles, savininko autorizaciją, pasiūlymo tiesą ir atsisakymą. Kuris nors `UNVERIFIED` neįjungia siuntimo.

Aktuali Lietuvos juridinių asmenų tvarka ir fizinių asmenų atskyrimas aprašyti tyrimo teisinėje dalyje. Tarptautinio adresato atveju atnaujinti vietinę patikrą. Hostinger dabartinė opt-in taisyklė užkerta kelią šaltos kampanijos siuntimui iš bendros dėžutės; nėra leidimo apeiti ją mažesniu laiškų skaičiumi ar kitu domenu. Tiekėjo pakeitimas būtų atskiras konkretus sprendimas, ne dabartinis įdiegimas.

Užklausos apdorojimas, sutikimas gauti rinkodarą ir leidimas perduoti kontaktą partneriui atskiri. Išsaugoti tikrą apimtį, laiką ir teksto versiją. Kontaktų iš vienos nišos nenaudoti kitų nišų reklamoms vien dėl bendro operatoriaus. Operatorius — aktualus config, šiuo metu MB Pinet / info@pinet.lt; svetainės išimtis ir reali siuntėjo paskyra tikrinamos atskirai.

## Duomenų ir integracijos modelis

Žemiau — siūlomi konceptai, ne naujos DB lentelės ar API endpointai:

| Įrašas | Esminis turinys |
|---|---|
| `SourcePolicy` | Šaltinis, URL / dokumento data, leidžiamas naudojimas, limitas, licencija, peržiūros data |
| `Prospect` | siteId, prospectId, organizacijos raktas, rolė, minimalus kontaktas su kilme, atrankos dimensijos, expiresAt |
| `Signal` | Originalus URL, paskelbimo / stebėjimo laikas, originalaus ir redaguoto skelbimo ID, faktai, statusas / terminas |
| `Experiment` | siteId, auditorija, pasiūlymas, kanalas, biudžetas, versija, matavimo / stabdymo kriterijai |
| `ContactPolicy` | Adresato / kanalo / tikslo pagrindas, faktų įrodymai, autorizacijos ribos, suppression sprendimas |
| `OutreachAttempt` | experimentId, siteId, adresatas, kanalas, juodraščio / leidžiamų faktų versija, send idempotency key, transporto būsena |
| `Conversation` | Realūs Message-ID, In-Reply-To / References, siteId, prospectId arba CaseSource, klasifikavimo įrodymas, kitas veiksmas |
| `Suppression` | Adresato / organizacijos raktas, apimtis, priežastis, laikas, atsisakymo įrodymas su ribota prieiga |
| `Outcome` | Konkretaus poreikio ID, priėmimas, vykdymas, tikri pajamų / kaštų įrodymai, ne AI prognozė |

Nišos raktas visur vienas: `siteId`, susietas su esamu runtime `business_id` registru. Naudoti jo CaseSource / užklausų importo sutartį; gamybinė D1 jungtis vis dar reikalauja įrodymo. D1 užklausa nepraranda savo originalaus ID. D1 įrašas ir jo pranešimas inbox nėra du klientai. Neaiški inbox žinutė neparenkama pagal panašų nišos pavadinimą: laikyti unassigned, kol turime pagrindą. Viešas el. paštas nebūtinai yra vienos įmonės unikalus raktas.

Nišų kontaktų / turinio / klientų izoliacija; bendras suppression leidžia sustabdyti operatoriaus reklamą, bet nesuteikia vienam nišos agentui priėjimo prie kitų klientų tekstų. Dublikatų šalinimas organizacijos kodu ar patikrintu domenu; neaiškų sutapimą žymėti peržiūrai. Laikyti nuorodas ir trumpus faktus, ne visą trečiosios šalies turinį. Retention / ištrynimo terminus pagrįsti tikslu; suppression įrodymų minimumą laikyti atskirai nuo pilnos korespondencijos.

Atribucijai vėliau reikia tikro neasmeninio experiment / partner source kelio ir serverinio užklausos ryšio. Dabartinis D1 `source_path` nelaikomas jau saugomu campaignId. Laiško paspaudimai ir tracking pikseliai neįrodo pirkėjo; personalinio sekimo numatytai nepridėti. Būsima migracija turi atnaujinti faktinį backend ir testus, ne vien planą.

Agentas atsakymams naudoja aktualius patvirtintus verslo faktus ir host / laiko filtruotą publicNichePages projekciją. Privatūs turinio planai, archyvinės kainos ar ImageGen darbai neįrodo dabartinio pasiūlymo. Voice lieka išjungtas pagal savo sutartį. Formos saugojimas / pristatymas lieka veikiantis, jei tyrimo agentas ar CRM neveikia.

## GUI ir autonomijos augimas

2026-10-01 privatus Facebook inkrementas jau įgyvendintas esamame agentų core: [modulio sutartis ir paleidimas](agent-business-core/FACEBOOK_MODULE.md), [actual priėmimas](research/facebook-module-2026-10-01/QA.md). Jis turi atskirą per-site valdymą / signalų / draft eilę, naudoja tą patį registry, RLS ir CaseSource. Nuolatinis rinkimas, Page ir external siuntimas dar neprijungti; žemiau esanti platesnė GUI vizija nėra jau veikiantis pilnas CRM. Verslo plėtros idėjas savininko paprašyta atskira sesija registruoja [business-development](business-development/IDEAS.md) pagal `automation-business-planner`; naujai idėjai reikia tikro savininko patvirtinimo.

Būsimame bendrame GUI vienas svetainės filtras ir atskiri ekranai: kanalų / bandymų konfigūracija; nauji signalai su įrodymais; pirkėjai; partneriai / tiekėjai; juodraščiai / planuoti veiksmai; tikros korespondencijos; piltuvas / kaštai; atsisakymai. Kalendorius rodo publikacijas ir kontaktavimo veiksmus kaip skirtingus tipus. Visada matyti, ar veiksmas tik parengtas, autorizuotas, išsiųstas, gautas, ar nepavyko. Nieko nevadinti „klientu“ vien dėl sąrašo įrašo.

Pirmas mažas įgyvendinimas būtų skaitymo / atrankos / privataus draft eilė su esama vietine aplinka ir eksportu; nereikia 30 pilnų CRM ar mokamos automatizacijos platformos. Integruoti su esamo agentų runtime job / retry / outbox modeliu ir tikrinti konkrečiam acquisition veiksmui trūkstamas ribas. Esama outbox savaime nesuteikia teisės siųsti naujiems prospectams. Reikia ribotų bandymų, site / global kaštų lubų ir gyvo sustabdymo. SMTP priėmimo neaiškumo atveju nedaryti aklo pakartotinio siuntimo; pažymėti uncertain, sutikrinti Message-ID / transportą. Tyrimo nesėkmė negali sukelti kampanijos ar fiktyvaus fakto.

Po mažo bandymo ir meaningful patikros leidimus plėsti iki autorizuotų atsakymų / kontaktavimo. Agento savarankiškumas auga su patikrintu procesu ir tikrais faktais, ne su tekstiniu „parduok visiems“ promptu. Web puslapiai, laiškai ir priedai yra nepatikimi duomenys: jie negali pakeisti siuntimo, kainų, mokėjimo, sekretų ar kitų klientų prieigos taisyklių. MCP siuntimo / paskyrų / kreditų įrankius atskirti nuo skaitymo įrankių ir tikrinti realias teises.

## Priėmimas prieš realizacijos paleidimą

- [ ] Tyrimo įrašas turi originalų šaltinį, šviežumą, rolę ir patikrinamus atrankos argumentus; pasibaigęs terminas nepriimamas kaip naujas poreikis.
- [ ] Skirtingų nišų prieiga izoliuota; D1 / inbox / voice deduplikavimas nepraranda šaltinio ir nesudvigubina paklausos.
- [ ] Trūkstamas kontaktavimo pagrindas, netinkamas transportas, suppression, netikras faktas ar biudžeto limitas sustabdo veiksmą; fit score jų neapeina.
- [ ] Atsisakymas lietuviškai, neaiškus atsakymas, OOO, bounce ir tikras poreikis suvaldomi teisingai; OOO nėra teigiamas atsakymas ar naujos sekos leidimas.
- [ ] Patvari outbox / idempotency nepakartoja kontakto po crash / timeout; tiesioginio siuntimo faktas atskiriamas nuo gavimo.
- [ ] Patikrintas leidžiamų faktų / pasiūlymo versijos pasenimas ir prompt injection iš svetainės ar laiško; nėra išgalvotos kainos, partnerio ar datos.
- [ ] Atribucija susieja tikrą užklausą, tačiau nepaverčia sintetinio testo, paspaudimo ar partnerio pokalbio pardavimu.
- [ ] Saugojimas, ištrynimas, tikri gavėjai, tiekėjo sąlygos ir pašto autentifikacija patikrinti konkrečiai naudojamai aplinkai.
- [ ] Formos kelias veikia, kai agentas išjungtas. Išlaidos, auth / quota klaidos ir kill switch išbandyti prasmingais izoliuotais testais.
- [ ] Pirmo bandymo rezultatas įrašytas kaip actual; pelningumas ir kita verslo fazė tvirtinami tik pagal įvykdytų poreikių / ekonomikos įrodymus.

Šios sutarties checkboxai dar nėra runtime PASS. Automatinių žinučių, skambučių, pirkimų, DNS ar naujo heartbeat ši dokumentacija pati neįjungia.

Provider_signup native integracijai naudoti [recipient-binding0.1.0](agent-business-core/contracts/recipient-binding-v1/README.md) greta nepakeisto acquisition0.1.1 ir atskirą [recipient-retirement0.1.0](agent-business-core/contracts/recipient-retirement-v1/README.md). Gavėjo proof tik susieja tikrą patvirtintą paskyrą; aktyviam teikėjui reikia actual organizacijos/publikuoto profilio ir dabartinių tinkamų pasiūlymų. Canonical native normalizer, OTP-before-provider buffer, original invite expiry ir atskiras atomic native counter/outbox saugomi pagal kontraktą. [Izoliuotas capture ledger/API](docs/ACQUISITION_DURABLE_CAPTURE_QA_2026-10-10.md) jau tikrinamas su tikru native OTP→TCP→PostgreSQL, exact replay ir privacy; normalus runtime mount,0011→0012 migracija, native atomic privacy/lifecycle outbox ir portalas turi savo pending priėmimą. Tai dar ne hosted pipeline ar autonominis naujų klientų paieškos paleidimas.

Dashboard ir direktoriaus ataskaita naudoja tą patį [acquisition-projection0.1.0](agent-business-core/contracts/acquisition-projection-v1/README.md) current snapshot: current/historical atskirai, žinomos ledger coverage ir period basis, neprijungti šaltiniai null. Bibliotekos realios DB patikros nėra generic tool/RBAC/route ar portalo adoption; šias būsenas priima jų savininkai. Scope gauna autorizuotas serveris, ne browser/model input.
