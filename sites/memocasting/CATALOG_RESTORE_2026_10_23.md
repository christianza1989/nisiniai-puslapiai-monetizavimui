# Memocasting: aštuonių prekių atkūrimas · 2026-10-23

Savininkas paprašė atkurti ankstesnės parduotuvės prekes ir aprašymus, išlaikyti dabartinę poros bei šeimos rinkinių sudėtį, o uosinį padėklą, kūdikio pėdutes ir rėmelį pažymėti „Išparduota“. Darbo pradžioje produkcijos kataloge buvo tik du SKU su 739 ir 764 ženklų aprašymais. Vien ankstesni URL nukreipimai šios užduoties neužbaigė.

## Turinys ir faktai

[Visi aštuoni tekstai](CATALOG_RESTORE_2026_10_23_CONTENT.mjs) paremti perskaitytais savininko Wayback šaltiniais ir jo naujesniais faktais. Poros rinkinyje vienas alginato pakelis, 1 200 g gipso; šeimos rinkinyje po du alginato ir gipso pakelius. Abiejuose balti dažai. Dabartinės kainos 32 € ir 48 €, pakuotės 2,2 kg / 20×20×17 cm ir 4,5 kg / 25×25×20 cm nepakeistos.

Senos 500/1 000 g bei 1 100/2 500 g komplektacijos, garantijos apie bet kokį amžių / rankų skaičių, tikslų stingimo laiką, odos saugumą, 10 000 klientų ir nebeaktualų pristatymą neperkeltos. Papildymų archyve ilgo aprašo nebuvo; jiems parašyti originalūs pasirinkimo ir pasiruošimo tekstai, neišgalvojant ankstesnio aprašymo.

| Prekė | Viešas URL | Pardavimo būsena |
| --- | --- | --- |
| Poros rinkinys | `/rinkinys-porai` | Veikia, 32 €; dabartinė sudėtis |
| Šeimos rinkinys | `/seimos-rinkinys` | Veikia, 48 €; dabartinė sudėtis |
| Mamos ir vaiko rinkinys | `/products/seimos-rinkinys` | Aprašymas ir kontaktas; dabartinės kainos / siuntos faktai nepatvirtinti |
| Kūdikio pėdutės | `/products/kudikio-pedutes` | Išparduota; ankstesnė kaina 25,99 € |
| Kūdikio įspaudai su rėmeliu | `/products/kudiko-ispaudu-rinkinys-su-remeliu` | Išparduota; ankstesnė kaina 22,99 € |
| Alginatas porai | `/products/alginato-papildymas-650g-dvieju-ranku-rinkiniui` | Aprašymas ir kontaktas; dabartinės kainos / siuntos faktai nepatvirtinti |
| Alginatas šeimai | `/products/alginato-papildymas-1100g-keturiu-ranku-rinkiniui` | Aprašymas ir kontaktas; dabartinės kainos / siuntos faktai nepatvirtinti |
| Uosinis padėklas | `/products/isdziovintas-uosinis-padeklas` | Išparduota; ankstesnė kaina 8 € |

Istorinis mamos ir vaiko adresas nėra dabartinis šeimos rinkinio URL. Jis atkurtas kaip atskira prekė. Ankstesni dviejų pagrindinių rinkinių ir katalogo 301 palikti. Padėklo pasirinkimas prie abiejų rinkinių išjungtas, saugotos ankstesnės +12 € / 300 g / +5 cm pasirinkimo reikšmės. Jau išsaugoti užsakymai neperrašyti; sena neapmokėta krepšelio konfigūracija su padėklu turi būti perskaičiuota.

## Sistemos ir medijos pakeitimai

Per tikras `CatalogOperations.saveDraft/revise` operacijas paskelbti du atnaujinti ir trys išparduoti SKU; trys nepatvirtinti pasiūlymai parengti kaip privatūs administravimo juodraščiai. Operatoriaus kataloge iš viso aštuonios prekės. Viešas prekybos API pateikia penkias, o trijų juodraščių kainos ir siuntos parametrai viešai nesiūlomi. Savininko redagavimas išlieka per esamą administravimą; naujas valdymo įrankis nekurtas.

Visų aštuonių puslapių medija importuota bendru `saveResponsiveAsset` keliu su konkrečiais alt ir teisių įrašais. Dviem pagrindiniams rinkiniams naudoti dabartiniai balti iškirpti liejiniai, kitoms šešioms prekėms — savininko seno katalogo nuotraukos. Rasti rožiniai vaizdai su Envato žymėmis atmesti; vietoje jų pasirinktos švarios alternatyvos. Nebuvo generuojami fiktyvūs klientų darbai. Trims viešiems išparduotiems SKU ir trims privatiems juodraščiams pasirinkta optimizuota medija taip pat įkelta per `CatalogMedia` į esamą R2. Failų leidžiamų kelių sąrašas nepraplėstas.

Viešasis rendereris turi vieną tikslų aštuonių produktų registrą, bendrą produkto šabloną, išparduotos prekės kainą ir būseną, kontaktą nepatvirtintam pasiūlymui. Papildymams nepriskiriami balti dažai ar padėklo pasirinkimas. Palyginimo lentelė lygina tik du pagrindinius rinkinius ir suranda jų sudėties skyrių, ne pirmą pasitaikiusį proceso sąrašą; išsaugotos PL/LV/ET antraštės.

## Leidinys ir patikros

Native leidinys `60d1bb3a-9c65-45d7-a895-01afc6937457`, SHA-256 `f5acefd5839bbe0d26a7d0ee4f065383edd78a804212171faae89b2bd608fde3`: 185 puslapiai, 800 medijos failų. Peržiūrėti devyni pakeisti puslapiai: aštuonios prekės ir katalogas. Likę 176 ankstesni puslapiai nepakeisti; visos ankstesnės publikavimo datos išsaugotos. Keturios naujos prekių datos yra tikros kūrimo datos. Straipsnių grafikas nekeistas.

Privačių įrodymų katalogas: `qa/catalog-restore-20261023/`. Jame originalūs šaltiniai, tikros sistemos būsenos prieš / po, native mobilios peržiūros, šešių sričių revision-bound redakciniai įrašai ir leidinio kvitas. Pirmas bendras regresijos paleidimas aptiko seno testo pirmojo sąrašo prielaidą; ji pataisyta išlaikant baltų dažų įtraukimo patikrą. Po pataisos 191/191 testas praėjo. Tikslinės papildomos kalbinių palyginimų patikros ir TypeScript / lint vykdomi galutinei versijai.

Galutinis įkėlimo ir viešų patikrų rezultatas fiksuojamas užbaigus surinkimą. Vien native eksportas čia nelaikomas produkcijos priėmimu.

## Likusi faktinė priklausomybė

Mamos ir vaiko rinkiniui bei abiem alginato papildymams reikia dabartinės kainos, supakuoto svorio, dėžės matmenų ir laikino pardavimo limito. Ankstesnės 32,99 / 12 / 18 € kainos išsaugotos tik privačių juodraščių parengimui. Kol šių faktų nėra, jų vieši aprašymai veikia su kontaktu, o mokėjimas nejungiamas. Atsakymo paprašyta savininko tame pačiame pokalbyje; tai nėra leidimo prašymas užbaigti jau autorizuotus tekstus ar publikavimą.
