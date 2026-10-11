# Vietinis kliento pokalbis

`customer-text.v1` yra atskiras vietinis, autentifikuotas tekstinis vartotojas bendrame core. Jis naudoja esamus Case, CaseSource, Conversation, Event, V2 knowledge.resolve ir need.patch. Naujų lentelių, antro klientų registro ar statinio nišos profilio nėra. Tai nėra balso, el. pašto, klientų paieškos, learning, postcall ar viešo kanalo aktyvacija. Kalibravimas ir savininko sustabdyta kalbos patikra lieka UNVERIFIED.

## Autoritetas ir duomenų kelias

Tinka tik local/test aplinka, local control režimas, įjungtas customer ir atskiri default-OFF customer_text_enabled/customer_text_runner_enabled jungikliai bei išjungti SMTP ir balsas. Seno owner konsultacijų queue chat_enabled/chat_runner_enabled neįjungiami šiuo vartotoju; jam nereikia atskiro queued worker. Modelis yra fiksuotas gpt-6-luna / medium, esamas no-tools transportas su retry0 ir bendri patikrinto binary/workspace pin. Privilegijuoto operatoriaus priimtas dabartinis Profile ir tikslūs Registration, accepted candidate, execution source, packaged instructions, V2 index/receipt/TTL privalomi. Kliento bearer naudoja esamą control.Session, patvirtintą paskyrą, owner narystę ir dabartinį BusinessGrant.

Kiekvienas DB etapas ima registration lifetime prieš actor/Creation ir dabartinio profilio/source užraktus. Sukurto pokalbio privatus serverinis binding saugo tikslią sesiją, Registration ir Admission fingerprint bei priimtą Profile; klientas šių laukų nesiunčia ir negali pasirinkti modelio, instrukcijų, verslo scope ar įrankių. Nauja login sesija savaime neperima seno pokalbio binding. Skaitymas neatnaujina šaltinio, nepriima profilio ir nepratęsia TTL.

Esamas agent-profile.v1 išlieka tik stebėjimas su LiteralFalse vykdymo teisėmis. Naujas vartotojas turi atskirą `text-capability`: sėkmė aprašo tik šio vietinio testo aktualias teises. Tai nėra esamų ProfileView flags pakeitimas. Pasenęs profilis ar neveikiantis runner grąžina klaidą; nėra optimistinio online ar fallback.

## HTTP sutartis

Kanoninė [OpenAPI](../../../docs/contracts/verslomatika-customer-text.openapi.json) išvedama iš tikro router/DTO per `customer_text.contract.document()`. Tie patys penki keliai montuojami pilnoje api ir portabiliame minimaliame control_api. Hosted režimas šiam vartotojui lieka uždarytas.

| Kelias po `/customer/v2/creations/{creation_id}` | Veiksmas |
| --- | --- |
| GET `/text-capability` | Dabartinės vietinio vartotojo teisės, tikslus admission_id, consent notice ir penki need laukai; be rezervacijos, kvietimo ar TTL renewal |
| POST `/text-sessions` | UUID request_id, tikslus admission_id, notice_version=customer-text.local.v1 ir strict consent=true; patvarus Case/Conversation; modelio dar nekviečia |
| GET `/text-sessions/{conversation_id}` | Tik savo dabartinio binding istorija ir poreikis; iki100 paskutinių įvykių, tikras history_truncated |
| POST `/text-sessions/{conversation_id}/turns` | UUID request_id, exact base_need_revision ir1..4000 prasmingų Unicode ženklų; viena patvari rezervacija ir daugiausia vienas provider dispatch |
| POST `/text-sessions/{conversation_id}/end` | Finalizuoti ir panaikinti aktyvų vykdymo owner/epoch; nėra postcall darbų ar kanalų siuntimo |

