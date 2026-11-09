// Correct private draft anchors. No review, approval, release or deployment.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const core=`${root}/memo-keywords-core-20261109`,pub=`${root}/memo-keywords-public-20261109`,work=`${root}/memo-keywords-studio-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const site=await model.getSite('memocasting');
const id=slug=>{const p=site.pages.find(x=>x.slug===slug);assert.ok(p,slug);return p.id;};
const labels={
 'dovanos/mamai':['dovanų mamai gide','Poros rinkinį','šeimos rinkinio aprašymą','pristatymo mokestį','susisiekite'],
 'dovanos/vyrams':['dovanų vyrams gide','Poros rinkinys','šeimos rinkiniu','pristatymo informaciją','susisiekti'],
 'dovanos/porai':['Dovanos porai gide','poros rinkinį','šeimos rinkinio aprašymą','pristatymo informaciją','susisiekite']
};
for(const [slug,anchors] of Object.entries(labels)){
 const page=site.pages.find(x=>x.slug===slug);assert.ok(page);
 const body=structuredClone(page.body);
 if(slug==='dovanos/porai'){
  const old='Prieš pirkdami peržiūrėkite pristatymo bei grąžinimo puslapius.';
  const block=body.find(b=>b.text?.includes(old));assert.ok(block);
  block.text=block.text.replace(old,'Prieš pirkdami peržiūrėkite pristatymo informaciją ir grąžinimo sąlygas.');
 }
 const text=body.map(b=>b.text||'').join('\n');
 for(const anchor of anchors)assert.ok(text.includes(anchor),`${slug}: missing ${anchor}`);
 const guide=slug==='dovanos/mamai'?'gidai/dovanos-mamai':slug==='dovanos/vyrams'?'gidai/dovanos-vyrams':'gidai/dovana-porai';
 const targets=[guide,'rinkinys-porai','seimos-rinkinys','pristatymas','kontaktai'];
 const updated=await model.editPage('memocasting',page.id,{body,links:targets.map((target,i)=>({targetPageId:id(target),label:anchors[i]}))});
 assert.equal(updated.approval,null);
 console.log(JSON.stringify({slug,revisionHash:model.revisionHash(updated),state:'draft-unreviewed'}));
}
