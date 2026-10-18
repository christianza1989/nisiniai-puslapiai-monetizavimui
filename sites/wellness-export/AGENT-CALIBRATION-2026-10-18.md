# Headless agentų kalibravimas ir priėmimas

2026-10-18, Europe/Kyiv. Apimtis: klientų paieška ir el. paštas be UI ar balso priklausomybės. Tai vietinis parengimo ir sintetinio Case kelio priėmimas; gyva kampanija neįjungta.

## Rezultatas

Įgyvendintos atskiros tyrėjo, rašytojo, nepriklausomo tikrintojo ir atsakymų koordinatoriaus rolės per esamą CodexLab ir acquisition engine. Canonical Case, MailMessage, MailBinding, ContactPolicy ir replay naudojami toliau. Naujo CRM, vertintojo, migracijos ar siuntimo endpointo nėra.

Ištirti 5 oficialūs Nyderlandų apgyvendinimo puslapiai; 5 publikuoti organizacijų kontaktai išlaikyti privačiai. 2 kandidatams modelis ir autorius peržiūrėjo tikslų laišką. Pirkimo intencija ir kontaktavimo teisė nepatvirtintos. Išsiųsta 0, pristatyta 0, tikrų atsakymų 0, kvalifikuotų poreikių 0. Privati žmogui skirta partija: runtime/artifacts/wellness-headless/BUYER-BATCH.md.

## Scenarijai ir išsaugotos nesėkmės

Apimti 16 pirkėjų archetipų ir atskiras vien veiklos kategorijos atvejis. Paskutinis kiekvieno žinomo atvejo rezultatas PASS skirtinguose užfiksuotuose vykdymuose; tai nėra viena iš naujo paleista visa galutinės versijos suite. 2 papildomus užantspauduotus scenarijus atskirame procese parengė persona modelis. Jie nebuvo pateikti rašytojui ar instrukcijų taisymui; raw SHA patikrintas. Procesų atskyrimas ir SHA neįrodo nepriklausomos modelių šeimos ar absoliutaus blind holdout.

| Vykdymas | Užbaigta / pasirinkta | Priimta | Kvietimai | Report SHA256 |
|---|---:|---:|---:|---|
| wellness-baseline-a | 2/2 | 0 | 6 | 0ee0e0fdbe39d2b98b6df8c20341f67780d4f2cee31c5d4b20d40bd15496e8ad |
| wellness-fixture-corrected-a | 3/3 | 3 | 23 | eed424fcbe57df0d9be54776cee445052b08ba5703c06c26a84cdf888372b796 |
| wellness-stories-b | 11/14 | 9 | 87 rezervacijos (report80 +7dalinio atvejo) | c148baa069cbab13930a274e5f1eb1bb1d0c951ab4948c1506d94386575c4a06 |
| wellness-repair-c | 5/5 | 5 | 33 | 89115f74fa83ec81c195d75edd3283ed6f449bc79542786941627ff7d2d247ce |
| wellness-protected-d | 2/2 | 2 | 13 | a584894b4f58a3a7e18d9c9245d23b5c11c692a6cfebd21be7dd1c0553f13f2e |

Pirmas corpus tikėjosi laiško be poreikio signalo: agentas teisingai grąžino research. Šis fixture FAIL paliktas; pataisytas sintetinės užklausos šaltinis ir pridėtas atskiras kategorijos atvejis. Antro pradinio atvejo native CLI exit3221226505 naudojimas nežinomas.

14 istorijų partija nutrūko po 11 užbaigtų atvejų: 9 PASS, netinkamo gavėjo sprendimas atmestas dėl papildomos privacy citatos, OOO fixture pats pridėjo aiškų atsisakymą. Pastaruoju atveju agento refusal/stop buvo teisingas, tačiau neatitiko per siauro oracle. 14-as atvejis liko dalinis, 15/16 nepradėti. Originalus report ir rezervacija116 neperrašyti; atskiras auditas patvirtino, kad proceso nebėra, naudojimas nežinomas.

Pataisyta canonical citatos laukų instrukcija; nežinoma duomenų ištrynimo būsena lieka operatoriaus handoff. Grynas OOO atskirtas nuo OOO su atsisakymu. Naujas 5 atvejų vykdymas PASS, įskaitant trūkstamus tiekimo/sutarties ir pirkimo klausimus. Kritiniai neleistino siuntimo ar fiktyvių tiekimo veiksmų įvykiai neužfiksuoti.

## Atskiri vartai

