# Madbeauty product context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Klientas ieško konkrečios grožio paslaugos tinkamoje vietoje ir laiku. Meistras rengia savo paslaugas, grafiką, klientų sąrašą ir valdo registracijas vietinėje darbo vietoje. Operatoriaus užduotis — patvirtinti informaciją, užklausų kelią ir duomenų kokybę.

## Product Purpose

Vienas paslaugų katalogas ir meistro darbo vieta pagal [PLATFORM_PLAN](PLATFORM_PLAN.md). Savininko patikslintas pagrindinis F2 kelias: paslauga, miestas, data ir viso vizito valandų intervalas → tikrai laisvi meistrai → patikima rezervacija.

## Capabilities and Constraints

Dabartinė apimtis: privati vietinė platforma su patvaria SQLite saugykla, el. pašto kodo autentifikacija per vietinį testinį capture, paskyros ir organizacijos izoliacija, realia viso vizito laiko patikra, laiko palaikymu, rezervacijos keitimu ir atšaukimu. Meistro darbo vietoje veikia paslaugos ir priedai, klientų sąrašas, rankinis vizitas, kalendorius bei laiko blokai. Operatorius peržiūri profilių versijas ir atsiliepimus. Aktualūs įrodymai ir ribos: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [SCREEN_STATUS](SCREEN_STATUS.json), [UI/UX priėmimas](uiux/ACCEPTANCE.md).

Savininko pavedimas dabar — gerinti platformą ir visos sąsajos funkcijas. Demo profilių ir fotografijų peržiūra sustabdyta. Black/white/violet tapatybė bei pasirinktas modern-v2 homepage išlieka. Nemokamo piloto ekonomika yra hipotezė. Vietinis veikimas neįrodo tikrų meistrų pasiūlos, SMTP / INBOX pristatymo, produkcinio paleidimo ar paklausos. Mokėjimai ir išorinių kalendorių sinchronizacija neįjungti.

Istorinė F1/frontend → privatus paspaudžiamas prototipas → backend darbų seka saugoma [PLATFORM_PLAN](PLATFORM_PLAN.md), [PROTOTYPE_ROADMAP](PROTOTYPE_ROADMAP.md) ir pradiniame [70 ekranų inventoriuje](SCREEN_INVENTORY.json). Jo PLANNED įrašai yra ankstesnio etapo fingerprint; dabartinė įgyvendinimo būsena saugoma atskirai.

## Brand Commitments

Domenas madbeauty.lt pagal savininką; bendras operatorius MB Pinet, info@pinet.lt. Vizualinę kryptį savininkas delegavo. Nėra patvirtintų dabartinių meistrų, jų kainų, nuotraukų ar laisvų laikų. Apmokami atsiliepimai atidėti.

## Evidence on Hand

[BUSINESS](BUSINESS.md), [tyrimas](../../research/madbeauty-2026-10-05/RESEARCH.md), 43 šaltinių registras. Sugeneruoti dizaino maketai yra privatūs demonstraciniai artefaktai; juose esantys vardai, portretai, darbai, kainos ir kalendoriai negali tapti tikrais marketplace faktais.

## Product Principles

Patikimas laisvas laikas svarbiau už katalogo dydį. Nepriverstinė kliento registracija. Meistras gali pradėti su dabartine registracijos sistema. Teikėjų klientai izoliuoti. Tikras vizitas ir ekonomika vertinami atskirai nuo dizaino.
