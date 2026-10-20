# Automatinis Instagram srautas

Savininko pavedimas2026-10-20: naujos @memocasting.lt nuotraukos ir video automatiškai rodomi esamame homepage. Esama22nuotraukų įkvėpimo galerija ir prekyba išsaugomos. Tai nėra publikavimo į Instagram, žinučių, reklamos ar komentarų administravimo pavedimas.

## Sprendimas ir ribos

- Oficiali Meta Instagram API su Instagram Login, tik instagram_business_basic ir savininko profesionali @memocasting.lt paskyra. Standard Access savoms paskyroms; išorinių klientų onboarding nereikalingas. Atskira Memocasting website feed programėlė, kontaktas info@memorycasting.lt, Memocasting, MB portfolio. Meta sąlygų priėmimas ir paskyros leidimas atskiri tikri žmogaus vartai.
- App Dashboard suteiktas60dienų tokenas paimamas tik į privatų failą, tikrinamas /me ir username ir įrašomas kaip Worker secret. Refresh po24h, kas7dienas; realus expires_in saugomas tik gavus iš Meta. Jokių raktų HTML, naršyklės bundle, Git, query ar galutiniame atsakyme.
- Atskiras mažas Worker memocasting-instagram ir vienas privatus KV. Be naujos mokamos prenumeratos, be Treg mokamų calls/scraperio. Pinned commerce-core Wrangler naudojamas tik kaip CLI; prekybos Worker nekeičiamas. Kas30min cron atnaujina iki48naujausių medijos įrašų, laikas nepriklauso nuo savininko PC.
- Frontend pasiekia tik service binding ir tik /social/instagram/feed bei /social/instagram/media/:id. Jokio viešo token importo/connect/admin endpointo. Media proxy priima tik cache esančių įrašų ID, validuoja tikrus Meta CDN hostus/MIME ir srautu perduoda vaizdą/video bei Range. Jokių lankytojo savavališkų URL, API cursors ar Instagram embed/tracking scriptų.
- Pirmi12 įrašų, Rodyti daugiau po12 iki48; tada nuoroda į profilį. Video tik paspaudus, native controls, preload none, playsInline ir poster; jokio autoplay. Albumo viršelis su nuoroda į tikrą Instagram albumą. Tekstai kaip tekstas, ne HTML. Kategorijų kūrimas/komentarai neprašomi.
- Per trumpą Meta gedimą paliekamas iki6h senumo snapshot. Atšauktas/expired tokenas uždaro srautą ir išvalo viešą snapshot; kitame cron nebandoma aklai jungti seno seed. UI rodo esamą patvirtintą Instagram fallback/profilio nuorodą, ne fiktyvius naujus įrašus. Atjungimui išjungti cron ir tik šios jungties tokeną/secret/KV.

## Patikros

Node: whitelist/HTML safety, paginavimo riba, naujumo tvarka, video/albumų forma, nežinomas mediaID ir blogasMIME/redirect, boundedproviderJSON, tokenų neskelbimas, refresh/nežinomasexpiry, revocation ir transientfailure. Frontend: host isolation, tik GET, no arbitraryproxy, loadmore, keyboard/nativevideo, realus desktop/mobile ir ilgasLTcaption. Genuine account connection, realūs medijos baitai ir actual cron/runtime statusas yra atskiri hosted vartai; fixture nėra jų priėmimas.

## Šaltiniai

Oficialūs Meta dokumentai perskaityti prisijungusChrome2026-10-20: [Business Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login), [Get Started](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started). BusinessLogin updated2026-03-13, GetStarted rodoAPIv26.0, Dashboardtoken60days ir server refresh. [Meta Postman](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) patvirtina profesionalių paskyrų ir Instagram Login apimtį. [Workers scheduled](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/), [KV writes](https://developers.cloudflare.com/kv/api/write-key-value-pairs/). Stripe Directory CLI neprieinamas šiamePC; setupdocs perstripe.directory peržiūrėtos, atskiroStripeprisijungimo vienMeta darbui nekurta. Treg katalogas irmy_tools tikread: nėra savininkoInstagramOAuth; mokami variantai nevykdyti.

## Būsena

2026-10-20: programėlės forma paruošta, Meta Terms/Developer Policies patvirtinimas laukia. Šiame dokumente nė vienas būsimas API/cron/live rezultatas nelaikomas PASS prieš actual patikrą. Source rezervacijaissue100/PR101 irpublicissue30/PR31; unikalūs upgrade7bc2ef04 ir24a030c8. Tikslus leidinys, prieiga, ištekliai ir rollback papildomi po priėmimo.
