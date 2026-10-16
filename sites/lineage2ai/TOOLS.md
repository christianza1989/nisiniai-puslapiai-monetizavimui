# Lineage2ai.com įrankių apimtis

SiteId `lineage2ai`; 2026-10-14; core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`, own PR135. Ši sesija užsakė techninį Facebook publikavimo bandymą ir Page API. Patvirtinto BUSINESS failo / mokamo kliento rezultato / vykdymo ekonomikos šiame checkout nerasta; jų neišgalvojame. Tai nėra naujo verslo, reklamos kampanijos ar klientų rinkimo paleidimas.

| Sritis | Dabar | Vėliau / nežinoma |
|---|---|---|
| Page tekstas / viena nuotrauka | Oficialus Graph adapteris, izoliuota patikra | Tikras Page tokenas ir viešas rezultatas |
| Page komentaras / atsakymas | Tik valdomo Page įrašai, exact parent | Grupių komentarai per API nepalaikomi |
| Profilio įrašas / komentaras | Codex Computer Use tiltas | Gyvo bandymo priėmimas |
| Grupių paieška | Iki 3 minimalių metadata rezultatų per Computer Use | Kolektorius / masinis rinkimas neįjungtas |
| Medija | Privatus AI vaizdas, bendras immutable importas | Neperduoti kaip tikros Lineage II ekrano nuotraukos |
| Pajamos / paklausa / tiekėjai | Neapibrėžta šioje techninėje užduotyje | Reikia atskiro BUSINESS sprendimo |

## Kandidatai ir pasirinkimas

2026-10-14 atliktas Treg `catalog_search`, tada trijų endpointų `catalog_get` ir komandos `my_tools`. Facebook ryšio komandos įrankiuose nėra. Tik katalogo buvimas nesuteikia Page prieigos.

| Tikslus ID | Įvestis → išvestis | Kaina / apimtis | Būsena |
|---|---|---|---|
| `facebook.facebook.page.post.create` | Page ID, message → post ID | 0 USD / call pagal katalogą; Meta app/Page limitai; reikia savo Page ryšio | Kandidatas, neprijungtas |
| `facebook.facebook.page.photo.create` | Page ID, image source/url, caption → photo/post ID | 0 USD / call; Meta limitai; savo ryšys; multipart privatiems baitams | Kandidatas, neprijungtas |
| `facebook.x.comment-reply` | Comment ID, message → reply ID | 0 USD / call; nėra pilnos input schemos ar išmatuoto patikimumo kataloge | Kandidatas, nepakanka priėmimui |
| Esamas core `facebook/page_api_*` | Credential key, nekintamas tekstas/medija/parent → durable provider kvitas | Meta neapmokestinimas nėra neriboto rate ar nemokamo runtime pažadas; modelio/hostingo sąnaudos atskiros | Pasirinktas, izoliuotai patikrintas |

Pasirinktas tiesioginis oficialus Graph adapteris leidžia išlaikyti bendrą nišos eilę, RLS, paskyros epoch, pause ir check-only. Naujos prenumeratos nereikia. Treg mokamų calls neatlikta. Tikro Meta response kokybė, Page prieiga ir hosted veikimas dar nežinomi; vendor patikimumo rodiklių be duomenų neteigiame.

Kalba: įrašų tekstas pagal savininko pavedimą, pirmas testas lietuviškai. API nepriklauso nuo rinkos, tačiau neįrodo leidimo rinkti grupės / žmogaus duomenis. Saugoti tik užduoties tekstą, minimalų Page/parent ID, peržiūros bei siuntimo kvitą; paslaptys privačiame runtime faile, žmonių feed / cookies nekopijuojami. Duomenų retention valdo bendras runtime; kolektorius nepridėtas.

Alternatyva — esamas Computer Use tiltas su ta pačia paskyros koordinacija. Fallback nėra automatinis: neaiškus API siuntimas blokuoja ir desktop. Stop sąlygos: nepatvirtinta Page tapatybė / teisės, pasikeitęs tokenas / turinys / medija, kvotos riba, host/platformos atmetimas, neaiškus write rezultatas. Bendro limito pradinis gyvas pavedimas lieka 5 rankinės užduotys ir pause; šio inkremento testai jo neaktyvavo.

Priėmimas: realus minimalios Page prieigos suteikimas, verify → vienas savininko autorizuotas įrašas → provider ID → autoriaus/teksto GET → matomas Page rezultatas → pause. 24/7 plėtra tik po tikros prieigos ir gyvo priėmimo, su konkrečiu operatoriumi / procesu / biudžetu. Dabartinė ataskaita: [API patikra](../../docs/FACEBOOK_PAGE_API_CHECK_2026-10-14.md), vykdymo sutartis: [Page API](../../agent-business-core/FACEBOOK_PAGE_API.md).
