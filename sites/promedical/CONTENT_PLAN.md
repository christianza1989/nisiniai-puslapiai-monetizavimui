# Promedical turinio ir ketinimų planas

2026-10-09. siteId promedical, promedical.lt, LT / lt-LT, Europe/Vilnius. Dabartinė apimtis: visas savininko užsakytas Klaro katalogas su originaliomis lietuviškomis santraukomis, produktų faktiniais parametrais ir nuorodomis į gamintoją; papildomai 11 pradinių informacinių puslapių. Katalogo faktinį galutinį skaičių ir ID fiksuoja root pagal crawl deduplikavimą.

## Užklausa → URL → skaitytojo sprendimas

| Tikslus klausimas / pagrindinė užklausa | Sprendimas ir formatas | Tikslas | Įrodymo būsena |
| --- | --- | --- | --- |
| Klaro medicininė įranga | Atstovaujamo tiekėjo asortimentas ir kitas žingsnis | / | Savininko pasiūlymas, gamintojo apžvalga |
| Klaro produktai; Klaro katalogas | Rasti konkretų produktą arba kodą | /produktai | Gamintojo katalogas; visas product inventorius root |
| medicininiai vežimėliai; procedūriniai vežimėliai | Pasirinkti paskirties kategoriją, rasti konkretų kodą | /kategorijos/<source-slug> | LT paieškos katalogo ketinimo pavyzdys; volume nežinomas |
| kaip pasirinkti medicininį vežimėlį | Suformuoti vežimėlio atrankos kriterijus | /gidai/medicininio-vezimelio-pasirinkimas | Gamintojo kategorijų, paviršių ir instrukcijų šaltiniai |
| ISO moduliai ligoninei; modulinė laikymo sistema | Suderinti talpos, kreipiančiųjų ir įrangos kelią | /gidai/iso-moduliu-sistema | ISO kategorijos, spintos, krepšiai, stelažai |
| medicininės įrangos pirkimo užklausa | Pateikti tą patį poreikį keliems pasiūlymams | /gidai/irangos-pirkimo-uzklausa | Originalus ruošinys; VPT pagalbinių priemonių indeksas |
| [tikslus Klaro produkto kodas] | Patikrinti vieno tikro varianto duomenis ir teirautis | /produktai/<source-slug> | Tiksli source product tapatybė ir parametrai root |
| medicininės įrangos gidai | Pasirinkti tinkamą planavimo atsakymą | /gidai | Originalus trijų gidų indeksas |
| Promedical kontaktai; Klaro užklausa | Pateikti produkto poreikį | /kontaktai | sales@promedical.lt / +370 686 88369 savininko patvirtinti |
| kas yra Promedical | Paaiškinti projekto ir gamintojo santykį | /apie-projekta | Atstovavimas savininko nurodytas, be išskirtinumo ar patirties fikcijos |
| Promedical informacijos rengimas | Patikrinti šaltinių ir taisymo metodiką | /redakcija | Tikra brand Organization; nėra fiktyvaus eksperto |
| Promedical privatumas / užklausos sąlygos | Suprasti kontaktų duomenų tvarkymą ir formos ribas | /privatumas, /naudojimo-salygos | Teisės remiasi EDAV; runtime detalės prieš release tikrinamos root |

Klausimus „medicininio vežimėlio parinkimas“ ir „kaip pasirinkti procedūrinį vežimėlį“ sujungti viename atrankos gide. Nepridėti miestų puslapių ar vienodų sinonimų straipsnių. Produktų variantai atskiri tik tada, kai turi tikrą gamintojo tapatybę ir naudingai skiriasi; paginacijos ir paieškos parametrų nekurti kaip redakcinių URL.

Katalogo ir atrankos gido atskyrimas yra svarbus: katalogas atlieka konkretaus modelio radimo darbą, gidas – kriterijų paruošimo. Tai semantinis ir matomų LT produktų katalogų patvirtintas sprendimas, ne išmatuotas paieškos apimties rezultatas. Kategorijų root pavadinimai lokalizuojami, originalus šaltinio slug išlaikomas.

