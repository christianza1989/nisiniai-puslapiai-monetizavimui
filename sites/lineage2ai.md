# Lineage2AI: prijungimo prie core būklė

2026-10-11 savininkas paprašė patikrinti esamo GitHub projekto prijungimą,
kad vėliau būtų galima perkurti svetainę, parengti turinio planą ir
publikuoti straipsnius pagal datą be cron užduočių.

- Source: [Lineage2ai.com](https://github.com/christianza1989/Lineage2ai.com).
- Canonical host: `lineage2ai.com`; siūlomas stabilus core `siteId`: `lineage2ai`.
- Dabartinė pagrindinė turinio kalba: anglų (`en`); planuojant studijoje
  reikės aiškiai nustatyti atitinkamą locale, o ne paveldėti `lt-LT`.
- Dabartinis viešas el. paštas: `hello@lineage2ai.com`, patikrintas source ir
  viešame `/contact`. Pašto gavimas šiame darbe netikrintas.
- Straipsnių hub: [AI research](https://lineage2ai.com/ai-research), šeši
  vieši angliški straipsniai. Jų URL, ID ir datos inventorizuoti.
- Stadija: **techninis prijungimas įvertintas; registracija, adapterio
  įgyvendinimas, perkūrimas ir naujas turinio planas dar neatlikti**.

[Prijungimo specifikacija](lineage2ai/CORE_INTEGRATION.md) aprašo dabartinį
publikavimą be cron, nustatytas spragas, rekomenduojamą trijų repo sąsają ir
įgyvendinimo bei priėmimo eigą. [Inventorius](lineage2ai/integration-inventory.json)
saugo patikrintus source SHA, šešis straipsnius ir ribotų bandymų rezultatus.

Tai esamas žaidimo produktas su atskira aplikacija. Naujo verslo modelis,
mokėtojas, pajamos, žaidimo funkcijų veikimas ir paklausa šiame techniniame
vertinime nenustatyti. Jo negalima pristatyti kaip naujai priimtos F1
svetainės ar automatiškai pakeisti kitos nišos verslo pasiūlymu.
