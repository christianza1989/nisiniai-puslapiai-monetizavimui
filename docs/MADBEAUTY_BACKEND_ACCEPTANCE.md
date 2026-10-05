# Madbeauty veikiančio vietinio piloto priėmimas

2026-10-05. Aktualus pavedimas: galutinė sąsaja, registracija testams tik email, meistro paskyra→paslaugos/grafikas→kliento rezervacija. Žemiau **planuojami vartai, ne PASS**. Kodo savininkas: sesija 01a10c23-938f-7e62-9674-4b3bfef2dc29, sites/madbeauty/. Root jos kodo neredaguoja lygiagrečiai.

Kiekvienam kriterijui fiksuoti PASS/FAIL/UNVERIFIED/NA, actual komandą, rezultatą ir saugų įrodymą. Sintetiniai naudotojai ir DB atskirai; testai neįrodo paklausos. Source peržiūra nepakeičia HTTP/naršyklės scenarijų.

## Paskyros ir saugykla

- [ ] Klientas ir meistras registruojasi email. Vienkartinio kodo hash, expiry, bandymų/siuntimo ribos, bendri atsakymai neatskleidžia paskyros egzistavimo. Neteisingas, pasibaigęs ir panaudotas kodas atmetamas.
- [ ] Viena tapatybė gali turėti kliento paskyrą ir serverinę narystę salone. URL, forma ar localStorage nesuteikia rolės. Bent dviejų sintetinių naudotojų cross-tenant read/write deny.
- [ ] HttpOnly/SameSite sesija, CSRF/origin apsauga, sesijos rotacija, serverinis logout. Neautorizuotas klientas nepasiekia svetimo profilio / vizito duomenų.
- [ ] Private local mail capture per operatoriaus CLI, ne viešas email→OTP endpoint ar produkto UI. Production capture neprieinamas; OTP/secret nepatenka į logus/Git/įrodymus. Capture nėra SMTP-INBOX PASS.
- [ ] Meistro onboarding, lokacija, paslaugos variantas/kaina/trukmė/buferiai, grafikas ir rezervacijos išlieka po serverio restart. Kliento paieška naudoja šiuos įrašus, ne antrą hardcoded katalogą.

## Rezervacija

- [ ] Tinkamo darbuotojo paslauga, pamaina, nedarbo intervalai, uždarymai ir resursai riboja laisvus laikus. Pakeista/išjungta paslauga atmeta pasenusį pasiūlymą.
- [ ] Paslauga/miestas/data/valandų intervalas: telpa visa procedūra ir numatyti buferiai. UTC/Europe/Vilnius, dienos ir DST ribų testai.
- [ ] Actual browser onboarding→paslauga→grafikas→email login→live API booking. Tas pats ID/statusas/laikas kliento vizituose ir meistro kalendoriuje; reload/restart išlaiko.
- [ ] Du lygiagretūs HTTP klientai tam pačiam resursui: vienas laimi, kitas gauna conflict. Pakartoti persidengiančiais skirtingos trukmės vizitais.
- [ ] Vienodas idempotency raktas+payload sukuria vieną vizitą/pranešimą; pakeistas payload su tuo raktu atmetamas.
- [ ] Cancel atlaisvina laiką; reschedule atominis, užimtas naujas laikas nepraranda seno. Svetimo vizito keitimas atmetamas. Jei hold naudojamas, jo expiry patikrintas; jei nenaudojamas, dokumentuoti.
- [ ] Vizitas ir notification outbox viename patvariame veiksme. Pending/captured/sent/delivered/failed atskiri statusai, ne sinonimai.

## Sąsaja ir core

- [ ] Vieninga juoda/balta/violetinė sistema, tikri ekranai ir būsenų/veiksmų inventorius, final tekstai pagal DEMO_DATA_POLICY. Desktop/mobile/keyboard/focus/dialog/error actual patikros.
- [ ] Bent 40 individualių meistrų su keliais tinkamais vaizdais kiekvienam. Seed on/off atskirai nuo realių testinių paskyrų/DB, production exclusion patikrinta arba UNVERIFIED.
- [ ] siteId=madbeauty, kontaktai iš central config, MEDIA_CORE ir bendras host-aware SEO/GEO/public projection kontraktas. Local Node SQLite nėra savaime priimtas D1/Workers adapteris.
- [ ] Public katalogas ir indeksuojami SEO filtrai tik iš patvirtintų realių įrašų; account/booking/datos filtrai neindeksuojami. Shared core adapteriui atskiras suderintas WORKSTREAMS langas ir actual core testai.

Ankstesnio frontendo Lighthouse/testai nėra šio backend priėmimas. Lokalų pilotą, production hosting adapterį, tikrą email pristatymą ir paleidimą vertinti atskirai; be jų neskelbti domain-ready ar produkcinės platformos 10/10.
