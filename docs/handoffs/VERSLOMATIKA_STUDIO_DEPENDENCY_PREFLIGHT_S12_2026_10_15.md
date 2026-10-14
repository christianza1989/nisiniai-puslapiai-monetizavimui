# S12 studijos priklausomybių source perdavimas

Source paketas skirtas root peržiūrai; aktyvus `c99094c` bandymas neliečiamas. [Sprendimas ir pirmas radinys](../decisions/VERSLOMATIKA_STUDIO_DEPENDENCY_PREFLIGHT_S12_2026_10_15.md) aprašo tikslią apimtį, pradinį missing Sharp gedimą, ribas ir regresiją.

Suderinti failai: `creation/studio.py`, minimalus `site_build/lifecycle.py` startup hook, fiksuotas `customer-content-preflight.mjs`, du nauji testų failai. Esami transportai, source/owner guard, default-OFF, SQL/RLS, modelių profiliai, kvotos ir instrukcijos išlieka. GUI serverio resolveris yra atskiras root upgrade.

Patikra: Python50 / Node6 PASS, tikras savo worktree importų probe ready su Sharp0.35.5, provider0/server0/data init0. Pirmas Ruff import-order FAIL ištaisytas; jo istorija sprendime išlieka. Nėra DB, provider, runtime ar deployment adoption.

Po peržiūros pagrindinė sesija gali sujungti scoped source commit ir iš naujo patikrinti savo būsimą užšaldytą source. Dabartinės gyvos užduoties source ar instrukcijų snapshot neperrašyti. Būsimo įjungto supervisor startup dabar vykdo tikrą importų probe; nesėkmė reiškia konkretų setup dependency / Node gedimą, ne leidimą praleisti vartus ar įdiegti pakaitinį media optimizer.
