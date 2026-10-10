# Verslomatika / Madbeauty sesijų koordinavimas

2026-10-10. Savininkas nurodė šioms sesijoms dirbti kartu. Bendras pasiekiamas koordinavimo šaltinis: [issue66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66). Kiekviena sesija komentare patvirtina repo, savo branch, pilną SHA, tikslius rašomus failus, PR ir priimtą contract_version/schema SHA. Prieš pakeitimus skaito aktualius komentarus ir vykdo Git freshness. Šis dokumentas nėra distributed lock ar patvirtinimas, kad visos sesijos jau jį perskaitė.

| Sesija | GitHub šaltinis ir darbo sritis | Ko dar laukiame |
| --- | --- | --- |
| Root 01a1225a-4db6-7aa1-a679-67d01d7cb104 | Shared acquisition, codex/acquisition-core-20261009 / [PR59](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/59), kontrakto source f629b76cfe3f9738d452b7734d6b6d72b8ff8f29 | Durable pipeline, native adapterio ir hosted testų priėmimas |
| „madbeauty.lt agentas“, 01a11268-7ab2-7a23-973c-598322dba15a | Madbeauty backend/Workers/prototype, ai/madbeauty-platform-upgrade-20261007 / [PR26](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/26), GitHub head 8dafd2c679527e06efdca70144d16f6de228d52c | Sesijos naujiau pranešto 14d49f8 pilnas SHA / push; 0.1.1 adapterio priėmimas po platformos išleidimo |
| Core integracijos sesija 01a122ec-9cfa-79b3-966b-43aa3f39ab58, kitas PC | Šis repo, codex/verslomatika-core-integration-plan-20261010 / [PR65](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/65), perskaitytas planas 21a59d594bd9e6934487b1d557c78c12e0e67119; issue66 jau gauta control runtime / I1a-I1b / migration0010 rezervacija | Naujas actual runtime SHA / tests / adoption; generic I2 failų rezervacija |
| Verslomatika „Kordinatorius A“, 01a0dcf8-8ade-7883-877b-8d5dba4e8c79, kitas PC | christianza1989/verslomatika, codex/core-portal-integration / [PR62](https://github.com/christianza1989/verslomatika/pull/62), 7b3885edd866e79cba4dc3ae4cad55b402c5039d; portalo login/session/BFF/UI planas | Issue66 perskaitymo atsakymas; portfolio.v1 vartojimas ir konkretūs I1b/UI failai |

[Issue64](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/64) ir PR65 rezervuoja `docs/VERSLOMATIKA_CORE_INTEGRATION_PLAN.md`, `docs/VERSLOMATIKA_CORE_INTEGRATION_EVIDENCE.md`, `docs/contracts/verslomatika-portfolio.openapi.json` bei savo WORKSTREAMS pastraipą. Sesijų tapatybė ir paired review patvirtinti jų paskelbtuose PR62/PR65 dokumentuose. Tai source review, o ne naujas issue66 perskaitymo ar acquisition adoption atsakymas. Šių failų neperrašome ir nesiimame antro konkuruojančio registry.

## Darbas per GitHub

Savininkas pasirinko GitHub koordinavimą. Root paskelbė nukreipiančias žinutes [core PR65](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/65#issuecomment-6091317697), [portalo PR62](https://github.com/christianza1989/verslomatika/pull/62#issuecomment-6091317916), [Madbeauty PR26](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/26#issuecomment-6091326837) ir [savo PR59](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/59#issuecomment-6091318242). Issue66 body turi aktualias ribas; atsakymai ir sprendimai turi likti jo komentaruose, kad visi PC matytų vieną eilę. GitHub paskelbimas savaime nepažadina Codex sesijos. Kito PC agentas turi pats perskaityti komentarą; gavimą patvirtina jo atsakymas. Automatinė GitHub→Codex paleidimo sistema šiame pakete neįdiegta.

> Prieš bendrą darbų partiją perskaityk issue66 naujus komentarus, fetch ir Git freshness. Užfiksuok savo session ID, repo/branch/pilną SHA, PR ir tikslius owned files. Patvirtink priimtą kontrakto versiją/schema SHA, actual ir planned API atskirai bei kitą priklausomybę. Core portfolio.v1 priklauso PR65; portalas vartoja jo canonical OpenAPI. Root acquisition ir Madbeauty native adapteris turi atskiras failų ribas. Konkrečių models/migrations/api.py/control/registry/chat failų rezervaciją paskelbk prieš rašydamas. Nerodyk fixture kaip veikiančio agento; acquisition 0.1.1 HTTP/DB/hosted pipeline dar turi būti realizuotas ir priimtas. Įgyvendinęs palik issue66 commit/PR, testų įrodymus ir adoption/release būseną.

Ankstesnis tiesioginis kito PC thread/read grąžino host unavailable. GitHub šaltiniai dabar perskaityti, bet tiesioginis ryšys dėl to neatsirado. [Remote connections instrukcija](https://learn.chatgpt.com/docs/remote-connections) lieka atskiras pasirinkimas; savininko pasirinktam GitHub darbui jos įjungti nereikia.

## Sąsajų savininkai

PR65 siūlo vieną core organizations/memberships/grants šaltinį, stabilų Business UUID/site ID ir keturis `portfolio.v1` GET. Portalas owns session/BFF/UI; serveris tikrina dabartines grants. Pirminio plano actor assertion vietiniam pilotui pakeičia žemiau gautas core-issued session susitarimas; future IdP atskiras. Acquisition adapterio HMAC yra atskiras server-to-server protokolas ir nepakeičia portalo naudotojo auth. Keturi portfolio GET dar neteikia agentų correspondence/report/chat projekcijų. Joms reikia atskiro suderinto kontrakto ir generic registry/task/chat I2 failų savininko; dabartinis narrow D1 pasiūlymas neužbaigia D1/D2.

PR65 iš pradžių rezervavo dokumentus; vykdymo metu core sesija išplėtė savo ribas [I1a/I1b issue66 komentaru](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6091345559), o root [patvirtino gavimą](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6091365642). Tai rezervacija, ne actual runtime priėmimas. Core owns `agent-business-core/runtime/src/pinet_core/control/**`, `migrations/versions/0010_control.py`, `tests/test_control_portfolio.py`, `scripts/control_bootstrap.py`, `scripts/control_local_setup.py`, naują local portfolio doc ir savo upgrade UUID (runtime keliai santykiniai runtime katalogui). Bendruose `api.py` tik control import/mount, `config.py` tik control settings, `migrations/env.py` tik control metadata import. Legacy models/db/conftest, acquisition ir portalo source šis langas neperima.

Local pilot: core-issued opaque persisted revocable 8h sessions, login/logout, scrypt password hash / token SHA256 tik server DB, portal BFF HttpOnly cookie, aktualios memberships/grants kiekvienam request; disabled by default ir loopback-only. Core sesijai perduota atnaujinti canonical OpenAPI/planą bei full source SHA prieš portal types/auth priėmimą. Actual PostgreSQL two-org/RLS/session/cursor ir portal browser testai dar laukia. Loopback priėmimas nėra hosted pilotas.

Acquisition neliečia migration0010. Kitą konkrečią revision/down_revision root suderins issue66 pagal actual core source prieš rašymą. Generic I2 agent registry/durable task/director chat failų savininkas dar turi būti rezervuotas atskirai. Root acquisition sritis nepersikelia į šiuos modulius. Madbeauty native backend/outbox priklauso jos sesijai; root neliečia `sites/madbeauty/backend/**`, `sites/madbeauty/cloudflare/**` ar `sites/madbeauty/prototype/**` jos checkout.

Portalo PR62 aktualus body ties 7b3885e fiksuoja ankstesnio Vercel author blocker RESOLVED ir READY preview. To paties head `docs/handoffs/core-portal-integration.md` dar turi seną blocker įrašą; jo savininkui PR komentare perduotas prašymas suderinti handoff, išlaikant istoriją. Tai nėra naujas deployment gedimas ar customer runtime priėmimas.

## Kontraktas ir darbo eilė

[Acquisition0.1.1](../agent-business-core/contracts/acquisition-v1/README.md) turi canonical Python→JSON schema, raw-byte Python/Web Crypto signature vector, invitation/resolve/native lifecycle/capture shapes. Native registracija nepadaro profilio aktyvaus; tam reikia tikro Madbeauty eligibility/operator approval. Testinis capture neišsiunčia laiško į išorę.

1. Sutarti scope/auth/identity ir I1a/I1b/I2 ownership pagal PR65, PR62 ir issue66. Bendro core generinių agentų registry/chat failų rezervaciją patvirtina juos kurianti sesija.
2. Root pateikia acquisition durable storage/router/worker ir operator projection su vienu versijuotu kontraktu; Madbeauty priima savo native outbox/ref adapterį. Tikslūs bendri migration/API failai rezervuojami issue66.
3. Uždaras actual model/capture/site-backend testas, tada realios visos Lietuvos šaltinių paieškos juodraščiai su kategorija×vietove ir organizacijos dedup. Nežinomas ketinimas prisijungti lieka unknown.
4. Verslomatika rodo to paties backend būseną, aktyvumą, correspondence, runs, stop ir report evidence. Direktorinis chat nekeičia serverinės mandatų/leidimų kontrolės.
5. Actual hosted priėmimas ir testavimo launch tik po native callback/replay/scope/stop bei tikro paieškos vykdymo patikrų. Faktinės siuntimo teisės/transportas/biudžetas neatsiranda nuo Git merge.

Dashboard [planas](../agent-business-core/verslomatika-plan/README.md) paruoštas, 35 ekranai, D0–D9. Jis atskirtas nuo dar nepriimto įgyvendinimo. Pilnas agentas ir viso pipeline testavimo paleidimas šiame kontrakto etape nedeklaruojami.

## Kontrakto patikra

2026-10-10 lokaliai: 42 acquisition offline regresijos PASS (31 ankstesnė +11 naujų kontrakto/security testų), 3 Node/Web Crypto patikros PASS, canonical schema/vector exact check ir scoped Ruff PASS. Pirmas bandymas turėjo import ordering FAIL ir dvi test fixture TypeError dėl dubliuoto body argumento; pataisytas tik testas, jo tamper assertions nepašalintos. Produkto signature/scope/lifecycle vartai nesušvelninti.

Actual DB/HTTP/site/frontend/replay testų šiame pakete nevykdėme. Docker executable yra, daemon nepasiekiamas; šiame etape svetimas runtime ar duomenų bazė neperimta. Tolimesnės actual DB patikros turi savo izoliuotą aplinką.

Vėlesnė0.1.0 kontrakto patikra parodė external_sent=0 →false Python coercion neatitikimą JSON boolean schema. Išsaugotas pradinis numeric_false_accepted=True įrodymas;0.1.1 wire primitive strict/frozen ir explicit false validator jį atmeta. Papildytos to paties11testų assertions dėl numeric/string false, string/bool revision, string approval ir numeric date-time; visi11 ir3Node PASS. Atskirai schema exact/Ruff patikra PASS. Modelių/conversation elgsena nepakeista.

Madbeauty sesija patvirtino 2082c6ba kontrakto gavimą ir numatė server-side OTP verified account → recipient binding; actual teikėjo pradžia /meistrui/pradzia per /paskyra, operator-approved current profile revision → native lifecycle ir persistent outbox. Ji diegia savo platformos leidimą ir vėliau priims scoped adapterį. Recipient canonicalization, native provider/profile key ir dedicated server-HMAC proof payload dar turi būti sutarti issue66; plain email SHA256 nėra priimtinas binding proof. 0.1.1 patch adoption dar nepatvirtintas; schema gavimas nėra native integration bandymas.
