# Pilno parduotuvės pagrindo priėmimas

2026-10-12 savininkas nurodė užbaigti visą pamatą, paliekant tik tikrų Stripe ir
Siųsk pigiau integracijų prijungimą. Galutinis puslapio dizainas ir verslo agentai
atliekami vėliau. Pateiktos šešios nuotraukos perduotos svetainės sesijai.

Šis dokumentas pakeičia dalinio paketo priėmimą kaip sustojimo kriterijų. Iki
galutinio perdavimo turi būti įgyvendinti visi nuo tikrų provider prieigų ir
savininko verslo faktų nepriklausomi keliai. Kiekvienas žemiau esantis rezultatas
turi konkretų HTTP/storage/UI bandymą; vienas testų skaičius nepatvirtina visumos.

| Kelias | Dabartinis trūkumas | Priėmimo kriterijus |
|---|---|---|
| Runtime ir operatoriaus prieiga | tik Node dev token, Worker be UI/provider binding | tas pats host-aware API/GUI Node ir native Worker; core patikėtų operatoriaus teisių adapteris, production admission, neaktyvių integracijų būsena, private/noindex/CSP |
| Pirkėjo kelias | viešas API yra, renderer dar neturi pilno užsakymo pagrindo | rinkos/katalogas → krepšelis → kontaktai/paštomatas → quote → idempotent order → Checkout → patvarus serverio statusas → atsisakymas; reload/restart ir klaidos; anoniminiai operatoriaus duomenys neprieinami |
| Dokumentai | tik vidinis TEST JSON/print | versijuota numeracijos/legal/tax politika, nekintanti sale/credit/packing eiga, private PDF eksportas ir teisėtas atsisiuntimas; paruošti aiškūs nepatvirtintų rekvizitų vartai |
| Siuntimas | planai/kainų read protokolas, kūrimas/PDF/track neprijungti | patvarus command, visos pakuotės ir pilnas siuntėjas, account binding, vienas POST po unknown, audituojamas reconciliation, privatūs PDF, operatoriaus ir pirkėjo sekimo projekcijos; provider sutartis tikrinama jungiant |
| Automatiniai darbai | lease/ack yra, consumer/DLQ nėra | transaction outbox → durable dispatch/retry/backoff/dead state → operatoriaus išimtys, expiry ir suplanuotas reconciliation; delivery be dublikatų pagal gateway/provider ribas |
| Duomenų atkūrimas | testinis restart, nėra backup/restore produkto kelio | privatus tikslus export/manifest/hash, naujos tuščios DB restore, skaičių/journal/attachments patikra; jokio esamos DB overwrite |
| Finansai/returns/B2B | pagrindai veikia, trūksta source adapterių ir operacinių pakeitimų | audituojami returns/dispute/source/banko CSV adapteriai, partnerio/kainyno versijos, duomenų eksportas; AI agentai ir deklaracijų teikimas neaktyvuojami |
| Svetainė ir SEO/GEO | LT struktūra patikrinta, 2 legacy URL bei vaizdai/localization likę | owner nuotraukos per MEDIA_CORE, naudingas legacy atkūrimas, keturių rinkų turinio/techninio core inventorius ir nuo dizaino nepriklausomas priėmimas; Product/Offer tik iš serverio konteksto |

## Bendri įrodymai ir ribos

Patikrinti du store, netinkamą host/role/token/environment, sumų ir pakuočių
neatitikimą, konkurenciją, pasikartojimą, ryšio praradimą ir serverio restart.
Runtime bandymas turi naudoti tikrą workerd/D1/R2/Queue sutartį su atskirais
aiškiai pažymėtais fixture provider atsakymais. UI turi rodyti tikrą persistent
API rezultatą ir neaktyvią tikro provider integraciją.

Tikrų finansinių/siuntimo operacijų, DNS/deploy, klientų laiškų, naujų prieigos
teisių ar deklaracijų šis foundation pavedimas neįjungia. Konfigūracija ir
automatika paruošiamos, o pirmą realų provider bandymą atliekame jungiant
atitinkamą paskyrą pagal actual mandatą.

MB rekvizitai, visas siuntėjas, inventorius, tiksli rinkinių/priedų sudėtis ir
tiekėjo instrukcijos turi likti savininko faktais. Jų įvedimui daromi konkretūs
konfigūracijos/validacijos keliai; nežinoma reikšmė nepakeičiama testine. Tiekėjo
kainos/idempotency sutarties patvirtinimas priklauso prijungimo patikrai.

Pirmiausia vykdomas 0.7 runtime/privataus storage/identity/pirkėjo sutarties
kelias, tada dokumentai/siuntos/jobs/atkūrimas ir likę operaciniai ekranai.
Svetainės sesija lygiagrečiai užbaigia savo turinio/media/SEO sritį. Vienas
paketas ar CI PASS nėra viso foundation užbaigimas.
