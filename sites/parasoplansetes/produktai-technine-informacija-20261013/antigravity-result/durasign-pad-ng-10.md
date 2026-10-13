# StepOver duraSign Pad NG 10

„duraSign Pad NG 10“ – naujos kartos (NextGen) parašo planšetė, savarankiškai apdorojanti PDF dokumentus: įrenginys atvaizduoja failą ekrane, fiksuoja biometrinį parašą ir sugeneruoja galutinį pasirašytą dokumentą. Pagrindinį pasirašymo procesą galima patogiai valdyti interneto naršyklėje be atskiros pasirašymo programos. Didesnis 10 colių ekranas idealiai tinka darbo vietai, kur klientas prieš pasirašydamas turi perskaityti visą dokumentą.

## Naudojimas ir integracija

Prijungus per USB laidą, planšetę valdo vietinis kompiuteris. Naudojant papildomą „Ethernet Connection Kit“ priedą, įrenginys prijungiamas prie vietinio tinklo, todėl juo paeiliui gali naudotis keli skirtingi darbo vietų kompiuteriai. Sisteminei integracijai gamintojas siūlo REST ir .NET API sąsajas bei „Print2NG“ virtualų spausdintuvą. Interaktyvių formų pildymui pačioje planšetėje skirtas papildomas „NG Pad Feature Extension“ plėtinys.

## Techninės charakteristikos

Duomenys pateikti remiantis oficialiu gamintojo produkto puslapiu ir techniniu lapu. RH – santykinė oro drėgmė.

| Parametras | Reikšmė |
|---|---|
| Matmenys | 29 × 22 × 2,1 cm |
| Svoris | 945 g PDF / 955 g puslapyje – tikslinti |
| Korpusas | PC/ABS; 3 mm |
| Ekranas | TFT; 64 000 spalvų; 1024 × 600 |
| Aktyvus ekranas / jutiklis (PDF) | 22,27 × 12,53 cm |
| Ryškumas | Iki 310 cd/m² |
| Jutiklio raiška | X/Y: 2560 DPI/LPI |
| Pakartojamumas | ±0,4 mm |
| Parašo duomenys | 330 X/Y/spaudimo/laiko rinkinių/s |
| Spaudimo lygiai | 2048 |
| Rašiklio modelis | duraPen 3 |
| Dokumentai | PDF/A-1b, -2b, -3b; kiti PDF tik išbandžius |
| Vaizdai | PNG, JPG, BMP; 1024 × 600 |
| Vaizdo įrašai | VP8; 512 × 300; 512K; 24 Hz; be garso |
| Jungtis | USB 2.0; Ethernet su papildomu priedu |
| USB režimas (PDF) | Tinklo įrenginys; Ethernet over USB / RNDIS |
| Kabelis | 2 × USB-A → Mini-USB-B; Y kabelis, 299 cm |
| Maksimali galia ir srovė | 5 W / 1000 mA |
| Sistemos (PDF) | Windows ≥10; macOS ≥Catalina; Linux su USB / CDC palaikymu |
| Naršyklės | Chrome, Edge, Safari, Firefox |
| Darbo sąlygos | 0…+50 °C / RH≤65 %; 0…+40 °C / RH≤90 %; be kondensacijos |
| Laikymas | −10…+70 °C / RH≤90 %; be kondensacijos |
| Laikrodžio baterija | CR2032 |
| GTIN | 4260130061418 |
| Gamintojo garantija | Standartinė 2 metai; yra 3 metų variantas |
| Jutiklis | ERT; chemiškai grūdintas stiklas |
| Rašiklio prispaudimo jėga | Apie 0,5–8 N |
| Rašiklis | Elektromagnetinis, be baterijos; pritvirtinamas virvele |
| Kriptografiniai algoritmai | RSA iki 4096 bitų, AES-256, SHA-256 |
| Apsauga nuo vagystės | Kensington užrakto lizdas |
| Kilmė | Pagaminta Vokietijoje |
| Atitiktis | CE, UKCA, RoHS; gamintojo lape nurodyta WEE |

## Programinė įranga ir prijungimas

Techniniame lape (PDF) nurodoma, kad tradiciniam darbo modeliui palaikomos „eSignatureOffice“ ≥7.X ir „SimpleSigner“ ≥8.X programos. NG integracijai pateikiamas įrenginio REST API, „NextGen API“ (.NET) bei „Swagger“ specifikacija. Tinklo priedai su 10/100 Mbit/s adapteriu ir maitinimo šaltiniu užsakomi atskirai.

## Šaltiniai

- [StepOver produkto puslapis](https://stepover.com/en/products/signature-pads/durasign-pad-ng-10/).
- [StepOver techninis lapas, 2024-10-15](https://stepover.com/wp-content/uploads/StepOver_Technical-Data-Sheet_duraSign-Pad-NG-10_EN.pdf).
- [NG Pad Feature Extension](https://stepover.com/en/products/software/ng-pad-feature-extension/).

## Pastabos prieš perkeliant į svetainę

- Produkto puslapyje nurodytas svoris yra 955 g, o techniniame lape (PDF) – 945 g; aktyvus plotas puslapyje nurodytas 22,41 × 12,67 cm, o PDF lape – 22,27 × 12,53 cm. Prieš skelbiant šiuos parametrus būtina gauti gamintojo patikslinimą.
- Techniniame lape datos ir laiko žyma vadinama standartine, tačiau atitinkamos eilutės antraštėje nurodyta „optional“. Tai vidinio įrenginio laikrodžio data, o ne kvalifikuota laiko žyma; NTP sinchronizavimo sąlygas reikia tikslinti.
- Korpuso atidarymo aptikimas produkto puslapio tekste pateikiamas kaip integruotas, o techniniame lape – kaip papildoma gamyklinė parinktis. Šios funkcijos negalima žadėti kaip standartinės komplektacijos dalies.
- Vaizdo įrašo srauto reikšmė 512K techniniame lape pateikta be matavimo vieneto; jos negalima savavališkai pakeisti į tikslų kbit/s skaičių. Vidinėje atmintyje telpa bent keturi budėjimo vaizdai, o vaizdo įrašo trukmė – iki 30 min.
- Papildomų tinklo priedų maitinimo šaltinio galia: 7 W („Europlugs“) arba 7,5 W („International“); tai nėra pačios planšetės 5 W galia. VESA 100 tvirtinimas nurodytas produkto puslapyje.
- Trejų metų varianto GTIN: 4260130061623. Jutiklio resursas (>30 mln. parašų) ir apšvietimo trukmė (20 000 val.) yra deklaruojami gamintojo rodikliai, o ne pardavėjo garantija.
