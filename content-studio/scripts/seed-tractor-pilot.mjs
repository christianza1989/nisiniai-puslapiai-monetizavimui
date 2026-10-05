import { initialize, getSite, mergePlan, editPage } from '../src/model.mjs';

// Reproducible editorial pilot. This only creates private planned pages and link/source candidates.
const siteId = 'traktoriupadangos';
const sources = {
  markings: ['https://business.michelinman.com/tips-suggestions/reading-tire-markings', 'Michelin: padangos žymėjimas'],
  faq: ['https://www.trelleborg-tires.com/en/education/faq', 'Trelleborg: žemės ūkio padangų DUK'],
  manual: ['https://www.trelleborg-tires.com/-/media/tires-aft/datatsheet/technical-manual/trelleborg-technical-manual-en.pdf?rev=258948143820400e9a05c5a63b8c7ae0', 'Trelleborg: techninis vadovas'],
  pressure: ['https://business.michelinman.com/help-advice/tools/agropressure', 'Michelin: AgroPressure'],
  rolling: ['https://blog.bridgestone-agriculture.eu/impact-of-the-dynamic-rolling-circumference-of-agricultural-tyres', 'Bridgestone: riedėjimo apskritimas'],
  safety: ['https://business.michelinman.com/tips-suggestions/tire-mounting-and-dismounting', 'Michelin: montavimo sauga'],
};
const rows = [
  ['2026-10-08', 'gidas/kaip-issirinkti-traktoriaus-padangas', 'Kaip išsirinkti traktoriaus padangas: nuo kokių duomenų pradėti?', 'Kokių traktoriaus ir darbo duomenų reikia prieš renkantis padangas?', 'Parinkimas', '', 'Prieš pavasario darbus pradėti nuo pagrindinių parinkimo klausimų.', ['markings', 'faq', 'manual'], []],
  ['2026-10-22', 'gidas/traktoriaus-padangu-zymejimas', 'Traktoriaus padangų žymėjimas: kaip skaityti šoninę sienelę?', 'Kaip perskaityti dydį, konstrukciją, apkrovos ir greičio kodą?', 'Parinkimas', 'gidas/kaip-issirinkti-traktoriaus-padangas', 'Ankstyvas praktinis gidas prieš sezono pasirengimą.', ['markings', 'faq'], ['gidas/kaip-issirinkti-traktoriaus-padangas']],
  ['2026-11-12', 'gidas/radialines-ar-diagonalines-traktoriaus-padangos', 'Radialinės ar diagonalinės traktoriaus padangos: kuo skiriasi?', 'Kuo skiriasi padangų konstrukcijos ir kada šis skirtumas svarbus?', 'Parinkimas', 'gidas/kaip-issirinkti-traktoriaus-padangas', '', ['faq', 'manual'], ['gidas/kaip-issirinkti-traktoriaus-padangas', 'gidas/traktoriaus-padangu-zymejimas']],
  ['2026-12-03', 'gidas/traktoriaus-padangos-ir-ratlankio-suderinamumas', 'Traktoriaus padangos ir ratlankio suderinamumas', 'Kodėl prieš keičiant dydį būtina patikrinti leidžiamą ratlankį?', 'Parinkimas', 'gidas/kaip-issirinkti-traktoriaus-padangas', '', ['markings', 'faq', 'manual'], ['gidas/kaip-issirinkti-traktoriaus-padangas', 'gidas/traktoriaus-padangu-zymejimas']],
  ['2026-12-17', 'gidas/traktoriaus-padangu-apkrovos-ir-greicio-indeksai', 'Traktoriaus padangų apkrovos ir greičio indeksai', 'Ką reiškia indeksai ir kodėl jų negalima vertinti atskirai nuo sąlygų?', 'Parinkimas', 'gidas/kaip-issirinkti-traktoriaus-padangas', '', ['markings', 'manual'], ['gidas/traktoriaus-padangu-zymejimas', 'gidas/traktoriaus-padangos-ir-ratlankio-suderinamumas']],
  ['2027-01-14', 'gidas/priekiniu-ir-galiniu-padangu-derinimas-4x4', 'Priekinių ir galinių padangų derinimas 4x4 traktoriui', 'Kodėl keičiant vienos ašies padangas svarbus riedėjimo apskritimas?', 'Parinkimas', 'gidas/kaip-issirinkti-traktoriaus-padangas', 'Prieš pavasario lauko darbus patikrinti ašių suderinamumą.', ['faq', 'rolling'], ['gidas/kaip-issirinkti-traktoriaus-padangas', 'gidas/traktoriaus-padangos-ir-ratlankio-suderinamumas']],
  ['2027-01-28', 'gidas/traktoriaus-padangu-slegis-lauke-ir-kelyje', 'Traktoriaus padangų slėgis lauke ir kelyje: nuo ko jis priklauso?', 'Kokie duomenys lemia slėgį ir kodėl vieno skaičiaus visiems nėra?', 'Eksploatacija', '', 'Prieš pavasario darbus paaiškinti, kodėl reikia individualios gamintojo lentelės.', ['manual', 'pressure'], ['gidas/kaip-issirinkti-traktoriaus-padangas', 'gidas/traktoriaus-padangu-apkrovos-ir-greicio-indeksai']],
  ['2027-02-11', 'gidas/if-ir-vf-traktoriaus-padangos', 'IF ir VF traktoriaus padangos: ką reiškia žymos?', 'Ką reiškia IF/VF ir ką patikrinti prieš pasirenkant?', 'Eksploatacija', 'gidas/traktoriaus-padangu-slegis-lauke-ir-kelyje', 'Prieš lauko darbų sezoną atsakyti į pažangesnį parinkimo klausimą.', ['faq', 'manual'], ['gidas/traktoriaus-padangu-zymejimas', 'gidas/traktoriaus-padangu-slegis-lauke-ir-kelyje']],
  ['2027-02-25', 'gidas/duomenys-traktoriaus-padangu-uzklausai', 'Kokius duomenis paruošti traktoriaus padangų užklausai?', 'Kokią informaciją apie esamas padangas, ratlankį, mašiną ir darbą surinkti?', 'Sprendimo pasirengimas', '', 'Prieš pavasario paklausą padėti pasirengti specialistų konsultacijai.', ['markings', 'manual', 'pressure'], ['gidas/kaip-issirinkti-traktoriaus-padangas', 'gidas/traktoriaus-padangu-slegis-lauke-ir-kelyje']],
  ['2027-03-11', 'gidas/traktoriaus-padangu-montavimo-sauga', 'Traktoriaus padangų montavimo sauga: ką patikėti specialistui?', 'Kodėl montavimas ir pripūtimas turi vykti su tinkama įranga?', 'Sprendimo pasirengimas', 'gidas/duomenys-traktoriaus-padangu-uzklausai', 'Prieš lauko darbų sezoną pateikti saugos ribas be savarankiško montavimo instrukcijos.', ['safety', 'manual'], ['gidas/traktoriaus-padangos-ir-ratlankio-suderinamumas', 'gidas/traktoriaus-padangu-slegis-lauke-ir-kelyje']],
];

