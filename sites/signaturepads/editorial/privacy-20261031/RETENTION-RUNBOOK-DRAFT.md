# 6 mėnesių taisyklės įgyvendinimo projektas

Tik privatus pasirengimas naujai Signaturepads versijai. Ši procedūra dar
nepriimta kaip veikiantis procesas. Nieko neištrinta ir jokio automatinio
valymo neįdiegta. Tai nėra pavedimas dabar valyti pašto dėžutes ar D1.

## Apimtis

Roko pasirinkimas: užsakymu nevirtusi užklausa ir jos siuntėjo / gavėjo
el. pašto kopijos saugomos 6 kalendorinius mėnesius nuo paskutinio
bendravimo. Tai nėra 180 dienų terminas nuo formos pateikimo.
Termino atskaitą keičia ir vėlesnis susirašinėjimas, o ne tik nauja forma.
Sutartys, apskaita, ginčai, platformos žurnalai ir atsarginės kopijos nėra
automatiškai priskiriami šiai taisyklei; jų kriterijai dar tikrintini.

## Prieš šios taisyklės paskelbimą

1. Paskirti vidinį atsakingą asmenį. Viešas kontaktas lieka
   sales@signaturepads.lt; šio failo sukūrimas žmogaus nepaskiria.
2. Pasirinkti ir priimti apskaitos būdą: kontroliuojamas privatus registras
   arba atskirai autorizuotas techninis sprendimas. Dabartinėje D1 lentelėje
   yra pateikimo laikas, tačiau nėra paskutinio bendravimo ar virtimo
   užsakymu lauko. Vien `created_at` atrankai nepakanka.
3. Registre susieti užklausos ID, svetainę, paskutinio bendravimo datą,
   užsakymo / sutarties būseną, patvirtintą saugojimo išimtį, jei ji yra,
   termino datą ir konkrečių pašto kopijų identifikatorius. Nedubliuoti
   laiškų turinio, telefono ar el. pašto sąrašų be poreikio; prieigą riboti.
4. Nustatyti kalendorinių mėnesių ir mėnesio paskutinės dienos skaičiavimą
   bei laiko juostą. Su sintetiniais pavyzdžiais patikrinti mėnesio 29–31
   dienas, keliamuosius metus ir vėlesnį susirašinėjimą. Reguliari patikra
   turi leisti įvykdyti pasirinktą terminą, o ne pridėti dar vieną mėnesį.
5. Patikrinti tikrų paslaugų paskyrų žurnalų, šiukšlinės, atsarginių kopijų
   ir atkūrimo taisykles. Nenustatytų terminų nerašyti kaip pažadų. Duomenų
   atkūrimas negali nepastebimai sugrąžinti jau ištrintų užklausų.

## Būsimas vienos užklausos tvarkymas

- Pagal registrą ir paskutinį susirašinėjimą patikrinti, kad tikrai
  pasibaigė 6 mėnesiai ir užklausa nevirto užsakymu. Jei aplinkybės neaiškios,
  sprendimą atlieka paskirtas asmuo; vien duomenų bazės būsena `notified`
  neparodo nei paskutinio bendravimo, nei sutarties buvimo.
- D1 veiksmas turi būti apribotas tik konkrečiu užklausos ID ir
  `site_id=signaturepads`. Bendras amžiaus filtras be svetainės ir išimčių
  patikros netinka. Šiame projekte nei DELETE komanda, nei valymo užduotis
  nepaleidžiama.
- Atskirai sutvarkyti konkrečias siuntėjo kontaktuforma@kontaktuforma.lt
  Sent / kitų aplankų kopijas ir sales@signaturepads.lt gavėjo kopijas.
  Vien D1 pakeitimas jų nepašalina. Bendroje siuntėjo dėžutėje neliesti
  o3tech ar kitų svetainių laiškų. Atranką grįsti Signaturepads svetainės
  žyma ir visu užklausos ID; vien el. pašto adresas arba 8 ženklų temos
  santrumpa nepakankama kitų laiškų neliečiamumui užtikrinti.
- Patikrinti platformų faktinio ištrynimo, šiukšlinės bei kopijų taisykles
  ir užfiksuoti minimalų vykdymo kvitą. Nežadėti momentinio ištrynimo iš
  visų tiekėjų atsarginių kopijų, jei jų elgesys dar nepatikrintas.
- Duomenų subjekto prašymą vertinti atskirai nuo reguliaraus termino:
  6 mėnesiai nėra bendras pagrindas atsisakyti anksčiau nagrinėti prašymą.

## Priėmimo įrodymai, kurių dar nėra

- Atsakingo asmens ir pasirinkto proceso priėmimas.
- Paskutinio bendravimo bei užsakymo / teisinių išimčių apskaitos bandymas.
- Sintetinis visos grandinės D1 + siuntėjo + gavėjo kopijų bandymas,
  įrodantis, kad nepaveikiamos kitos svetainės ar aktyvi užklausa.
- Tikros žurnalų, pašto ir atsarginių kopijų taisyklės bei atkūrimo scenarijus.
- Teisinio tikrintojo ir tikslios privatumo revizijos patvirtinimas.

Šio failo būsena: PROJEKTAS. Automatinis valymas, pašto šalinimas,
publikavimas, DNS ir gyvas WordPress šia užduotimi nekeičiami.
