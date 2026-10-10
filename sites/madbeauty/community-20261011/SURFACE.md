# Madbeauty bendruomenės ekranų ir dizaino kryptis

2026-10-11. Planavimo briefas; tai nėra jau sugeneruotų maketų ar veikiančios sąsajos priėmimas. Apimtį ir serverio taisykles aprašo [PLAN.md](PLAN.md), ekranų sąrašą ir darbų priklausomybes – [BACKLOG.json](BACKLOG.json).

## Pagrindinė kompozicija

Nuotraukų srautas primena grožio darbų žurnalą: didelis darbas, aiškus autorius ir vienas patogus kelias pas meistrą. Greta telpa pokalbis, grupė ir artėjantis renginys. Bendruomenė turi savą erdvę, bet išlaiko Madbeauty logotipą, DM Sans, `#111114`, baltą, `#7040E8` ir `#F1EDFF`.

1440 px ekrane turinys telpa maždaug 1240 px pločio zonoje: apie 200 px navigacijai, 620 px srautui ir 280 px vietinėms grupėms / renginiams; tikslūs tarpai derinami makete. 768 px slepiama papildoma dešinė skiltis. 390 px – viena skiltis, nuotraukos beveik per visą ekraną, trumpi veiksmai ir saugus tarpas apatinei navigacijai. Ilgi pavadinimai laužomi, o ne paslepiami po neaiškia išnaša.

Violetinę naudoti veiksmams, aktyviems filtrams ir svarbiam akcentui. Žinučių burbuluose ji pažymi savo žinutes, bet neužpildo viso ekrano. Grupės ir renginio viršelis duoda savitumą; teksto skaitomumą užtikrina atskiras šviesus turinio plotas. Kursoriaus hover ir 150–200 ms perėjimai nepakeičia aiškių focus būsenų. Reduced motion režime nereikalingi judesiai išjungiami.

## Srauto kortelė

Viršuje autoriaus avataras, vardas, „Meistras“ arba salono tapatybė, laikas ir auditorija. Viduryje 4:5 arba 1:1 darbas, su natūralia peržiūra visos nuotraukos lange; portretų ir prieš / po vaizdų nenukirpti vien dėl vienodos eilės. Karuselė valdoma mygtukais ir klaviatūra, telefono gestas yra papildomas būdas.

Po vaizdu – reakcijų / komentarų / išsaugojimo veiksmai, trumpas tekstas ir paslaugos juosta. Pavyzdžiui: „Manikiūras · Vilnius“ bei „Peržiūrėti paslaugą“. „Patinka“ skaičius nevaizduojamas žvaigždutėmis, kad nesusimaišytų su tikrais meistro įvertinimais.

Įrašo kūrimas telefone – atskiras ekranas, kompiuteryje – platus dialogas. Pasirinkti vaizdai, jų tvarka, tekstas, autorius, auditorija ir paslauga matomi prieš publikaciją. Kiekvieną vaizdą galima pašalinti ir aprašyti. Serverio klaida išlaiko tekstą bei pasirinktą auditoriją; sėkmė nukreipia į tikrą sukurtą įrašą.

## Profilis ir ryšiai

Meistro viešame profilyje išlieka esamos paslaugos, darbų galerija ir įvertinimai. Bendruomenės papildymas: „Sekti“, „Rašyti“, „Pakviesti“ ir darbų įrašų skiltis. Asmeniniame bendruomenės profilyje – pasirinktas vardas, avataras, trumpas pristatymas ir leidžiami įrašai. „Pridėti į draugus“ yra asmeninio, o ne salono profilio veiksmas.

Ryšio būsenos įvardytos: „Sekama“, „Prašymas išsiųstas“, „Priimti“, „Draugai“. Atmetimo nereklamuoti kitam žmogui. Privatumo nustatymai pateikiami paprastai: „Kas gali man rašyti“, „Kas mato mano draugus“, „Ar rodyti perskaitymą“. Išsaugotos kolekcijos matomos tik jų savininkui.

## Žinutės

Kompiuteryje kairėje pokalbiai, dešinėje aktyvus pokalbis; telefono pokalbis turi aiškų grįžimą į sąrašą. Viršuje vardas ir tapatybė, pavyzdžiui, „Salono komanda“; vizito pokalbiui rodoma vizito nuoroda. Gavėjas ir išsiuntimo būsena aiškūs net siaurame ekrane.

Žinučių užklausai skiriamas atskiras vaizdas su „Priimti“, „Atmesti“ ir „Blokuoti“. Blokavimo / skundo veiksmai pasiekiami per pokalbio meniu, o įprastas parašymas neužkraunamas moderavimo instrukcijomis. Privataus failo publikavimo į galeriją veiksmo čia nėra.

## Grupės