Sėkmės envelope yra customer-text.v1 su exact running source, observation time ir bounded typed SessionView/Capability. Klaidos turi code/message/request_id, private/no-store, be žinių ar privilegijuotų exception details. Transportas iki64KiB priima ir4000 astral ženklų JSON escape formą; semantinė4000 riba lieka. Naršyklė naudoja tik to paties origin BFF ir serverio sesiją; global worker/operator raktas nėra kliento prisijungimas.

## Vienas kvietimas ir rezultato priėmimas

Prieš provider kvietimą transakcija išsaugo realų kliento įvykį, dabartinį knowledge.resolve rezultatą ir provider_attempt: request fingerprint, run/epoch/need revision/deadline, server binding hash bei tiksliai perduotų prompt/schema UTF-8 baitų SHA256. Ji užbaigiama prieš mokamą kvietimą; DB užraktas per provider vykdymą nelaikomas. Kontekstas turi paskutinius20 tinkamų istorijos įvykių ir dabartinius patvirtintus šaltinius; privatūs draft/intake nėra žinių šaltinis.

Transportas per vykdymą pakartoja dabartinį autoritetą. Modelio išvestis turi plain reply ir daugiausia vieną typed need.patch. Adapteris prieš usage/result priėmimą atmeta nežinomą lauką, neteisingą evidence/revision, dubliuotą need lauką ar tuščią atsakymą. Need išsaugo konkretaus kliento įvykio provenance ir proposed būseną; modelis jo nepaverčia confirmed.

Usage atskirai išsaugomas pagal užšaldytą serverinį verslo binding net atšaukus kliento sesiją, Grant ar Profile. Žinomi integer tokenai išsaugomi; nežinomas usage ir neišmatuota USD kaina lieka null. Actual request cancellation išlaiko jau stebėtą canonical turn.completed usage ir persiunčia cancellation, nesukurdama atsakymo.

Rezultatas ir need patch priimami tik naujoje aktualaus autoriteto transakcijoje, sutapus run/epoch/lease/need revision. Atšaukimas, source/instruction/Profile pasikeitimas, expiry ar pause neleidžia vėlyvo atsakymo. Nėra teiginio, kad visų SELECT-only Grant/Membership administracinių rašymų commit visada fiziškai serializuotas; vykdymo bei galutinis skaitymas pakartoja faktinį autoritetą.

Tas pats UUID su identišku turiniu grąžina išsaugotą result arba running; pakeistas turinys atmetamas409. Pasibaigęs ar nutrūkęs patvarus attempt grąžina interrupted ir nekviečia provider iš naujo, taip pat po DB pool/restart. Naujas UUID negali apeiti gyvo lease ar pasenusios need revision. Klientas naują bandymą pateikia aiškiai; neaiški nesėkmė nėra automatinis retry.

Legacy worker/edge Conversation helper aiškiai atmeta customer-text.v1 prieš senų token/epoch/įrankių kelią. Direktinis bendras policy/source finalize lieka veikiantis, tačiau naujam tekstiniam transportui neprideda seno analysis/quality/followup pipeline.

## UI ir priėmimas

UI rodo tik iš tikrų įvykių gautą pokalbį ir poreikio reviziją; nėra išgalvoto pasisveikinimo, online ar užbaigimo. Poreikio pataisymas ateina per kliento tekstą ir tikrą įvykio kvitą. Sending yra vietinė naršyklės būsena; running/succeeded/failed/interrupted ateina iš serverio. Nutraukimas naudoja serverio end; vien AbortController neįrodo, kad procesas sustabdytas. Istorijos data ar kalibravimo būsena neturi suteikti pasenusių teisių.

Šaltinio patikra, clean source adoption, tikras provider kvietimas, ordinary UI/keyboard/mobile ir visas platformos priėmimas registruojami atskirai. Restricted PostgreSQL su pakeistu provider yra autoriteto testas, ne DI efektyvumo įrodymas. Synthetic Python child tikrina realų proceso nutraukimą be provider kvietimo. Esamos klientų istorijos, nesėkmės, priimtas turinys ir apskaita nenulinami. Viešas domain/deploy ir target PC paleidimas nėra šio paketo rezultatas.
