# Savininko video karuselė

Savininkas pakeitė Instagram collab prijungimą į vietinių video karuselę. Šaltiniai:23video pateiktame aplanke ir vienas papildomasMP4. Originalai lieka privatūs ir nepakeisti. Tai kūrimo akimirkos, ne patvirtinti atsiliepimai; išsaugomi originalūs autoriaus žymėjimai. Senų konkursų ar akcijų negalima pateikti kaip galiojančio pasiūlymo.

## Realizavimo ir tekstų patikros apimtis

- [ ]24unikalūs H264/AAC faststart failai be metaduomenų, kiekvienas mažesnis nei24MiB. Viršeliai iš tikrų kadrų per bendrą responsiveWebP importerį, be didinimo virš šaltinio raiškos. Tikslus immutable asset manifest ir esamas homepage/host admission.
- [ ]Horizontali portretų juosta su daliniu kitu kadru, braukimu, pelės tempimu, klaviatūra, rodyklėmis ir tikru pozicijos skaitikliu. Be automatinio slinkimo. Tik pasirinktas video gauna src. Native garsas, laiko juosta, fullscreen; sustabdymas išėjus iš matomos srities ar paslėpus tab.
- [ ]Esama Manrope400/600, offwhite#f8f7f5, ink#282625, pink#8b4560. H2iki48px/1.08, body16px/1.6/max50ch, pavadinimai16px/1.4, metadata/valdikliai14px/1.5, target44px. Kontrastinga trukmė ant tamsaus paviršiaus. Pastaba „Įrašuose minimi konkursai ir akcijos gali būti pasibaigę.“14px.
- [ ]Įkėlimo, klaidos/pakartojimo ir uždarymo būsenos, fokusas ir natūralus LT visų24pavadinimų/alt/valdiklių perskaitymas. Nativecontrols klaviatūros neperimti. Reducedmotion ir esamas judesio išjungimas.
- [ ]Tikri desktop/mobile390/320, kelių klipų paleidimas, navigacija ir vienas aktyvus player; asset/range/admission regresija, lint/types/build ir vienas finaldetector. Tikro zoom/spacing negautam mechanizmui PASS nepriskirti.
- [ ]Frontend-only productiondeploy, išsaugant actualbindings, native3367ef65/181pages/759media,22galerijosnuotraukas ir92straipsniųdatas. Commerce/DNS/paštas/DB nekeičiami. Ankstesnė frontend97678db4 versija lieka coderollback.

Parengimas nėra hosted priėmimas. Įrodymai ir galutinis version/source pildomi po patikrų.
