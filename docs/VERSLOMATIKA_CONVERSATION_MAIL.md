# Pokalbio laiško ir kliento atsakymo ryšys

2026-10-10. Issue 77, atskira `codex/verslomatika-conversation-mail-20261010` šaka.

Pokalbio santrauką siunčiantis darbuotojas anksčiau išsaugodavo `Outbox` ir SMTP `Message-ID`, tačiau atsakymų skaitytuvas ieškojo tik priimtų `MailMessage` įrašų. Todėl santraukos gavėjo atsakymas negalėjo pasiekti originalaus pokalbio. Pradinis izoliuotas PostgreSQL bandymas su imituotu SMTP transportu šį defektą atkūrė: po siuntimo `MailMessage` nerastas. Pirmas FAIL išsaugotas upgrade-3eecca11 žurnale.

## Įgyvendinta jungtis

`conversation_mail.py` naudoja esamą `Conversation.case_id` ryšį, `MailMessage` ir pokalbio įvykius. Naujų lentelių ar HTTP sąsajų nėra. Tik esami `jobs.py`, `mail_reader.py` ir `mailbox.py` gauna siauras jungtis.

Po esamų siuntimo patikrų, prieš tinklo operaciją, viena transakcija išsaugo `Outbox` ketinimą ir susietą siunčiamą `MailMessage`. Kvitas saugo tą patį `Message-ID`, verslą/aplinką, `Conversation` ir `Case`, gavėją ir siuntėją, kontakto reviziją, artefakto ID/reviziją/turinio hash, žinių reviziją/deployment ir tiksliai naudotų puslapių nuorodas/hash. Vidinė kvito versija — `conversation-mail.v1`; tai privati metaduomenų sutartis, ne nauja kliento API versija. SHA-256 apima kvito turinį ir ryšius.

Esamas SMTP adapteris išlieka vienintelis siuntimo kelias. Jo rezultatas toje pačioje DB transakcijoje įrašomas į abu įrašus: `accepted` → `accepted_by_smtp`, `rejected` → `rejected`, `unknown` → `delivery_unknown`. Procesui nutrūkus po ketinimo lieka `dispatched` / `sending`. Nė viena tokia būsena automatiškai nepakartoja siuntimo. `inbox_verified` lieka `false`: SMTP priėmimas nėra gavėjo pašto dėžutės įrodymas.

Esamas skaitytuvas toliau veikia tik per autorizuotą vietinio savininko kanalą. Jis pirmiausia skaito ne daugiau kaip 100 INBOX laiškų antraščių su `BODY.PEEK`, nepažymi laiškų kaip perskaitytų ir nekeičia dėžutės. Visas laiškas skaitomas tik po teigiamo žinomos gijos, siuntėjo ir gavėjo patikrinimo bei dydžio ribos. Nesutampančios pirmojo ir viso laiško antraštės atmetamos. HTML ir priedai nevykdomi; įrašoma tik ribota tekstinė dalis.

`Message-ID`, `In-Reply-To` ir `References` interpretuojami kaip tikslūs, riboti ASCII identifikatoriai. Nežinomos gijos neimportuojamos; dviprasmiški verslo, `Case` ar pokalbio ryšiai atmetami. Jei `In-Reply-To` pateiktas, jis turi tiksliai nurodyti vieną žinomą laišką: nežinomas ID neatspėjamas pagal istorines nuorodas. Jei ši antraštė nepateikta, nuorodose leidžiamas tik vienas žinomas laiško ID. Keli tos pačios užklausos laiškai turi skirtingus kvitus, todėl paskutinis nepasirenkamas. Jei tas pats žinomas `Message-ID` kartojasi skirtingose srityse, skaitytuvas taip pat nepasirenka paskutinio įrašo. Pasikartojančios tapatybės antraštės, klaidingi gavėjai, papildomas tekstas aplink ID ir per ilgos antraštės atmetamos. Šis ribotas identifikatorių formatas sąmoningai nepriima visų retų RFC komentarų ar domain-literal formų.

Teigiamai susietas atsakymas gauna vieną nekintamą įeinantį `MailMessage` ir vieną `email_reply_received` įvykį originaliame pokalbyje. Įvykis saugo kvito nuorodas/hash, ne kontaktą ar laiško tekstą. Jis nėra balso transkriptas. Finalizuotas pokalbis, jo epoch, sesijos galiojimas ir esami darbai neatidaromi iš naujo. Įeinančio laiško būsena `conversation_evidence` neperduoda jo senojo sintetinio pardavimo darbuotojo interpretavimui.

Pakartotinis identiškas atsakymas grąžina ankstesnį kvitą. Tas pats pašto tiekėjo `Message-ID` su pakeistu tekstu, dalyviu ar ryšiu atmetamas. Advisory lock serializuoja ID visoje to paties verslo/aplinkos srityje; pokalbio užraktas saugo įvykių seką. Esami forced RLS ir composite FK išlieka. Istoriniai laiškai atgaline data neprijungiami ir jų hash neperrašomi.

