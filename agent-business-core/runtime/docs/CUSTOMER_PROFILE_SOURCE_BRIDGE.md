# Vietinis kliento žinių ir profilio kelias

Šis adapteris perduoda patvirtinto V2 paketo dabartinę projekciją į tiksliai registruoto kliento verslo žinių indeksą. Jis naudoja bendrus viešo core projekcijos, publikavimo ir transporto helpers. Privatus intake ar verslo juodraštis nėra agento faktų šaltinis. Viešo domeno paleidimas, tekstinė sesija, modelio kvietimas ir kanalų įjungimas priimami atskirai.

Adapteris skirtas privilegijuotam vietiniam operatoriui: local/test režimas, Docker/PostgreSQL, išjungti SMTP ir balsas. Kliento HTTP suteikia tik esamas autentifikuotas skaitymo teises. Pavyzdžio komandas vykdyti iš `agent-business-core/runtime`, naudojant jo Python aplinką ir tik privačius, Git ignoruojamus įvesties bei kvito failus. Jų nerodyti skydelyje ar žurnaluose.

## Tikslios priklausomybės

Prieš operaciją sėkmingai patikrinti abiejų repo Git freshness ir užfiksuoti šaltinių SHA. Viešo core checkout turi būti švarus ir sutapti su `public_source_revision`. `sandbox` yra izoliuotas katalogas po to checkout `output/`; jo keturi projekcijos/validatoriaus helpers turi sutapti su švariu šaltiniu.

V2 paketo SHA, siteId ir canonicalHost turi tiksliai sutapti su priimta vietinio preview aktyvacija. Ji privalo turėti `scope=local-preview` ir `testOnly=true`. Kompiliuoto paketų inventoriaus pasirinktas paketas sutampa su paketo turiniu; kontaktas ir operatorius sutampa su tinklo config. Bendras projekcijos helperis parenka tik tuo metu eligible puslapius ir jų nuorodas. Bent homepage turi būti matomas. Išvestis turi visą inventorių, o ne tik pirmą transporto partiją.

## Aiškios operacijos

`scripts/customer_knowledge_sync.py` įvestis turi esamo `creation_registration.wire.Provision` tapatybę: creation_id, accepted_revision, candidate_sha256, accepted_source_revision, authorizing_session_id. Papildomi laukai: public_core, public_source_revision, sandbox, package_sha256 ir neprivalomas griežtas boolean admit_source (numatyta false).

```powershell
.venv/Scripts/python.exe scripts/customer_knowledge_sync.py --input artifacts/customer-source-request.private.json --receipt artifacts/customer-source-receipt.private.json
```

Registration lifetime užraktas paimamas prieš savininko užraktus. Registracijos fingerprint, dabartinė priimta versija ir canonical accepted proof patikrinami prieš index.begin/batch/commit. Esami policy/index užraktai užtikrina atominį viso inventoriaus perdavimą. Trūkstama partija nepriimama ir transakcija atšaukiama. Tik explicit `admit_source=true` įrašo source_ready=true, learning_admitted=false. Pats index.commit nėra šaltinio priėmimas.

Naujas privatus kvito failas ir jo `<receipt>.status.json` rezervuojami ir fsync patikrinami prieš projekciją ar DB operaciją. Tikslus rezultatas su status=prepared išsaugomas dar prieš DB commit ir vėliau neperrašomas. Atskiras statuso failas po commit gauna committed ir tikslių rezultato baitų SHA. Nepavykus paskutiniam rašymui pranešama `committed_receipt_unavailable`; net dalinis statuso įrašas nesugadina parengto rezultato. prepared, dalinis ar neužbaigtas statusas reikalauja palyginti faktinį indeksą ir receipt prieš naują operaciją; automatinio pakartojimo nėra. CLI nerodo DB URL, sesijos ar turinio.

Profilio priėmimas lieka atskira esamo `customer_profile.admin.admit` operacija. Naujas plonas CLI nekeičia jo autoriteto, replay, istorijos, RLS ar atšaukimo semantikos:

```powershell
.venv/Scripts/python.exe scripts/customer_profile_admin.py admit --input artifacts/customer-profile-request.private.json
.venv/Scripts/python.exe scripts/customer_profile_admin.py revoke --input artifacts/customer-profile-revoke.private.json
```

Admit įvestis atitinka `customer_profile.wire.Admit`: tiksli registracija, accepted versija/kandidatas/istorinis source, dabartinė authorizing sesija, execution_source_revision ir naujo indekso knowledge_ref. Revoke naudoja admission_id ir fingerprint. Istorinis accepted_source_revision lieka nepakitęs; execution_source_revision yra aktualios vykdymo kopijos SHA. Pasikeitus execution source, indeksui/receipt, instrukcijoms, Grant, registracijai arba TTL, senas priėmimas nebėra current.

## Skaitymo patikra

Esamas `agent-preparation-v2` maršrutas prieš savininko užraktus pinina registracijos lifetime. Jis naudoja tikrą packaged ProfileView ir dabartinį žinių indeksą. Galutinis profilio/source stebėjimas vyksta po paskutinės registracijos patikros; po jo nebėra laukiančių autoriteto operacijų. Užrakinti žinių duomenys dar kartą įvertinami pagal dabartinį laiką, nes užraktas nesustabdo TTL.

Priimtas current profilis gali pagrįsti source_pin, business_profile, role_instructions ir v2_knowledge vartus. Tai nesuteikia v2_session, balso, email, acquisition ar kalibravimo PASS. `can_activate=false` ir ProfileView vykdymo teisės lieka nepakitusios. Senasis preparation V1 maršrutas ir wire nepritaikomi atgaline data.

Kalbos taisymas ir vien kalbos defektų blokavimas savininko sustabdyti. Kalbos priėmimas lieka UNVERIFIED; šis adapteris neprideda Gemini.

## Įrodymai ir ribos

Regresijos tikrina bendrą tikrą projekciją su būsimo puslapio pašalinimu ir daugiau nei viena transporto partija, source/package/config/helper/approval neatitikimus, atominį pilną bei nepilną indeksą, source admission atskyrimą, receipt klaidas iki ir po commit, profilio TTL pasibaigimą per paskutinį laukimą ir terminalų atšaukimą. Sintetinis restricted PostgreSQL ir offline bandymas yra šaltinio patikra. Tikras kliento adapterio priėmimas bei UI kelias registruojami atskirai savo source/adoption kvite; nėra viešo deployment, inbox ar pilno platformos priėmimo teiginio.
