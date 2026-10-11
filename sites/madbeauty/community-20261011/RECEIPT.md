# Facebook ir bendruomenės C0–C2 bandymo leidimas

2026-10-11. Būsena **C0–C2 trial hosted and Facebook owner accepted; public Meta review pending**. Runtime source ced9559130e41c3cede6288fa9e94308c689ffe8; push į PR88, dar ne merge. Canonical 09f767e9-9bba-4ddb-96bc-3feaac299535; trial 8e4da6de-9e07-4c4b-8f37-b42bd4474a30. Tikslūs artifact/core/content/binding įrodymai [RECEIPT.json](RECEIPT.json). Frozen129 e20c3b95 ir core566 nepakeisti.

## Kaip bandyti

Atidaryk https://bandymas.madbeauty.lt/bandymo-paskyros. Prisijungimo kodas rodomas ekrane, realus paštas nesiunčiamas. Meistrui rinkis demo-provider-1@example.com (ar kitą esamą paskyrą), klientui demo-client-0@example.com. https://bandymas.madbeauty.lt/bendruomene turi45 meistrų/salonų įrašus iš jų esamų galerijų ir pasiūlymų,90 seeded person/org profilių bei papildomus bandymo dalyvius. Įrašai ir nuotraukos pažymėti sintetiniais. Galioja iki2026-10-17.

Dviem atskiromis naršyklės sesijomis prisijunk demo-client-0@example.com ir demo-client-1@example.com. Testiniai dalyviai jau draugauja ir turi pokalbį. Sukurk įrašą, pridėk AI pavyzdį, komentuok/atsakyk, išsaugok į savo albumą, sek meistrą. Žinutės atsinaujina kas5s, nuotrauka prieinama tik pokalbio dalyviams. Meistro paskyroje gali pasirinkti asmeninį profilį arba savo organizaciją; žinutėse – savo ar salono dėžutę. trial-operator@example.com → Bendruomenė → Pranešimai rodo tik įrašų skundus.

## Priėmimo ribos ir patikros

Unit/media/native SQL restart, audience/CSRF/block/role/retention/erasure/moderation ir UIform shadowing/retry patikros PASS savo apimtyje. Tikslus trial artifact: existing45profiles/reviews preserved,90paged actors, actualownimage transform/upload, idempotent seed and restart. Exact public native+hosted main84 ir trial130 checks PASS; atskiras real HTTPS community19 operacijų scenarijus PASS (nuotrauka, anonymous/logout401, comments/replies, private album, following, accepted friendship, personal/salon send, outsider org403, moderationhide404).

Actual browser: du local actors, post/image/comment edit/save/follow/friendship/private text/photo ir restart;390/768/1440DOM be horizontaliojo dokumento overflow. Hosted ChromeFacebook mygtukas pasiekė realų Meta consent langą, jo ContinueasChristian laukia atskiro savininko sutikimo. Hosted IABOTP,24post feed, savo optimized image loaded, personal+salon list ir actualphoto-only DMupload/persist/loaded PASS telefone390. Vaizdai cloudflare/output/community-20261011, ne Git/public assets.

Canonical API/policy: FBconfigured, malformed signed request403 INVALID_SIGNATURE, canonicalprivacy FBtekstas matomas. Canonical community ir publicFBlogin išjungti; main tik paruošta konfigūracija ir callback sutartis. Nė vieno dummy profilio canonical. Meta App Review/public publish ir real ownerOAuth/firstlink/relogin dar nepriimti.

## Incidentai, išsaugojimas ir atkūrimas

Pirmas trial leidimas7bad78b7 neturėjo IMAGES binding. Actual hosted upload503 neleido priimti medijos; po klasifikavimo pridėtas IMAGES ir exact-config gate, native actualupload testas. Patikrintas antras leidimas5d2173cb. Pirmo bandymo artifact/evidence archyvas trial-attempt-1 išsaugotas. Pirmas livehelper vartojo neesamą example.com adresą ir gavo400; pakeista į esamą demo-client-1, jokių auth taisyklių nešvelninta.

