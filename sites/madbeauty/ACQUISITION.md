# Madbeauty: SEO ir Facebook klientų pritraukimo planas

2026-10-10 papildymas: savininkas pasirinko Madbeauty kaip būsimos bendros aktyvios paieškos sistemos pirmą teikėjų prisijungimo pilotą. Nauja darbo seka ir priėmimo vartai: [ACQUISITION_PILOT_PLAN](ACQUISITION_PILOT_PLAN.md), [TOOLS](TOOLS.md), [core roadmap](../../agent-business-core/acquisition-plan/ROADMAP.md). Toliau esantis ankstesnis SEO/FB planas išsaugotas; ši nuoroda neįjungia gyvo kontaktavimo.

2026-10-05. Privatus planas pagal BUSINESS, ACQUISITION_CORE ir niche-client-acquisition. Statusas research/draft_only. Nemokami piloto profiliai ir naudojimas; jokios garantijos dėl naujų klientų ar laisvo vizito. Savininko ankstesnis grupių veiksmų pavedimas išlieka, bet šis tyrimas neįjungia gyvo transporto ir neatlieka kontaktavimo. Visus veiksmus turi riboti aktuali pasiūla, grupės taisyklės ir priimtas platformos adapteris.

## Dvi auditorijos, dvi konversijos

| Auditorija | Signalas | Vertė / CTA | Tikras rezultatas |
|---|---|---|---|
| Meistras / mažas salonas | Priima naujus klientus, nori profilio / papildomo kanalo | Nemokamas pilnas profilis su tikra galerija ir turima booking nuoroda | Sutinka, patvirtina faktus / teises, profilis aktyvus |
| Grožio paslaugos pirkėjas | Konkreti paslauga, Vilnius / rajonas, laiko ar kainos poreikis | Tinkamas gyvas profilis / paslaugos variantas arba skaidri vizito užklausa | Realus poreikis gautas, teikėjas patvirtina, vizitas įvyksta |

Profesinės grupės yra pasiūlos paieška, ne mūsų paslaugos pirkėjų sąrašas. Bendras „ieškau darbo grožio srityje“, mokymų reklama ar meistro parduodamos priemonės nėra nagų procedūros pirkimas. Grįžtantis klientas ir naujas konkrečiam meistrui klientas žymimi atskirai nuo naujo Madbeauty lankytojo.

## Kanalai ir eiga

1. Vilniaus nagų meistrų profesinių bendruomenių / miesto grupių inventorius: įrašo originalus URL, matoma data, kalba, taisyklės, leidžiamas formatas, aktualumas. Konkrečių FB grupių šiame tyrime neapžiūrėjome; nerašyti išgalvotų grupių pavadinimų, jų narių skaičių ar „radome X klientų“.
2. Pirmasis pasiūlos tikslas — 20 sutikusių teikėjų vienoje vietovėje, ne tūkstančiai scraped profilių. Profilis turi tikras paslaugas, vietą, teikėjo patvirtintas kainos sąlygas, nuotraukų teises ir priėmimo statusą. Išorinio booking URL teisės / adresas tikrinami.
3. Klientų pritraukimą pradėti tada, kai yra tikras pasirinkimas; kol jo nėra, skelbti tik sąžiningą piloto kvietimą / poreikio testą. Į konkrečią „ieškau manikiūro penktadienį...“ užklausą pateikti tinkamą variantą, ne bendrą reklamą ar pažadėtą laisvą laiką.
4. Kiekvienas teikėjas gali dalytis savo profilio nuoroda savo auditorijai. Tai natūralus starto kanalas, kurio nereikia painioti su naujais Madbeauty atvestais klientais. Šaltinis provider_owned atskirai nuo FB / organic.
5. SEO: tikras paslaugos+miesto puslapis, unikalūs profiliai ir 3 pasirinkimo gidai. Jokio automatinio visų miestų / rajonų programmatic katalogo be realios pasiūlos.

Pirmas grupių bandymas: 3–5 patikrintos tinkamos bendruomenės, iki 10 privačiai kvalifikuotų signalų per darbo dieną ir ne daugiau vieno aktualaus bendro kvietimo vienai grupei per bandymo savaitę, tik jei jos taisyklės tai leidžia. Šie skaičiai mūsų siūlomas eksperimento darbo limitas, ne Meta saugus rate limit. Konkrečių atsakymų skaičių ir kartojimą riboja grupės taisyklės, postų kontekstas ir būsimas channel policy, ne poreikis išnaudoti kvotą. Jokių paid ads ar prenumeratų pagal šį planą.

## Agentų vaidmenys ir esamo modulio ribos

Vienas bendras FB paskyros koordinatorius; madbeauty turi atskirą kontekstą / politiką, ne atskiras naršykles su bendrais slaptažodžiais. Rekomenduojami darbo vaidmenys, ne jau sukurti agentai:

