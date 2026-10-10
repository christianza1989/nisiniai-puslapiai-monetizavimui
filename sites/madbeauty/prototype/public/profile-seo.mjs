const origin='https://madbeauty.lt';
export const profilePath=p=>`/${p.kind==='solo'?'meistrai':'salonai'}/${encodeURIComponent(p.id)}`;
export const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicReviews(p){return (p?.reviews||[]).filter(r=>r.approved!==false&&Number.isFinite(r.rating)&&r.rating>=1&&r.rating<=5);}
export function reviewSummary(p){const reviews=publicReviews(p);return reviews.length?{count:reviews.length,rating:Math.round(reviews.reduce((n,r)=>n+r.rating,0)/reviews.length*10)/10}:null;}
export const reviewLabel=p=>{const s=reviewSummary(p);return s?`${s.rating.toFixed(1).replace('.',',')} / 5 · ${s.count} atsiliepimai`:'Atsiliepimų dar nėra';};
export function profileMetadata(p){return {title:`${p.name} – ${p.kind==='solo'?'Grožio meistras':'Grožio salonas'}, ${p.city}`,description:[p.bio||`${p.name} · ${p.city}.`,...new Set((p.services||[]).slice(0,4).map(s=>s.label))].join(' ').slice(0,300)};}
export function publicImage(p,id){const a=(p.media||[]).find(a=>a.id===id),v=a?.variants?.at(-1);return v?.file&&/^\/?(?:api\/madbeauty\/media\/|images\/)[a-zA-Z0-9_./-]+$/.test(v.file)?'/'+v.file.replace(/^\//,''):null;}
export function moduleSchema(path,title,description,profile=null){
 const page={'@type':'WebPage','@id':origin+path+'#page',url:origin+path,name:title,description,inLanguage:'lt-LT'},graph=[page];
 if(profile?.approved&&!profile.isDemo&&!String(profile.id).startsWith('demo-')){
  const business={'@type':'LocalBusiness','@id':origin+path+'#provider',url:origin+path,name:profile.name,description:profile.bio,address:{'@type':'PostalAddress',addressLocality:profile.city,addressCountry:'LT',...(profile.location?.publicAddress?{streetAddress:profile.location.publicAddress}:{})},hasOfferCatalog:{'@type':'OfferCatalog',name:'Paslaugos',itemListElement:(profile.services||[]).map(s=>({'@type':'Offer',price:(s.priceMinor/100).toFixed(2),priceCurrency:'EUR',itemOffered:{'@type':'Service',name:s.label}}))}};
  const summary=reviewSummary(profile);if(summary)business.aggregateRating={'@type':'AggregateRating',ratingValue:summary.rating,reviewCount:summary.count,bestRating:5,worstRating:1};
  const image=publicImage(profile,profile.avatarImageId)||(profile.gallery||[]).map(id=>publicImage(profile,id)).find(Boolean);if(image)business.image=origin+image;
  const l=profile.location;if(l&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&Math.abs(l.latitude)<=90&&Math.abs(l.longitude)<=180)business.geo={'@type':'GeoCoordinates',latitude:l.latitude,longitude:l.longitude};
  graph.push(business);page.mainEntity={'@id':business['@id']};
  graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Pradžia',item:origin+'/'},{'@type':'ListItem',position:2,name:profile.name,item:origin+path}]});
 }
 return {'@context':'https://schema.org','@graph':graph};
}
export function renderPublicProfile(p){
 const esc=htmlEscape,images=(p.gallery||[]).map(id=>({url:publicImage(p,id),entry:(p.works||[]).find(w=>w.mediaId===id)})).filter(x=>x.url);
 return `<article class="page container"><h1>${esc(p.name)}</h1><p>${esc(p.location?.publicAddress||p.city)} · ${esc(p.city)}</p><a class="link" href="#reviews">${esc(reviewLabel(p))}</a><p>${esc(p.bio)}</p>${images.length?'<section id="works"><h2>Darbų galerija</h2><div class="gallery-grid">'+images.map(x=>`<figure><a href="${esc(x.url)}"><img src="${esc(x.url)}" alt="${esc(x.entry?.caption||p.name+' darbų galerija')}" loading="lazy" width="640" height="640"></a><figcaption>${esc(x.entry?.caption||'')}</figcaption></figure>`).join('')+'</div></section>':''}<h2>Paslaugos</h2>${(p.services||[]).map(s=>`<section><h3>${esc(s.label)}</h3><p>${esc(s.durationMin)} min. · ${(s.priceMinor/100).toFixed(2)} €</p></section>`).join('')}<section id="reviews"><h2>Atsiliepimai</h2><p>${esc(reviewLabel(p))}</p><p>${p.isDemo?'Bandomieji atsiliepimai. Jie neatspindi tikrų klientų patirties.':'Atsiliepimai susieti su atliktais vizitais.'}</p>${publicReviews(p).map(r=>`<div class="list-row"><div><strong>${r.rating}/5 · ${p.isDemo?'bandomasis atsiliepimas':'vizito atsiliepimas'}</strong><p>${esc(r.text)}</p></div></div>`).join('')}</section></article>`;
}
