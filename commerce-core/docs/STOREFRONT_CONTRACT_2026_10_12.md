# Memocasting turinio ir prekybos ribos — 0.6

Savininko nurodymas svetainės sesijoje 2026-10-12: užbaigti struktūrą ir SEO/GEO,
dizainą atlikti vėliau, su prekybos sesija suderinti integraciją. Šis dokumentas
patvirtina esamo API ir URL ribas; nėra paleidimo ar svetimų failų perėmimas.

| Adresas | Prekybos ir turinio ryšys |
|---|---|
| /products/liejimo-rinkinys-porai | Poros rinkinys, pagrindinis SKU couple; balti dažai +3 EUR yra variantas, jo reali pakuotė/BOM dar nepatvirtinti |
| /products/seimos-rinkinys-1 | Šeimos rinkinys, SKU family; išlaikomas istorinis produkto adresas |
| /collections/all | Dviejų produktų katalogas; papildomų tuščių kategorijų nereikia |
| /pages/instrukcija, /gidai ir patvirtinti gidai | Svetainės turinio projekcija, canonical, schemos ir bendras publikavimo predikatas |
| /cart, checkout ir order būsenos | noindex, ne sitemap/llms; grįžimo URL nepatvirtina mokėjimo |

Papildymo ir kūdikio pasiūlymai nepatvirtinti. Senus adresus laikyti 404 ir
inventoriuje iki tikro turinio/SKU arba pagrįsto artimo migracijos tikslo.
Nerelevantiškų peradresavimų nedaryti. Naujo produkto/kategorijos URL nereikia.

Svetainės sesija valdo sites/memocasting, renderer/config/content/media ir
publikavimo/schemos projekciją savo šakose. Prekybos sesija valdo commerce-core
src/API/migracijas/operators ir checkout/order serverinę eigą. Kitų sesijų
8797/8817 serverių ar darbinių failų nekeisti. PR96 yra nesujungta PR101 bazė.

## Įgyvendintas viešas API

- GET /api/catalog: sku,title,prices (šalies raktai, centai),available,package.
- GET /api/markets: requireCustomer,markets su country,currency,policyVersion,
  delivery/locker pasirinkimais. Browser nekuria savo pristatymo tarifo.
- POST /api/quote: lines[{sku,quantity}],country,currency,deliveryId ir pirkėjas,
  kai būtinas. Serverio snapshot autoritetingas, stock dar nerezervuojamas.
- POST /api/orders: ta pati įvestis, Idempotency-Key ir Order-Access-Token.
  Klientas iš anksto išlaiko abu vienam veiksmui; timeout kartoja tą pačią įvestį.
- GET /api/orders/:id ir POST /api/orders/:id/checkout bei /withdrawal: Bearer
  order token, tos pačios serverio parduotuvės ir tik konkretaus order ribos.
- Stripe signed webhook patvirtina mokėjimą; redirect/query nėra mokėjimo faktas.

0.6 viešo cart/checkout API nelaužo. Pakuočių/kainų endpointai privatūs operatoriui
ir nepakeičia apmokėtos sumos ar viešos pristatymo politikos. Ten atskirai
nurodomas gavėjo įmonės požymis. Prieigos tokenų nelaikyti viešuose URL,
metadata/schema ar loguose; operatoriaus teisių storefront negauna.

## Product / Offer projekcija

Product URL, tekstas, realus vaizdas ir patvirtintos savybės ateina iš svetainės
publikavimo core. Offer prijungiamas tik iš teisingos serverio production store
konfigūracijos su priimtais realiais mokėjimo, siuntimo, įmonės ir likučių
duomenimis. Dabartinis Worker production atmeta.

Vien GET catalog išvestis neturi environment/testOnly žymens. Todėl preview ar
fixture gateway negali būti produkcinio Offer šaltinis. Aplinkos teisę nustato
serverio konfigūracija, ne browser query. Kol ši riba neprijungta, Offer, InStock,
konkretus pristatymo terminas ir tikras checkout nepublikuojami. Vėliau kaina,
valiuta ir prieinamumas privalo sutapti su puslapio rinka ir matomu turiniu.
Production Offer/publikavimo adapteris dar nėra įgyvendintas; tai likusi
commerce–renderer integracija, ne naujas SEO backend.

0.5 turi tikrą laikiną izoliuotą Stripe testą, o ne nuolatinę MB live aplinką.
0.6 turi pakuotes ir current Sendparcel staging read protokolą su fixture.
Patvirtinta Vilnius, 02211; pilnas siuntėjas/MB rekvizitai dar nepateikti. API
laiškas paruoštas privačiai; tikri tarifai, etiketės ir track dar nepatikrinti.
Agentai kuriami po svetainės.

[API](API.md), [būsena](IMPLEMENTATION_STATUS.md),
[0.6 kvitas](CONTINUATION_2026_10_12_SHIPPING.md).
