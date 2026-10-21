# LT prekių valdymas ir pasirinkimai

Savininko pavedimas 2026-10-21: užbaigti patogų Lietuvos prekių administravimą. Pavadinimas, trumpas / išsamus aprašymas, komplektacija, nuotraukos su alt tekstu, pasirinkimų grupės ir kainų priedai redaguojami prisijungus. Balta bazinė; kitos spalvos pavyzdys +3 EUR, medinis padėklas +12 EUR. Savininkas patvirtino padėklo svorį 300 g; jo matmenys ir naujos supakuotos kombinacijos matmenys dar nepateikti. Faktinių kainų / atsargų ar pakuočių neišgalvoti.

## Apimtis

- Esamas katalogo ekranas tampa prekės redaktoriumi, išlaikant Operate / Segoe UI / žalią esamos administravimo sistemos tapatybę. Shopify yra patogumo analogas, ne įpareigojimas pakeisti technologiją ar kopijuoti prekės ženklą.
- Patvarus juodraštis, peržiūra ir aiškus paskelbimas; senų užsakymų kainos / pasirinkimai nekinta. Paprastas tekstas ir skyrių laukai, jokio nepatikimo HTML vykdymo.
- Nuotraukų failų įkėlimas, rūšiavimas, alt ir susiejimas su konkrečia pasirinkimų kombinacija. Draft vaizdai iki publikavimo nevieši. Fallback tikri esami produkto vaizdai; neegzistuojantis auksinis / padėklo vaizdas nepakeičiamas tariama tikra nuotrauka.
- Vienos prekės pasirinkimas atskiria pvz. baltą poros rinkinį nuo auksinio krepšelyje. Kaina ir pasirinkimai tikrinami serveryje, pirkėjas negali atsiųsti savo priemokos. Bendras kibirų likutis rezervuojamas pagal bazinį SKU; skirtingi variantai jo nepadaugina.
- Produkto nuotrauka / kaina keičiasi iš karto pasirinkus variantą. Deriniui galima priskirti tikrą bendrą nuotrauką arba atskiras skulptūros ir padėklo iliustracijas; nepristatyti atskirų vaizdų kaip vieno fiziškai patikrinto montažo.
- Viešas produktų turinys ir SEO gauna paskelbtą katalogo reviziją, straipsnių 92 publikavimo datos / turinio leidiniai nepakeičiami. Nuotraukos neįtraukiamos į viešą projekciją iki publikavimo.
- Atsiskaitymas išlaiko kompaktišką vieno puslapio formą ir mokėjimą dešinėje. Pasirinkimų snapshot pasiekia kainos pasiūlymą, mokėjimą, savininko užsakymo vaizdą ir dokumentus.

## Darbų seka ir priėmimas

1. Backend: normalizavimas, pasirinkimų kainodara / svoris, agreguotas atsargų rezervavimas, katalogo tekstų / medijos patikra ir juodraščiai. Ankstyvas mixed-options → quote → order → atsargų bandymas.
2. Admin: prekės sąrašas → redaktorius → įkėlimas → variantai / vaizdas → juodraštis / peržiūra → paskelbimas. Leidimai, kito store izoliacija, XSS / netinkami failai, CAS / pakartojimas ir restart.
3. PUBLIC: tikslus canonical SDK importas, serverinis produkto turinys ir interaktyvi galerija / pasirinkimai / krepšelis. Bazinės kitų šalių funkcijos išsaugomos, nauji pasirinkimai pradžioje LT.
4. Patikra: prasmingi Node / worker / renderer testai; actual desktop / mobile / klaviatūra, tuščios / klaidos / loading / pasenusio redaktoriaus būsenos. Vienas bendras vaizdo patikros ratas, pataisų partija ir tikslinė pakartotinė patikra. Jokių realių charge ar mokamų siuntų.
5. Deployment tik su išsaugotais actual bindings, esamais užsakymais / atsargomis / publikavimo datomis ir rollback; sintetinės DB į produkciją nekelti. Naujo priedo pardavimas tik turint realią pakuotę ir savininko duomenis; neapeiti pristatymo validacijos.

## Būsena

Pradėta, ne užbaigta. Pradinė CORE 131e95e768098402626d10741913006ce77fd07a, PUBLIC 44d24ef6462aea98de04ee88881f84ed37ffdd19. Esamas katalogas turi kainas / pakuotes / addonFor, tačiau aprašymų / medijos / pasirinkimų nėra; dabartinis cart normalizavimas sujungia viską pagal SKU. Tai atkuriama bendra trūkstama funkcija. Shopo pokalbis informuotas koordinacine žinute, naujų provider operacijų neprašyta. Istoriniai produkto konteksto teiginiai apie dar nepaleistą LT prekybą nėra šiandienos operacinė tiesa.

Savininko patikslinimas: padėklas 20 × 20 × 5 cm, prideda tik 5 cm prie rinkinio dėžės aukščio. Poros derinys 2500 g / 200 × 200 × 220 mm; šeimos 4800 g / 250 × 250 × 250 mm. Priemoka 1200 ct, baziniai balti dažai 0 ct; kitų spalvų pavyzdys 300 ct.