Grupių sąraše – 3 kortelės kompiuterio eilėje, 2 planšetėje ir 1 telefone. Kortelė turi viršelį, pavadinimą, temą, miestą, viešumo žymą ir prisijungimo būseną. Privačios grupės kortelė neprideda narių nuotraukų ar įrašų ištraukų.

Grupės puslapyje – viršelis ir pristatymas, po jais „Diskusijos“, „Renginiai“, „Apie“ ir nariams prieinama „Nariai“. Taisyklės glaustos ir pasiekiamos prieš prisijungimą. Grupės kūrimo forma padalyta į du aiškius žingsnius: pavadinimas / tema / viršelis, tada privatumas / prisijungimo ir skelbimo taisyklės.

Administratoriui atskiras „Valdyti grupę“: prašymai, nariai, rolės, skundai ir taisyklės. Įprastiems nariams šie valdymo elementai nerodomi. Pašalinus narystę ekranas persikrauna į grupės pristatymą be privataus turinio.

## Renginiai ir konferencijos

Renginių atradimas turi datų juostą, „Mokymai / Konkursai / Konferencijos / Susitikimai“ filtrus, miestą ir sąrašo / kalendoriaus pasirinkimą. Kortelėje stambi data, viršelis, renginio pavadinimas, organizatorius ir vieta. „Domina“ galima paspausti neišėjus iš sąrašo; registracija atsidaro tikrame renginio puslapyje.

Renginio puslapis: viršelis, pavadinimas ir organizatorius, data / vieta / registracijos būsena, aprašymas, programa, pranešėjai ir sąlygos. Kompiuteryje registracijos skiltis šone; telefone kompaktiškas apatinis veiksmas su tekstu „Registruotis“, „Laukti organizatoriaus“ arba „Vieta patvirtinta“. Veiksmas neuždengia sąlygų ir galima lengvai atsisakyti dalyvavimo.

Konferencijos programai naudoti dienų skirtukus ir vertikalią sesijų laiko juostą. Kiekvienoje sesijoje laikas, tema, pranešėjas ir salė. Pranešėjų portretai su vardais, be fiktyvių ekspertų ar titulų. Programa patogi telefone ir pasiekiama be prisijungimo, jei konferencija vieša.

Kūrimo forma: „Renginys“, „Laikas ir vieta“, „Programa“, „Registracija“, „Peržiūra“. Mokymams ir konkursams pasirodo tik jų tipui reikalingi laukai. Juodraštis automatiškai išsaugomas tik patvirtintu serverio atsakymu; aiškiai rodoma paskutinio išsaugojimo būsena. Organizatoriaus ekranas su dalyvių / paraiškų būsenomis atskiras nuo viešo puslapio.

## Vaizdai ir ikonos

Pradiniam socialiniam srautui reikia tikrų autorinių meistrų darbų. Generuoti galima tuščių būsenų ir pristatymo iliustracijas, ne fiktyvias klienčių patirtis, konferencijų nuotraukas ar pranešėjų portretus.

Numatomi 4 nedideli skaidraus fono iliustracijų rinkiniai: tuščias idėjų albumas, pirmas pokalbis, grupės diskusija ir renginio kalendorius. Vienodas subtilus grafito / violetinis stilius, naudojamas tik ten, kur nėra tikro turinio. Ikonos – redaguojamas vientiso stiliaus SVG rinkinys: sekti, draugai, patinka, komentarai, albumas, grupė, renginys, programa, pranešėjas, žinutės, blokavimas ir pranešti.

Kiekvienas asetas turės paskirtį, provenance, alt sprendimą ir responsive variantus pagal bendrą media sutartį. Darbo ir renginio vaizdui rezervuojamas dydis prieš jo įkėlimą, kad kortelės nešokinėtų. Įrašo autorius gali naudoti tekstinį renginio viršelį, jei neturi tinkamos nuotraukos.

## Priėmimas

Prieš rašant visą UI paruošti 5 pagrindinius desktop / mobile maketus: srautas, įrašo kūrimas, pokalbis, grupė ir konferencijos puslapis. Vieną kryptį įgyvendinti vertikaliai su tikru backend ir patikrinti faktinėse ekrano nuotraukose. Tai kitas įgyvendinimo žingsnis; šiame planavimo lange vaizdai dar negeneruoti.

Kiekvienas BACKLOG ekranas turi bendras būsenas: kraunama, tuščia, sėkmė, klaida ir prarasta prieiga. Mutacijoms papildomai: laukiamas atsakymas, versijos konfliktas ir limitas. Tikrinti 390 / 768 / 1440 px, klaviatūrą, grįžimą, fokusą ir faktinę serverio būseną po refresh. Tinkamas dizainas turi išlikti ir be gerų pavyzdinių nuotraukų.
