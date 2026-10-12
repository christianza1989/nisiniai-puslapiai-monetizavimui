# Patvirtinto plano svetainės vartas prieš agentų aprašų rašymą

Scope: naujasis discovery build, provider0, izoliuota sintetinė PostgreSQL.
Visas vietinis pavedimas OPEN. Issue66#6134120461/#6134144227; own šaka
codex/discovery-agent-foundation-gate-20261013 iš PR117 source7d5b0929,
companion5924a2eb nekeistas. API wire Git bytes nepakitę.

Stebėta prieštara: business-discovery.v1 rodo foundationUNVERIFIED ir
can_create_agents=false, bet customer_agents.check_binding(write=True)
anksčiau tikrino vien dabartinę Registration ir nuosavą grant.
UI mygtuko išjungimas tiesioginio API neatstoja.

require_agent_foundation sieja owned Creation su patvariu BuildApproval.
Naujas linked build negali rašyti agento aprašo, kol tikro svetainės užbaigimo
adapterio nėra. Taikoma ir galutiniame source/session tikrinime prieš commit.
Discovery išjungimas jau susieto build vartų nepanaikina. Unlinked legacy
ir read/history nekeičiami. READY proof, grants ar nauja kalibracija nekuriami.

## Patikros

- Offline discovery + customer-agent spec48PASS4.18s; scoped RuffPASS.
- Actual restricted PostgreSQL HTTP naujas vartas PASS:1testas po test-only
  Session pataisos, log SHA3fc851a49d872abd46a4c97d5f425d01907cf0a762fa78ead22709ec8884ce61.
  POSTcreate ir revise409, existing GET/list200, tie patys Agent/Config
  skaičiai ir discoverydisabled atvejis. Zero provider, operational mutations0.
- Ankstesnėje mišrioje source grupėje28PASS/1FAIL151.13s; vienintelė klaida
  tas pats naujo testo detached Session. Log5ab0b870d18d9a5259b386b384dcc1443c2cbbe32df544e32c7cc67bca706b5c
  išlieka. Senų28atvejų nekeista ir be naujo gedimo jie nekartoti.
- Tikras ankstesnio Registration-only elgesio baseline dabar atkurtas,
  nuėmus tik naują gate per atskirą test seam (tracked source neliečiamas):
  APIcreate201 ten, kur naujasis klientų kelias turi atmesti409.
  Originalas7f31213659e8d7dc8773d24bd51f9fde58ceb630f75ddcabf6a9b6f73ee280b3.
- Pirmas baseline FAIL7a1cbfeb0f55cacf9d9f860a3f6b3f8f4362efd631cb2711bd50e073cd053cee
  yra test-only detached Session: tą patį Session reikia naujai įkelti kitoje
  transaction. Tai nėra įrodytas Registration-only bypass rezultatas.
  Originalas saugomas; taisomas testas, source vartai nesilpninami.

Fixture naudoja tikrą esamą registracijos/Profile grandinę, išsaugo vieną
ankstesnį agento aprašą ir tik QA bazėje susieja jį su sintetiniu peržiūrėtu
discovery report. Tai setup, ne operacinė legacy migracija. Tikrinami
tiesioginiai create/revise, dabartinių GET/list išlikimas ir nepakeisti
Agent/Config skaičiai. Operational istorija neliečiama.

Initial chat ordinary UI, tikras modelio testas, visa svetainė, foundation,
Designer ir galutinė agentų kalibracija dar nepriimti. Scheduler PAUSED;
gyvi kanalai, target-PC ir public held.