- Signalų atranka: permitted šaltinis, data/vieta, pirkėjas ar teikėjas, konkretus poreikis. Jei šaltinio pernaudojimas ribotas, tik anoniminė kanalo išvada; ne narių duomenų bazė.
- Madbeauty atsakymo rengimas: skaito tik patvirtintas šios nišos / teikėjo žinias. Nesiūlo neegzistuojančių profilių, kainų ar appointment slotų.
- Faktų / kanalo patikra: tikrina realų CTA, dabartinį turinį, grupės formatą, disclosure ir nepasikartojimą. Antras to paties modelio bandymas nėra nepriklausomos kalibracijos įrodymas.
- Koordinatorius: serializuoja vienos paskyros veiksmus, prieš write patikrina tikslą / policy ir išsaugo realų publication receipt; uncertain submit nekartojamas aklai. Galioja pause/disable ir per-site opt-out.
- Rezultatų analitika: signalas → actual atsakymas → svetainės užklausa → teikėjo patvirtinimas → įvykęs vizitas. Case sukuriamas tik realiam inbound, ne perskaitytam postui.

[FACEBOOK_MODULE](../../agent-business-core/FACEBOOK_MODULE.md) jau aprašo vietinę politiką, privačius juodraščius ir GUI. Jis pats nurodo: live collector / Page webhook / sender neprijungti, send endpoint atmeta. Naujas madbeauty enabled=false iki faktinių priėmimo vartų. Tai statusas, ne savininko prašymas neautomatizuoti ateityje.

[Meta paaiškinimas](https://about.fb.com/news/2021/04/how-we-combat-scraping/) reikalauja leidimo automatizuotam rinkimui. Groups API pašalinimą liudija [Zapier integracijos panaikinimas](https://help.zapier.com/hc/en-us/articles/23970212345357-App-update-Facebook-Groups-app-removal); Meta v19 originalą šiame tyrime perskaityti nepavyko. Asmeninio profilio grupės, oficiali Page komunikacija ir Messenger yra skirtingi kanalai. Nepasirenkame apėjimo, stealth browser ar rate limit slėpimo kaip sprendimo. Kol nėra patvirtinto gyvo adapterio, agentas rengia privačius juodraščius, o platformos paleidimas nuo jo nepriklauso.

## Juodraščių pavyzdžiai

Meistrui, prieš viešą katalogą: „Kuriame Madbeauty.lt grožio meistrų paieškos pilotą Vilniuje. Dalyvavimas ir profilis nemokami, be platformos komisinių. Galima palikti savo dabartinę registracijos nuorodą. Jei priimate naujus klientus ir norite dalyvauti, galima pateikti profilio paraišką.“ Paraškos URL įdedamas tik jam realiai veikiant. Nekopijuoti šio kvietimo į visas grupes.

Pirkėjui po tikro profilio priėmimo: „Esu susijęs su Madbeauty.lt. Pagal jūsų nurodytą paslaugą ir vietą mūsų pilote yra šis meistro profilis [tikras URL]. Kainos variante nurodyta, ar įeina senos dangos nuėmimas. Dėl penktadienio laiko dar reikia meistro patvirtinimo.“ Naudoti tik jei konkretus profilis iš tikrųjų tinkamas. „Esu klientas, rekomenduoju“ netinka, jei tai mūsų reklaminis atsakymas.

Kai tinkamo meistro dar nėra: skaidriai pasakyti, kad siūlome piloto poreikio užklausą ir negalime patvirtinti vizito. Nesiųsti jau pilnai patenkintam ar pasenusiam postui; teikėjo atsisakymas ir grupės moderatorius stabdo tolesnį kontaktavimą.

## Matavimas ir testas

UTM / first-party source tracking be žmonių vardų URL. Tiekėjo profilio link paspaudimas nėra vizitas; išorinis booking patvirtinamas tik gavus teisėtą callback arba teikėjo/kliento faktinį atsakymą. Nesugalvoti trackingo, kurio adapteris neturi. Sintetinius QA kontaktus laikyti atskirai nuo demand.

4–6 savaičių pasiūlos langas: actual kontaktavimo darbų kiekis / atsakymai / sutikimai / aktualūs profiliai / laikas vienam patvirtintam profiliui. 90 dienų paklausos langas nuo live: kvalifikuotos klientų užklausos / atsakymų laikas / priimti vizitai / įvykę vizitai / paslaugos neatitikimai / pakartotinis naudojimas / support laikas. Naujai pradėtas organic gali turėti nepakankamą imtį; nulis neinterpretuojamas atsietai nuo faktinio pasiekiamumo.

Siūlomi BUSINESS slenksčiai 20 profilių / 30 qualified poreikių / 10 confirmed įvykusių vizitų yra eksperimento taisyklės, ne pažadėtas rezultatas. FREE meistro registracija neįrodo būsimo premium mokėjimo. Tyrime realių outreach veiksmų, grupių narystės pakeitimų, gautų klientų ir paid rezultatų nėra.
