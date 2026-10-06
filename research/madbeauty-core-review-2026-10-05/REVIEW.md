# Madbeauty patirties peržiūra ir bendros taisyklės

2026-10-05. Root read-only Madbeauty source / išsaugotų QA rezultatų peržiūra ir agento `sites/madbeauty/CORE_FEEDBACK.md` atsakymas. Ne naujas visos platformos auditas ar runtime bandymas. Agentas lieka active ir valdo savo site/backend/content namespace.

## Patikrinta būsena

- Backend V7 TAP: 27/27 PASS,0 FAIL; foundation / platform V2:30/30 PASS. Tai ankstesni išsaugoti agento rezultatai, šiame rate testai nekartoti.
- Agentas dokumentavo atskirų meistro / kliento paskyrų browser booking / reschedule / cancel ir restart išlikimą. Root čia nepriskiria sau nepriklausomo šių browser kelių priėmimo.
- Actual pirmo gido turinio HTTP kvitas PASS: ta pati importuota versija, kontroliuojamas laikrodis prieš / po datos, gidų / nuorodų / medijos / SEO / LLM paviršiai, unknown host ir privatūs artefaktai. Bendro SEO smoke PASS5 public pages. Izoliuotas revoke kvitas PASS; tikri tenant duomenys neperrašyti.
- Agentui pateikus feedback, profile manifest progresas pasikeitė109→117/120assets; tai atskiro manifesto įrašų skaičius, ne visų40profilių vizualinis ir HTTP priėmimas. Darbas vyksta.
- Policy3/sav. ir6mėn.76vietos yra planavimo tikslas, ne76parengti tekstai. Pirmame release5puslapiai / vienas gidas, exported-not-deployed.
- Full70screen serverinės versijos individualus priėmimas, du likę pradiniai gidai, galutinis A–Z, production SSR/hosting/SMTP-INBOX/domenas ir demand dar neužbaigti. 10/10/domain-ready neskelbiama.

## Pamokos su faktiniais įrodymais

1. Seno frontend-only roadmap ir GitHub integravimo instrukcijos nebeatitiko savininko išplėsto užsakymo. Root pataisė `docs/INTEGRATING_A_PROJECT.md`; agentui perduota savo roadmap/README pradžią susieti su aktualia būsena. F1 taisyklės lieka kitoms nišoms.
2. Atskiri seed UI ir real auth keliai neįrodė viso meistro / kliento serverinio veiksmo. Agentas juos sujungė savo izoliuotame preview su tomis pačiomis API. Bendra taisyklė: ankstyvas viso kelio bandymas prieš masinę ekranų plėtrą.
3. Agentas išsaugojo SQLite užrakto ir seed `active` klaidos FAIL→repair→retest istoriją. Bendros taisyklės reikalauja concurrency, persistence ir serverinių teisių įrodymų; Node SQLite rezultatas automatiškai netampa D1/Workers rezultatu.
4. Root perskaitė pirmų turinio nesėkmių kvitus: approve atmestas kaip per trumpas turinys; importer sandbox trūko V2schema priklausomybės net V1 paketui; fetch Host override neįrodė unknown-host izoliacijos. Pridėtos adapterio priklausomybių / source versijos ir pirmo gido import/publish/revoke patikros taisyklės. Bendro validatoriaus kodo šiame rate nekeista; kvotos tinkamumas platformų homepage vertintinas atskirai, nereikalaujant filler.
5. Agentas aptiko netinkamą tab/viewport mobile bandyme ir guest kalendoriaus Lighthouse. Privalomas actual viewport, URL, auth rolės ir duomenų režimo įrašas; neperkelti balo kitam ekranui.
6. Savininkas šiame rate papildomai patvirtino visų paviršių modernų dizainą pagal homepage kokybę. Taisyklė įtraukta ir perduota agentui: vientisa black/white/violet brand sistema, paskirčiai tinkamos vidinių ekranų kompozicijos ir individuali actual patikra.

## Root pakeitimai ir ribos

Naujas `PLATFORM_BUILD_CONTRACT.md`, trumpi AGENTS / START_HERE / SKILLS PROJECT_CONTRACT nukreipimai, aktuali docs INTEGRATING_A_PROJECT apimtis. Sutartis nustato dokumentuojamą per-modulio apimtį, bendro core / verslo modulio ribas, runtime-dependent adapterių patikrą, ankstyvus funkcinius ir turinio kelius, demo izoliaciją ir atskiras local / launch / demand būsenas. Tai nėra automatiškai įgyvendintas authorization manifest runtime ar universalus booking backend.

Root nekeitė Madbeauty source/DB/content/assets/testų, bendrų validatoriaus/scheduler/schema/runtime/procesų ar agento failų. Agentui perduoti pradžios dokumentų ir visų ekranų kokybės reikalavimai. Neužbaigtos bendro adapterio / validatoriaus kodo idėjos lieka pasiūlymais, ne paslėptu scope išplėtimu.

Patikra: struktūrinis54skillsauditas0issues ir naujų/keistų instrukcijų42vietinės nuorodos PASS prieš paskutinį dokumento papildymą; galutinis nuorodų/diff check atskirai. Privatus STATE saugo source SHA ir cursor; sekretų, klientų DB ar raw naršyklės duomenų nekopijuota. Dokumentų patikra neįrodo platformos runtime ar dizaino kokybės.
