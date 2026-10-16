# Pasirašytas PhoneBridger Windows leidimas

Patikrinta 2026-10-13. Dabartinio priimto Windows `1.1.0-beta.3` paketo patikros įraše `windows_production_signed=false`. Parašas neįdiegtas ir sertifikatas nenupirktas. Ankstesni priimti paketai ir pelės bazinė versija lieka nepakeisti.

## Rekomenduojamas kelias MB Memocasting

Naudoti **Microsoft Azure Artifact Signing, Basic**, su **Public Trust** organizacijos tapatybe. Microsoft šiuo metu leidžia ES organizacijoms kreiptis dėl Public Trust; galutinis išdavimas priklauso nuo įmonės tapatybės patvirtinimo. Basic bazinė kaina yra **9,99 USD per mėnesį**, iki 5 000 parašų; viršijus kvotą 0,005 USD už parašą. Galutinė vietinė kaina, valiuta ir mokesčiai rodomi Azure paskyroje prieš užsakymą. Tai pasirašymo paslauga, ne Windows operacinės sistemos licencija ir ne PhoneBridger mokamos licencijos aktyvavimo mechanizmas.

1. Prisijungti prie [Azure portal](https://portal.azure.com) su įmonės valdomu Microsoft prisijungimu ir Azure prenumerata.
2. Sukurti **Artifact Signing / Basic** paskyrą palaikomame Europos regione.
3. Skiltyje **Identity validations** pasirinkti **Public Trust / Organization** ir įmonės atstovui patvirtinti tikrus MB Memocasting registro duomenis bei Microsoft prašomus dokumentus. Kontaktui naudoti įmonės valdomą adresą, pvz., hello@phonebridger.com. Dokumentų ir slaptažodžių į pokalbį siųsti nereikia.
4. Kai patikra yra **Completed**, sukurti **Public Trust certificate profile** su patvirtinta MB Memocasting tapatybe.
5. Paruošti konkretaus profilio pasirašymo prieigą. Profilio ID paimti iš tikros paskyros; nesaugoti sertifikato / slaptažodžio Git ar pokalbyje.

Po patvirtinimo Codex gali paruošti atskirą leidimo kopiją, pasirašyti `PhoneBridger.exe` bei mūsų pačių diegiklį, jei toks sukuriamas, su SHA-256 ir RFC3161 laiko žyma; patikrinti Authenticode pasitikėjimo grandinę; supakuoti naują ZIP; apskaičiuoti naujas kontrolines sumas ir atnaujinti atsisiuntimą. ZIP parašas nepakeičia jame esančio EXE parašo. Trečiųjų šalių DLL parašai išsaugomi. Originalūs priimti leidimo failai neperrašomi, pelės šaltiniai ir manifestas nekeičiami.

Prieš bet kokį naują programos pakavimą vykdoma esama pelės bazinės versijos patikra. Vien pridėtas Authenticode parašas nėra pelės optimizacija; išėjimo paketas turi būti atskirai versijuotas ir patikrintas. Parašas patvirtina leidėją ir failo vientisumą; naujas leidimas vis tiek gali rodyti SmartScreen reputacijos pranešimą, kol sukaupia reputaciją.

## Kas atlikta šio patikrinimo metu

- hello@phonebridger.com patvirtintas kaip kontaktinis paštas; kūrėjo prisijungimas lieka phengwey5@gmail.com.
- Chrome matoma aktyvi MB Memocasting Stripe paskyra ir Hostinger dėžutėje esantys ankstesni PhoneBridger patikros / pagalbos laiškai. Laiškai neperrašyti, naujų laiškų į klientų adresus neišsiųsta.
- Dabartinis ribotas Stripe raktas sutampa su jau naudojamu raktu; realių pinigų gavimas ir pagrindinės paskyros išmokos įjungtos. V1 paskyrų sąrašas skaitomas, V2 sąrašas grąžina 403 dėl `v2_account_storer_read`. Naujų paskyrų ar API raktų nesukurta, prieigos neišplėstos ir pinigų pervedimų neatlikta. UI jau rodo Accounts / Connect Accounts Write, todėl aklas pakartotinis tų pačių teisių pasirinkimas nelaikomas įrodytu sprendimu.
- Bendras pašto adapteris išsaugo kitų svetainių MB Pinet numatytą vardą. PhoneBridger kontaktų laiškui dabar aiškiai perduodamas PhoneBridger siuntėjo vardas; pilnas LLM eksportas naudoja patvirtintą MB Memocasting pardavėją.
- Naujo **phonebridger-creator-server** integracijos rakto forma paruošta; raktas dar nesukurtas. Sąskaitų / onboarding nuorodų ir komisinių pervedimų Write, balanso Read; Connect Accounts grupė taip pat paveldi savo penkių poskyrių Write. Neįjungtos mokėjimų, kortelių, prenumeratų Billing ar kitų grupių teisės. Kūrėjų serverio klientas gali naudoti atskirą `CREATOR_STRIPE_KEY`, todėl parduotuvės rakto nereikia pakeisti. Be naujo rakto išlieka ankstesnė aplinka. Naujo rakto Accounts V2 suderinamumas turi būti patikrintas realia tik skaitymo užklausa prieš įkeliant jį į Worker; vien paruoštos formos nepakanka.

## Pirminiai šaltiniai

- [Microsoft: Windows programų pasirašymo variantai](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options) — tiesioginis platinimas, Authenticode, SmartScreen reputacija ir sertifikatų variantai.
- [Microsoft: Artifact Signing pradžia](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) — ES organizacijų tinkamumas, Azure ištekliai, įmonės tapatybės patikra ir Public Trust profilis.
- [Microsoft: Basic ir Premium kaina](https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-change-sku) — 9,99 USD / 5 000 parašų Basic kvota, perviršio kaina.

Šaltiniai tikrinti 2026-10-13. Stripe Directory oficiali CLI užklausa šį kartą buvo atmesta dėl User-Agent; pasirašymo rekomendacija remiasi tiesiogiai Microsoft dokumentacija. Mokama Azure paslauga neužsakyta.
