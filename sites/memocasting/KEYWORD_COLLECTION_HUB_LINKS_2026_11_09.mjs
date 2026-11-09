// Distinct anchor labels avoid colliding with the existing guide links.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-keywords-public-20261109`;
process.env.STUDIO_DATA_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${root}/memo-keywords-bulk-studio-20261109/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${root}/memo-keywords-core-20261109/content-studio/src/model.mjs`));
const site=await model.getSite('memocasting'), get=slug=>{const p=site.pages.find(p=>p.slug===slug);assert.ok(p,slug);return p;};
const hub=get('dovanos');
const baseline=JSON.parse(await readFile(`${pub}/content-packages/memocasting/content-package.json`,'utf8'));
const old=baseline.pages.find(p=>p.slug==='dovanos');
const groups=[
 ['Pagal gavėją: ',[['dovanos/moterims','rinkiniai dovanai moteriai'],['dovanos/vyrams','rinkiniai dovanai vyrui'],['dovanos/mamai','rinkiniai dovanai mamai'],['dovanos/seneliui','rinkiniai dovanai seneliui'],['dovanos/mociutei','rinkiniai dovanai močiutei']]],
 ['Kuriant kartu: ',[['dovanos/porai','rinkiniai dovanai porai'],['dovanos/seimai','rinkiniai dovanai šeimai'],['dovanos/valentino-dienai','rinkiniai Valentino dienai']]],
 ['Kalėdoms: ',[['dovanos/kaledoms','kalėdiniai rinkiniai'],['dovanos/kaledoms/mamai','kalėdiniai rinkiniai mamai'],['dovanos/kaledoms/moterims','kalėdiniai rinkiniai moterims'],['dovanos/kaledoms/vyrams','kalėdiniai rinkiniai vyrams'],['dovanos/kaledoms/seimai','kalėdiniai rinkiniai šeimai'],['dovanos/kaledoms/tevams','kalėdiniai rinkiniai tėvams']]],
 ['Pagal idėją: ',[['dovanos/personalizuotos','asmeniško liejinio idėjos'],['dovanos/originalios','originalios liejimo dovanos']]]
];
const blocks=groups.map(([prefix,items])=>({type:'paragraph',text:prefix+items.map(x=>x[1]).join(' · ')+'.'}));
const links=groups.flatMap(([,items])=>items.map(([slug,label])=>({targetPageId:get(slug).id,label})));
assert.equal(old.links.length+links.length,30);
await model.editPage('memocasting',hub.id,{body:[...old.body,{type:'heading',level:2,text:'Rankų liejimo dovanų kolekcijos'},...blocks],links:[...old.links,...links]});
console.log('draft hub: 30 links, 16 distinct collection anchors; remaining 4 linked from parent collections');
