# Administravimo ekranas

Scope: tik commerce-core/public/admin.* ir backoffice-ui.mjs ir vietinis serveris. Režimas Operate. Naudotojas prižiūri užsakymų vykdymą, likučius ir dokumentus. Vieša Memocasting svetainė nepatenka į šį darbą.

Produkto faktai: [PRODUCT](../PRODUCT.md), [modulio planas](MODULIO_PLANAS.md). Kainos ir klientai šioje vietinėje aplinkoje testiniai. Ekranas gauna duomenis tik iš persistent API; jame nėra įrašų atsarginio fallback.

Septynios svarstytos sistemos: dienos darbų lenta; apskaitos registro puslapis; katalogo priežiūros lentelė; sandėlio priėmimo žurnalas; užsakymo byla; išsiuntimo registras; patikros darbo lapas. Seed21664d59 paskyrė šeštą — išsiuntimo registrą. Code-led įgyvendinimas; pasirinkimą atliko agentas pagal projekto deleguotą dizaino teisę, ne savininko koncepcijos patvirtinimas.

## Direction contract

WORLD: šviesus darbo registras, ramus smėlio atspalvio navigacijos paviršius, balta duomenų sritis, tamsus rašalas ir žalias aktyvus veiksmas. Vienas sistemos sans šriftas, aiškūs 16px duomenys. Dieną naudojamas sandėlio/biuro ekranas — dizaino prielaida, kurią galima koreguoti po realaus naudojimo.

FIRST VIEWPORT: prisijungus iškart matomas užsakymų sąrašas, būsenos, suma ir vienas pasirinkto užsakymo kelias. Kompaktinis skaitiklių sakinys pateikia darbo apimtį; stambių dekoratyvių rodiklių nėra.

VISITOR PATH: prisijungti → pasirinkti užsakymą → peržiūrėti kontaktus bei prekes → patvirtinti komplektavimą → suformuoti testinį dokumentą. Likučio korekcija atskirame navigacijos skyriuje.

SIGNATURE INTERACTION: pasirinktas sąrašo įrašas atveria užsakymo bylą toje pačioje duomenų srityje. Po veiksmo matoma serverio patvirtinta būsena. Pirkėjo kontaktai neišsiunčiami į neautorizuotą ekraną.

CROSS-SURFACE REACH: tas pats registro ritmas likučiams ir dokumentams, matomas navigacijos pasirinkimas; telefone lentelės įrašai tampa vertikaliomis eilutėmis.

HONEST RISK: pažįstama administravimo struktūra turi mažiau prekės ženklo išraiškos. Šio ekrano tikslas — aiškus kasdienis darbas; Memocasting identitetas kuriamas viešai svetainei atskirai.

Seed challengers: sodo žemėlapio sistema atmesta dėl silpnesnio operatoriaus atpažinimo ir sunkesnės būsenų paieškos; iš jos perimta aiški vietos/aktyvaus kelio skirtis, ne spalvotos formos. Programinės įrangos žinyno sistema konkurencinga pagal aiškumą, bet registro eiga artimesnė užsakymų darbui; jos pastovios navigacijos disciplina taikoma visiems skyriams. Šrifto pavyzdžių sistema atmesta abiem ašimis; jos skaičių tikslumo disciplina taikoma sumoms. Kiti seed alternatyvų vardai ir raw seed lieka vietinėse darbo priemonėse; tai ne konkurentų auditas ar nepriklausoma peržiūra.

Neišspręsta: realaus core identity binding, faktiniai vežėjo tarifai, sandbox/live aktyvacija, tikrų dokumentų taisyklės. UI negali jų parodyti kaip veikiančių.

0.3 toje pačioje sistemoje prideda Medžiagos (komponentas/partija/sudėtis/surinkimas), Sutikrinimas (finansinis source ir match), Didmena (kainyno versijos ir nepatvirtinto partnerio kūrimas, prekybos patvirtinimas/stabdymas, quote/accept/reorder) paviršius. Pasiūlymo prekės ir pristatymas parenkami iš partnerio kainyno bei serverio rinkos. Duomenys nėra naršyklės seed fallback. Esamo partnerio adreso ar kainyno priskyrimo redagavimas ir portalas dar neįgyvendinti.
