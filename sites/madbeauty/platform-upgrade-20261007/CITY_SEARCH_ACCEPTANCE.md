# Miesto pasirinkimas ir straipsnių nuorodos — 2026-10-09

Kandidato runtime `fbc4bbc3e900694cee8c011667a1a2cb7abd1ecc` pataiso katalogo miesto pateikimą: kai nėra priimtų pasiūlymų, atidaroma `/paieska` su išsaugotu procedūros bei miesto filtru. Kai pasiūlymų yra, lieka jų tikras katalogo adresas. Pašalinus pasiūlą, miesto turinio tikslas išnyksta; savavališkas tuščio miesto URL ir toliau grąžina 404. Tai nekuria fiktyvios pasiūlos ar indeksuojamų miesto puslapių.

Miesto puslapis naudoja dabartinio katalogo aktyvias kategorijas: šiame tuščiame izoliuotame kataloge matėme visas 14. Kategorijos veda į paiešką su tuo miestu; nebevartojamas senas dešimties paslaugų sąrašas. Katalogo forma išsaugo miesto pasirinkimą, padarytą prieš pirmą kliento atvaizdavimą. Procedūros ir miesto pasirinkimai vieni savaime nepatvirtina konkretaus meistro teikiamų paslaugų.

Patikros:

- `city-selection-regression.json`: visi keturi rinkiniai 264/264 PASS, 0 naujų / 1 papildytas / 0 pašalintų testų, 114,415 s. Workers bandymas apima tuščią pasiūlą, priimtą pasiūlą, jos pašalinimą, nuorodos projekciją ir paieškos HTTP200/noindex.
- `city-selection-ui.json`: normalus svečias pasirinko Žiežmarius kompiuteryje ir Vilnių telefone. Pasirinkimai išliko paieškos formoje; rodomas aiškus nulis rezultatų. 390×900 DOM viewport main/document plotis neviršijo horizontalios ribos. SPA kategorijos pasirinkimas iš Žiežmarių puslapio išlaikė abu filtrus.
- `city-initial-selection.json`: nepakitusio programos failo pristatymas atskirame vietiniame serveryje atidėtas 5 s; iki jo įkėlimo pasirinkti Žiežmariai išliko po pirmojo kliento atvaizdavimo ir pateikimo. Ankstesnis neišlaikytas bandymas saugomas kaip diagnostika, šis patikrinimas priima jo konkretų pataisymą.
- `city-calendar-proof.json`: naujas kompiliuotas kandidatas su core `c7e0c9a`, tuo pačiu bb paketu, 39 puslapiais ir 309 assets išlaikė 64 faktines native HTTP T−1/T publikavimo būsenas. QA laikrodis yra tik kompiliuoto bandymo apvalkale.

`city-continuation.json` turi tikslias source/artifact tapatybes, failų SHA ir penkių naršyklės vaizdų tikrus MIME bei rastrų dydžius. Full-page JPEG rastrų dydžių netapatiname su DOM viewport dydžiais.

Gyvas leidimas tebelieka `4dbdf361` / runtime b7 / core63 / bb. `live-content-targets.json` užfiksavo 22 konkrečias veikiančias nacionalines procedūrų nuorodas, jų tikrus `checkedAt`, HTTP200/canonical, 103 miesto pasirinkimus ir abu faktinius deployed resolverius. Registre yra 257 ready nacionaliniai informational targets ir 0 miestinių targets; vien indeksas `/paslaugos` neturi bare `mb:catalog` typed ID. Registro TTL viena valanda; būsimiems straipsniams reikia šviežio runtime registro. URL query parametrai neleidžiami. Turinio sesijai šie faktai ir tikslūs ID perduoti.

Gyvos nacionalinės formos tuščio Vilniaus pateikimas šio patikrinimo metu vis dar grąžino 303→404. Jo pataisymas yra kandidatui skirtas pakeitimas, dar ne production. Ankstesni 3c hosted booking/handoff receipts išlaiko savo tapatybę ir nepervadinami į fbc priėmimą. Pilnas atnaujinimas tebėra ACTIVE / neužbaigtas: realaus teikėjo pilotas, autorizuotas rezervacijos/primenamojo laiško gavėjas, faktinė retention/backup tvarka bei galutinis pasirinkto leidimo hosted/canonical priėmimas dar liko.
