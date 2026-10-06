import {projectContentPagesV2} from '../../../../dovanos-memorycasting/lib/content-projection-v2.mjs';
import {contentSeoV2} from '../../../../dovanos-memorycasting/lib/content-seo-v2.mjs';
import {giftSchemas} from '../cloudflare/output/gift-seo.mjs';
import {renderContentPage} from '../prototype/public/content-render.mjs';
export function projectMadbeautyV2(pkg,{settings={},registry={targets:[]},now=Date.now()}={}){
 if(pkg.schemaVersion!==2||pkg.siteId!=='madbeauty'||pkg.canonicalHost!=='madbeauty.lt')throw Error('Wrong content tenant/version');
 const pages=projectContentPagesV2(pkg,[pkg],settings,registry,now),byId=new Map(pages.map(p=>[p.id,p]));
 const schema=p=>giftSchemas(pkg,p.type==='guide'?{...p,type:'article'}:p,pages);
 const dto=pages.map(p=>({...p,links:p.links.map(l=>({...l,href:'/'+byId.get(l.targetPageId).slug})),dates:{published:p.editorial.datePublished,modified:p.editorial.dateModified},schema:schema(p)}));
 const seo={nichePageUrl:(_pkg,p)=>p.url||'https://madbeauty.lt/'+p.slug,nicheRobotsText:(_pkg,preview)=>contentSeoV2(pkg,pages,'robots',preview).body,nicheSitemapXml:(_pkg,visible=pages)=>contentSeoV2(pkg,visible,'sitemap').body,nicheLlmsIndex:(_pkg,visible=pages)=>contentSeoV2(pkg,visible,'llms').body,nicheLlmsFull:(_pkg,visible=pages)=>contentSeoV2(pkg,visible,'llms-full').body};
 return {pkg:{...pkg,pages},pages,dto,seo,operatorName:pkg.site.operatorName,html:p=>renderContentPage(dto.find(d=>d.id===p.id),{pages:dto,operatorName:pkg.site.operatorName}),schema};
}
