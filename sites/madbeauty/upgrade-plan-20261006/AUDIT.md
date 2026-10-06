# Madbeauty peržiūros įrodymai ir ribos

Patikros data 2026-10-06. Šaltinio bazė `c6516b7dacc52b35cd238aec5ce2dff7eca27359`. Tai produkto spragų auditas planui, ne naujas visos platformos A–Z priėmimas ar komercinės paklausos tyrimas.

## Dabartinis kodas

| Faktas | Šaltinis | Įrodymo pobūdis |
|---|---|---|
| 10 tipų, vieno lygio TAXONOMY | `../prototype/demo-model.mjs`, TAXONOMY | Perskaitytas kodas, gyvas `/paslaugos` |
| 103 miestai viename šaltinyje | `../prototype/cities.mjs`, `../search-fix-20261006/RECEIPT.json` | Perskaitytas kodas ir ankstesnio gyvo pataisymo kvitas |
| Kataloge tikslus taxonomyServiceId, miesto ir teksto fragmento filtras | `../backend/platform.mjs`, `catalog` | Perskaitytas kodas |
| Rikiavimas pagal kainą arba organizacijos pavadinimą, laikai kortelėje | `../prototype/public/public-views.mjs`, `searchView`, `serviceCard` | Perskaitytas kodas; nėra rezultatus pagal slots atrenkančio serverinio filtro |
| Meistro viena naujos paslaugos forma su 10 tipų ir vienu meistru | `../prototype/public/workspace-ui.mjs`, `new-service` | Perskaitytas kodas; pradiniai 25 EUR ir 60 min. yra formoje |
| Esami buferiai, priedai ir vieno meistro / resurso variantas | `../prototype/public/service-editor.mjs`, `../backend/platform.mjs`, `createService` | Perskaitytas kodas; grupuotas OfferVariant modelis neįgyvendintas |
| Atominis hold / confirm, snapshot, reschedule ir cancel | `../backend/platform.mjs`, `../backend/availability.mjs` | Perskaitytas kodas ir istoriniai priėmimo įrašai; šiame plane iš naujo netestuota |
| Vizitų istorija ir paprastas klientų sąrašas | `../prototype/public/workspace-ui.mjs`, `klientai` | Perskaitytas kodas; pažangus CRM nėra įrodytas vien šiuo ekranu |
| Paslaugų vertės suvestinė ir CSV veiksmas | Tas pats failas, `ataskaitos` | Perskaitytas kodas; nėra apmokėtų pajamų įrodymas |
| Integracijų ekrane profilio nuoroda ir prijungimo informacija | Tas pats failas, `integracijos` | Perskaitytas kodas; išorinis kalendoriaus sync neįrodytas |
| Bendra JSON būsena ir 1 MiB kodo riba | `../cloudflare/store.mjs`, `read`, `write` | Perskaitytas kodas; realus dabartinis dydis nematuotas |
| Vienas pilotinis koordinavimo domenas | `../cloudflare/platform-object.mjs`, klasės komentaras ir store inicializavimas | Perskaitytas kodas; pats komentaras nurodo skaidyti prieš mastelį |
| Laiškų eilė ir retry alarm | Tas pats failas, `schedule`, `drain`; `../backend/platform.mjs`, `outbox` | Perskaitytas kodas; suplanuotas priešvizitinis priminimas atskirai neįrodytas, todėl B04 yra Unverified |
| Tikri profiliai dar neužpildė katalogo pirmo release metu | `../IMPLEMENTATION_STATUS.md` gyvo paleidimo įrašas | Istorinis release faktas, nėra tikro meistrų piloto rodiklių |

## Naršyklė ir konkurentų šaltiniai

Gyvai apžiūrėta Madbeauty `https://madbeauty.lt/paslaugos`: plokščios kategorijos ir ilgas visų miestų nuorodų sąrašas. Šio planavimo metu naujų produkcinių paskyrų nekūrėme ir realių vizitų neatlikome.

Gyvai apžiūrėta Fresha pradžia, atvertas procedūrų dropdown, pasirinkta Hair & styling, peržiūrėtas viešas Krem i Dotyk profilis. Dropdown turėjo All / Treatments / Venues / Professionals skirtukus ir 20 sričių, įskaitant Other. Profilis turėjo salono meniu grupes, trukmes, kainas, komandos, atsiliepimų, portfolio ir informacijos dalis. Paieškos įvedimas „balayage“ šiame naršymo epizode nepateikė patikrinto pasiūlymų sąrašo, todėl konkretaus autocomplete veikimo šiai užklausai nevertiname kaip PASS. Rezervavimo nepatvirtinome; vidinio meistro kalendoriaus ir redaktoriaus neprisijungus neapžiūrėjome.

