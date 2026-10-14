# Grand Vila core grįžtamasis ryšys

2026-10-14. Savininkas pasirinko tik auditą ir konkretų atnaujinimo planą.

Patikrinti migracijos apribojimai: paskutinis `/` canonical helperyje; 60 media variantų riba V1 ir V2; `/wp-content/uploads/` legacy alias ir senų sitemap failų adapterių poreikis; konkretaus V2 nišos adapterio POST užklausos kelias. Įrodymai ir priėmimo bandymas: [CORE-SUDERINAMUMAS.md](CORE-SUDERINAMUMAS.md).

Šie apribojimai pagrįsti dabartiniu kodu ir svarbūs būsimai migracijai. Šiame audite bendras core nepatobulintas: nėra patobulinimo ID, jo regresijos PASS, main sujungimo ar faktinio pritaikymo įrodymo. Pagal vartotojo siauresnį pavedimą bendras kodas nekeistas. Darbo katalogo kūrimo app įrankis nepriėmė `origin/main`; savo worktree saugiai sukurtas Git CLI su `--no-track`, originalus checkout nepakeistas. App įrankio kodas nepriklauso šio projekto rašymo sričiai.

Šio fetched main snapshot nėra `scripts/core-upgrade-check.mjs`, nors sesijos bootstrap jį nurodo būsimiems shared upgrade. Audit-only dokumentų perdavimas nėra shared upgrade; pasenęs ar nesujungtas kito checkout script nevykdytas. Prieš vėlesnį core įgyvendinimą iš naujo fetch ir skaityti faktinius priimtus Git/upgrade kontraktus.
