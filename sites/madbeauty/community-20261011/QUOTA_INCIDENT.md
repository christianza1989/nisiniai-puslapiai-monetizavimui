# 2026-10-11 — Durable Objects skaitymų limitas

Aktuali būsena: **paslauga atkurta po savininko plano apmokėjimo**. Savininkas pranešė „sumokejau uz plana katik“. Pakartotinė įprastų HTTPS užklausų patikra gavo200 ties `/` ir `/api/madbeauty/session` visuose trijuose domenuose: madbeauty.lt, bandymas.madbeauty.lt ir perziura.madbeauty.lt. Tai faktinis paslaugos atkūrimas; mokėjimo kvito ar galutinės sąskaitos netikrinome. Ankstesnio incidento ir versijų įrodymai lieka istorija.

## Faktinis įrodymas

Po reviewer trijų naršyklės modulių atnaujinimo b2e96aa4-5788-4403-bc40-35dea865b542 vieša HTTPS patikra gavo500. Scoped Cloudflare telemetry atskleidė tikslų exception: `Exceeded allowed rows read in Durable Objects free tier.` Stack nurodo PLATFORM SQLite atidarymą. Canonical madbeauty.lt ir originalus bandymas.madbeauty.lt taip pat grąžino500 ties `/` ir `/api/madbeauty/session`. Main ir trial leidimai / konfigūracija šioje operacijoje nepakeisti. Tai bendras paskyros limito incidentas; vien ankstesnio reviewer kodo rollback jo neišspręstų.

Old/new reviewer provider version details turi tą patį Worker script etag, compatibility, migration tag ir visas saugyklų / secret-name / variable bindings. Atitinka vietinį nepakeisto Worker SHA ea02b98aa5e22d90d809f2798820b8301fea24bb326ee85020c3e1f928dc2188. Pasikeitė tik `http-adapter.mjs`, `account-ui.mjs`, `auth-entry.mjs`. Visų kitų reviewer asset failų hash palyginimas, main/trial/QA provider lease ir custom domain išsaugojimas PASS. Tai neišsprendžia API kvotos.

Privatūs įrodymai `cloudflare/output/community-20261011/review/`: `auth-update.json`, `auth-update-before.private.json`, `auth-update-after.private.json`, `quota-incident.json`, `quota-blocked-iab.jpg`. Juose negalima skelbti request headers, prisijungimo tokenų ar privačių kontaktų. Git dokumente išsaugota tik klasifikacija.

## Atkūrimo pasirinkimas

[Oficiali Durable Objects kainodara](https://developers.cloudflare.com/durable-objects/platform/pricing/) patikrinta2026-10-11: Free leidžia5milijonus perskaitytų ir100000 parašytų eilučių per dieną; viršytos rūšies operacijos atmetamos. Limitas atsinaujina00:00UTC, šiam laikotarpiui03:00Europe/Vilnius. Paid pavyzdyje nurodomas minimalus5USD/mėn. mokestis ir papildomas naudojimas; įskaičiuota25milijardai perskaitytų eilučių per mėnesį. Tai nėra fiksuota galutinė sąskaita ar mastelio garantija.

Savininko paprašyta pačiam pasirinkti / įjungti Workers Paid. Mokamo plano neįjungėme, kortelės ar sutarties nepatvirtinome. Jei paliekamas Free, išnaudotą šiandienos limitą kodo optimizavimas neatkuria. Nevykdyti aklų redeploy, DB kopijų grąžinimo, namespace perkūrimo ar pakartotinių masinių HTTPS testų.

## Įgyvendinta dabar

- Prisijungimas laikomas patvirtintu tik po atskiro cookie-backed session read su tuo pačiu user ID. Nepavykus paaiškinama sesijos problema, sunaudotas OTP nebekartojamas automatiškai, grįžimo kelias išlaikomas. Source71e3fb4, reviewer trys moduliai įkelti; faktinis naujo prisijungimo browser bandymas sustabdytas kvotos.
- Vietinis autoriaus projekcijos pataisymas:24įrašų sąrašui person dokumentas skaitomas1kartą vietoje25. Auditorija, blokavimo taisyklės, nuotraukos ir publikavimo idempotency išlaikomi; jokio ilgalaikio leidimų cache.
- Vietinis anoniminės platformos sesijos pataisymas: nebeskaitomos memberships / organizations / practitioners kolekcijos. Prisijungusių naudotojų teisės tikrinamos kaip anksčiau.
-19auth/adapter/account-state testų PASS.8Node community/media/read-budget testų PASS.37backend ir native community / trial / salon testų PASS,0fail,0removed. Komandos ROADMAP checkpointe.

Optimizacijų įkėlimas ir kiekvienos gyvos versijos priėmimas fiksuojami naujausiame ROADMAP checkpointe ir RECEIPT.json. Šios sumažintos konkrečių funkcijų užklausos neįrodo visos dienos billable rows sumos ar to, kad Free planas pakaks viešai platformai.

## Priėmimas po atkūrimo

Reviewer b2e96aa4 trijų auth modulių leidimas: viešas hosted130 PASS; IAB naujas OTP → cookie-backed sesija → puslapio perkrovimas → bendruomenės srautas → atsijungimas PASS. Tik testinis example.com adresas, tikras laiškas nesiųstas. Ekrano įrodymas `review/quota-recovered-iab.jpg`. Chrome naujas OTP vis dar grąžina login, tiesioginė API navigacija vėl ERR_BLOCKED_BY_CLIENT. Browser acceptance PARTIAL; konkretus Chrome blokavimo mechanizmas UNVERIFIED, apsaugos nekeistos. Šis Chrome rezultatas nėra dabartinio bendro API limito įrodymas.

## Kur tęsti

1. Gavus savininko atsakymą, patikrinti faktinį paskyros plano arba dienos limito atkūrimą. Neužsakyti mokamo plano jo vardu.
2. Patikrinti vieną API sesijos roundtrip ir vieną homepage prieš platesnį priėmimą.
3. Native patikrintas skaitymų optimizacijas per maintained release build įtraukti į naują konkretų Worker artifact; naršyklės modulius oficialiai kopijuoti į to leidimo assets. Pakartoti config/bindings/secrets/content/expiry lease, neperkelti fixtures į canonical.
4. Priimti naujo reviewer OTP / reload / logout ir Facebook return kelią. Chrome `ERR_BLOCKED_BY_CLIENT` incidentas tebėra atskiras, jo konkreti priežastis nepatvirtinta ir apsaugos nešvelnintos.
5. Meta SMS žingsnis savininko atidėtas. Nespausti Send text, nesinaudoti screenshot numeriu, nepaprašyti CAPTCHA dar kartą. App Review/public activation dar nepriimti.
