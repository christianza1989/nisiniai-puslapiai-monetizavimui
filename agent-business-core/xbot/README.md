# Xbot — Pinet X kanalo modulis

Vietinis vieno koordinatoriaus modulis: atskiri verslų faktai, dienos planas, Codex CLI juodraščiai ir peržiūra, patvari eilė, vaizdų biblioteka, Treg kvitai ir sąnaudų ribos. Nauji profiliai išjungti, biudžetai nuliniai. Jokia paskyra ar PhoneBridger kampanija nepriskiriama automatiškai.

2026-10-11 vietinis įgyvendinimas patikrintas. Tikras sintetinis bandymas praėjo visą kelią: eilė → Codex CLI → atskira peržiūra → išsaugotas juodraštis. Bendram projektui ir konkrečiai nišai kalibruosime vėliau; gyvas siuntimas neįjungtas.

- [Paleidimas](RUNBOOK.md)
- [Aktuali būsena](IMPLEMENTATION_STATUS.md) ir [roadmap](ROADMAP.md)
- [Verslomatika integracijos sutartis](PLATFORM_CONTRACT.md)
- [Actual izoliuotas PostgreSQL prijungimas](PG_BRIDGE.md) ir [jo patikros](QA-PG-BRIDGE.md)
- [Pilnų šaltinių dalijimas ir kilmė](SOURCE_FACTS.md) bei [atskira patikra](QA-SOURCE-FACTS.md)
- [2026-10-11 patikros](QA-2026-10-11.md)
- [Istorinės patikros](QA.md), [ankstesnė būsena](HISTORY-2026-10-07.md), [Treg setup istorija](TREG_SETUP.md)

Skiltis „Agentai → X“ suderinta su platformos kūrėju. Paketas pateikia tipizuotą adapterį, schemas ir default-OFF izoliuotą PG worker/ticket/proposal priėmimą per esamas platformos teises. Safe owner HTTP kvitas patikrintas; tikro kalibravimo, BFF/dashboardo ir operational adoption priėmimas atskiras. Modulis nekuria savo klientų CRM ar bendros autentifikacijos.

`data/`, `.env`, DB, operatoriaus raktas ir per-nišos prisijungimai privatūs, į Git nekeliauja. Treg jungtis nėra nemokamo ar neriboto darbo pažadas.
