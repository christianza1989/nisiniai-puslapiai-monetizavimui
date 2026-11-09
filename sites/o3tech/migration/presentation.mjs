import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parseHTML} from '../../../../tools/node_modules/linkedom/esm/index.js';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..'));
const site=JSON.parse(await readFile(path.join(root,'private/studio-data/sites/o3tech.json'),'utf8'));
const captures=JSON.parse(await readFile(path.join(root,'private/capture/pages.json'),'utf8'));
const api=JSON.parse(await readFile(path.join(root,'private/capture/api.json'),'utf8'));
const file=path.join(root,'dovanos-memorycasting/config/o3tech-layout.json');
const layout=JSON.parse(await readFile(file,'utf8'));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const signature=s=>createHash('sha256').update(s).digest('hex');
const catalogueCapture=captures.find(c=>c.path==='/prekes/'&&!new URL(c.url).search);
const catalogueDocument=parseHTML(catalogueCapture.html).document;
const cardWidths=new Map([...catalogueDocument.querySelectorAll('li.product')].map(n=>{const a=n.querySelector('a[href*="/produktas/"]'),img=n.querySelector('img');return a?[new URL(a.getAttribute('href'),'https://o3tech.lt').pathname,Number(img?.getAttribute('width'))]:null;}).filter(Boolean));
function inline(node,text){
 const ranges=[],breaks=[],nbsp=[];
 for(const br of node.querySelectorAll('br')){let prefix='',found=false;function walk(n){if(n===br){found=true;return;}if(found)return;if(n.nodeType===3)prefix+=n.textContent;else for(const c of n.childNodes)walk(c);}walk(node);const pos=clean(prefix).length;if(pos>0&&pos<text.length)breaks.push(pos);}
 const raw=node.textContent;for(let i=0;i<raw.length;i++)if(raw[i]==='\u00a0'){const pos=clean(raw.slice(0,i)).length;if(text[pos]===' ')nbsp.push(pos);}
 for(const e of node.querySelectorAll('strong,b,em,i,a[href]')){
  const prefix=[];let found=false;
  function walk(n){if(n===e){found=true;return;}if(found)return;if(n.nodeType===3)prefix.push(n.textContent);else for(const c of n.childNodes)walk(c);}
  walk(node);const label=clean(e.textContent);let start=clean(prefix.join('')).length;if(start&&/\s$/.test(prefix.join('')))start++;
  if(text.slice(start,start+label.length)!==label)start=text.indexOf(label);
  if(!label||start<0)continue;
  const range={start,end:start+label.length,kind:e.tagName==='A'?'link':/^(EM|I)$/.test(e.tagName)?'em':'strong'};
  if(range.kind==='link'){try{const u=new URL(e.getAttribute('href'),'https://o3tech.lt');if(!['https:','http:'].includes(u.protocol))continue;range.href=u.href;}catch{continue;}}
  ranges.push(range);
 }
 return {signature:signature(text),ranges,...(breaks.length?{breaks}:{}),...(nbsp.length?{nbsp}:{} )};
}
for(const page of site.pages){
 const meta=layout.pages[page.id];const cap=captures.find(c=>c.path===meta.path&&!new URL(c.url).search);if(!cap)throw Error('Missing source '+meta.path);
 const product=api.products.find(p=>new URL(p.permalink).pathname===meta.path);
 if(product){const sourceDocument=parseHTML(cap.html).document;meta.cardImageWidth=cardWidths.get(meta.path)||300;meta.relatedPaths=[...sourceDocument.querySelectorAll('.related.products li.product')].map(n=>n.querySelector('a[href*="/produktas/"]')?.getAttribute('href')).filter(Boolean).map(href=>new URL(href,'https://o3tech.lt').pathname);}
 const {document:d}=parseHTML('<html><body>'+(product?product.short_description:cap.html)+'</body></html>');
 const nodes=[...d.querySelectorAll('p,h1,h2,h3,h4,h5,h6')],lists=[...d.querySelectorAll('ul,ol')];meta.format={};meta.imageLinks={};
 for(const [index,b] of page.body.entries()){
  if(b.type==='image'){const asset=page.media.find(a=>a.id===b.assetId),source=[...d.querySelectorAll('img')].find(e=>{const href=e.closest('a')?.getAttribute('href');return href&&asset?.rights?.includes(href);});if(source)meta.imageLinks[index]={width:Number(source.getAttribute('width'))||asset.width};}
  if(b.text){const node=nodes.find(e=>clean(e.textContent)===b.text);if(node){const f=inline(node,b.text);if(b.type==='paragraph'&&['/taisykles/','/garantija-ir-grazinimas/','/musu-slapuku-politika/'].includes(meta.path)){let next=node.nextElementSibling,count=0;while(next?.tagName==='P'&&!clean(next.textContent)){count++;next=next.nextElementSibling;}if(count)f.spaceAfter=Number((count*48.8).toFixed(1));}if(f.ranges.length||f.breaks?.length||f.nbsp?.length||f.spaceAfter)meta.format[index]=f;}}
  if(b.type==='list'){const node=lists.find(e=>JSON.stringify([...e.children].filter(c=>c.tagName==='LI').map(e=>clean(e.textContent)))===JSON.stringify(b.items));if(node)meta.format[index]={signature:signature(b.items.join('\n')),ordered:node.tagName==='OL',start:Number(node.getAttribute('start'))||1,items:[...node.children].map((e,i)=>inline(e,b.items[i]))};}
 }
 if(meta.path.includes('ozonas-geriausia')){
  let offset=0;meta.sections=[...d.querySelectorAll('section.elementor-top-section')].map(s=>{
   const sourceTexts=[...s.querySelectorAll('h1,h2,h3,h4,p,ul,ol,img')];
   const indices=page.body.map((b,i)=>({b,i})).filter(({b,i})=>i>=offset&&sourceTexts.some(e=>b.type==='image'?Boolean(e.tagName==='IMG'&&site.assets.find(a=>a.id===b.assetId)?.rights?.includes((e.getAttribute('src')||'').split('/').at(-1))):b.type==='list'?clean(e.textContent)===clean(b.items.join(' ')):clean(e.textContent)===b.text));
   // Source section order is stable; the next section's first body block is
   // the boundary. Images below are included by their neighboring text.
   const start=indices[0]?.i??offset;const end=(indices.at(-1)?.i??(offset-1))+1;offset=end;return{start,end};
  });
  // Preserve the source's three actual diagrams, including image-only tails.
  const imageIndices=page.body.map((b,i)=>b.type==='image'?i:-1).filter(i=>i>=0);
  meta.sections[0]={start:0,end:meta.sections[1].start};
  meta.sections[6].end=meta.sections[7].start;
  if(imageIndices.at(-1)>=meta.sections[6].start&&imageIndices.at(-1)<meta.sections[7].start)meta.sections[6].end=meta.sections[7].start;
 }
}
layout.presentationVersion=2;
await writeFile(file,JSON.stringify(layout,null,2)+'\n');
await writeFile(path.join(root,'private/layout.json'),JSON.stringify(layout,null,2)+'\n');
console.log(JSON.stringify({pages:Object.keys(layout.pages).length,formattedBlocks:Object.values(layout.pages).reduce((n,p)=>n+Object.keys(p.format).length,0),proseCopies:0}));