await initialize();
const before = await getSite(siteId);
const existingSlugs = new Set(before.pages.map(page => page.slug));
const proposals = [
  { type: 'home', slug: '', title: 'Traktorių padangų pasirinkimo gidas', description: 'Praktiniai klausimai apie traktoriaus padangų žymėjimą, suderinamumą ir naudojimą.', intent: 'Pradėti traktoriaus padangų pasirinkimą', reason: 'Informacinis centras be nepatvirtinto prekybos pažado.', cluster: 'Pradžia', pillarSlug: '', sourceQueries: [], publishDate: '2026-09-30', seasonalHook: '' },
  ...rows.map(([publishDate, slug, title, intent, cluster, pillarSlug, seasonalHook, sourceIds]) => ({
    type: 'guide', publishDate, slug, title, description: intent, intent, reason: `Atsakyti į savitą klausimą. ${seasonalHook}`.trim(),
    cluster, pillarSlug, seasonalHook, sourceQueries: sourceIds.map(id => sources[id][1]),
  })),
];
const result = await mergePlan(siteId, proposals, 6);
const site = await getSite(siteId);
for (const [publishDate, slug, , , , , , sourceIds, targetSlugs] of rows) {
  if (existingSlugs.has(slug)) continue;
  const page = site.pages.find(item => item.slug === slug);
  const linkSuggestions = targetSlugs.map(targetSlug => {
    const target = site.pages.find(item => item.slug === targetSlug);
    return target ? { targetPageId: target.id, label: target.title, reason: 'Papildomas susijęs skaitytojo klausimas.' } : null;
  }).filter(Boolean);
  const externalLinks = sourceIds.map(id => ({ url: sources[id][0], label: sources[id][1], reason: 'Pirminis šaltinis techniniams teiginiams patikrinti.', verified: false }));
  await editPage(siteId, page.id, { linkSuggestions, externalLinks });
}
for (const [, slug, , , , pillarSlug] of rows) {
  if (pillarSlug) continue;
  const page = site.pages.find(item => item.slug === slug);
  if (page?.pillarPageId && !page.publishedRevision) await editPage(siteId, page.id, { pillarPageId: '' });
}
console.log(JSON.stringify({ ...result, siteId, dates: rows.map(item => item[0]) }, null, 2));
