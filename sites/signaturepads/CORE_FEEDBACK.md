# Signaturepads: Core patirtis

2026-10-31, issue303 / public102. Savininko Cloudflare pavedimas reikalavo
tikros atskiros peržiūros, išlaikant veikiantį WordPress ir production
launch checks. Loopback admission teisingai neleido seno local-preview
tiesiog publikuoti. Įgyvendintas atskiras exact-host / readOnly / testOnly
hosted-preview su8 lokalių sričių įrodymais; production13 vartų ir paketo
baitai nekinta. Upgrade `cc4ba8c4-8141-4d57-8efe-944cf5db6cb7`.

Tikras edge browser testas rado bendrą integracijos spragą: Vinext rezervuoja
`/_next` ir Worker-first režimu neperduoda CSS / JS į ASSETS. Visi26 HTML,
204 vaizdai ir237 alias jau buvo PASS, bet tai neįrodė dizaino. Kanoninis
hostedPreviewAssetResponse perduoda tik viešą framework static namespace po
to paties host / method vartų; turinio ir medijos native vartai lieka Core.
ESM adapteris taiko tą patį helperį nekintamam compiled Core ir įrašo source /
artifact SHA. Pridėta prasminga regresija bei bendro SEO smoke realizuotų
CSS / JS tikrinimas ir V2 / exact hosted origin palaikymas. V1 prielaidos
išliko; native favicon redirect griežtai siejamas su metadata ir projekcija.
Upgrade `f2d7b5ba-5b0f-48ff-a51e-9ac2367f08e2`.

Galutinė priėmimo ataskaita: [Cloudflare peržiūra](CLOUDFLARE-PREVIEW-20261031.md).
314 testų, types, tikras SEO smoke ir4 pločių browser PASS. Tiksli dalinio
build / adapterio kilmė ir ankstesni FAIL išsaugoti. Nepriskirti production
launch, SMTP / INBOX, main merge ar automatinio kitų PC adoption.