## Pradinė sistema

11 puslapių juodraščiai materializuoti kanoniniu modeliu, workflowVersion=1. Gidai – 597, 652 ir 642 žodžių (įskaitant antraštes ir sąrašus), su konkrečiais kriterijais, pavyzdžiu ir kitu žingsniu. Tai apimtis, ne kokybės balas.

Klasterio pagrindas /gidai apima visas tris atrankos ir pasiruošimo užklausas. Kiekvienas gidas grįžta į indeksą; katalogo, susijusio gido ir užklausos nuorodos dedamos tik kai padeda sprendimui. Vidinės nuorodos naudoja kanoninius tikrus page ID, ne HTML pseudo-nuorodas. CONTENT-IDS.json yra vietinis actual inventory, ne Git approval žurnalas.

Medija: vežimėlio gidui – tikra gamintojo atitinkamo modelio nuotrauka; ISO gidui – tikras krepšio ir sistemos produktas arba originali aiškinamoji schema; užklausos gidui – aiškinamoji darbo lapo / komplektacijos struktūra. Gamybinės fotosesijos, įstaigos projekto ar sertifikavimo nevaizduoti kaip savo įrodymo. Root importuoja per MEDIA_CORE, peržiūri actual image ir rendered puslapį. Privatumo, sąlygų bei metodikos tekstams dekoratyvinė fotografija nereikalinga.

## Privatus tolesnis planas

Policy: 6 mėnesiai, monthly 1 straipsnis/mėn., 10:00 Europe/Vilnius. Tai kukli redakcinė pasiruošimo riba; nevyksta automatinis generavimas ar periodinis task. Publikuoti tik kai atsiranda naudingas atskiras klausimas, šaltinis ir pilna peržiūra. Visos temos evergreen, seasonalHook tuščias; datos yra planavimo vietos, ne medicininio pirkimo sezono faktai.

| Vietinė planavimo data | Privatus klausimas | Sprendimas / reikalingas šaltinis |
| --- | --- | --- |
| 2026-10-23 | Kaip atskirti bazinį vežimėlį ir pasirenkamus priedus? | Tikri sukonfigūruotų modelių sąrašai; originalus komplektacijos palyginimas |
| 2026-11-20 | Kaip patikrinti turimos Klaro detalės kodą? | Gamintojo atsarginių dalių katalogas ir instrukcija |
| 2026-12-18 | Ką surinkti dėl valymo priemonių suderinamumo? | Konkretūs modelio priežiūros dokumentai; ne bendras dezinfekavimo receptas |
| 2027-01-22 | Kaip perkelti krepšius iš spintos į vežimėlį? | Modelių ir kreipiančiųjų tikras suderinamumas; atsakymą galima integruoti į esamą ISO gidą, jei atskiros vertės nėra |
| 2027-02-19 | Kaip aprašyti nerūdijančio plieno stalo poreikį? | Gamintojo medžiagų, matmenų ir komplektacijos dokumentai |
| 2027-03-19 | Ką patikrinti gavus medicininės įrangos komplektą? | Concrete tiekimo, instrukcijų ir įstaigos priėmimo procesas; ne fiktyvi mūsų garantija |

Nesukurti tuščių būsimų puslapių kaip viešo asortimento. Prieš rašant įvertinti tikrus naudotojų klausimus ir esamų gidų papildymo galimybę. GSC, pardavimai, organinis volume ir AI citavimas šiuo metu nepatikrinti.

## Priėmimo perdavimas

Tekstas ir svarbūs pirminiai šaltiniai perskaityti; medijos/rendered review, privatumo aplinkos faktai, atomic approval, immutable release ir importas dar yra root darbas. Review negalima įrašyti prieš atlikus actual pateikimo patikrą. Viso katalogo approval turi laikytis esamos 200 IDs/batch ir 30 prasmingų links/page ribos arba kanoninio core pagerinimo. Šis planas nekuria savos release/publishing sistemos.
