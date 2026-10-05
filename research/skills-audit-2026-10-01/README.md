# Projekto skills suderinimo auditas

2026-10-01. Peržiūrėtas visas projekto rinkinys: **52 SKILL**, 48 importuoti PROMPT, naudojami nišų ir Impeccable priedai, discovery junction, studijos instrukcijų loaderis ir schema/medijos/publikavimo sąsajos. Tai vienos pagrindinės sesijos konfigūracijos bei instrukcijų peržiūra; nepriklausomo agento ar naujos svetainės kokybės bandymu jos nevadiname.

## Kas rasta ir pakeista

| Spraga | Konkretus pakeitimas |
|---|---|
| Importuoti blog/brand/SEO/UX helpers privalomai klausinėjo apie rutininius pasirinkimus, keli neteisingai draudė naršyklę/connectorius | 48 SKILL ir PROMPT perrašyti jų konkrečiai paskirčiai projekte; faktai gaunami iš realių prieinamų šaltinių, įprastus sprendimus priima agentas |
| Svetainės/landing helper galėjo sustoti ties planu ar maketu | Nukreipta į pilną START_HERE/CORE_BUILD_CONTRACT ir builder/planner/audit; homepage, gidai su vaizdais, kontaktų/pasitikėjimo/teisinių puslapių kelias lieka bendros užduoties dalis |
| GEO siūlė Person/FAQ schemą kaip būtinybę; internal linking — universalią 30–60 nuorodų normą; refresh — reitingų atsigavimo pažadą | Pašalintos šios normos/pažadai. Schema atitinka matomus faktus, tikra organizacija gali būti autorius, nuorodos padeda realiam klausimui ir pereina tikrus tikslo publikavimo vartus |
| Metadata/schema/nuorodų/autorių taisyklės galėjo dubliuoti bendrą variklį | PROJECT_CONTRACT nustato vieną SEO_GEO_CORE/MEDIA_CORE/NETWORK_LINKING ir patvirtintos revizijos projekciją; specialistai ją naudoja |
| E-mail/CRM/proposal helpers buvo platformai pririšti ir galėjo būti suprasti kaip naujos nišos moduliai | Jų paskirtis atskirta nuo naujos svetainės; Hostinger info@pinet.lt nėra tariama Gmail paskyra; kontaktai, klientai ir siuntimo autorizacija tikri ir izoliuoti per siteId |
| Spreadsheet/file/image helpers kartojo blanket approval flow arba galėjo sulaužyti viešus medijos ID | Gerbiamas jau autorizuotas grįžtamas darbas; reikšminga destrukcija ar faktinė neaiškumo rizika lieka konkretaus sprendimo dalis. Originalai, paketai ir immutable media ID saugomi |
| 12 importuotų frontmatter vardų nesutapo su aplankais; index.csv trūko niche-site-audit | Vardai sulyginti, visi 52 įrašyti į catalog.json ir CSV su paskirtimi ir ankstesniu vardu/kilme |
| Studijos CLI negavo visiems skills bendros naujos sutarties | Abu plan/draft režimai gauna ../PROJECT_CONTRACT.md, jo tekstas įtrauktas į SHA-256; trūkstant failo generavimas sustoja prieš CLI |
| Impeccable Windows instrukcija rodė ne šio projekto .agents launcher; vienas priedo link rodė reference/reference kelią; human checkpoint konfliktavo su deleguotu pasirinkimu | Tikras skill-base-dir/scripts/impeccable.cmd, pataisyta asset-producer nuoroda, PROJECT_ADAPTATION aiškiai suderina delegavimą ir agento vizualinę peržiūrą. Papildoma patikra galima tik dėl konkrečios likusios spragos |
| Windows Python validatorius skaitė Unicode per cp1252 | Audito helper naudoja oficialų quick_validate.py su Python -X utf8; pats svetimo validatoriaus kodas nepakeistas |

## Kilmė ir aktyvavimas

