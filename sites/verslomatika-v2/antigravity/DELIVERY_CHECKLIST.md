# Tekstų rezultato formatas ir priėmimas

Rezultatas turi būti pilnas šiam projektui skirtas tekstų ir tyrimo failų rinkinys. Codex galės jį patikrinti ir prijungti prie Verslomatikos svetainės.

## Failai

| Kelias | Turinys |
|---|---|
| content/pages/P01.md … P58.md | 58 pilni pagrindinių puslapių tekstai. |
| content/pages/S1.md … S16.md | 16 pilnų praktinių straipsnių. |
| content/pages/AGENT_TEMPLATE.md | Vienas pilnas tikro profilio šablonas ir lauko paskirtis. Ne šimtai išgalvotų profilių. |
| content/ui-copy.json | Visos SITE_STRUCTURE.md nurodytos sąsajos tekstų grupės. |
| content/source-register.json | Šaltinių ir teiginių patikros registras. |
| content/link-register.json | Kontekstinės nuorodos, jų vieta, natūralus tekstas, tikslas ir skaitytojo priežastis. |
| content/media-plan.json | Vaizdo paskirtis, tipas, proporcija, alt, mobile kompozicija, kilmė, teisės ir faktinė parengimo būsena. |
| content/assets/ | Realiai parengti šablonai, skaičiavimai, JSON ir kiti priedai; ne tušti failų vardai. |
| private/dependencies.json | Tikslūs trūkstami verslo faktai, tikri maršrutai, bandymai ar vaizdai ir paveikti puslapiai. Jokių paslapčių. |
| content/coverage.json | Visi 75 plano raktai, failai, būsena, šaltinių ir saviredakcijos patikros apimtis. |
| DELIVERY.md | Kas parašyta, kas patikrinta, konkretūs likę klausimai ir failų sąrašas. |

Kiekvieno puslapio pradžioje atskirk redakcinius laukus nuo viešo body. Tinka YAML front matter su planKey, canonicalPath, pageType, title, description, h1 ir proposedAuthor. Vidinis updatedAt reiškia rašymo datą, o ne viešą dateModified. Planinį publishAt perimk iš manifesto, jo nekeisk į tariamą paskelbimo datą. Rašymo metaduomenų nepateik kaip techninio paskelbimo ar nepriklausomos peržiūros įrodymo.

Po metaduomenų pateik pilną viešą tekstą su antraštėmis, lentelėmis, pavyzdžiais, nuorodomis ir mygtukų etiketėmis. Privataus tyrimo istorija, nepatikrinti teiginiai ir TODO lieka atskiruose failuose. Visas tekstas turi būti prieinamas be skaitytojo el. pašto pateikimo, išskyrus tikrą atskirai numatytą komercinę funkciją.

## Registro laukai

source-register įrašas: sourceId, pageKeys, url, title, publisher, accessedAt, publishedAt arba unknown, claim, supportingLocation, sourceType, verificationStatus ir limitations. Pirminio dokumento nepasiekus įrašyk failed arba candidate, ne verified. Vienas šaltinis gali aptarnauti kelis puslapius, tačiau kiekvienas teiginys turi savo kontekstą.

link-register įrašas: sourcePlanKey, section, anchor, targetPath, targetPlanKey, readerReason ir readiness. Svetainės techniniai identifikatoriai susiejami vėliau. Nėra fiktyvaus nuorodos protokolo ar automatinio viešinimo.

coverage įrašas: planKey, canonicalPath, file, state, researchCompleted, sourceIds, originalContributionFile arba section, languageSelfEditCompleted, materialDependencies. Būsenos: written, written-with-dependency, blocked-specific-fact, template-complete. researchCompleted ir languageSelfEditCompleted nustatyk tik iš tikrųjų atlikęs darbą; ne visiems įrašams pagal nutylėjimą.

## Rašytojo patikra

- Visi 75 raktai pateikti po vieną; nėra praleistų puslapių ar dubliuotų sinonimų URL.
- Kiekvieno konkretaus puslapio tekstas atsako į jo klausimą ir laikosi ribos su gretimais puslapiais.
- Atliktas konkretus to puslapio tyrimas; naudotų kainų, teiginių ir techninių sąlygų šaltiniai tikrai perskaityti.
- Pateikta savita praktinė nauda ir išlaikyta produkto apimtis, agentų kūrėjas bei pasirenkami specialistai.
- Nėra išgalvotų klientų, ekspertų, bandymų, SLA, sertifikatų, savų kainų ar statistinių rezultatų.
- S1 teisinis taikymas, MX ribos ir siuntimo sąlygos patikrintos; nėra universalaus laiškų skaičiaus.
- P39 patikrintas B1 ir Site.pro produkto kontekstas; P40 nurodytas tikslus Rivilės produktas; P49 lygina aktualius apskaitos vienetus.
- Visi mygtukai atitinka pateiktą priemonę ar tikrą būsimam integravimui patvirtintą veiksmą. Neparengtas atsisiuntimas nevadinamas veikiančiu.
- Nuorodų, medijos ir šaltinių registrai sutampa su galutiniu body, o ne ankstesne jo versija.
- Atlikta atskira viso teksto saviredakcija; sutampa skaičiai, vienetai, neiginiai, sąlygos ir natūralūs lietuviški linksniai.

## Toliau po rašymo

Codex peržiūrės tekstų, šaltinių ir nuorodų atitiktį bei konkrečias likusias priklausomybes. Įgyvendinant svetainei bus pritaikytas tikras kontaktų kelias, programos veiksmai, vaizdai, desktop/mobile atvaizdavimas ir publikavimas pagal datą. Tekstų autoriui nereikia perimti kito projekto techninių priėmimo procedūrų, kad galėtų užbaigti šį darbą.

Pateik geriausią įmanomą pilną tekstų rezultatą. Neatliktų bandymų nežymėk atliktais ir viso turinio nestabdyk dėl vienos nežinomos sąlygos.
