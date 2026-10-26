# „Memory Casting“ atsiliepimų valdymas

Prisijungimas: https://login.memocasting.lt/admin → **Atsiliepimai**. Naudok esamą administratoriaus prisijungimą; ši funkcija nekeičia jo prieigos teisių.

- Naują atsiliepimą peržiūrėk ir paskelbk. Galima paslėpti, perkelti į pašalintų sąrašą arba atkurti. Visus įvertinimus vertink pagal tą pačią turinio politiką.
- Nuotrauką galima pašalinti arba atkurti atskirai nuo teksto. Pašalinus ji neberodoma viešai net atidarius ankstesnę jos nuorodą. Tai grįžtamas pašalinimas; prašymas fiziškai ištrinti asmens duomenis nagrinėjamas atskirai.
- Tame pačiame lange keisk kvietimo laukimo laiką: numatyta **30 dienų**, galima nuo 1 iki 180. Laikas skaičiuojamas nuo užsakymo lange patvirtinto siuntos perdavimo vežėjui, o ne nuo lipduko sukūrimo.
- Vieną kvietimą siunčiame tik tiems naujiems pirkėjams, kurie atskirai sutiko jį gauti. Seni užsakymai automatiškai neprenumeruojami. Sistemos serverio užduotis veikia ir išjungus tavo kompiuterį.

Pirkėjo forma: https://memocasting.lt/atsiliepimas . Įvedus užsakymo numerį ir perkant naudotą el. paštą, saugi nuoroda siunčiama užsakyme esančiu adresu. Vien numerio neužtenka. Per nuorodą atidarytoje formoje užsakymas užpildomas automatiškai. Pirkėjas gali pridėti iki penkių nuotraukų; jos paverčiamos WebP ir lieka privačios iki atsiliepimo patvirtinimo.

Siuntėjas – **info@memorycasting.lt** per jau prijungtą parduotuvės pašto jungtį. Įjungtas numeravimas po senojo Shopify numerio 9877: pirmasis naujas užsakymas gauna **9878**. Ankstesni šios sistemos užsakymai nepernumeruoti.

CSV importas palaiko UTF-8, kablelius ir kabutėse esančias kelių eilučių reikšmes; iki 100 eilučių vienu importu. Stulpelius galima susieti administracijoje. Standartiniai pavadinimai:

`product_sku,rating,author_name,review_date,review_text,review_title,review_id,image_urls`

`product_sku` – `couple` arba `family`; `rating` – 1–5; data – `YYYY-MM-DD`. Paskutiniai trys stulpeliai neprivalomi. Keli nuotraukų adresai atskiriami `|`; vien adresas nuotraukos automatiškai neįkelia. Originali data ir tekstas išsaugomi, dublikatai sutikrinami. CSV žyma apie patvirtintą pirkimą pati savaime pirkimo neįrodo.

Importuojant atskirai patvirtinama teisė skelbti ir, kai tai tiesa, kad atsiliepimai surinkti ankstesnėje to paties domeno parduotuvėje. Kitoje prekyvietėje surinktų įvertinimų nepridėk prie „Google“ schemos suvestinės. To paties domeno migracija gali būti įtraukta į atitinkamos prekės suvestinę, tačiau negauna naujos patvirtinto pirkimo žymos be užsakymo įrodymo. „Google“ pats sprendžia dėl žvaigždučių rodymo paieškoje.

Šio importo apimtis: 214 atsiliepimų (166 poros ir 48 šeimos), 104 turėtos nuotraukos. 22 įrašai apie nebeparduodamus pilvo atliejų rinkinius neįtraukti, dvi tuščios eilutės praleistos. 89 nuotraukų nuorodos neturėjo pateikto failo; jų neatkūrėme ir nekeitėme sugeneruotais vaizdais. Originalūs savininko failai nepakeisti. Faktinis viešinimo patvirtinimas ir techninės versijos fiksuojami REVIEWS_2026_10_26.md.
