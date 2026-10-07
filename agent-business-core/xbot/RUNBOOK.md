# Xbot vietinė darbo vieta

Pirmiausia [būsena](IMPLEMENTATION_STATUS.md), [QA](QA.md), [Treg prieiga](TREG_SETUP.md). Šio paketo lokalaus koordinatoriaus patikra nėra viso savininko pavedimo ar gyvos komercinės kampanijos priėmimas.

## Paleisti privačią darbo vietą

Terminale iš šio `agent-business-core/xbot/` katalogo:

```powershell
uv sync --locked
uv run python -m xbot.cli init
uv run python -m xbot.cli serve
```

Atverti `http://127.0.0.1:8893`. Prisijungimui yra sugeneruotas lokalus `data/.operator-key`; **ne** Treg raktas. Pirmasis PhoneBridger profilis OFF, paused, live read/write OFF, biudžetai 0. Naujos nišos taip pat prasideda išjungtos. Vietinių API pavyzdžių/cookie sesijos nereikia kelti į viešą core.

GUI turi verslo pasirinkimą, veikimo būseną, darbo kalendorių, Codex užduotis ir juodraščius, kiekvieno teksto/datos/politikos hash peržiūrą, rinkos signalus atskirai nuo inbound, išlaidų kvitus, politikos versijas ir pause/resume. Kalendorius rodo verslo laiko juostą; rankinis datetime input interpretuojamas to įrenginio laiko juostoje. Lentelės rodo naujausius 200 darbų/išlaidų ir 150 įrašų; sąnaudų/signalų bendros sumos skaičiuojamos SQL iš visos saugyklos. DB failai nekeliauja su Git.

API naudoja HttpOnly same-site login cookie arba vietinį operator Bearer. Cross-origin mutacijos ir svetimas Host atmetami. Ši autentifikacija yra vietinės darbo vietos riba, ne internetui ar daugelio operatorių role sistemai priimta apsauga. Nepublikuoti serverio, neįjungti tunnels ar 0.0.0.0.

## Agentų ir vykdymo kelias

```powershell
uv run python -m xbot.cli day
uv run python -m xbot.cli tick
uv run python -m xbot.cli worker
```

`day` idempotentiškai sudaro dienos planą ir ribotas query užduotis. `tick` vykdo vieną due job; `worker` kartą per minutę aptarnauja įjungtus profilius ir išsaugo heartbeat. Darbo langas ir publikavimo datos taikomi Europe/Vilnius/DST arba profilio IANA zonai. Vienas account lease saugo nuo lygiagretaus X siuntimo. Veikia tik su **viena autoritetinga DB**; dviejuose kompiuteriuose klonuotos SQLite kopijos nėra distributed scheduler.

Codex per bendrą `runtime/src/pinet_core/codex_lab.py` gauna tik patvirtintus faktus, allowed URL, konkrečią užduotį ir ribotus tyrimo signalus. Modelis neturi shell, MCP, apps, naršyklės, tinklo ar ImageGen įrankių. Jis planuoja, rašo, atskirai peržiūri, kvalifikuoja signalą arba rengia rezultatų suvestinę. Instrukcijų ir faktų hash išsaugomi. `XBOT_CODEX_ENABLED=true` ir modelio prieiga būtini; modelis iš `XBOT_CODEX_MODEL` arba tik user config `model` scalar. Nenaudoti viso config modelio runneriui. Actual šiame kompiuteryje API atmeta numatytą gpt-5.4 ir configured gpt-6.1-sol: prieš įjungiant privalomas sėkmingas faktinės CLI paskyros draft+review bandymas. Nemeluoti, kad fixtures tai įrodė.

`auto_publish=false` numatytai palieka juodraščius privačius. Įjungtas `auto_publish` gali parengti originalaus posto užduotį tik po teigiamos atskiros review, be unsupported claims, su valid fact indices ir valid tekstu/URL. Faktų ar politikos pakeitimas panaikina pending review; vykdytojas patikrina kontekstą dar kartą po kainos patikros ir atominiame dispatch. Rankinis tekstas turi exact-version operator review. Agentas negali pats padidinti biudžeto, paskirti savo mandato ar ignoruoti šių vartų.

