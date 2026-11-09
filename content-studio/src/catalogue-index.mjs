import policy from '../../sites/o3tech/catalogue.json' with {type:'json'};

// Owner-authorized existing indices only. This is not a configurable bypass of
// the ordinary text minimum, review, facts, media, approval or link gates.
export function catalogueIndexDefinition(site,page){
 if(site.id!==policy.siteId||site.canonicalHost!==policy.canonicalHost||page.siteId!==site.id)return undefined;
 return policy.indices.find(index=>index.pageId===page.id);
}
export function catalogueIndexHasContent(site,page){
 const index=catalogueIndexDefinition(site,page);
 if(!index||page.type!=='faq'||page.contentVersion!==undefined||page.slug!==index.slug)return false;
 if(!index.productIds.length||new Set(index.productIds).size!==index.productIds.length)return false;
 const products=index.productIds.map(id=>site.pages?.find(p=>p.id===id));
 if(products.some(p=>!p||p.siteId!==site.id||p.type!=='product'||p.status==='revoked'||!p.title?.trim()||!p.slug?.startsWith('produktas/')))return false;
 const list=page.body?.length===1&&page.body[0].type==='list'?page.body[0].items:null;
 return Array.isArray(list)&&list.length===products.length&&Array.isArray(page.links)&&page.links.length===products.length
   &&products.every((product,i)=>list[i]===product.title&&page.links[i]?.targetPageId===product.id&&page.links[i]?.label===product.title);
}
