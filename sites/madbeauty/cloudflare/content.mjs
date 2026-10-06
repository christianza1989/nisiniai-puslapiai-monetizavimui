import pkg from '../content/initial-release/content-package.json';
import network from '../../../../dovanos-memorycasting/config/niche-network.json';
import {projectPublicPages,contextualParts} from '../../../../dovanos-memorycasting/lib/niche-links.mjs';
import {nicheSchemaGraph,nicheEditorialDates} from '../../../../dovanos-memorycasting/lib/niche-schema-core.mjs';
import {renderContentPage} from '../prototype/public/content-render.mjs';
import * as seo from './output/seo.mjs';
export const contact={operatorName:network.contactsBySite?.madbeauty?.operatorName||network.operatorName,email:network.contactsBySite?.madbeauty?.email||network.defaultEmail};
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contentProjection(now=Date.now()){
 const pages=projectPublicPages(pkg,[pkg],network,now),byId=new Map(pages.map(p=>[p.id,p])),projected={...pkg,pages};
 const dto=pages.map(p=>{
  const links=p.links.map(l=>({...l,href:'/'+byId.get(l.targetPageId).slug})),contextual={};
  for(const text of p.body.flatMap(b=>b.type==='paragraph'?[b.text]:b.type==='list'?b.items:[]))contextual[text]=contextualParts(text,links).map(x=>x.href?`<a href="${escape(x.href)}">${escape(x.text)}</a>`:escape(x.text)).join('');
  return {id:p.id,type:p.type,slug:p.slug,title:p.title,description:p.description,url:seo.nichePageUrl(projected,p),body:p.body,media:p.media,links,externalLinks:p.externalLinks||[],dates:nicheEditorialDates(p),contextual,schema:nicheSchemaGraph(projected,p,pages,contact.operatorName)};
 });
 return {pkg:projected,pages,dto,seo,html:p=>renderContentPage(dto.find(x=>x.id===p.id),{pages:dto,operatorName:contact.operatorName}),schema:p=>nicheSchemaGraph(projected,p,pages,contact.operatorName)};
}
