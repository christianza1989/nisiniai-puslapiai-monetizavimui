import {projectContentPagesV2,contentSeoV2} from '../cloudflare/output/content-core.mjs';
import {giftSchemas,giftMetadata} from '../cloudflare/output/gift-seo.mjs';
import {renderContentPage} from '../prototype/public/content-render.mjs';
export function projectMadbeautyV2(pkg,{settings={},registry={targets:[]},now=Date.now(),schemaRenderer=giftSchemas,metadataRenderer=giftMetadata,projector=projectContentPagesV2,seoRenderer=contentSeoV2}={}){
 if(pkg.schemaVersion!==2||pkg.siteId!=='madbeauty'||pkg.canonicalHost!=='madbeauty.lt')throw Error('Wrong content tenant/version');
 const pages=projector(pkg,[pkg],settings,registry,now),byId=new Map(pages.map(p=>[p.id,p]));
 const schemaPages=pages.map(p=>p.type==='guide'?{...p,type:'article'}:p);
 const schema=p=>schemaRenderer(pkg,p.type==='guide'?{...p,type:'article'}:p,schemaPages,{homeLabel:'Madbeauty',articleIndexSlug:'gidai',articleIndexLabel:'Gidai'});
 const metadata=p=>metadataRenderer(pkg,p.type==='guide'?{...p,type:'article'}:p);
 const dto=pages.map(p=>({...p,links:p.links.map(l=>({...l,href:'/'+byId.get(l.targetPageId).slug})),dates:{published:p.editorial.datePublished,modified:p.editorial.dateModified},schema:schema(p),sharing:metadata(p)}));
 // Discovery includes public citations, never the package's editorial claim
 // verification notes. Keep all publication/author/link decisions in the core.
 const reading=visible=>visible.map(p=>({...p,externalLinks:(p.editorial.sources?.length?p.editorial.sources:p.externalLinks||[]).map(({url,label,publisher})=>({url,label:label||publisher||url,reason:''}))}));
 const seo={nichePageUrl:(_pkg,p)=>p.url||'https://madbeauty.lt/'+p.slug,nicheRobotsText:(_pkg,preview)=>seoRenderer(pkg,pages,'robots',preview).body,nicheSitemapXml:(_pkg,visible=pages)=>seoRenderer(pkg,visible,'sitemap').body,nicheLlmsIndex:(_pkg,visible=pages)=>seoRenderer(pkg,reading(visible),'llms').body,nicheLlmsFull:(_pkg,visible=pages)=>seoRenderer(pkg,reading(visible),'llms-full').body};
 return {pkg:{...pkg,pages},pages,dto,seo,operatorName:pkg.site.operatorName,html:p=>renderContentPage(dto.find(d=>d.id===p.id),{pages:dto,operatorName:pkg.site.operatorName}),schema,metadata};
}
