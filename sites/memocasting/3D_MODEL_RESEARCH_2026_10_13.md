# 3D modelių generavimo tyrimas · 2026-10-13

Savininko tiesioginis pavedimas: koks geriausias OpenRouter modelis rankų skulptūrų3D ir ką naudoja Meshy/Tripo. Autorizuota prototipo sesija atliko read-only oficialių šaltinių tyrimą; root peržiūrėjo pilną jos rezultatą. Tai nėra realių generavimų kokybės benchmark ar mokamos API aktyvavimas.

OpenRouter viešas all-models katalogas tyrimo metu grąžino662 modelius, be3D/mesh išvesties ir Meshy/Tripo modelių. Dokumentuoto native text/image-to-3D/GLB endpointo nerasta. OpenRouter LLM gali orkestruoti įrankius/parengti Blender code, bet geometriją generuoja atskira3D API. [Oficialus modelių API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties).

| Kandidatas | Oficialios galimybės | Vieša API kaina, tyrimo diena |
|---|---|---|
| Meshy7.1 | Text/image ir1–4views; GLB. Multiview geometry2k, single-image taip pat4k; textures2K/4K/8K |20credits geometry;Ultra+5;2K/4Ktextured30;remesh+5. [Multi-image API](https://docs.meshy.ai/en/api/multi-image-to-3d), [pricing](https://docs.meshy.ai/en/api/pricing) |
| TripoH3.1,v3.1-20260211 | Text/image/multiview; detali geometrija/GLB,Ultra iki2Mpolygons | image/multiview20credits be texture,30standard texture;detailgeometry+20.1credit=$0.01, detali geometry be texture=$0.40. [API](https://developers.tripo3d.ai/en/docs/generation-multiview-to-model/standard), [pricing](https://developers.tripo3d.ai/en/pricing) |
| TripoP1/P2 | P1small-poly;P2iki50ktriangles/25kquads | Oficialus PSeries tab: P1image/multiview40/50credits, P2 100/110without/withstandardtexture. [P API](https://developers.tripo3d.ai/en/docs/generation-multiview-to-model/p), [pricing](https://developers.tripo3d.ai/en/pricing) |

Meshy latest dabar7.1, nors kai kurie landing puslapiai rašo7. Modelio versiją būsimoje integracijoje prisegti konkrečiai. [Changelog](https://docs.meshy.ai/en/api/changelog). Modelių tapatybės yra Meshy/Tripo šeimos; visos komercinės architektūros šaltiniai neatskleidžia.2D image providers sąrašas nėra3D backend įrodymas; viešas TripoSR taip pat neįrodo dabartinės komercinės API backend. [Tripo models/versions](https://developers.tripo3d.ai/en/docs/models-and-versions), [TripoSR](https://github.com/VAST-AI-Research/TripoSR).

Agentų rekomendacija bandymui: pirmiausia Meshy7.1multiview, palyginti TripoH3.1. Tai nėra įrodytas anatomijos laimėtojas. Poros/šeimos rankoms paruošti4tos pačios skulptūros tikrus priekio/galo/kairės/dešinės vaizdus, vienodą pozą ir apšvietimą. Dabartiniai vieno kampo generuoti PNG nėra patikimi keturių kampų matavimai.

Patvirtinimo seka: abu objektai per abu kandidatus(4jobs) tik po atskiro generation/API budget ir prieigos pasirinkimo. Tikrinti360°/viršų/apačią, nykščius/fingers/riešus/susikibimą/žiedoformą ir sujungtas ar papildomas dalis. [Tripo oficialios anatomijos/generavimo rekomendacijos](https://www.tripo3d.ai/help/features/how-to-get-better-image-to-3d-results). Balta matinė gypsum medžiaga pirmame geometry palyginime; didesnė texture nepašalina extra fingers.

Tik priimtą modelį optimizuoti į orientacinį20–50ktriangles/iki3MBmobileGLB (mūsų bandymo tikslas, ne vendor pažadas). [Khronos validator](https://github.com/KhronosGroup/glTF-Validator) tikrina formatą, o browser QA tikrina tikrąload/orbit/zoom/focus/touch; anatomija atskiras žmogaus/agentų vaizdo peržiūros kriterijus. Nepraėjus anatomijai, tikras skenavimas arba rankinis modelio taisymas.

Būsimas serverio adapteris: images→asynchronous task→poll/webhook→GLB→private review→approved public asset. Meshy/Tripo API keys atskiri nuoOpenRouter. Esamo homepage3D stage dabar tikras2D asset swap, ne įdiegtas GLB viewer. Downloads3D reference planas galioja; realiusmodelius savininkas pateiks vėliau.

Tyrimo ribos: Stripe Directory CLI šioje peer aplinkoje nepasiekiamas ir neįdiegtas; Treg kataloge3Dendpointo nerasta, naudotos oficialios docs ir actual pricing tabs. Jokio paidjob/provision/grant/accountlogin/generavimo ar svetimų failų pakeitimo. Kainos/modelių katalogai kinta; prieš budget/job dar kartą patikrinti. APIcredit kaina nepaverčiama Studio subscriptioncredit kaina.
