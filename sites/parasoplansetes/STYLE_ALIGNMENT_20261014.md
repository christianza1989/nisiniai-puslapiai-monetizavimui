# Vienodas pradžios ir vidinių puslapių stilius

Savininko pavedimas 2026-10-14: suvienodinti visos svetainės stilių, header ir footer pagal gyvą pradžios puslapį. Apimtis – esamas StepOver rendereris ir jo CSS; tekstai, paketai, kitos nišos bei publikavimo pauzė išsaugomi.

## Patikros ir pataisų planas

- [x] Palyginti actual homepage ir `/programine-iranga` 1280 px naršyklėje. Vidiniame puslapyje yra papildoma utility juosta, pilkšvas bendras fonas ir 1248 px header/footer riba, o homepage naudoja baltą foną ir 1600 px rėmą.
- [x] Bendrą baltą foną, header/footer rėmą, kontaktų mygtuką ir breakpoint elgseną perkelti į visų puslapių sistemą; pašalinti tik vidiniuose puslapiuose rodomą viršutinę juostą.
- [x] Suvienodinti gidų kortelių ir užklausos formų stilius, išlaikyti skirtingą puslapio paskirtį, breadcrumb, ArticleMeta ir techninius aprašus.
- [x] Patikrinti homepage, programų/katalogo, produkto, gido ir kontaktų puslapius desktop/mobile; menu ir footer. Patikrinti ilgų tekstų įskaitomumą ir žinomų prieinamumo ribų faktinę būseną.
- [x] Actual build/type/lint/core/HTTP bei pause patikros; paketo SHA ir kitų nišų failai nepakeisti. Įdiegti į tą patį Worker, išlaikant domenus, secrets ir runtime/indexing nustatymus.

Pradiniai source: core `c005a8f6`, public `abc78ea7`, fetched main `7af6b964`/`ec8a9c03`, abu canonical freshness PASS. Įrodymai ir patikros – `output/parasoplansetes-style-alignment-20261014/`. Tai nėra naujas turinio patvirtinimas ar SEO matomumo įrodymas.

## Rezultatas ir patikros

Vienas `shell` visiems StepOver puslapiams nustato baltą foną ir 1600 px maksimalų header/footer rėmą. Homepage kontaktų mygtuko, gidų kortelių, kontaktų sekcijos ir mobilūs stiliai perkelti į bendrus tos svetainės selektorius. Vidinių puslapių H1 naudoja tą patį display vaidmenį; išsaugotas siauresnis ilgo straipsnio skaitymo plotis. Poraštės informacija ir nuorodų atranka lieka to paties bendro komponento atsakomybė. Tik vidinių puslapių utility juosta pašalinta kartu su jos nebenaudojamais CSS.

Naršyklėje patikrintos 7 rūšys: homepage, programinė įranga, katalogas, duraSign 4.3 produktas, PDF gidas, gidų centras ir kontaktai. 1280 ir 390 px actual peržiūrose header/footer rėmai sutampa, fonas baltas, horizontalios perpildos nėra. Papildomas 320 px programų puslapio, meniu ir footer bandymas be horizontalios perpildos; logo 180 px telpa kartu su meniu. Išsaugotos realios ekrano nuotraukos ir DOM matmenys. Pirmos dalies nuotraukos prieš SVG logotipo įkėlimą parodė nepilną paint; galutinės peržiūros užfiksuotos sulaukus networkidle, logotipo asset ar crop nekeisti.

70/70 core testų, typecheck, scoped ESLint, build, Wrangler dry-run ir vietinės bei domeno HTTP patikros PASS. Impeccable mechaninis detector grąžino tuščią radinių sąrašą; tai atskiras šaltinio patikrinimas, ne visos svetainės kokybės balas. Viešame domene po diegimo naršyklėje matomas naujas programų puslapis ir footer, jų plotis sutampa su homepage.

Esamas immutable package SHA `3bcd0d8400bc205274dd5d24d3b55b84d5631b215016c8a8cc2aedb298800b98` ir network config SHA `b92cc4080d33337214f2f15592a4e4d3b3162f97d29efde33ad5eeec7d3563fc` nepakito. 24 vieši ir 22 paslėpti puslapiai išlaikomi; cutoff `2026-10-13T19:26:19.387Z`. Naujų approval, laidų, medijos ar tekstų revizijų nekurta. Kiti domenai naudoja nepakeistus savo rendererius.

Įdiegta į esamą Worker, versija `d10f2361-c3d5-41ce-96c0-48ca3490ecec`, `--keep-vars`, code-only config be domenų maršrutų keitimo. D1 ir runtime jungikliai išsaugoti; indexing/mail/chat/voice lieka OFF. Ankstesnė atkuriama Worker versija `27cfdbf8-701c-42b3-8552-54afb09a3744`. DNS, nauji mokami ištekliai ir sąskaitos planas nekeisti.

Ribos: tikro 200 % browser zoom IAB klavišų bandymas nepakeitė nei devicePixelRatio, nei viewport, todėl `UNVERIFIED`. Naudotojo tekstų tarpų override šiame bandyme nepritaikytas; nėra pilnos WCAG atitikties deklaracijos. Bandytas 1920 px override nepakeitė pasirinkto live skirtuko 1280 px matmenų, todėl jis neįvardijamas kaip actual plataus ekrano PASS. HTTP helper `remoteDeploymentProven` apex domene grąžina false dėl seno `.workers.dev` host patikrinimo; tai ne diegimo nesėkmė. Tikras domenas, TLS, deployed version ir naršyklės rezultatas užfiksuoti atskirai. Šio mažo UI pavedimo metu helperis nekeistas.
