// Functional and provider pages are public modules, not fabricated editorial revisions.
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const origin='https://madbeauty.lt';
export const profilePath=p=>`/${p.kind==='solo'?'meistrai':'salonai'}/${p.id}`;
export function publicModuleEntries(contentPages,trustPages,profiles){
 const editorial=new Set(contentPages.map(p=>'/'+p.slug));
 return [
  ...Object.entries(trustPages).filter(([path])=>!editorial.has(path)).map(([path,p])=>({path,title:p.title,text:p.body.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()})),
  ...profiles.filter(p=>p?.approved).map(p=>({path:profilePath(p),title:p.name,text:[p.bio,p.city,...p.services.map(s=>`${s.label}: ${s.durationMin} min., ${(s.priceMinor/100).toFixed(2)} EUR`)].join('\n')})),
 ];
}
export function moduleDiscovery(content,path,entries){
 const pages=content.pages.filter(p=>p.slug!=='paslaugos'&&!p.slug.startsWith('paslaugos/'));
 if(path==='/sitemap.xml')return content.seo.nicheSitemapXml(content.pkg,pages).replace('</urlset>',entries.map(e=>`<url><loc>${escape(origin+e.path)}</loc></url>`).join('')+'</urlset>');
 const full=path==='/llms-full.txt',base=full?content.seo.nicheLlmsFull(content.pkg,pages):content.seo.nicheLlmsIndex(content.pkg,pages);
 return base+'\n\n## Platformos informacija ir priimti teikėjų profiliai\n'+entries.map(e=>full?`\n### ${e.title}\nURL: ${origin+e.path}\n${e.text}`:`- [${e.title}](${origin+e.path})`).join('\n');
}
export function moduleSchema(path,title,description,profile=null){
 const page={'@type':'WebPage','@id':origin+path+'#page',url:origin+path,name:title,description,inLanguage:'lt-LT'};
 const graph=[page];
 if(profile){const business={'@type':'LocalBusiness','@id':origin+path+'#provider',url:origin+path,name:profile.name,description:profile.bio,address:{'@type':'PostalAddress',addressLocality:profile.city,addressCountry:'LT',...(profile.location?.publicAddress?{streetAddress:profile.location.publicAddress}:{})},hasOfferCatalog:{'@type':'OfferCatalog',name:'Paslaugos',itemListElement:profile.services.map(s=>({'@type':'Offer',price:(s.priceMinor/100).toFixed(2),priceCurrency:'EUR',itemOffered:{'@type':'Service',name:s.label}}))}};graph.push(business);page.mainEntity={'@id':business['@id']};}
 return {'@context':'https://schema.org','@graph':graph};
}
