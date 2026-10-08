# GitHub source perkėlimas

Actual kelių PC / agentų versijų patikra: [CODEX_GIT_WORKFLOW](CODEX_GIT_WORKFLOW.md). Push/PR iki merge nepakeičia kitų agentų main; kiekvienam PC reikalingas global bootstrap ir sėkmingas start/continue/handoff fetch gate. Gate leidžia savo worktree pakeitimus pagal režimą, bet neresetina aktyvių kitų darbų. Toliau galioja scoped stage / sekretų / PR tvarka.

2026-10-05 savininko pavedimas bendram darbui kitu kompiuteriu. Numatyta PRIVATE:

- `christianza1989/nisiniai-puslapiai-monetizavimui` — šis projektas.
- `christianza1989/niche-public-core` — švari aktualaus viešo variklio source/media/package kopija.

Repo apimtis yra kodas, skills, planai, temos assets, schema ir paketai; tai nėra full kompiuterio backup ar production DB migracija. Pradinis įkėlimas turi darbų, kuriuos kitos sesijos dar kuria; snapshot nėra jų darbų priėmimas. Paskutinius pakeitimus visada vertinti per git status/commit.

## Saugos priėmimas

Root .gitignore išskiria `.env`, login/passwordTXT, duomenų bazes, data/output/tmp/artifacts, dependencies, browser profilius, frozen/FIRST-RUN ir factory archyvą. Research perkeliami atrinkti MD dokumentai, žali JSON/HTML/pixels ir trečiųjų šalių source klonai paliekami vietiniai. MD nuoroda į vietinį įrodymą nėra pažadas, kad tas įrodymas įkeltas.

`scripts/repository-safety.mjs` tikrina kandidatinius failus arba TIKRUS staged blob: žinomus tokenų formatus, privačius raktus, užblokuotus failų pavadinimus,90MB ribą ir tikslius vietinių secret reikšmių sutapimus. Reikšmių neišspausdina. Tai nėra visuotinė klientų PII ar visų galimų sekretų detekcija; atskira failų atranka būtina.

Prieš pirmą push ir commit tikrinti, kad rawcredentials/.env/DB/runtime artifacts nėra staging, nė vienas failas neviršija ribos ir saugos gate PASS. Git apsauga neatšaukia jau nutekėjusio rakto — toks raktas rotuojamas atskirai. Šio perkėlimo metu sekretai neviešinami, jų nekeliame net į private repo.

## Companion core ir senas checkout

Esamas `C:/Users/lenovo/Documents/dovanos-memorycasting` origin lieka savo ankstesniame host; istorija ir aktyvūs working pakeitimai neperrašomi. `scripts/export-public-core.mjs` daro read-only pasirinktų source katalogų snapshot į naują TUŠČIĄ katalogą, be .git istorijos, node_modules/output/state. Kopija tada gauna naują GitHub istoriją. Exporto report vietinis `.github-preparation/public-core-snapshot.json`.

GitHub prieiga prie naujo repo nereiškia, kad senas origin automatiškai persijungė. Tolimesniam bendram core darbui naudoti švarų `niche-public-core` clone, pavadintą `dovanos-memorycasting`, arba sąmoningai perkelti paskesnę seno checkout delta į PR. Nestumti senos istorijos į naują remote ir nesugriauti dabartinių kitų sesijų pakeitimų. Pradinis companion snapshot nėra automatinė nuolatinė sinchronizacija.

## Patikros ir išlaidos

Source priėmimas: exact-staged safety, fresh clone tinkama gretima struktūra, studijos ir domain-history testai, public core testai/compile pagal galimybę. Testas neperkelia seno SMTP/DB ar mokamų modelių. Privačiame repo CI workflow paruoštas tik `workflow_dispatch`; automatiškai neįjungia mokamų hosted darbų kiekvienam push. GitHub plano ribos/branch protection ir native platformos kaštai neįrodyti, mokamų funkcijų ši užduotis nejungia.

GitHub saugyklos neturi Codex sesijų istorijos. Kitas AI skaito versioned AGENTS/docs/nišos roadmap; sesijų identifikatoriai yra koordinavimo kontekstas, ne būtina prieiga į darbą.
