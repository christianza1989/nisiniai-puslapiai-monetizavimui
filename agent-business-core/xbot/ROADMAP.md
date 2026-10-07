# Xbot darbo ir priėmimo planas

- [x] Treg setup, actor ir vienos siauro query actual probe; $0.07 receipts, be write.
- [x] Per-site kanalo profilio sutartis: faktų versija, mandatas, allowed actions, išlaidų ir laiko kvotos, quiet hours; default OFF.
- [ ] Patvari SQLite social-job eilė: atominis account lease, revision-bound review, no duplicate dispatch, unknown write reconciliation, dienos ir mėnesio reserve/settlement.
- [ ] Įrankiai: own-profile, research, mentions, own-post metrics, original post/thread, media/alt, inbound reply/DM tik su actual capabilities ir platformos pagrindu. Like/hide/spam nenumatyti.
- [ ] Codex CLI per bendrą no-tools CodexLab: dienos planas, originalūs juodraščiai, atskira peržiūra, kvalifikavimas ir dienos išvados; bounded calls/time, no-tools ir injected tekstas tik duomenys.
- [ ] Worker: ryto planas, periodinis tyrimas/inbound, pagal kalendorių publikavimas, vakaro rezultatų suvestinė. Darbo laikai nėra reikalavimas nuolat rašyti postus.
- [x] Privatus operator GUI: statusas, kalendorius, juodraščiai/review, signalai, faktai/politika, kvitai/išlaidos ir pause/resume. Pardavimų adapteris dar nėra veikiantis.
- [ ] Bendro core projekcijos ir CaseSource sąsajos: toks pats siteId/business_id, tikras inbound atskirai nuo researched signalų; jokio default telefono/adreso pernešimo.
- [ ] API vienas actual original-post/media bandymas tik su aiškiu actor/produkto paskirties tinkamumu; ne publikuoti netinkamo asmeninio profilio testinį turinį vien checklistui.
- [ ] Negatyvūs tenant/budget/revision/pause/idempotency/injection/timezone testai, actual desktop/mobile/keyboard UI ir vienas Codex vertikalus kelias.
- [ ] Git/safety/PR perdavimas ir paleidimo runbook; nepriskirti unavailable live vartams PASS.

Pilotui 4 originalūs naudingi postai/sav. yra pradinė hipotezė, ne API allowance. X ir FB pardavimų atribucija nesumuojama kaip papildomas pelnas. Fake demo/device benchmark negali pavirsti produkto įrodymu. ImageGen iliustracija gali būti tik aiškiai redakcinė, ne tikro įrenginio veikimo pakaitalas.

**Tęsti po šio paketo:** išspręsti tikrą CLI modelio prieigą (dabar FAIL), patvirtinti actor/brand paskirtį ir pasikartojantį spend; įgyvendinti approved core fact projekciją + X CaseSource adapterį, tikras medijos importo/rights ir inbound consent UI sąsajas, užbaigiant šių funkcijų vertikalų kelią. Kainų/kvotų/lease/mock kelių kodas yra, bet reconciliation šiuo metu tik surenka audit evidence ir automatiškai nekeičia unknown į success. Nenubraukti likusių checkbox vien dėl 28 local tests.

Pagrindiniai šaltiniai: [Treg onboarding](https://treg.to/llms.txt), [X kainos](https://docs.x.com/x-api/getting-started/pricing), [X automation](https://help.x.com/en/rules-and-policies/x-automation), [FB/X auditas PR20](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/20). Įgyvendinimo detalės ir nepraleisti vartai fiksuojami QA.
