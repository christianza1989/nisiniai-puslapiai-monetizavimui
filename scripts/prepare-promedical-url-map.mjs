import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const [publicRoot,dir]=process.argv.slice(2);
if(!publicRoot||!dir)throw Error('Usage: node scripts/prepare-promedical-url-map.mjs <public-root> <private-work-directory>');
await fs.mkdir(dir,{recursive:true});
const pkg=JSON.parse(await fs.readFile(path.join(publicRoot,'content-packages/promedical/content-package.json'),'utf8'));
const ascii=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const cats=pkg.pages.filter(p=>p.slug.startsWith('kategorijos/'));
const byId=new Map(cats.map(p=>[p.id,p]));
const overrides={
 'infuflex-page':'infuflex-sulankstomas-infuziju-stovas',
 'metal-line-basic':'metal-line-basic',
 'metal-line-basic-sestavy':'metal-line-basic-komplektacijos',
 'metal-line-profi':'metal-line-profi',
 'metal-line-profi-sestavy':'metal-line-profi-komplektacijos',
 'specialni-voziky':'specialios-paskirties-vezimeliai',
 'ukazka-vyrobku-navrzenych-podle-prani-zakazniku':'individualiai-suprojektuoti-gaminiai',
 'steny-a-regaly':'pakabinami-stovai-stelazai-ir-vielos-gaminiai',
 'sestavy-manipulacnich-voziku-se-systemem-rego':'rego-vezimeliu-komplektacijos',
 'vybaveni-pro-velkokapacitni-mycky-prehled':'plovimo-irenginiu-priedai',
 'protihlukove-a-protiskluzove-podlozky':'triuksma-ir-slydima-mazinantys-ideklai',
 'akcni-nabidky':'specialiuju-pasiulymu-asortimentas',
 'vyprodej-hlavni-menu':'ispardavimo-asortimentas',
 'vyprodej-nabidka':'ispardavimas',
 'vyprodej-skladovych-zasob-9417':'sandelio-atsargu-ispardavimas',
};
function segment(p){
 const old=p.slug.slice('kategorijos/'.length);
 if(overrides[old])return overrides[old];
 let t=p.title.replace(/\s*\|\s*Promedical$/iu,'');
 t=t.replace(/^Žemas variantas \(aukštis (.+)\)$/u,'Žemas $1').replace(/^Aukšta versija \(aukštis (.+)\)$/u,'Aukštas $1');
 t=t.replace(/\s+serija$/iu,'').replace(/\s*\(papildomi elementai\)/iu,'');
 return ascii(t);
}
function ancestry(p,seen=new Set()){
 assert.ok(!seen.has(p.id),'category cycle '+p.slug);seen.add(p.id);
 const parents=p.links.map(l=>byId.get(l.targetPageId)).filter(Boolean);
 assert.ok(parents.length<=1,'multiple parents '+p.slug);
 return [...(parents[0]?ancestry(parents[0],seen):[]),p];
}
const rows=[];
for(const p of cats){const chain=ancestry(p);rows.push({id:p.id,type:'category',title:p.title,from:p.slug,to:'kategorijos/'+chain.map(segment).join('/'),ancestors:chain.slice(0,-1).map(p=>({id:p.id,title:p.title}))});}
const products=pkg.pages.filter(p=>p.type==='product');
const codeWords={ukazka:'',varianta:'variantas',zasuvka:'stalcius',ocel:'plienas',vyprodej:'variantas',vypr:'variantas',pruh:'juosta',pruhy:'juostos',poradac:'skirstytuvas',brzda:'stabdis',pruzinaeur:'spyruokle-eur',centralni:'centrinis',smerova:'krypties',aretace:'fiksavimas',rucni:'rankinis',lekovy:'vaistams',prislusenstvi:'priedai',prevazovy:'tvarstymui',siti:'siuvimui',nove:'nauja',madlo:'rankena',prodej:'variantas',modry:'melynas'};
for(const p of products){
 const rawCode=p.intent.split(' | ')[0].slice('Katalogo kodas: '.length);
 const code=ascii(rawCode).split('-').map(w=>codeWords[w]??w).filter(Boolean).join('-');
 let title=p.title.replace(/\s*\|\s*Promedical$/iu,'').replace(/\s*[–-]\s*pakeičia ankstesnį modelį.*$/iu,'').replace(/\bIŠPARDAVIMAS\b|YRA SANDĖLYJE|su nuolaida/giu,'').replace(/\b(?:kodas|kod\.)\s*/giu,'');
 if(code.length>2){for(const c of [rawCode.replace(/\*/g,''),...rawCode.split('-').filter(c=>c.length>3)])title=title.replace(new RegExp('\\b'+c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','giu'),'');}
 title=title.replace(/^BASIC,\s*PROFI/iu,'BASIC PROFI');
 let main=title.split(/\s+[–-]\s+|,\s*/u).map(s=>s.trim()).find(s=>ascii(s).split('-').length>=2)||title;
 if(/komplektacijos pavyzdys/iu.test(title)&&/\s[–-]\s/u.test(title))main=title.split(/\s[–-]\s/u).at(-1)+' komplektacijos pavyzdys';
 if(/^KLARO MOP SYSTÉM/iu.test(main))main='Plokščioji grindų šluostė Klaro MOP';
 const grade=p.title.match(/\b(II|III) kokybės rūšis/iu)?.[0];
 let base=ascii(main+(grade?' '+grade:''));
 const max=119-code.length;
 if(base.length>max){const words=base.split('-');base='';for(const w of words){if((base?base.length+1:0)+w.length>max)break;base+=(base?'-':'')+w;}base=base.replace(/-(?:ir|arba|su|be|pagal|is|bei)$/u,'');}
 assert.ok(base&&code,'empty product identity '+p.slug);
 rows.push({id:p.id,type:'product',title:p.title,sku:rawCode,from:p.slug,to:'produktai/'+base+'-'+code});
}
const merged=rows.find(r=>r.from==='kategorijos/kategorie');
const retained=rows.find(r=>r.from==='kategorijos/kategorie-sadrovaci-voziky');
const a=byId.get(merged.id),b=byId.get(retained.id);
for(const field of ['title','description','body','media','links'])assert.deepEqual(a[field],b[field],'merge differs in '+field);
assert.deepEqual(pkg.pages.filter(p=>p.links.some(l=>l.targetPageId===a.id)).map(p=>p.id).sort(),pkg.pages.filter(p=>p.links.some(l=>l.targetPageId===b.id)).map(p=>p.id).sort());
merged.targetPageId=retained.id;
merged.action='merge-identical-category';
const duplicates=rows.filter(r=>rows.some(v=>v.id!==r.id&&v.to===r.to&&(r.targetPageId||r.id)!==(v.targetPageId||v.id)));
const long=rows.filter(r=>r.to.length>150);
const collidingWithOld=rows.filter(r=>pkg.pages.some(p=>p.id!==r.id&&p.slug===r.to));
await fs.writeFile(path.join(dir,'candidate-map.json'),JSON.stringify({version:1,siteId:pkg.siteId,canonicalHost:pkg.canonicalHost,preparedAt:new Date().toISOString(),rows,duplicates,long,collidingWithOld},null,2)+'\n');
await fs.writeFile(path.join(dir,'candidate-map.tsv'),rows.map(r=>[r.type,r.title,r.from,r.to].join('\t')).join('\n')+'\n');
console.log(JSON.stringify({categories:cats.length,products:products.length,unchanged:rows.filter(r=>r.from===r.to).length,duplicates,long:long.map(r=>({from:r.from,to:r.to,length:r.to.length})),collidingWithOld,samples:rows.filter(r=>/nerez1005ais|nerez1101|zakladni-voziky|basic-mini-nizka|basic-mini-nizke|infuzni-stojany/.test(r.from))},null,2));
