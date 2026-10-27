import assert from 'node:assert/strict';

// Two reviewed additions to already published product pages; no commerce data,
// dates, price, availability, pictures, or unrelated sections are changed.
export function productClarityChanges(pkg, observedAt) {
  const get = slug => {
    const page = pkg.pages.find(p => p.slug === slug);
    assert.ok(page, `Missing page: ${slug}`);
    assert.ok(Date.parse(page.publishAt) <= Date.parse(observedAt), `Not public: ${slug}`);
    return page;
  };
  const pair = get('rinkinys-porai');
  const family = get('seimos-rinkinys');
  const pairGuide = get('instrukcijos/poros-rinkiniui');
  const familyGuide = get('instrukcijos/seimos-rinkiniui');
  const copy = p => ({ id:p.id, slug:p.slug, expectedRevisionHash:p.revisionHash, publishAt:p.publishAt, input:{ body:structuredClone(p.body), links:structuredClone(p.links) } });
  const a = copy(pair), b = copy(family);
  const replace = (row, original, replacement) => {
    const blocks=row.input.body.filter(block=>block.type==='paragraph' && block.text===original);
    assert.equal(blocks.length,1,`${row.slug}: expected unique original paragraph`);
    blocks[0].text=replacement;
  };
  replace(a,
    'Tai gali būti bendra veikla dviese, dovana vestuvėms, metinėms ar įkurtuvėms. Dovanodami rinkinį dovanojate ir progą skirti laiko vienas kitam. Nuotraukose matote galimo rezultato bei apdailos pavyzdžius; įsigyjate medžiagų rinkinį savo liejiniui, o ne jau pagamintą skulptūrą.',
    'Tai gali būti bendra veikla dviese, dovana vestuvėms, metinėms ar įkurtuvėms. Dovanodami rinkinį dovanojate ir progą skirti laiko vienas kitam. Nuotraukose matote galimo rezultato bei apdailos pavyzdžius; įsigyjate medžiagų rinkinį savo liejiniui, o ne jau pagamintą skulptūrą. Jei planuojate kūrybinę veiklą su šeima, palyginkite šeimos rinkinį: jame yra po du alginato ir gipso pakelius. Rankų padėtį ir tinkamumą aptarkite pagal jų dydį bei pasirinktą kompoziciją.');
  replace(b,
    'Šeimos komplekte yra du alginato ir du gipso pakeliai. Poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso. Abiejuose rinkiniuose balti dažai jau įskaičiuoti.',
    'Šeimos komplekte yra du alginato ir du gipso pakeliai. Poros rinkinyje yra vienas alginato pakelis ir 1 200 g gipso. Abiejuose rinkiniuose balti dažai jau įskaičiuoti.');
  const appendTime = (row, heading, label) => {
    const i=row.input.body.findIndex(block=>block.type==='heading' && block.text===heading);
    assert.ok(i>=0,`${row.slug}: expected process heading`);
    const next=row.input.body.findIndex((block,index)=>index>i && block.type==='heading');
    assert.ok(next>i,`${row.slug}: expected next section`);
    row.input.body.splice(next,0,{type:'paragraph',text:`Pagal ${label} gipsas formoje stingsta vieną valandą. Išimtą liejinį prieš dažant reikia džiovinti 5–7 paras, kol jis taps baltas. Jei prie jūsų rinkinio pridėta instrukcija skiriasi, prieš pradėdami pasitikslinkite su mumis.`});
  };
  appendTime(a,'Kaip gimsta rankų liejinys?','poros rinkinio instrukciją');
  appendTime(b,'Nuo atspaudo iki skulptūros','šeimos rinkinio instrukciją');
  a.input.links.push({targetPageId:family.id,label:'šeimos rinkinį'},{targetPageId:pairGuide.id,label:'poros rinkinio instrukciją'});
  b.input.links.push({targetPageId:pair.id,label:'Poros rinkinyje'},{targetPageId:familyGuide.id,label:'šeimos rinkinio instrukciją'});
  for(const row of [a,b]) for(const link of row.input.links) assert.ok(link.targetPageId!==row.id);
  return [a,b];
}