| Vartai | Būsena / įrodymas |
|---|---|
| Source regresija | 68 PASS +39 subtests; final offline log privatus |
| Canonical PostgreSQL | 41 PASS, 1 aiškus mokamo testo praleidimas įprastame rate |
| Tikras modelis → DB → reply | Atskiras 1 PASS /65.19s /5 modelio kvietimai: pradinis laiškas, tas pats Case, inbound, peržiūrėtas naujas outbound ir MailBinding; SMTP0 |
| Replay / source / stale | Tas pats request grąžina tą patį outbound be modelio; kitas parent ir instrukcijų drift atmetami; naujesnis inbound ir dabartinis stop/bounce/uncertain neleidžia rašyti |
| Privatumas | Tikras izoliuotos DB CaseSource/operator_required ACK ir marketing stop; papildomo outbound nėra. Tai nėra ištrynimo įvykdymas |
| Laiko riba | Pirmas fake-clock/no-retry 2 FAIL palikti. Likęs laikas perduotas esamam CodexLab process-tree timeout; testuota be tikro child/modelio. Cleanup užtrunka baigtinį laiką |
| Pertrauktas kvietimas |116 lieka rezervuotas ir įskaičiuotas, usage unknown; nauji bandymai jo nekartoja. Nauji privatūs PID/schema kvitai leidžia tikslią proceso patikrą |
| DB restart | Tik exact wellness-acq-qa-20261018 /15547; 90 lentelių eilučių SHA/count sutapo prieš ir po restart. Operacinė DB neliesta |
| SMTP / inbox / reply delivery | UNVERIFIED: dabartinėje operatoriaus konfigūracijoje nėra SMTP credentials ir kontroliuojamo gavėjo; siuntimo vėliavos OFF |
| Operating admission | NOT ADMITTED. Dabartiniai sintetiniai fixture nėra perkelti į Root tikrą Business. Reikalingas prižiūrimas ModuleBinding/private registration writer ir konkreti politika |
| Learning / adoption / rollback | Jokio outbound promotion. Conversation controller/pointer nekeisti. No-change/not-admitted sprendimas; source grąžinamas scoped revert, privatūs kvitai ir DB išlieka |
| UI / balsas / viešas domenas | NA šiam aiškiai susiaurintam pavedimui; Root atskirai valdo UI ir operacinį diegimą |

Galutinio replay instrukcijų drift apsauga ir canonical OOO generatoriaus paaiškinimas pridėti po modelių partijos; pakartota source/PG regresija, papildomi modelio kvietimai neatlikti. Kiekvienas modelio report turi savo actual implementation, config, knowledge, corpus, reply, persona ir evaluator hash; jų istorija neperrašyta.

## Naudojimas ir versijos

Rezervuota 174/180. Žinomi usage laukai: {"input_tokens": 2422330, "cached_input_tokens": 270464, "cache_write_input_tokens": 0, "output_tokens": 65000, "reasoning_output_tokens": 34599}. Nežinomas usage bandymams 6 ir 116. Faktinė USD kaina neatskleista ir nevertinama kaip0. Treg 2 nemokamos paieškos: USD 0; naujų mokamų duomenų calls 0. Pradinis deadline2026-10-17T23:00:11.502833Z (2026-10-18 02:00:11 Europe/Kyiv) neplėstas. Likę 6 bandymų lizdai nėra naujas leidimas ar reset; daugiau modelių nekviečiama.

Source bazė1c6f1f59b88e997df1efa746b2f43c69e6149acd; fetched main533597c10e290a2a09a522ad348e19c9968aa9d5. Read-only companion255fea0813bf1aabeaeea2f2de0b29564118f2fc; main ec8a9c032fe926d1d9722802d8eb26fa8bd02937. Modelis aiškiai prašytas gpt-6.1-sol/high; provider grąžintas tikslus ID neatskleistas. Source delivery ir Root operating adoption atskiri.

Originalios Creation 13 puslapių bylos SHA liko 015c3074a972c3c568154bdc5eecd353a1907a0c39261fa1d5bb3032ea8cf10e. Root Creation 37/40 neliestas. Nuosavas QA konteineris33ab032ebb09bf608af0919cdab6c6847c0b3357cbf2cf8da3f3491f87299bee, tik naujas pinet_acq_work_20261018010000.

## Konkretūs likę priklausomumai

Gyvam kontroliuojamam pristatymui reikia tikro siuntėjo SMTP/IMAP prieigos ir aiškaus nuosavo gavėjo. Tikriems adresatams reikia leistino transporto, dabartinių rinkos ir kontaktavimo pagrindų bei konkrečios kampanijos. Hostinger politika draudžia nepageidaujamus laiškus; viešas adresas nėra opt-in. Prekės kainoms, tiekimui, garantijoms ir atstovavimui vis dar nėra gamintojo susitarimo. Šių faktų agentai neišgalvoja.

Tęstinumas ir komandos: [HEADLESS-RUNBOOK](HEADLESS-RUNBOOK.md). Tikslūs sintetiniai pavyzdžiai: [SAMPLE-EMAILS](SAMPLE-EMAILS-2026-10-18.md). Tikri prospect, kontaktai, raw modeliai, .eml ir DB į Git neįtraukiami. Source rezervacija issue200; atskiri upgrades b9533b2c ir4b36a8d7.

Po Root peržiūros atskirai atkurtas cancellation defektas: 1 fake-subprocess FAIL išsaugotas. Tas pats child-tree cleanup taikomas timeout ir CancelledError, išlaikant cancellation semantiką ir įskaičiuotą nežinomą naudojimą. Naujas 68 PASS ratas atliktas be provider calls. Tai ne reservation116 priežasties nustatymas.
