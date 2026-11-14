# BDEV-0003-P4 — nepristatymo pranešimo offline laboratorija

Statusas: **proposed**. Approval source / scope: null. Dar nepradėta. Tik esamos Verslomatikos patikimų vykdymo kvitų krypties detalė; ne naujas pašto runtime.

Apimtis: iki 2 agento darbo valandų, privatus izoliuotas katalogas, Python standartinė MIME biblioteka, sintetiniai `.eml` ir outbound žemėlapis dviem nišoms. Visi adresai rezervuotuose example domenų varduose. Jokio tinklo, realių laiškų, inbox, DB ar esamo src pakeitimo. Maksimali įvestis 64 KiB, MIME dalių ir gylio ribos turi būti aiškiai nustatytos bandyme.

Išvestis: parse būklė, gavėjui tenkanti deklaruota Action / Status, originalaus siuntimo ID kandidatas, siteId ir susiejimo priežastis arba nežinomybė. Kilmei atskiras `unverified` laukas; matching nėra autenticity. Original-Envelope-Id ir originalaus laiško Message-ID neinterpretuojami kaip vienas laukas. Neįvykdyti jokio resend, kontakto blokavimo, pristatymo patvirtinimo ar reply agento paleidimo.

12 kontrolinių atvejų:

1. Žinomo siuntimo failed / 5.1.1 — sugedusio adreso stebėjimas, be naujo siuntimo.
2. Delayed / 4.2.2 — vėlavimo stebėjimas, be mūsų pakartotinio siuntimo.
3. Failed / 4.4.7 — deklaruota galutinė nesėkmė, ne automatinis retry pagal pirmą skaitmenį.
4. Delivered / 2.0.0 — deklaruotas pristatymas, be perskaitymo fakto.
5. Nežinomas originalas / nėra pakankamų koreliacijos laukų — nesusietas įvykis.
6. Vienas kandidatas dviejose nišose — atmesti dviprasmį susiejimą.
7. Pakartotas tas pats DSN — vienas stebėjimas, be papildomo veiksmo.
8. Sugadinta arba prieštaringa MIME / Action / Status — nežinomybė.
9. Įprastas kliento laiškas — ne DSN; laboratorija jo nepaverčia siuntimo kvitu.
10. Suklastotas, su žinomu originalu sutampantis DSN — lieka nepatvirtintos kilmės kandidatas, be automatinio realaus būsenos pakeitimo.
11. Vieno pranešimo du skirtingi gavėjų rezultatai — tik tiksliai žinomo gavėjo kandidatas, jokio svetimo gavėjo priskyrimo.
12. Tarptautinis MIME variantas arba daugiau kaip 64 KiB — aiški nepalaikoma / per didelė įvestis, ne klaidingas PASS.

Priėmimas: 12/12 sutartų išvesčių, dvi nišos izoliuotos, dublikatas idempotentiškas, nėra tinklo ar runtime mutacijų. Tai laboratorijos priėmimas, ne realaus pristatymo, viso RFC palaikymo ar saugaus automatinio suppression įrodymas. Paskelbiami originalūs nepavykę scenarijai ir tikras laikas.

Stabdymas: 2 valandų riba; poreikis skaityti tikrą inbox, gauti paslaptis, įjungti transportą ar liesti kitą aktyvią šaką; nepatikimas susiejimas arba mokama priklausomybė. Netinkamas atvejis lieka unknown. Naujų prenumeratų nėra, faktinis agento / modelio darbas nėra paskelbtas nemokamu.

Prieš būsimą shared integraciją — atskiras core vykdytojo koordinavimas ir faktinės DSN gavimo / patikimumo taisyklės. Šis mandatas, jei būtų duotas, apimtų tik laboratoriją. [Tyrimas](RESEARCH.md).
