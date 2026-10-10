# Žemėlapio ir vietos sprendimas

2026-10-07, S05, atskiroje platformos atnaujinimo šakoje. Gyvam domenui šis pakeitimas dar nediegtas.

Naudojamas oficialus OpenStreetMap HTML iframe. Jis užkraunamas tik pasirinkus žemėlapio vaizdą ir tik turint patvirtintos veiklos vietos koordinates. Vienu metu rodomas pasirinktas adresas; šalia yra visos to paties rezultatų puslapio vietos. Filtrai, rezultatų tipas ir puslapio numeris bendri su sąrašu. Kai koordinačių nėra, lieka adresai ir visi užsakymo veiksmai.

Automatinio geokodavimo nėra. Adresą ir koordinates pateikia veiklos savininkas, operatorius patvirtina jų viešą reviziją. Miesto centro taškas neatstoja tikro adreso. Įjungiant kitą geokodavimo ar mokamą žemėlapių tiekėją reikės atskiro sprendimo dėl kainos, naudojimo sąlygų ir duomenų.

Atstumas yra tiesia linija, apskaičiuojamas platformos serveryje. Klientas gali pasirinkti naršyklės vietos nustatymą arba pats įvesti koordinates. Geolokacija nekviečiama atveriant puslapį. Atskaitos taškas nepatenka į URL, localStorage, sessionStorage, turinio indeksus ar žemėlapio tiekėjo užklausą; laikomas tik atverto puslapio atmintyje. Perkrovus puslapį atstumo rikiavimas prašo tašką pasirinkti iš naujo ir iki tol aiškiai rodo laiko rikiavimą. Agentas bandymuose naudoja sintetinį tašką, ne kompiuterio GPS.

Iframe perduoda tik viešos veiklos koordinates. Pasirinkęs žemėlapį lankytojas užkrauna trečiosios šalies turinį, todėl tiekėjas gauna įprastus naršyklės tinklo duomenis. Apie tiekėją nurodoma prie žemėlapio; referrerpolicy yra no-referrer. Nenaudojame savo tile prefetch, scraping, offline cache, API rakto ar mokamos paskyros. Nėra pažado dėl neribotos nemokamos paslaugos ar prieinamumo. Tiekėjo gedimo atveju adresų sąrašas ir registracija veikia nepriklausomai.

CSP leidžia tik frame-src https://www.openstreetmap.org. Script, connect, media, auth, CSRF ir frame-ancestors ribos išlieka. Prieš didesnį srautą reikia išmatuoti faktinį naudojimą ir įvertinti paslaugos tiekėjo modelį.

Pirminiai šaltiniai, patikrinti 2026-10-07: [oficialus HTML įterpimo aprašymas](https://wiki.openstreetmap.org/wiki/Export#Embeddable_HTML), [OSMF tile naudojimo politika](https://operations.osmfoundation.org/policies/tiles/), [OSMF privatumo politika](https://osmfoundation.org/wiki/Privacy_Policy). Oficiali iframe vidinė atributika ir licencijos nuorodos neslepiamos.
