---
name: facebook-bot-setup
description: Connect, audit, or repair this core's Facebook bot for an owned Page or personal profile, using official Page Graph API and Codex desktop Computer Use with durable jobs and real receipts. Use for Facebook bot setup, token configuration, live acceptance, or publishing troubleshooting; ordinary site creation does not activate it.
---

# Prijunk Facebook botą prie bendro core

Pagrindinis dabartinės sistemos entrypoint: [FACEBOOK_SYSTEM](../../agent-business-core/FACEBOOK_SYSTEM.md). Tai bendras per-site modulis, ne naujas nepriklausomas botas. [PROJECT_CONTRACT](../PROJECT_CONTRACT.md) ir aktualus savininko pavedimas nustato apimtį. Senas FB planas / draft QA nėra dabartinio transporto aprašymas.

## Pradėk nuo tikro konteksto

- Vykdyk šio checkout Git freshness pagal AGENTS; savo šaka/worktree, sėkmingas origin/main fetch ir recorded source SHA. Nesiremk asmenine skill kopija ar seno pokalbio PASS. Main merge, kito PC fetch ir actual runtime adoption yra atskiri žingsniai.
- Nustatyk siteId, runtime environment, operator/worker prieigą, savininko tikslą, konkrečius Page/profilio URL ir užduočių / auditorijos / biudžeto ribas. Perskaityk tos nišos patvirtintus verslo faktus ir TOOLS / ACQUISITION, jei skelbiamas verslo turinys. Nepersinešk Lineage2ai paskyrų, ID, tokenų ar tekstų kitam verslui.
- Perskaityk normalų master / pasirinkto transporto dashboard ir actual credentials/session readiness. Įjungimas nėra turinio publikavimo įrodymas. Seno `/actions/{id}/send` endpoint nenaudok: jo live transportas sąmoningai neprijungtas.

## Pasirink turimą transportą

| Pavedimas | Dabartinis kelias |
|---|---|
| Valdomo Page tekstas / viena nuotrauka | [Page API](../../agent-business-core/FACEBOOK_PAGE_API.md); naršyklė kasdieniam POST nereikalinga |
| Komentaras po to Page įrašu / atsakymas į pirminį komentarą | Page API, exact Graph parent ID ir serverio ownership check |
| Asmeninio profilio įrašas / jo komentaras | [Codex desktop Computer Use](../niche-client-acquisition/references/facebook-browser-worker.md) |
| Page arba profilio komentaras grupėje | Computer Use, aktualus to aktoriaus group-access ir exact parent URL |
| Iki3 grupių paieška | Computer Use `discover_groups`, tik root metaduomenys |
| Like / reaction, join, DM, collector, scheduler | Dabartinė eilė šių veiksmų neturi; neapsimesk, kad comment/post juos įvykdė |

Įprastas Codex CLI generatorius neturi desktop naršyklės. Page API leidimas nesuteikia asmeninio profilio / grupių publikavimo API. API ir Computer Use vienam realiam prisijungimui privalo dalytis tuo pačiu account_key ir job kvota.

## Prijunk ir patikrink

**Page API:** skaityk [Meta prijungimą](references/meta-page-connection.md), tada Page API runbook. Naudok tinkamą patikrintą programą arba pagal tikrą savininko mandatą sukurk vieną minimalią Pages programą. Patikrink išsaugotus OAuth pasirinkimus: Meta gali numatytai pažymėti visus Page. Atskirai įrodyk tikslų Page, app, scope ir token galiojimą. Browser actor ID ir Graph Page ID nustatomi atskirai. Paslaptys lieka privačiame ignored runtime faile; operator HTTP gauna tik credential_key. Verify yra GET į Meta, ne post.

**Computer Use:** perskaityk actual turimo browser įrankio dokumentaciją. Patikrink aktyvų Page/profilį UI, tikslią tapatybę, auditoriją ir editable composer; užregistruok riboto galiojimo binding. Grupėje patikrink actual taisykles ir būtent to aktoriaus formą. `Join group` savaime neįrodo komentavimo draudimo. Media atveju naudok palaikomą file chooser, vieno privataus failo hash ir realią miniatiūrą. Jei įrankis grąžina „Allow access to file URLs“ klaidą, naudok jo documented handoff; internal chrome:// adreso saugos atmetimo neapeik.

Prieš įjungdamas naują runtime / saugumo prieigą taikyk actual tool reikalavimus ir esamą autorizaciją. Įprasto jau autorizuoto post/comment teksto, pasirinkto tinkamo parent ir serverio submit permit savininkui kartotinai tvirtinti nereikia. review_note yra Codex teiginių, kalbos ir kanalo patikra. API / browser policies ir master policy numatytai off; įjungti tik pavedimui reikalingus vartus per normalų HTTP CAS kelią.

## Vykdyk per eilę ir užbaik kvitą

- Naudok nekintamą key/body/audience/media/context ir actual worker. Page worker atlieka vieną POST, prieš jį patvariai įrašo sending; žinomą provider ID išsaugo prieš GET. Computer Use pasiekia galutinę Next/Post peržiūrą prieš vieną15s permit, naudoja tikrą iki20s UI stebėjimą ir vieną click. Neužklijuok naujo observed_at ant senos UI patikros.
- Ilgam read-only paruošimui claim nepradėk per anksti. Aktyvų galiojantį claim atnaujink prieš expiry. Po privalomo handoff pasibaigusiam **dar be jokio permit** darbui galimas tik įrodyto not_published reconciliation ir explicit resume kelias; po permit ar receipt jis draudžiamas. Tai nėra automatic retry.
- Matomas Posting / client UUID dar nėra provider receipt. Grupės pirmas komentaras gali būti accepted pending review be ID: saugok pending_moderation su explicit notice ir originaliu parent. Laukimas nėra visible. Po moderator approval atlik tik read-only check ir išsaugok tikrą comment ID / permalink.
- Uncertain / accepted su nepatvirtintu rezultatu nekartok. Įrašyk tikrą būseną, išlaikyk account užraktą ir sutikrink per documented check-only. Timeout nėra įrodymas, kad Facebook nieko nepaskelbė.
- Užsakytas ribotas testas baigiasi kiekvienos užduoties kvitu ir normalia pause. Screenshot rodo konkretų rezultatą; screenshot failas ir raw socialiniai duomenys lieka privatūs. Įrašas / reakcija / atsakymas nėra gauta kliento užklausa.

## Perduok kitam AI

Pateik per-site būseną pagal [priėmimo ir handoff sutartį](../../agent-business-core/FACEBOOK_SYSTEM.md#priėmimas-ir-perdavimas): vykdytus veiksmus, transportą, proof datą, source SHA, scopes be tokenų, tikslius job rezultatus, quota/pause, išlaidas, trūkstamas priklausomybes ir atkūrimą. Privačiai saugok actual provider nuorodas; į Git keliauja sanitizuotas report, unikalūs upgrade ir scoped PR. Core code clone neperkelia Facebook sesijos / tokeno ir nereiškia24/7 paleidimo.

Pavyzdinis [penkių gyvų užduočių testas](../../docs/FACEBOOK_LIVE_TEST_2026-10-14.md) įrodo šio transporto kelią2026-10-14; jo seni failed etapai išlaikyti. Tai ne kitos nišos PASS. Rastas atkuriamas shared neatitikimas taisomas pagal CORE_IMPROVEMENT su originaliu FAIL ir prasminga regresija, ne vien pasiūlomas kitam AI.
