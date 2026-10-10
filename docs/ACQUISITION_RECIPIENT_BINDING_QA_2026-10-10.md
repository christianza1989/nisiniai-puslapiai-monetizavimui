# Recipient binding ir pending profilio regresijos

2026-10-10. Root source bazė f319b4311faa914ce7e8aff182ce1b65ad864010 ant fetched main d4ea8bf7384b70c4ea62a344001e3f8158812c56; public read-only main d0fd6b7d296303bfcaafadc4071945e675a72b96. Native [PR68](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/68) exact7f9a47b6ef09ac1f8e2f22377827a61d6800faa0 / runtimeba911586 pasiūlymas perskaitytas; jo4SQLite/OTP testai yra native savininko vykdyti, ne root pervadintas rezultatas. [Susitarimas ir scope](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6092144585).

## Pakeitimas

Naujas [recipient-binding-v1](../agent-business-core/contracts/recipient-binding-v1/README.md), recipient_contract_version0.1.0, greta nepakeisto acquisition0.1.1 wire. Strict challenge/proof/receipt,5min/original invite expiry riba, atskiri recipient-challenge/verify-recipient transport grant permissions, dedicated MAC ir canonical JS helper. Python HMAC naudoja privačiai saugotus exact native canonical bytes; actual Node24.19.0/Unicode17 ir Python3.13.15/Unicode15.1 nėra vienas normalizer. OTP-before-provider, stable actual org, dedicated counter/outbox, current eligible publication ir replay/transakcijų/prieigos reikalavimai perduoti tame pačiame canonical kontrakte ir acquisition skill/reference. Atnaujintas tik savo skill entry SHA; SOURCE/fingerprint neliesti.

Native pasiūlymas atskleidė tikrą current reducer spragą: profile_submitted po aktyvaus profilio buvo atmestas kaip lifecycle_regression. [Scope prieš pataisą](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6092218839). Naujas actual12test interface run: **11PASS/1ERROR**, pending submission klaidingai atmestas. Pataisa priima activity, padidina monotonic source_revision/last_event ir išlaiko ankstesnę published eligibility būseną; deactivated profilis nuo naujo draft netampa active. Scope/profile mismatch, signup/account regression, deleted terminal ir operator-eligibility guards išlieka. Tai naujas shared patirties radinys, išsaugotas atskiru upgrade-20839d13-f32d-47fc-ad21-8244c19cb972; proof sluoksnis upgrade-970c53a2-902c-47f5-b7c6-f6b47c52a2db.

## Tikros patikros

- Pradinės49acquisition offline patikros su nauju proof paketu PASS. Po actual pending-draft regresijos/pataisos visas aktualus rinkinys **50/50PASS**,0FAIL; Python locked aplinka, be real modelių/DB/SMTP.
-3esami raw-body Web Crypto ir3nauji canonical/MAC/input tests **6/6PASS**. Visi3Python→JS UTF8 vektoriai sutampa, native fixed digest a39e8497..., alias/dots ir dotted-I išlaikomi; scope/key/ref/nonce pokyčiai ir netaisyklingi digest/metadata/Unicode atmetami.
- Naujas schema/vector exact check PASS; schemas SHA256 **0ef2273cf5b0ab6530862cffed1bb3fc8e3caa8d32a3a8da59e4e60dddea5ae4**. Esamas acquisition schema/vector exact check PASS,0.1.1 hash35b0a87c... ir wire bytes nekeisti. Reducer semantikos pataisa nėra wire shape pakeitimas.
- Scoped Ruff6Python failų PASS. Skill/doc/catalog ir final staged/committed coverage/CI kvitas pateikiamas tik po actual vykdymo/push, ne kaip išgalvotas būsimas source SHA.

## Priėmimo ribos ir tęsinys

Nėra mounted challenge/proof route, stored registration/key material, durable core nonce/receipt/account/provider ledger, native atomic buffer/outbox, real HTTP/restart ar hosted/native acceptance.3MAC vektoriai nėra visų native runtime Unicode inputų ar visų klientų archetipų priėmimas. Identity canonicalizer turi būti tikrai prieinamas invite preparation ir patikrintas native deployed aplinkoje; silent Python fallback draudžiamas. Profile publication eligibility ir native offer withdrawal/reconciliation dar turi savo actual hooks/testus.

Pre-provider account deletion turi panaikinti pending native/core recipient attribution per aiškų authenticated revocation/retention kelią;0.1.1 provider lifecycle negalima užpildyti išgalvotu provider_ref. Šis atskiras privacy/outbox veiksmas dar neįgyvendintas ir turi būti sutartas/priimtas prieš pipeline enablement. Recipient proof neišplečia invite expiry ir nereiškia aktyvaus teikėjo. Privacy callback ir later already-attributed lifecycle negali būti blokuoti vien marketing pause/expiry.

Native Worker fd24248a, namespaces/QA/production paskyros/mail, core I2/tasks/migration0011 ir portalo source nepakeisti. Naujos core storage/API/migration/handler sąsajos derinamos pagal actual I2 schema/chain, antro generic runnerio nekuriame. Originalus Madbeauty all-services/all-Lithuania provider_signup tikslas tęsiamas; full pipeline testavimo paleidimas dar nepriskiriamas šiam codec/schema slice.
