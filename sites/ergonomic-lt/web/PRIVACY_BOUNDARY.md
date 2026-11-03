# Pirkėjo ir gamintojo duomenų atskyrimas

Roko tiesioginis 2026-11-03 pavedimas: viešame puslapyje ir viešuose 3D duomenyse nėra gamintojo kodų. Pirkėjas renkasi pagal pavadinimus; administratoriui gaunama visa originali patikrinta komplektacija. Šis naujesnis pavedimas pakeičia ankstesnę AGENTS nuostatą viešai išlaikyti pasirinkimų kodus.

## Realizacija

1. Serveris išlaiko vienintelį originalų katalogą ir konfigūravimo variklį. Viešas klientas gauna tik paskelbtus pavadinimus, neutralius identifikatorius, pasirinktą būseną slepiantį autentifikuotai užšifruotą tokeną ir patikrintą vaizdavimo planą.
2. Parinkties pakeitimas grąžinamas serveriui. Serveris tikrina leidžiamą perėjimą ir iš naujo apskaičiuoja visą būseną; klientas negali pats nurodyti gamintojo kodo ar suklastoti tokeno.
3. Užklausos serveris iššifruoja būseną ir pakartotinai taiko esamus originalių kodų, tarpusavio priklausomybių ir geometrijos vartus. Saugo originalius bazės, laukų, reikšmių ir klasių kodus; administravimo rodinys ir laiško formatas jų nepraranda. Kliento pateikti aprašymai nėra užsakymo autoritetas.
4. Vieši GLB yra išvestiniai: pašalinami tiekėjo metadata, vardai ir originalios nuorodos; originalių BIN chunk / geometrijos / tekstūrų baitai bei topologija nepakeičiami. Neutralių scenos vardų susiejimas išlaiko komponentų pašalinimo taisykles. Naujos išvestinės SHA patikros nepakeičia originalo pilno SHA patikros serveryje.
5. Nėra senų raw runtime JSON, GLB, source palette, source PDF ar konfigūravimo URL apeigos. Administratoriui originalai pasiekiami tik su autentifikacija. Vieši HTML/RSC/JSON/JS ir failų vardai tikrinami pagal realų privatų kodų inventorių.
6. Vien tekstų paslėpimas CSS ar gamintojo lauko pervadinimas nėra priėmimas. Nežinomas viešas tekstas pažymimas TVS kaip trūkstamas pavadinimas; gamintojo kodas nėra fallback.

## Priėmimas

- Tikri skirtingų produktų konfigūravimo perėjimai ir visos jau galiojančios priklausomybės; pasirinkimų ir geometrijos kokybės ribos nemažinamos.
- Viešo DTO ir GLB privatumas, tokenų tipų atskyrimas, pakeisto / svetimos prekės tokeno atmetimas, originalių binarinių chunk tapatybė.
- Pirkėjo užklausa iš viešo tokeno → saugomas administratoriaus įrašas ir laiško tekstas turi visus tiksliai originalius kodus.
- Autentifikuoto TVS susiejimai ir patikros pažanga išsaugomi. Duomenų migracija nesumaišo tekstų ID su viešais pasirinkimų ID.
- Kompiuterio ir telefono naršyklės eiga, tinklo atsakymų / bundle / failų vardų privatumo skenas, tikras gautos užklausos patikrinimas. Be leidimo nesiunčiami bandomieji laiškai.
- Rinkimo procesai, Native rezervacijos, RAW, originalūs GLB ir jų manifestai yra tik skaitomi. Naujos išvestinės ir patikros D:/Core; G nerašomas, J archyvas tik skaitomas. Pagrindinės peržiūros publikavimas tik su aktualiais Native savininko source / pilno SHA / rollback vartais.

Pradinė būsena: source 78b302ce01a8a1e9ddb4afacbc923419823efacd, main 25292e20219b735df7f04c5807dd4c100f98addc, companion c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da. Own PR320 ir šaka codex/ergonomic-product-performance-20261102. Naujas darbas nekeičia jau užbaigtų archyvavimo programų.
