# Traktoriupadangos: aktualus balso pavedimas

2026-10-07. Savininkas šioje Codex sesijoje aiškiai užsakė visiškai paruošti `traktoriupadangos.lt` su paskambinamu AI konsultantu. Ankstesnė vien pirmos fazės apimtis šio domeno balso pavedimo neberiboja. Kitų nišų balsas šiuo darbu neįjungiamas.

**Būsena:** vietinis tikro garso pilotas veikia; viešas domeno paleidimas NEPRIIMTAS. Pataisų paketas nėra viso pavedimo užbaigimas. Laukiama konkretaus pastovaus serverio / LiveKit Cloud ir domeno administravimo prieigos. Tai dokumentuotas pavedimas, ne papildomas runtime leidimas.

**Savininkas ir source:** root, atskira `codex/tractor-voice-launch-20261007` šaka abiejuose repo. Core bazė `74eecf4`, viešo core bazė `8e46092`. GitHub koordinacija: core issue 29, public issue 8. Priėmimas ir paleidimo eiga: [VOICE_LAUNCH_2026-10-07](../../voice-agent-plan/VOICE_LAUNCH_2026-10-07.md). Ankstesni tekstiniai rezultatai išlaiko savo ankstesnę apimtį.

| Modulis / kelias | Režimas ir įrodymas | Likusi riba |
| --- | --- | --- |
| Traktoriaus nišos svetainė | Patvirtinta esamo public core projekcija, 11 viešų puslapių SEO smoke PASS | Šio darbo metu DNS ir HTTPS domenas nepasiekiami; preview nėra deployment |
| Balso worker | Tikras `gemini-3.8-live`, LiveKit RTC/PCM, serverinis readiness po pirmo generuoto garso | Vieši `voice_enabled` / `m0_verified` lieka false; pilnas M0 dar nepriimtas |
| Pokalbio tools | Tikras `ui.open_contact_form` + `need.patch`, išsaugotas 420/85 R30 poreikis ir UI parodymo ACK | Poreikio pilnumą patikslinti; bandymo STT praleido pradžios kiekį |
| Kontaktas ir užbaigimas | Tikras pasirašytas HTTP email išsaugojimas, finalizacija po worker transkriptų ištuštinimo, patvari follow-up eilė; savininko laiško peržiūra SMTP priimta ir gavėjo Gmail inbox patvirtinta per Chrome | Production automatinis pristatymas dar UNVERIFIED; automatinė Gmail jungtis reikalauja reauth |
| Po-pokalbinis AI | Tikras Flash analizės / kokybės bandymas; griežta JSON schema ir įrodymų ID, nepriklausomas laiško review | Native draft priėmimas atskiras nuo SMTP / gavėjo inbox; sintetinės DB bylos automatiškai nesiunčiamos |
| Grįžtančios naršyklės atmintis | Esamas per-site slapuko / DB atminties modulis ir testai; tikras Gemini dviejų jungčių resumption išsaugojo matmenis | Pilnas browser perskambinimo su RTC ir telefono įrenginiu bandymas dar UNVERIFIED. Slapukas atpažįsta įrenginį, ne patvirtintą asmenį |
| Kalibracija / Jev / komercija | Esamos core/per-nišą instrukcijos ir bendri moduliai išlaikyti | Šio izoliuoto piloto learning ir SMTP išjungti; šis garso priėmimas nesertifikuoja autonominių pirkimų, sąskaitų ar promptų promotion |

Vietinis entrypoint: `http://127.0.0.1:5187/`, API `127.0.0.1:8840`, privatus worker `pinet-m0-consultant`, atskira PostgreSQL DB `127.0.0.1:25432`. Procesai nėra Windows tarnybos. Nuolatinis serveris reikalingas veikimui nepriklausomai nuo šio kompiuterio / miego režimo.

Vieša verslo tapatybė: `MB Pinet` / `info@pinet.lt` pagal bendrą kontaktų config. Laikini sąskaitų rekvizitai neperkeliami į viešą svetainę. Nežinomi tiekėjai, likučiai, kainos, montavimas ir pristatymas netampa patvirtintais faktais.

## Likusių darbų įvykdomumas

| Darbas | Galima dabar? | Kitas veiksmas / priėmimas |
| --- | --- | --- |
| Kodo regresija, paleidimo ir privataus garso įrodymai | Taip; atliekama šioje šakoje | Priėmimo įrodymai ir Git perdavimas žemiau nurodytame dokumente |
| Pastovus API / PG / jobs / voice worker | Ne, konkreti serverio prieiga nepateikta | Gavus privačios konfigūracijos vietą įdiegti pagal runbook, patikrinti restart / išlikimą ir backup restore |
| LiveKit WSS / ICE / TURN | Ne, nėra Cloud projekto ar viešo SFU serverio / DNS prieigos | Prijungti tinkamą TLS ir WebRTC transportą, patikrinti iš kito tinklo |
| Dabartinio hosted public source ir domeno balso konfigūracija | Ne, nėra domeno administravimo / patvirtinto backend URL | Scoped widget pataisą perkelti į tikrą dabartinį source, nustatyti serverinius VOICE laukus, DNS/TLS ir HTTP smoke |
| Viešas mikrofonas, interrupt, reconnect, paskutinis transkriptas, kontaktas, email inbox | Dalinis vietinis įrodymas; viešam reikia ankstesnių priklausomybių | Vienas tikras browser kelias + neigiamas mic/worker/network bandymas; SMTP priėmimas ir gavimas atskirai |
| M0 ir gyvo piloto įjungimas | Dar ne | Tik išsaugojus visus taikomus įrodymus keisti measured gate ir per-site operatoriaus politiką. Launcher jų pats nekeičia |

Autorizacija svetainę paleisti jau suteikta; pakartotinio bendro „tęsk“ nereikia. Trūkstamų serverio, DNS, juridinių faktų ir paslaugos pajėgumo neišgalvoti.

Git perdavimas: tikrintas runtime source `070c8c2`, public widget `e6f763b`; [core Draft PR32](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/32), [public Draft PR9](https://github.com/christianza1989/niche-public-core/pull/9). Abu push atlikti, exact-staged safety PASS; privačių .env/DB/audio/mail duomenų staging nėra. PR nėra merge/deployment. Vietiniai API/SFU/PG/jobs/probe procesai ir ignoruojami įrodymai išlaikyti šiame worktree.