## Įrodymai ir teisės atskirti

Pašto dėžutės prisijungimas autentifikuoja jungtį. Sutampantys `From` ir gijos identifikatoriai neįrodo fizinio žmogaus tapatybės, domeno nuosavybės, naujos rinkodaros prenumeratos ar teisės atlikti komercinį veiksmą. Laiško tekstas lieka nepatikima kliento pateikta medžiaga.

Įeinantis kvitas saugo tai, kas pastebėta, ir atskirą dabartinės politikos/kontakto/žinių stebėjimą. Po santraukos siuntimo atšauktas šaltinis ar sustabdyta politika nepaverčia tikro kliento atsakymo neegzistuojančiu. Tokia kliūtis įrašoma, o `can_respond` visada `false`: ši jungtis nesuteikia jokio automatinio atsakymo leidimo. Vėlesnis darbuotojas turės iš naujo tikrinti dabartines teises ir šaltinius; išsaugotas stebėjimas nėra leidimų cache.

Seni kontakto pataisymo, peržiūrėto artefakto, source/TTL, politikos, išsiuntimo ir retention vartai išlaikyti. Atsakymo negalima susieti su pašalintu pokalbiu ar už retention ribos; jam naujas pokalbis nesukuriamas. Sintetinio savininko pardavimo `Case` eiga išlieka atskira. Jos pasikartojimo patikra taip pat nebegali grąžinti kitos gijos kvito vien dėl sutapusio ID.

## Patikra ir likusi apimtis

Pradinis šaltinis — pagrindinės sesijos `cbc7ad139b800eea82c126d590bd46babe9e3350`. Prieš rašymą savo šakoje integruotas naujai gautas `main` `7af6b9641012a30c5f95eac38a66daeff8f8cb39`; naujos tipografikos ir kalbos taisyklės perskaitytos. Viešas core tik skaitytas: `ec8a9c032fe926d1d9722802d8eb26fa8bd02937`. [GitHub rezervacija](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/77#issuecomment-6099688393). Pagrindinės sesijos darbo katalogas, jos `.env`, klientų duomenys ir procesai neliesti.

Prieš paskutinį griežtesnį antraščių pasirinkimą visi 52 PostgreSQL bandymai PASS per 183,75 s: nauja jungtis, siuntimo vartai, `MailMessage`, senoji pardavimo eiga, kontakto pataisymas ir sąskaitų/PDF eiga. Įrodymai užfiksuoti prieš šaltinio keitimą; tikslūs to rinkinio 7 Git blob hash saugomi privačiame `tmp/frozen-mail-source.json`. Pagrindinės sesijos peržiūra po šio rato aptiko per laisvą nežinomo `In-Reply-To` ir paskutinės nuorodos pasirinkimą. Du nauji bandymai prieš pataisą FAIL (35 PASS / 2 FAIL per 1,51 s); klaida išsaugota, atranka susiaurinta. Galutiniam griežtesniam skaitytuvui 37 atskiri bandymai PASS per 1,29 s; du tiksliniai PostgreSQL bandymai PASS per 10,79 s. Pastarieji iš naujo tikrina tikrą DB jungties kelią per imituotus SMTP/IMAP adapterius ir po gijos nuskaitymo pasikeitusią politiką.

Visi transporto bandymai naudoja fiktyvius adresus ir pakeistus SMTP/IMAP adapterius. PostgreSQL tikrinamas atskiroje ankstesnėje šios sesijos QA DB su ribotų teisių vykdymo role, esamomis migracijomis ir atsitiktinėmis testų aplinkomis; į bandymų paleidimo įrankį patenka tik dvi tos QA DB jungtys. Seno sąskaitos testo reikalaujamas profilis atskiroje kopijoje sukurtas iš esamo `test_order_tests.profile` sintetinės reikšmės. Pradiniai 42 PASS / 2 FAIL ir Windows per ilgo parametrų ID 32 PASS / 2 ERROR išsaugoti žurnale; bandymų pagalbinių funkcijų ir duomenų pataisos atskirtos nuo funkcinių defektų. Toks bandymas neįrodo tikro SMTP, gavėjo pašto dėžutės ar kliento atsakymo gavimo.

Naujo kliento creation→Business/profilio ryšys, jo V2 session admission, tikras inbox priėmimas, automatinis peržiūrėtas atsakymas ir agento kalibravimas tebėra atskiri nepriimti darbai. Ši jungtis jų neįjungia. Esamos kliento OpenAPI sutartys nekeičiamos. Pakeitimas grąžinamas atšaukus tik funkcinį commit; istoriniai kvitai neištrinami ir neaiškūs siuntimai nekartojami.
