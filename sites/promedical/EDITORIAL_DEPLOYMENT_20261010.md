# 65 redakcinių puslapių publikavimo planas

Savininko perduotas paketas: public šakos `codex/promedical-20261009` commit `c08340bf6f6b88cf526a560b6469b8b4aa5a2258`; kandidato SHA-256 `1459e5429157a3d856c5f220d297f96ef8dc2ce571774915ffea18d466bbb5e2`. Diegimo checkout: `C:/Core/promedical-public-logo-20261010`, išlaikant savininko pasirinktą raudoną 6 logotipą ir pašalintą prierašą.

1. Patikrinti tikslią 65 puslapių apimtį, patvirtinimų hash, nepakitusį produktų katalogą, mediją, URL ir 57 gidų kalendorių (2026-10-12–2026-11-22).
2. Ištaisyti konkrečiai aptiktas faktines klaidas pagal gamintojo šaltinius: įkūrimo metus, chloro poveikį AISI 304, nepagrįstas universalias sterilizavimo, ratukų ir tarnavimo trukmės garantijas. Privatumo puslapyje nurodyti realius infrastruktūros paslaugų teikėjus. Perskaityti visus taisomų puslapių galutinius tekstus ir patvirtinti tik naujas tikrai peržiūrėtas versijas.
3. Pradžios ir pagrindinio katalogo maketuose parodyti jų paketo teksto blokus esamu `Blocks` komponentu. Promedical pradžios tekstą įtraukti ir į esamą LLM išvestį. Kitų svetainių maketų, šriftų ir turinio nekeisti.
4. Išlaikyti dabartinę Figtree tipografiką; patikrinti ilgų antraščių ir naujų teksto blokų vaizdą 320, 390, 768 ir 1440 px, dokumento perpildymą, nuorodas bei logotipą. Būsimų 57 gidų serverinį vaizdą tikrinti atskirame vietiniame QA build, nekeičiant produkcijos laiko.
5. Sukompiliuoti 10 paketų, paleisti core testus, SEO smoke, TypeScript, komponento lint, Impeccable detektorių ir build. Tiksliai įtraukti savo failus į Git, atlikti freshness ir sekretų patikrą, push į esamus PR.
6. Wrangler versijų pipeline įkelti ir patikrinti tikras D1/Email/ASSETS sąsajas; aktyvuoti versiją 100 %. Patikrinti gyvų 8 pagrindinių puslapių tekstus, canonical, LLM išvestį, būsimų gidų slėpimą, nepakitusį raudoną logotipą ir esamus domeno maršrutus.
7. Išsaugoti tikro source/version ir HTTP/browser įrodymus. Tai siauras redakcinio paketo diegimas, ne pakartotinis visos svetainės ar pašto pristatymo audito sertifikavimas.

Būsena: baigta. Originalus savininko kandidatas ir jo commit išsaugoti; galutinės papildomos pataisos commit 6ffc4eb43c87aa42d22f97ae3b84d00ef84288fd. Gyva versija fe782168-8426-4aac-bcda-4af54fb35771, deployment b3f4b29f-011b-4868-8080-f60d64721b9b, 100 %. Galutinės HTTP ir naršyklės patikros PASS; detalūs įrodymai verification-20261010/editorial-release-v1.json. 57 gidų publikavimo datos išsaugotos. Tai nesertifikuoja nepatikrintų bendros veiklos, 200 % zoom ar pašto Inbox vartų.
