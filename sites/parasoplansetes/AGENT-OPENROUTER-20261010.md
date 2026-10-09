# OpenRouter jungtis — 2026-10-10

Savininkas paprašė pridėti OpenRouter į bendrą core ir šią nišą. Ankstesnis
tikras Chrome žinutės bandymas pasiekė Google, bet Gemini API grąžino HTTP402
`prepayment credits depleted`; modelio atsakymo nebuvo. AI Studio parodė
`Prepay required`, jokio paruošto prepayment metodo ir 0EUR tinkamų GCP kreditų.
Šie privačių bandymų kvitai išsaugoti; metadata200 nėra pokalbio kokybės PASS.

## Įgyvendinta

- Bendras serverio `text_provider.py`: aiškus Gemini arba OpenRouter pasirinkimas.
- Tas pats pasirinkimas naudojamas svetainės chat, analizei, nepriklausomai
  laiško peržiūrai ir žinomo laiškų thread atsakymui. Nėra atskiro CRM/mail variklio.
- Core tool/evidence, contacts/memory, reviewed followup, recipient ir biudžeto
  vartai lieka galioti. OpenRouter engine žyma nesuteikia siuntimo leidimo.
- Struktūrizuotas JSON, operatoriaus kainų ribos, privacy routing ir sąnaudų
  registravimas. Modelio/transporto klaidos nekartojamos automatiškai.
- Viešo rendererio signed chat protokolas nepakeistas. Balsas lieka išjungtas;
  Codex tekstinio kalibravimo kelias nepakeistas.
- Tikras bandymas aptiko pakartotinių knowledge.resolve ciklą. Pataisa išlaiko
  trijų generacijų ribą: paskutinė naudoja reply-only schemą ir negali kviesti
  daugiau įrankių. Pirmo gyvo bandymo FAIL išsaugotas; po pataisos tikras
  Chrome → svetainė → OpenRouter → agento atsakymas PASS.

Official OpenRouter catalog GET2026-10-10 patvirtino `google/gemini-3.8-flash`,
`response_format` / `structured_outputs`; nurodytas prompt0.75/completion3.75USD/M.
Tai šios dienos katalogas, ne kainos garantija. Projekto operatoriaus ribos
paruoštos pagal šį modelį; private raktas į Git nepatenka.

## Priėmimo ribos

Prieš gyvo ciklo pataisą pilnas runtime:371PASS. Private OpenRouter `.env`
atskleidė vieną legacy Gemini-default testų izoliacijos FAIL; autouse fixture
jį pataisė, tikslinis platesnis rinkinys65PASS. Po reply-only pataisos37tikslinės
regresijos PASS, įskaitant signed ASGI/PG/tool/cost/idempotency kelią su
nemokamu MockTransport ir daugiau įrankių atmetimą galutiniame žingsnyje.
Galutinis pilnas runtime:373PASS (158,87s). Naujų modulių Ruff, pakeistų
legacy modulių F lint ir diff whitespace PASS.
Originalūs bandymų FAIL neperrašomi; jokio naujo protected Gemini/OpenRouter
archetipų rato arba 10/10 bendravimo priėmimo nedeklaruojama.

Savininkas pateikė OpenRouter raktą; jis įrašytas tik ignoruojamame runtime `.env`.
Oficialūs katalogo ir rakto GET abu200, metadata preflight PASS. Pirmas gyvas
bandymas: įrankiai įrašė poreikį, tačiau trys generacijos baigėsi paieškų ciklu,
atsakymo nebuvo; provider-reported26046microUSD ir40000rezervacija išsaugoti.
Po pataisos naujoje Chrome sesijoje gautas modelio atsakymas apie Windows/PDF
darbo vietą. Dabartinio source OpenRouter mail/inbox/reply kelias UNVERIFIED.
Antra žinutė išlaikė 2įrenginius/1Windows darbo vietą/PDF poreikį ir pridėjo
Adobe Acrobat kontekstą. Agentas faktiškai iškvietė ui.open_contact_form,
naršyklė parodė laukelį ir serveris išsaugojo shown ACK. Du tikri modelio
atsakymai; pokalbis baigtas per UI, kontaktas neįvestas. Tai vienas sintetinės
užklausos gyvas transporto bandymas, ne protected archetipų kalibravimas.
Ekrano kopijos ir išsamūs DB įvykiai išsaugoti tik ignoruojamuose artifacts.
Viešo Cloudflare preview core jungtis po PC perkrovimo dar neprieinama503;
vietinis preview5197/API8853/PG25443 atkurtas. Nuolatinis hosting/DNS ir
reviewed main merge/adoption lieka atskiri darbai.

Papildomai leista iki0.30EUR vienam realiam chat bandymui. Konservatyvi
250000microUSD allocation; Google402 bandymas pridėjo40000 rezervaciją,
provider observed0. Autentifikaciją atkūrus atrakinta tik likusi210000allocation,
policyrevision7, ne naujas biudžetas. Trys OpenRouter žinutės (pirmas FAIL,
du atsakymai po pataisos) pridėjo120000microUSD rezervacijų ir provider-reported
70878microUSD (0,070878USD). Ledger48rezervacijos, held2026000microUSD,
observed563488microUSD; nepanaudota90000allocation vėl užrakinta,
global/daily/sitecap2026000, policyrevision8. Savas API perkrautas su šia riba.
Visos ankstesnės rezervacijos išsaugotos; niekas nelaikoma provider invoice.
OpenRouter pasirinkimas naujos išlaidų autorizacijos nesukuria. Credit purchase,
voice, SMTP ar background jobs šiame rate neįjungiami.

Konfigūracijos eiga: private `.env` įrašyti `PINET_OPENROUTER_API_KEY`,
`PINET_TEXT_PROVIDER=openrouter`, `PINET_OPENROUTER_MODEL=google/gemini-3.8-flash`,
prompt/completionoperator ceilings0.75/3.75; vykdyti metadata-only
`scripts/text_provider_preflight.py`. Kai key/credit veikia, atkurti tik likusią
autorizuotą bandymo ribą ir pradėti naują naršyklės pokalbį. API restartas
perskaito `.env`; prieš background jobs įjungimą reikia atskirai patikrinti
esamas postcall/mail eiles ir jų biudžetą.

Rollback: grąžinti private `PINET_TEXT_PROVIDER=gemini` ir perkrauti savą API;
arba scoped code revert. DB migracijos nėra. Senų dialogų, laiškų, provider
rezervacijų, žinių paketų ir C5 vertinimo istorija lieka išsaugota.

Upgrade journal: `upgrade-6b6e990d-88c5-4f03-b6e1-30a4892823b8`.
Fresh core main d4ea8bf7384b70c4ea62a344001e3f8158812c56 ir companion main
d0fd6b7d296303bfcaafadc4071945e675a72b96; savo private PR46 šaka,
companion b2d581d šio darbo metu source nepakeistas. Backend papildymas
reviewable PR46, ne reviewed main merge ar kito PC adoption.
