# Nuolatinės tipografikos sistemos taisyklės

2026-10-10. Savininkas tiesiogiai pavedė peržiūrėti ir taisyti ergonomic.lt tekstų stilius bei įrašyti į core nuolatinę visos šriftų sistemos priežiūrą. Šis įrašas aprašo bendrų instrukcijų dalį; svetainės realizacijos ir naršyklės įrodymai laikomi jos atskirame projekte.

## Bazė ir atsakomybė

- Own worktree `C:/Core/typography-system-20261010`, branch `codex/typography-system-20261010`.
- Sėkmingai fetched main ir pradinė HEAD bazė `13c9649c76dd48cdf426604cb721e1ccd58a9854`; `git-freshness --phase start` ir `--phase continue` PASS.
- [Issue83](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/83) rezervuoja tikslius rašomus failus prieš pakeitimus.
- Upgrade `upgrade-be77d278-39b0-4957-8bdc-adff244f900d` fiksuoja pradinį radinį ir atskirus patikros / Git įvykius.
- Viešo companion sąsajos, runtime, paketai ir rendereriai nenaudojami bei nekeičiami; companion SHA / PR šiai dokumentų pataisai netaikomi.

## Radinys ir rezultatas

Esama `art-direction.md` instrukcija jau apima realų eilučių, svorio ir lietuviškų ženklų tikrinimą, DESIGN bei mobilų vaizdą. Audito R2/S2 jau reikalauja įskaitomumo ir tikro mastelio keitimo. Tačiau šie reikalavimai išskaidyti ir nėra vieno kasdieniam tekstų kūrimui, keitimui, realizacijai bei auditui taikomo visos tekstų sistemos kontrakto.

Naujas [canonical reference](../../SKILLS/niche-site-builder/references/typography-system.md) sujungia tekstų vaidmenis, šriftų suderinamumą, tikrus svorius / ženklus, dydžius, hierarchiją, eilučių / raidžių tarpus, skaitymo plotį, kontrastą ir išdėstymą. Į jį nukreipia root AGENTS, PROJECT_CONTRACT ir builder/planner/audit įėjimo taškai. Agentas suplanuoja konkrečią apimtį, taiso žinomus defektus, tikrina realų desktop/mobile vaizdą bei taikomą mastelio / tarpų keitimą ir atnaujina patikrą po reikšmingų pakeitimų.

Tai vienas prižiūrimas projekto tekstų stilių šaltinis ir patikros eiga, o ne bendras ergonomic.lt šriftas, spalvos ar dydžiai visoms svetainėms. Dydžių, leading ir 45–75ch gairės aiškiai pažymėtos kaip pradinės euristikos, ne visuotinis šablonas. Išlaikoma svetainės pasirinkta tapatybė, originalių tekstų semantika ir esama exact-revision publikavimo sutartis. Viena raidės pataisa neįpareigoja kurti naujo dokumento ar kartoti visos svetainės audito. Read-only JSON planner grąžina tik palaikomos schemos laukus ir neapsimeta atlikęs naršyklės patikrą.

## Faktinė patikra

- [x] Perskaityti fresh AGENTS, CORE_IMPROVEMENT, Git workflow / MULTI_MACHINE / GITHUB, PROJECT_CONTRACT, upgrade runbook, builder/planner/audit instrukcijos ir esama mastelio patikros sutartis.
- [x] Naujo teksto saviredakcija ir konflikto su esamu scope, tapatybe, publikavimo bei mastelio priėmimo reikalavimais peržiūra.
- [x] Pakeistų trijų SKILL struktūra: `quick_validate.py` 3/3 „Skill is valid!“. Pradinis bandymas negalėjo įkelti PyYAML; priklausomybė įdiegta tik own ignored `tmp/typography-validator-deps`, tada visi trys tikri validatoriai praėjo.
- [x] Savas file-backed `tmp/verify-typography.mjs` patikrino 101 vietinę Markdown nuorodą, frontmatter vardus, uždaras fences ir nuorodas į naują reference.
- [x] Tik trijų tikrai pakeistų katalogo skill entry SHA atnaujinti pagal actual bytes; kitų entry ir SOURCE archive įrašai išsaugoti.
- [x] `git diff --check` PASS; mažas routing diff ir visas naujas reference perskaityti.
- [x] Tikslus staged diff / whitespace peržiūrėtas; `repository-safety.mjs . --staged` PASS: 12 tikrų staged tekstinių blob, 0 findings.
- [x] Fresh handoff gate PASS, main bazė išliko `13c9649c76dd48cdf426604cb721e1ccd58a9854`.
- [ ] Scoped commit / push / PR ir atskiro reviewer / merger sprendimas; faktinis Git perdavimas fiksuojamas atskiru journal įvykiu.

Patikros skirtos instrukcijų struktūrai ir nuoseklumui. Šiame core darbe nepakeistas UI, todėl nekurti papildomi runtime, Lighthouse ar svetainės screenshot PASS. Originalūs svetainių auditai ir ankstesnė agentų instrukcijų istorija neliečiami. Naujas kontraktas pats neįrodo, kad visos senos svetainės jau jį atitinka.

## Šaltiniai ir atkūrimas

2026-10-10 perskaitytos oficialios W3C [contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [resize-text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [text-spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) ir [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) gairės. Kontrastas, 200% resize ir vartotojo tarpų override testai atskirti nuo projekto pasirinkto numatyto stiliaus; negalima jų laikyti pilna WCAG sertifikacija.

Atkūrimas — scoped šio PR revert, ne kito agento checkout reset ar istorinių įrodymų perrašymas. Main merge, kito PC fetch / instrukcijų perskaitymas ir actual projekto adoption yra atskiri įvykiai.
