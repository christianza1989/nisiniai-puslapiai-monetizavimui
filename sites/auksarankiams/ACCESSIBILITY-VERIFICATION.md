# Prieinamumo ir didinimo patikra

Galutinė versija: VERSION.json. qa/ACCESSIBILITY-VERIFICATION.json: Chrome 154 agentui priklausančiame profilyje, viewport null, native chrome://settings/appearance #zoomLevel pasirinkimas 100 → 200 → 100 %. 1424 CSS px / DPR 1 → 712 CSS px / DPR 2 → 1424 /1. Tikras browser zoom, ne CSS transform/viewport/DPR emuliacija. Native procentas matomas chrome-zoom-200.png ir restored100.png. Profilis uždarytas, vartotojo bendri nustatymai neliesti.

Peržiūrėti homepage, indeksas, visi 3 gidų atvėrimai, ilgiausio gido body, šaltiniai, byline, breadcrumb, turinys, forma ir footer. Native meniu/turinys keyboard, fragmentas, contextual inquiry ir empty form veikia. Chrome didinimo PNG fiksavimo CSS/DIP neatitikimas ištaisytas Page.captureScreenshot DIP clipping; nekeičiant puslapio mastelio/pikselių. Pirmas nutrūkęs išorinio QA proceso bandymas paliko tik agento profilį 200 %, jis atkurtas ir galutinė eiga pakartota su restoration.

Atskiras 1440/390/320 testas visiems 13 puslapių (39) + 768 home/contact/longest, vienas H1, visas body tekstas/lists, decoded media, font loaded, overflow nėra. Tikslios nuotraukos qa/*.png, skaitymui patogūs cropai crop-qa.py; cropping nekeičia originalaus ekrano. Iki didinimo visų 3 gidų openings/mobile ir body/sources/footer peržiūrėti; po DIP pataisos tos pačios sritys peržiūrėtos 200 %.

Kontrastai: text 12.48:1; utility 6.07:1; utilityPanel 5.43:1; button 5.81:1; focus 5.07:1; inputBorder 4.43:1; inputBorderPanel 3.51:1; closing 12.48:1. Native menu >=44 px, CTA >=50, inputs >=48, utility/input >=16 px; consent turi susietą visą label, ne vien mažą checkbox targetą. Skip link, focus ir native form bad-email/rejected/success testuoti. Šis ribotas patikrinimas nėra WCAG sertifikatas ar fizinio telefono testas.