48 importuoti originalūs SKILL ir jų PROMPT išsaugoti **96 SOURCE_* failuose be baitų pakeitimo**. Registro SHA-256 leidžia tikrinti jų nekintamumą. 43 kilę iš viešo SKILL, 5 buvo vietiniai paketai iš viešo prompto. SOURCE_* yra kilmės archyvai, ne instrukcijos. Vienkartinis [adapt-library.mjs](adapt-library.mjs) išsaugotas pakeitimų atsekamumui; jo nereikia vykdyti kiekvienam domenui ar perrašyti vėlesnių rankinių skills patobulinimų.

Keturi jau įdiegti skills lieka esamais junction į projekto šaltinius. Importuoti pagalbiniai skills **neįdiegti masiškai**; jų nereikia krauti į kiekvieną užduotį. Impeccable upstream commit, LICENSE ir NOTICE išlaikyti, vietinės pataisos įrašytos UPSTREAM.json. Neįdiegti nauji įrankiai, hooks ar mokamos paslaugos.

Paskirčių registras: [catalog.json](../../SKILLS/catalog.json). Viena [PROJECT_CONTRACT](../../SKILLS/PROJECT_CONTRACT.md) sutartis taikoma visiems. Pagrindiniai 4 / pirmos fazės pagalbiniai 20 / verslo operacijų 11 / artefaktų ir failų 17. Operacijų analizė gali naudoti tikrus pirmos fazės duomenis, tačiau savaime neįjungia pilno CRM, voice, e-commerce ar klientų siuntimo.

## Patikros ir ribos

Galutinis vykdymas: **52/52 struktūros/config PASS**, **159** aktyvūs Markdown failai, **391** tikra vietinė nuoroda ir **96** originalų hash patvirtinti; konfigūracijos klaidų nėra. Veikia atnaujinta [studija](http://127.0.0.1:4317), paleista su nauju loaderiu; po paleidimo GET jobs snapshot parodė 0 queued/running darbų. Tikrų Codex generavimo ar laiškų užduočių kaip šio audito testų nepaleista.

- [Vykdymo JSON](verification.json): visi SKILL/PROMPT ir aktyvūs priedai, oficialūs struktūros validatoriai, tikri vietiniai failų link, junction/kopijų atitikimas, originalų SHA-256 ir instrukcijų fingerprint. [Pradinis techninių spragų rezultatas](verification.before-fixes.json) išlaikytas; jo cp1252 klaida ir vienas broken link pataisyti.
- [Studijos testai](studio-tests.log): 15/15 PASS. Testuotas realus fixture CLI plan/draft promptas, bendros sutarties įtraukimas, private package riba, aktyvaus snapshot nekintamumas ir naujas fingerprint po skill arba bendros sutarties pakeitimo. Trūkstanti bendra sutartis stabdo CLI ir nepaliečia turinio. API/šeimų medijos, patvirtintų revizijų ir tinklo nuorodų regresijos taip pat praėjo.
- Viešo rendererio kodas, paketai, DNS, tikri laiškai ir balso runtime šiame darbe nekeisti. Esamos kitų sesijų ir svetainių įrodymų versijos neperrašytos; tai ne naujas Lighthouse/zoom ar 10/10 svetainės auditas.
- Aktualios būsimos užduotys naudoja naujas instrukcijas; jau pradėtos studijos partijos išlaiko savo pradžioje pakrautą SHA-256. Bendro keitimo laikas pažymėtas WORKSTREAMS, istorinis FIRST-RUN nėra pagerinamas vėlesniu skill pakeitimu.

Pakartotinė konfigūracijos patikra iš projekto root:

```powershell
node SKILLS/scripts/audit-skills.mjs
npm --prefix content-studio test
```

Konfigūracijos PASS nereiškia, kad modelis visada laikysis instrukcijų ar sukurs 9/10 dizainą iš pirmo bandymo. Toks vertinimas atliekamas su tikru naujo domeno rezultatu pagal AUTONOMY_BENCHMARK ir A–Z auditą.
