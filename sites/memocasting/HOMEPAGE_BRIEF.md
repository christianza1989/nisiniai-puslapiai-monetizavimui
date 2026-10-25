# Pagrindinio puslapio atspirties taškas

2026-10-12 savininkas patvirtino ankstesnį landing page [memorycasting.lt](https://memorycasting.lt/). Perskaitytas tekstas ir peržiūrėtas tikras desktop hero. Šaltinis yra dizaino ir migracijos nuoroda, ne dabartinio kainyno ar pardavimo istorijos patvirtinimas. HTML ar medija nekopijuoti į Git; screenshot vietinis ignoruojamas.

Senas puslapis turi rezultato nuotrauką, rinkinių pasirinkimą, proceso žingsnius, klausimus ir kontaktus. Jame rodomos senesnės kainos, 10 000 klientų ir 4,9/5 teiginiai; keli portretai ateina iš randomuser.me, yra akcijos laikmatis. Rekvizitai skiriasi nuo šiame pokalbyje pateiktų MB Memocasting. Visa tai laukia patikrinimo, neperkeliama kaip verslo faktai. Nuotraukų kilmę/teises, rekomendacijas, instrukciją ir kontaktų veikimą tikrinti atskirai. [Šaltinis](https://memorycasting.lt/).

Naujo puslapio darbas: padėti žmogui suprasti, kokį prisiminimą gali sukurti, ar jam tinka procesas ir kurį iš dviejų patvirtintų rinkinių pasirinkti. Darbo struktūra:

1. Liejinio rezultatas ir poros veikla viename aiškiame vaizde. Siūlomas pirmas tekstas: „Sukurkite jūsų ryšį primenantį rankų liejinį.“ Matomas pasirinkimas porai ar šeimai ir kelias į procesą.
2. Du tikri pasiūlymai: porai €32, šeimai €48; baltų dažų pasirinkimas +€3 pagal savininką. Šalies pristatymo kaina parodoma prieš apmokėjimą iš vežėjo adapterio, o ne paslepiama bendrame dovanos pažade.
3. Rezultatas, pakuotės turinys ir dydžio palyginimas iš savininko produktų nuotraukų. Žmonių/rankų skaičių ir tikslų medžiagų kiekį patvirtinti pagal realų bandymą.
4. Procesas su pasiruošimo, formavimo, užpildymo ir džiovinimo etapais. Santykiai/laikas bei atsargumo priemonės tik pagal tiekėjo instrukciją ir realų bandymą; pilnas gidas sename `/pages/instrukcija`.
5. Kam dovana tinka: poros bendra veikla ir šeimos prisiminimas. Atsakyti apie dalyvavimą ir laiką iki dovanojimo, susieti su turinio plane esančiais atskirais klausimais.
6. Trumpa pagalba prieš ir po pirkimo: ką daryti nepavykus, kur kreiptis, kaip veikia grąžinimas. Rodomas tikras veikiantis pagalbos kanalas.
7. Tikros kliento nuotraukos ir patvirtinti atsiliepimai, kai yra jų šaltinis bei naudojimo teisė. Iki tada pasitikėjimą kuria aiški prekė, įmonė, pristatymas ir pagalba.
8. DUK apie pasirinkimą, pasiruošimą, pristatymą ir nepavykusį bandymą. Mažas didmenos kelias partneriui; detalių privačių kainų homepage nėra.

Viešo dizaino kryptis dar nepriimta. Seno puslapio violetinė paletė, šriftai ir akcijos langas nėra automatinė naujo dizaino sutartis. Kai prasidės svetainės etapas ir savininkas pateiks nuotraukas, bendras builder/design-system/impeccable procesas parinks iš jų konkrečią kryptį. Naudoti bendrą media pipeline, host rendererį, SEO/GEO ir publikavimo sutartis; nedubliuoti commerce API ar content core.

Papildomų senų nuorodų sąrašas — [landing-urls.json](landing-urls.json). Šeimos rinkinio LT canonical rekomenduojamas `/products/seimos-rinkinys-1`, kaip dabartinio landing page nuorodoje; patikrinti eksportą, nes `/products/seimos-rinkinys` ten naudojamas kitam rinkiniui. Pastarojo automatiškai nenukreipti į šeimos prekę. [GSC šešių adresų sutartis](MIGRACIJA.md) išlieka.

Puslapio ir abiejų domenų išorinis GET/indexavimo/redirect/robots/hreflang bei realus pirkimo kelias tikrinami po priimto paleidimo. Šis briefas nesukūrė viešo puslapio, nepakeitė senos svetainės ir neįjungė kontaktų formos ar naujienlaiškio.