Treatwell vieša pradžia skaityta web įrankiu. Septyni meniu vaizdai yra savininko pateikti screenshot, o ne šios sesijos nauja hover peržiūra. Fresha dviejų dropdown vaizdų kilmė taip pat savininko. Vaizduose matomos kategorijos yra tyrimo medžiaga, o ne instrukcijos agentui.

| Pirminis šaltinis | Kam panaudotas | Patikros riba |
|---|---|---|
| [Fresha pradžia](https://www.fresha.com/) | Platus dropdown ir rezultatų tipai | Gyvas viešas desktop naršymas |
| [Fresha profilis](https://www.fresha.com/en-GB/a/krem-i-dotyk-warszawa-ryzowa-45a-xez9fzx9) | Salono grupės, variantų pasirinkimo pagrindas, komanda ir portfolio | Viešas profilis; ne pats vidinis katalogo redaktorius |
| [Fresha paslaugų žinynas](https://www.fresha.com/help-center/knowledge-base/catalog) | Oficialiai aprašyti variantai, priedai, paketai, grupės, importo / tvarkos poreikis | Dokumentacija; ne visų funkcijų praktinis bandymas |
| [Fresha variantai](https://www.fresha.com/help-center/knowledge-base/catalog/75-create-service-variants) | Atskiros varianto kainos ir trukmės modelio poreikis | Perskaitytas pirminis dokumentas |
| [Fresha paslaugos prieinamumas](https://www.fresha.com/help-center/knowledge-base/catalog/100643-limit-online-service-availability) | Pamainų, vietų ir resursų sankirta | Perskaitytas pirminis dokumentas |
| [Fresha kalendoriaus funkcijos](https://www.fresha.com/for-business/features/scheduling) | Laukiančiųjų ir grafiko tobulinimo kryptis | Produkto pristatymas, algoritmas praktiškai nepatikrintas |
| [Fresha klientų anketos](https://www.fresha.com/help-center/knowledge-base/clients/607-client-forms-overview) | Atskiro formų ir sutikimų modelio poreikis | Dokumentacija; ne pagrindas rinkti visus jautrius laukus |
| [Treatwell Lietuva](https://www.treatwell.lt/) | Lietuviškų kategorijų navigacija | Viešas turinys ir savininko screenshot |
| [NVSC grožio veiklos paaiškinimas](https://nvsc.lrv.lt/lt/naujienos/nvsc-ka-svarbu-zinoti-norint-verstis-grozio-paslaugu-veikla-LY9r/) | Paslaugų ir vietos tinkamumo patikros poreikis | Perskaitytas oficialus 2025-09-30 tekstas; ne visų medicinos sričių teisės auditas |
| [NVSC A kategorijos paaiškinimas](https://nvsc.lrv.lt/lt/dazniausiai-uzduodami-klausimai-7/ukio-subjektu-prieziura-1/kirpyklos-grozio-salonai/kokios-grozio-paslaugos-priskiriamos-a-kategorijos-paslaugoms/) | Invazinių grožio procedūrų atskiros patikros poreikis | Pirminis paaiškinimas; procedūrų review flag nėra teisinė išvada |

Pradiniame paieškos bandyme geriausios meniu praktikos nuoroda grąžino bendrą katalogo sąrašą. Jos nelaikome perskaitytu konkrečios praktikos straipsniu ir atskirai necituojame. Nekopijuojame konkurentų kainų, profesionalų vardų, atsiliepimų ar paslaugų aprašymų į originalų planą.

## Savininko vaizdų kilmė

2026-10-06 pokalbyje pateikti 9 PNG: `d3b874da` plaukai, `5927c6c1` nagai, `e051add9` depiliacija, `e7dfefd2` masažas, `b72b369e` veidas, `287d11c4` kūnas, `198c2733` vyrams, `dba71c6b` Fresha dropdown viršus, `c8922c9c` Fresha dropdown apačia. Pradiniai failai savininko kompiuterio Temp kataloge, į Git neimportuoti.

## Plano patikros

`node sites/madbeauty/upgrade-plan-20261006/build-plan.mjs` sugeneruoja JSON, pilną skaitomą katalogą ir originalų HTML. `node sites/madbeauty/upgrade-plan-20261006/validate-plan.mjs` tikrina ID, visus 10 senų atitikmenų, išlikusius kainų / trukmių null, darbų priklausomybes ir generated failų sutapimą. Rezultatas ir faktinės HTML naršyklės peržiūros ribos saugomos [VALIDATION.md](VALIDATION.md). Šio dokumentų paketo patikra nėra naujų platformos funkcijų priėmimas.