Nuolatiniam darbui reikalinga tikra verslo faktų projekcija su siteId/business_id, actor atitikimas (šiuo metu actual @synthaudio), mandato paskirtis, faktų šaltinis/datos, per-site ir global spend ribos. Modelio sąnaudos yra atskiras Codex paskyros resursas, ne Treg ledger. `codex_calls_per_day` riboja kvietimus per nišą, bet neįrodo nemokamumo ar USD ribos.

## Kaštai ir neaiškus rezultatas

Prieš gyvą kvietimą skaityti šviežią (TTL 5 min.) Treg kainos descriptor ir rezervuoti konservatyvią sumą vienoje SQLite transakcijoje. Identity naudoja user-resource rate, media-alt tikrą metadata descriptor. Original post/reply/thread rezervuoja bent $0.20 net jei be URL; žemesnis actual settlement atlaisvina skirtumą. Kainos/kvotos riboja ir nesėkmingus dispatch bandymus. Tai vietinis atsisakymo vartas, ne upstream garantija niekada nenuskaičiuoti daugiau. Katalogo ar receipt nepasiekiamumas nėra nulinė kaina.

Timeout/network/409/410 neaiškūs rezultatai laikomi `uncertain`. Expense rezervas lieka, modulis pristabdomas esant neaiškiai sumai. Expired write lease negrąžina darbo į queued. Reply/DM rezervuoja interaction suppression prieš siuntimą: praradus receipt negalima atsakyti tuo pačiu interaction nauju key. Blind retry ar automatinis perjungimas į kitą providerį nenumatyti.

`POST /api/sites/<site>/jobs/<id>/reconcile` surenka Treg call ledger/result tik iš to site's uncertain darbo jau užregistruoto call_id. **Tai įrodymų surinkimas, ne automatinis job užbaigimas, rezervacijos atlaisvinimas ar pakartotinis siuntimas.** Own-tool Treg gali neturėti response kopijos. Jei call_id dingęs, reikalinga actual X/Treg peržiūra; neatkurti failed būsenos iš prielaidos.

## Medija ir sąveikos

Svetainės/ImageGen kilmė ir responsive WebP šeimos lieka bendro MEDIA_CORE atsakomybė. Socialinis modulis nekurią dar vieno vaizdų optimizatoriaus. X transportui lokalus failas `data/assets/<id>.png|jpg|webp` priimamas tik su exact SHA-256 `asset` manifestu: source ir rights_verified. `POST /api/sites/<site>/media` su asset_id/alt tikrina actor, mandatą, kainą, upload bei alt receipt; tik ready, savo actor ir neexpired media_id tinka postui. Asset manifest nėra GUI importo ar actual upload bandymo priėmimas. Šiuo paketu transporto kontraktas patikrintas official OpenAPI + mock HTTP, gyvas upload dar UNVERIFIED.

Reply/DM numatytai OFF; reikalingas platformos actual AI approval, priimtos OAuth galimybės, aiškiai inicijuota sąveika, atsekamas optin_evidence, neopt-out būsena ir tinkamas parent/recipient. Vien keyword signalas nėra leidimas. Mention pagination saugo pending cursor ir nekeičia since_id, kol neišskaityti puslapiai; vėlesnis bounded poll tęsia pagination. Kolektorius neperrašo jau užfiksuoto opt-out. DM id nėra public tweet URL. Nuosavo posto metrics nepriimami, jei actual author nesutampa.

Likes, hide, masinis following, cold keyword replies ir browser fallback nenumatyti. SEO svetainės išlieka pirmoje fazėje; X modulio runtime nėra jų prekybos ar tiekėjų sistemos įjungimas.

## Core perdavimas ir tęstinumas

Ši eilė saugo socialinio transporto, planning, review, cursor ir expense būsenas. Ji nėra naujas CRM, site content publisher ar bendro business-core schemos pakaitalas. Core turi likti approved faktų, CaseSource ir realių pardavimų autoritetas. Esamas `/v1/sites/{site}/lead-import` priima tik website_d1; X postą taip maskuoti draudžiama. Tikra social inbound CaseSource sąsaja dar neįgyvendinta ir nepriimta. UI sąmoningai rodo `core_inbound=not_connected` ir pardavimus „Nežinoma“.

Tolimesnės vykdomos užduotys — [ROADMAP](ROADMAP.md). Neužbaigti pavedimo iš dalinio commit ar testų sumos; po realios modelio prieigos/actor mandato/biudžeto ir core adapterio reikia tęsti vertikalų actual priėmimą. Draft PR saugo vietinį paketą iki šių vartų, ne live kampanijos pažadą.
