import {CITIES} from '../prototype/cities.mjs';
// Functional and provider pages are public modules, not fabricated editorial revisions.
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const origin='https://madbeauty.lt';
import {directoryRoute,directoryRows,directoryDescription} from '../prototype/public/provider-directory.mjs';
import {profilePath} from '../prototype/public/profile-seo.mjs';
export {profilePath,moduleSchema} from '../prototype/public/profile-seo.mjs';
export function publicModuleEntries(contentPages,trustPages,profiles){
 const editorial=new Set(contentPages.map(p=>'/'+p.slug));
 return [
  ...[{path:'/paslaugos',title:'Grožio paslaugos',text:'Paslaugų kategorijos ir procedūrų paieška.'},...TAXONOMY_NODES.filter(n=>n.scope==='core'&&n.kind==='category').map(n=>({path:'/paslaugos/'+n.id,title:n.label,text:TAXONOMY_NODES.filter(g=>g.parentId===n.id).map(g=>g.label).join(' · ')}))].filter(e=>!editorial.has(e.path)),
  ...Object.entries(trustPages).filter(([path])=>!editorial.has(path)).map(([path,p])=>({path,title:p.title,text:p.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()})),
  ...['/salonai','/meistrai',...new Set(profiles.filter(p=>p?.approved&&!p.isDemo&&!String(p.id).startsWith('demo-')).flatMap(p=>(p.locations?.length?p.locations:[{city:p.city}]).map(l=>{const city=CITIES.find(([,name])=>name===l.city)?.[0];return city?`/${p.kind==='solo'?'meistrai':'salonai'}/miestas/${city}`:null;}).filter(Boolean)))].map(path=>{const route=directoryRoute(path),rows=directoryRows(route,profiles);return {path,title:route.title,text:directoryDescription(route,rows)};}),
  ...profiles.filter(p=>p?.approved&&!p.isDemo&&!String(p.id).startsWith('demo-')).map(p=>({path:profilePath(p),title:p.name,text:[p.bio,p.city,...p.services.map(s=>`${s.label}: ${s.durationMin} min., ${(s.priceMinor/100).toFixed(2)} EUR`)].join('\n')})),
 ];
}
export function moduleDiscovery(content,path,entries){
 const pages=content.pages.filter(p=>p.slug!=='paslaugos'&&!p.slug.startsWith('paslaugos/'));
 if(path==='/sitemap.xml')return content.seo.nicheSitemapXml(content.pkg,pages).replace('</urlset>',entries.map(e=>`<url><loc>${escape(origin+e.path)}</loc></url>`).join('')+'</urlset>');
 const full=path==='/llms-full.txt',base=full?content.seo.nicheLlmsFull(content.pkg,pages):content.seo.nicheLlmsIndex(content.pkg,pages);
 return base+'\n\n## Platformos informacija ir priimti teikėjų profiliai\n'+entries.map(e=>full?`\n### ${e.title}\nURL: ${origin+e.path}\n${e.text}`:`- [${e.title}](${origin+e.path})`).join('\n');
}