Esamos PLATFORM/ORGANIZATION namespaces, secret names, mail/DNS/content/trialexpiry išsaugoti; COMMUNITY pridėta atskirai kiekvienamworker, trialIMAGES pridėta po faktinės klaidos. Secret vertės tik private stdin, ne source/artifacts/screenshots. Observability samplings/logs/traces išsaugoti; vienintelė tikslinga saugos išimtis – redact_query_string=true, kad OAuthcode/token nepatektų į URL logs/traces. Oficialus PATCHscript-settings ir readback PASS abiem, kitųworker/QA būsena nekito. PinnedWrangler4.92 šio naujo lauko neturi, todėl po būsimų deploy vykdyti redact.mjs ir tikrinti readback.

Rollback nėra duomenų atkūrimas. Esant bendruomenės incidentui išjungti COMMUNITY_ENABLED ir FACEBOOK_LOGIN_ENABLED, išlaikant naujus class exports/migrations/namespaces bei esamas var/secret bindings; perkurti/priimti tęstinį artifact. Nenaikinti COMMUNITY namespace ir negrąžinti senos SQL kopijos virš naujų rezervacijų. 12m privačių žinučių/media cleanup ir kartojamas account-erasure journal įdiegti; jie neįrodo realios pilno masto apkrovos.

## Galutinis dizaino ir išleidimo pataisymas

Runtime source ced9559130e41c3cede6288fa9e94308c689ffe8. Atskiras paskutinio leidimo native/hosted main84 ir trial130 PASS, exact compiled trial community acceptance PASS. Pataisytas savo privačios nuotraukos lygiavimas; actual hosted1440 vaizdas: private photo loaded, right edge matches container, dokumento plotis1425 ≤ viewport1440. Screenshot `cloudflare/output/community-20261011/trial-chat-desktop-final.jpg`.19 mutation scenarijaus kvitas sąžiningai paliktas savo ankstesnio5d2173cb leidimo; bendruomenės runtime/API source po jo nekeistas, todėl operacijos dėl CSS nekartotos. Ankstesni main776/trial5d leidimai ir jų priėmimas išsaugoti JSON. Deploy helper dabar automatiškai pritaiko redact_query_string=true prieš provider after patikrą.

## Tikras Facebook savininko bandymas

Savininkas pats užbaigė pradinį Facebook prisijungimą; actual Chrome į demo-client-0@example.com parodė susietą paskyrą. Patikrinti realūs Meta relogin, unlink su Facebook sesijos panaikinimu, naujas OAuth → pending identity → trial OTP → relink. Galutinė būsena susieta ir prisijungta;8 buvę vizitų detalės URL išliko. Screenshot `cloudflare/output/community-20261011/facebook-owner-linked-final.jpg`. Nenaudotas sintetinis Graph provider šiam bandymui; secret/token/code neįrašyti į kvitą. App Review dar Not submitted, public_profile/email requests; programėlė Unpublished. Išorinio vartotojo ir canonical public login priėmimo nėra. Ankstesni consent pending įrašai žemiau yra istorija.

## Meta App Review juodraštis ir likę vartai

Website platform/Site URL https://madbeauty.lt/ Save Changes/readback PASS. Testing instructions for Web saved/reopened PASS (screenshot meta-web-instructions-saved.jpg). Submission1827877654877169 Not submitted; Verification reikalauja verifiedbusinessportfolio,3matomi kiti Unverified, jokio jų susiejimo. Allowedusage email/public_profile konkretūs sutikimai perskaityti, atskiras savininko patvirtinimas paklaustas, nepriimti. Datahandling processors Yes faktiškai pažymėtas, tiekėjų ir šalių sąrašas dar nebaigtas. Duomenų valdytojo šalies, nacionalinio saugumo užklausų istorijos ir esamos tvarkos faktai palikti neužpildyti, paklausti savininko. Nė vieno nepatvirtinto compliance claim. Peržiūros aplinka turi būti ilgaamžė prieš finalsubmission, originalus trialexpiry nekeistas.

Techninis šalies deklaravimo pagrindas: [Cloudflare Workers localization](https://developers.cloudflare.com/data-localization/how-to/workers/) nurodo, kad kodas ir secrets platinami globaliai; [Cloudflare privacy](https://www.cloudflare.com/privacypolicy/) aprašo globalias operacijas. Negalima iš serverio europinio pasiekiamumo teigti EU-only processing. [Hostinger DPA](https://www.hostinger.com/uk/legal/dpa) apima EmailServices, bet faktinė mūsų pašto apdorojimo / remoteaccess geografinė apimtis šiame lange nepatvirtinta. Meta reikalauja visų processing ir remoteaccess šalių, todėl vien juridinės buveinės šalies nepakanka.
