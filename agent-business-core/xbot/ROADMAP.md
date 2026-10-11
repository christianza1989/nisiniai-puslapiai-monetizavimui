# Xbot roadmap

## Užbaigtas vietinis modulis

- [x] Atskirti X modulį nuo FB ir bendro CRM.
- [x] Atskiri verslų faktai, paskyros/credential nuorodos, default OFF.
- [x] Dienos planas, laike paskirstyti juodraščiai, review, kalendorius ir patvari eilė.
- [x] Actual Codex CLI strict JSON draft + review per Service; modelio ir kvotų ribos.
- [x] Atominiai rezervai, globalios sąnaudų ir modelio ribos, paskyros lock bei bendras veiksmų limitas.
- [x] Neaiškus siuntimas sustabdo kanalą, nėra aklo pakartojimo.
- [x] Privatus PNG/JPEG importas, alt/teisių patikra ir X upload kelias.
- [x] Inbound įrodymai ir sticky opt-out, tyrimo signalai atskirai nuo klientų.
- [x] Tipizuotas Verslomatika manifest/snapshot/command/binding adapteris; source revokacija.
- [x] Vietinio operatoriaus desktop/mobile UI, 40 testų ir actual CLI įrodymai.

## Kitas etapas: bendra integracija ir kalibravimas

- [ ] Peržiūrėti ir sujungti scoped PR; atnaujinti vartojančio vykdytojo source SHA.
- [ ] Platformos owner prijungia maintained auth, grant ir current source resolverį pagal PLATFORM_CONTRACT.
- [ ] Dashboarde per-verslo „Agentai → X“ prijungti penkių skydelių duomenis; įjungimo/pause komandos idempotentinės.
- [ ] Actual tenant/session/grant revokacijos ir pasikeitusios V2 projekcijos e2e priėmimas.
- [ ] Bendras projekto kalibravimas, paskui viena pasirinkta niša: pirkėjas, pasiūlymas, faktai, eksperimento kriterijai ir įrodymų rinkinys.
- [ ] Patvirtinti tikrą paskyros paskirtį, expected actor, sąnaudų ribas ir vykdytojo ownership.
- [ ] Ribotas actual Treg read, originalaus įrašo ir media bandymas; kvitas + tikras X rezultatas.
- [ ] Priimti canonical CaseSource importą ir atskirą konversijų/pardavimo atribuciją.
- [ ] Tik po šių vartų — vienas patvarus dienos koordinatorius; be paralelinių DB kopijų.

## Papildomos gyvos funkcijos

- [ ] Reply / DM tik su X AI leidimo ir žmogaus iniciatyvos įrodymais, scopes bei atskiru priėmimu.
- [ ] Neaiškaus siuntimo rankinis sutikrinimas: ledger/result + tikras X; kvitų surinkimas pats neatleidžia rezervo ir nekartoja siuntimo.
- [ ] Sąnaudomis ir tikromis konversijomis pagrįsta nišos plėtra; reach ir signalų kiekis nėra pelnas.
