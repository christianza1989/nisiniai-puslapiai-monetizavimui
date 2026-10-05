# Autonominių pre-live patikrų žurnalas

2026-09-30. Apimtis: bendras voice runtime ir traktorių svetainės vietinė integracija. Tikras mikrofonas/modelio audio, viešas domeno deployment, kliento laiškas ir paklausa šiuo darbu nepatvirtinti.

| Patikra | Rezultatas | Įrodymai ir riba |
| --- | --- | --- |
| Visas Python runtime paketas | PASS | 92 testai, 0 klaidų, 290,83 s; tikras PostgreSQL, izoliuotos atsitiktinės testų aplinkos, išjungti mokami provideriai ir SMTP. JUnit: runtime/artifacts/prelive-tests.xml. |
| Ruff | PASS | src/scripts/migrations/tests; paskutinio M0 probe pakeitimo importai taip pat patikrinti. |
| Viešo core TypeScript ir siauras ESLint | PASS | tsc --noEmit; balso bridge, valdiklis ir route. |
| Viešo core regresijos | PASS | npm run test:core: 19/19. Kitų sesijų turinio/medijos failai nekeisti. |
| Traktorių SEO smoke | PASS | 11 public pages, robots, sitemap, llms, schemas, host isolation ir 404; source peržiūra 5187. Tai nėra paieškos paklausos ar viso A–Z svetainės audito įrodymas. |
| Balso HTTP edge smoke | PASS | Alias/metodai, vidinių kelių izoliacija, Origin, HMAC, privatus manifestas ir voice readiness vartai. Tikras modelis nekviestas. |
| Pokalbis → jobs → artefaktai | PASS | local_smoke.py: realus HTTP, PG ir atskiras jobs procesas sukūrė analysis, quality, followup; sintetinis case pašalintas, audio ir mail false. |
| Perskambinimo atmintis | PASS | memory_web_smoke.py: tikras API/public edge, grįžimo kontekstas, cookie revoke; token nėra JSON. Tikrinta įrenginio atmintis, ne asmens tapatybė. |
| Dabartinių žinių grandinė | PASS | knowledge_web_smoke.py: foninis HMAC ir browser→edge refresh, 11 patvirtintų puslapių, browser manifesto pakeitimas neleidžiamas. |
| Migracijų atkūrimas | PASS | check_migration.py iki 0007_import: 17 lentelių/13 forced RLS, vienkartinė schema pašalinta; taikytos migracijos neperrašytos. |
| Tikras DB kopijos atkūrimas | PASS | pg_dump/restore į vienkartinę DB: ribota rolė, tenant/aplinkos izoliacija, transkriptas/kontaktas/outbox ir lease/generation. Jobs/mail false; privatus dump į failą nesaugotas; fixture ir laikina DB pašalinti. runtime/artifacts/backup-restore-report.json. |
| Mobilus valdiklis ir klaviatūra | PASS ribotai | IAB: 390×844 panel x16,width343; 320×640 x16,width273,height313,5. Nėra horizontalaus widget perpildymo, open fokusas Close, Escape grąžina fokusą į launch. Pradžia be M0 parodo fallback. Android/iOS, mikrofonas ir Bluetooth netikrinti. |
| Google native M0 probe | UNVERIFIED | blocked_missing_google_api_key; full_m0_pass=false. Papildomi 3 testai įrodo key/budget/rate vartus be išorinių kvietimų. Įeina į bendrus 92. runtime/artifacts/m0-probe.json. |
| Live readiness doctor | UNVERIFIED gyvam balsui | Ribota DB rolė, skirtingi serverio raktai ir aktualios žinios PASS; Google/LiveKit/M0/budget/site enable nėra patvirtinti. live_eligible=false; voice ir SMTP false, unreconciled_delivery_count=0. runtime/artifacts/prelive-doctor.json. |
| Tikras SMTP→INBOX | UNVERIFIED | SMTP transporto gedimai testuoti pakaitalais; realus siuntimas/gavimas neatliktas. |
| Tikras Gemini/LiveKit audio, semantika ir invoice | UNVERIFIED | SDK sutarties pakaitalas ir sąnaudų formulė nėra tikro modelio, lietuvių tarimo, reconnect ar sąskaitos įrodymas. |
| Viešas traktoriupadangos.lt deployment | UNVERIFIED šiame darbe | 5187 yra vietinė source peržiūra. DNS, viešo domeno balso secrets, nuolatinis core/worker hostingas ir M6-A dar reikalingi. |

Runtime paketas apima RLS/composite FK, nonces ir sesijų capability, concurrent admission, budget rezervacijų lenktynes, worker/job fencing, kontakto/pabaigos abi tvarkas, UI ACK, kontakto korekciją ir pasenusį outbox, žinių TTL/revoke/refresh, perskambinimo izoliaciją/puslapiavimą/retention, du profilius, D1 replay/CAS ir read-only reader restartą, SMTP timeout/refusal, inertinių kandidatų statinę patikrą, SDK adapterį, clipped transcript coverage bei kumuliacinio usage deduplikavimą.

Pirmas naujo D1 skaitytuvo testas nepraėjo dėl testinio ID, neatitinkančio tikro formos UUID kontrakto. Pataisytas fixture; nebuvo atlaisvintas produkcinis validatorius. Ankstesnis visas paketas turėjo 89 PASS; pridėjus M0 biudžeto/rate vartų testus visas paketas pakartotas ir gautas 92 PASS. Vietiniai procesai po nutrūkusios sesijos buvo sustoję, todėl atkurti ir HTTP/edge/jobs patikros vykdytos su naujai paleistais procesais.

Runtime artefaktai ir .env ignoruojami. JSON žurnalas greta šio dokumento saugo tik metaduomenis, be kontaktų, transkriptų ar paslapčių. Testiniai DB įrašai šalinami savo scope; originali D1 forma ir jos pašto eiga nekeistos. Konkrečios svetainės A–Z auditą valdo kita workstream; šis žurnalas jo PASS neperima.

Paleidimo veiksmai: [LIVE_TEST_RUNBOOK](LIVE_TEST_RUNBOOK.md). Įgyvendintas kodas ir likusios ribos: [IMPLEMENTATION](IMPLEMENTATION.md). Visas roadmapas, Jev ir savikalibracijos promotion lieka atviri pagal jų vartus.
