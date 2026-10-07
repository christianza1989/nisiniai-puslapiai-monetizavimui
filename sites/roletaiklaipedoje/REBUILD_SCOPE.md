# Perkūrimo ir šalinimo ribos

2026-10-07. Izoliuota pora C:/Users/Lenovo/Documents/Nisiniai_puslapiai/roletai-rebuild/. Abu worktree pradėti nuo origin/main. Originalūs nešvarūs darbo medžiai nepakeisti.

Prieš šalinimą inventorius: public components/niche/roletaiklaipedoje-site.tsx ir .module.css; content-packages/roletaiklaipedoje/; public/content-assets/roletaiklaipedoje/; own font/license, jei nėra kitų vartotojų. app/niche/[siteId]/[[...slug]]/page.tsx branch išlieka prijungimo vieta. lib/generated/content-packages.json regeneruojamas bendru compileriu, ne ranka. config domeno tapatybė ir operatoriaus kontaktas išlieka.

Private: senas content-studio/scripts/build-roletaiklaipedoje-site.mjs šalinamas; sites/roletaiklaipedoje/assets/ senos tik šiam domenui skirtos medijos/fontai ir senas PRODUCT/DESIGN/SURFACE/REVIEW perrašomi nauju rezultatu. Naujas history išsaugomas. sites/roletaiklaipedoje.md pakeičiamas naujo rezultato indeksu. Git istorija saugo ankstesnį darbą; bendrų tyrimų ir kitų nišų failai netrinami.

Kiekvienas Remove-Item tik su LiteralPath ir prieš tai resolved absolute path containment patikra šio worktree ribose. Senas aktyvus turinys nebus naudojamas kaip naujas tekstas ar dizainas.
