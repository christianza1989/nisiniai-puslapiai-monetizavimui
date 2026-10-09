import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8'));
const media=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
let delivery={state:'PRIVATE_REVIEW'};try{delivery=JSON.parse(await fs.readFile(new URL('DELIVERY.json',here),'utf8'));}catch{}
const origin='http://127.0.0.1:8876';
const chosen=new Map(sel.pages.map(i=>[i.pageId,i.planId+'.html']));
for(const p of site.pages.filter(p=>p.publishedRevision&&!chosen.has(p.id)))chosen.set(p.id,'reference-'+p.id+'.html');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const captures=[];
for(const [id,file] of chosen){
 const p=site.pages.find(p=>p.id===id),r=await fetch(origin+'/preview/madbeauty/'+id);if(!r.ok)throw Error('Native preview failed '+id);
 const nativeHtml=await r.text();
 let html=nativeHtml.replaceAll('/api/media/madbeauty/','assets/').replace('href="/"','href="index.html"').replace('href="/favicon.svg"','href="data:,"');
 html=html.replace(/href="\/preview\/madbeauty\/([^"]+)"/g,(_,target)=>`href="${chosen.get(target)||'index.html#planned'}"`);
 // A private presentation adapter only: the studio's operator footers are not public article prose.
 const related=(p.links||[]).filter(l=>chosen.has(l.targetPageId)).map(l=>`<a href="${safe(chosen.get(l.targetPageId))}">${safe(l.label||site.pages.find(p=>p.id===l.targetPageId)?.title)}</a>`).join(' · ');
 html=html.replace(/<h2>Planuojamos vidinės nuorodos<\/h2><nav>[\s\S]*?<\/nav>/,related?`<h2>Susiję gidai</h2><nav>${related}</nav>`:'');
 const bibliography=(p.editorial?.sources||[]).filter(s=>s.public&&/^https:\/\//.test(s.url)).map(s=>`<li><a href="${safe(s.url)}" rel="noopener noreferrer">${safe(s.title)}</a>${s.publisher?' · '+safe(s.publisher):''}</li>`).join('');
 html=html.replace(/<h2>Šaltiniai peržiūrai<\/h2><ul>[\s\S]*?<\/ul>/,bibliography?`<h2>Šaltiniai</h2><ul>${bibliography}</ul>`:'');
 for(const b of p.body.filter(b=>b.type==='richParagraph'&&b.content.some(n=>n.target?.kind==='commerce'))){
  const nodeHtml=(n,commerce)=>{
   if(n.type!=='link')return safe(n.text);
   if(n.target.kind==='page'){const target=site.pages.find(p=>p.id===n.target.pageId);return target?`<a href="${chosen.get(target.id)||'index.html#planned'}">${safe(n.text)}</a>`:safe(n.text);}
   if(n.target.kind==='external'&&/^https:\/\//.test(n.target.url))return `<a href="${safe(n.target.url)}" rel="noopener noreferrer">${safe(n.text)}</a>`;
   if(n.target.kind==='commerce'&&commerce){const t=p.editorial.commerceTargets.find(t=>t.id===n.target.targetId);if(!t?.verified)throw Error('Unverified commerce snapshot '+id);return `<a href="${safe(t.url)}">${safe(n.text)}</a>`;}
   return safe(n.text);
  };
  const original='<p>'+b.content.map(n=>nodeHtml(n,false)).join('')+'</p>';
  const adapted='<p>'+b.content.map(n=>nodeHtml(n,true)).join('')+'</p>';
  if(!html.includes(original))throw Error('Native commerce-label block not found '+id);html=html.replace(original,adapted);
 }
 html=html.replace('</style>','main{overflow-wrap:anywhere}</style>');
 const when=new Intl.DateTimeFormat('lt-LT',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Vilnius'}).format(new Date(p.publishAt));
 const notes=''; // Private gates stay in evidence; article preview matches public body.
 html=html.replace('</h1>',`</h1><p style="font-size:14px">Autorius: Madbeauty redakcija · Numatyta ${safe(when)} (Lietuvos laiku)</p>${notes}`);
 await fs.writeFile(new URL(file,here),html);
 captures.push({pageId:id,file,nativeHtmlSha256:createHash('sha256').update(nativeHtml).digest('hex'),adaptedHtmlSha256:createHash('sha256').update(html).digest('hex')});
 for(const asset of p.media)await fs.copyFile(sel.privateStudio+'/media/madbeauty/'+path.basename(asset.src),new URL('assets/'+path.basename(asset.src),here));
}
const cards=sel.pages.map(i=>{const p=site.pages.find(p=>p.id===i.pageId),m=media.find(m=>m.pageId===p.id),a=m.imported.variants.find(a=>a.width===640)||m.imported.variants[0];return `<article data-search="${safe((p.title+' '+p.cluster).toLocaleLowerCase('lt'))}"><a href="${safe(chosen.get(p.id))}"><img src="assets/${safe(path.basename(a.src))}" width="${a.width}" height="${a.height}" alt="${safe(a.alt)}" loading="lazy"></a><div><p class="date">${safe(i.localDate)} · ${safe(i.localTime)} · Lietuvos laiku</p><h2><a href="${safe(chosen.get(p.id))}">${safe(p.title)}</a></h2><p>${safe(p.description)}</p><p class="state">${p.publishedRevision?(delivery.state==='ACTUAL_DOMAIN_VERIFIED'?'Įkeltas į Cloudflare; pasirodys nurodytu laiku':'Patvirtintas; diegimas tikrinamas atskirai'):p.factChecks.length?'Tekstas ir nuotrauka parengti; likusi patikra':'Redakcinė patikra atlikta; publikavimo patvirtinimas atskirai'}</p></div></article>`;}).join('');
const html=`<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Madbeauty: 60 papildomų straipsnių</title><style>body{margin:0;background:#f8f5f1;color:#29212a;font:17px/1.55 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:36px 24px}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.12;max-width:850px}a{color:#9b2950;text-underline-offset:4px}.intro{max-width:850px}.note{padding:18px;background:#fff;border-left:4px solid #9b2950}input{box-sizing:border-box;width:100%;max-width:600px;padding:14px;border:1px solid #c6b8bb;border-radius:8px;font:inherit;margin:24px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{background:#fff;border:1px solid #e0d8d4;border-radius:14px;overflow:hidden}article[hidden]{display:none}article img{width:100%;height:auto;display:block}article div{padding:20px}h2{font-size:1.2rem;line-height:1.3}.date,.state{font-size:14px}.date{color:#70555e}.state{border-top:1px solid #e0d8d4;padding-top:12px}footer{margin-top:35px;font-size:14px}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){main{padding:24px 16px}.grid{grid-template-columns:1fr}}</style></head><body><main><p>MADBEAUTY · PERŽIŪRA 2026-10-10</p><h1>60 papildomų straipsnių ir 60 skirtingų nuotraukų</h1><div class="intro"><p>Auskarai, estetika, plaukai, nagai, depiliacija, masažas, kūno priežiūra, SPA, burnos priežiūra, sportas, tatuiruotės ir kitos platformos temos. Atverk kortelę ir perskaityk visą tekstą.</p><p class="note">Tai privati bendros turinio studijos peržiūra. Datos – esamo kalendoriaus publikavimo akimirkos nuo spalio 30 d. iki gruodžio 23 d., 10:00 arba 16:00 Lietuvos laiku. Teksto parengimas, redakcinė patikra, patvirtinimas ir faktinis įkėlimas turi atskiras būsenas.</p><p>Autorius: <strong>Madbeauty redakcija</strong>. Kainų pavyzdžiai datuoti pagal realių meniu patikrą, o ne pateikti kaip Lietuvos vidurkis. Turinį pagal svetainės redakcinę politiką tikrina agentas: teiginiai, šaltiniai, nuotraukos, nuorodos ir realus vaizdas tikrinami atskirai.</p></div><label for="search">Rasti temą</label><br><input id="search" type="search" placeholder="Pvz., blakstienos, kaina, pedikiūras"><p id="count">60 straipsnių</p><section class="grid">${cards}</section><footer id="planned">Nepublikavus likusių plano temų, jų pasiūlymai išlaikomi privačiame nuorodų plane. Nacionaliniai procedūrų katalogo ID patikrinti; miestų rezultatų ar rezervavimo pasiūlos šis paketas nežada.</footer></main><script>const input=document.querySelector('#search');input.addEventListener('input',()=>{const q=input.value.toLocaleLowerCase('lt');let count=0;for(const a of document.querySelectorAll('article')){a.hidden=!a.dataset.search.includes(q);if(!a.hidden)count++;}document.querySelector('#count').textContent=count+' straipsnių';});</script></body></html>`;
await fs.writeFile(new URL('index.html',here),html);
await fs.writeFile(new URL('PREVIEW-ADAPTER.json',here),JSON.stringify({capturedAt:new Date().toISOString(),private:true,productionRenderer:false,bodyContentUnchanged:true,changes:['Local asset/navigation paths','Organization/date preview byline','Only finalized actual p.links in related guide wrapper','Public editorial source bibliography without private research reason','Verified six-field commerce snapshot hrefs for native plain-label fallback','Responsive overflow-wrap for private reading layout'],captures},null,2)+'\n');
console.log(JSON.stringify({nativeArticlePreviews:chosen.size,newArticles:sel.pages.length,private:true,productionRenderer:false,presentationAdapter:true}));
