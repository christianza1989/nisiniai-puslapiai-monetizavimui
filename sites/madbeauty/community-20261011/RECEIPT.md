# Facebook ir bendruomenės C0–C2 bandymo leidimas

2026-10-11. Būsena **C0–C2 trial hosted accepted; Facebook owner consent pending**. Runtime source d539271295c04fe9523795b6b3abd9c40e992c20; push į PR88, dar ne merge. Canonical 776ac16c-c67b-41bb-8630-3145509fe57c; trial 5d2173cb-fff3-4902-83b9-021b56f61889. Tikslūs artifact/core/content/binding įrodymai [RECEIPT.json](RECEIPT.json). Frozen129 e20c3b95 ir core566 nepakeisti.

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
