import {esc,icon,btn,photo,money,time} from './ui.mjs';
import {matchesTaxonomy,taxonomyNode} from '/taxonomy.mjs';

export function relatedGuides(publicGuides,procedureId,cityId,nodes){
 if(procedureId==='all')return publicGuides.slice(0,2);
 const selected=taxonomyNode(procedureId,nodes);if(!selected)return [];
 return publicGuides.map((guide,index)=>{
  const scores=(guide.editorial?.commerceTargets||[]).flatMap(target=>{
   const parts=target.id?.split(':')||[];
   if(!target.verified||parts[0]!=='mb'||parts[1]!=='catalog'||![3,4].includes(parts.length)||parts[3]&&parts[3]!==cityId)return [];
   const node=taxonomyNode(parts[2],nodes);if(!node)return [];
   const rank=node.id===selected.id?4:matchesTaxonomy(node.id,selected.id,nodes)?2:matchesTaxonomy(selected.id,node.id,nodes)?1:0;
   return rank?[rank+(parts[3]?1:0)]:[];
  });return {guide,index,rank:Math.max(0,...scores)};
 }).filter(row=>row.rank).sort((a,b)=>b.rank-a.rank||a.index-b.index).slice(0,2).map(row=>row.guide);
}

export const distanceLabel=value=>value==null?'':`${new Intl.NumberFormat('lt-LT',{maximumFractionDigits:1}).format(value)} km tiesia linija`;
export function entityCard(ctx,g){
 for(const a of g.media||[])ctx.media.set(a.id,a);
 const href=`/${g.kind==='salon'?'salonai':'meistrai'}/${encodeURIComponent(g.organizationId)}`,professional=g.entityType==='professional';
 g.slots.slice(0,3).forEach(c=>ctx.candidates.set(c.id,c));
 return `<article class="service-card entity-card"><a href="${href}${professional?'#team':''}">${photo(ctx,g.avatarImageId,'card-photo')}</a><div class="card-body"><p class="eyebrow">${professional?'Meistras':'Salonas'}</p><h3><a href="${href}${professional?'#team':''}">${esc(g.name)}</a></h3>${professional&&g.name!==g.organizationName?'<p>'+esc(g.organizationName)+'</p>':''}<div class="card-meta">${icon('location')} ${esc(g.location?.publicAddress||'Adresas tikslinamas')}, ${esc(g.city)}</div>${g.distanceKm!=null?'<p class="hint">'+distanceLabel(g.distanceKm)+'</p>':''}${g.reviewSummary?.count?'<p class="hint">'+esc(g.reviewSummary.rating)+' / 5 · '+g.reviewSummary.count+' '+(professional?'veiklos profilio':'salono')+' atsiliepimai</p>':'<p class="hint">Patvirtintų atsiliepimų dar nėra</p>'}<p>${g.services.length} paslaugų variantai · nuo <strong>${money(g.priceMinor)}</strong></p><div class="entity-services">${g.services.slice(0,3).map(s=>`<div><span>${esc(s.label)}<br><small>${money(s.priceMinor)} · ${s.durationMin} min.</small></span>${btn(professional?'professional-service':'begin-booking','Pasirinkti',`data-id="${esc(s.id)}" ${professional?'data-practitioner="'+esc(g.practitionerId)+'"':''}`,'button outline small')}</div>`).join('')}${g.services.length>3?'<a class="link" href="'+href+'#services">Visos paslaugos</a>':''}</div><div class="card-slots">${g.slots.slice(0,3).map(c=>btn('quick-slot',time(c.startAt)+' · '+esc(g.services.find(s=>s.id===c.providerServiceId)?.label||'Paslauga'),`data-id="${esc(c.id)}" aria-label="${esc(g.name)}: ${esc(g.services.find(s=>s.id===c.providerServiceId)?.label||'Paslauga')}, pasirinkti laiką ${time(c.startAt)}"`,'slot')).join('')||'<span class="hint">Laikas patikrinamas pasirinkus paslaugą ir priedus.</span>'}</div></div></article>`;
}

export function mapLinks(location){
 const {latitude:lat,longitude:lon}=location||{};
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const bbox=[clamp(lon-.025,-180,180),clamp(lat-.015,-90,90),clamp(lon+.025,-180,180),clamp(lat+.015,-90,90)].map(n=>Number(n.toFixed(6))).join(',');
 const params=new URLSearchParams({bbox,layer:'mapnik',marker:`${lat},${lon}`});
 return {embed:'https://www.openstreetmap.org/export/embed.html?'+params,external:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`};
}
export function mapPanel(ctx,rows){
 const locations=[...new Map(rows.filter(r=>r.location).map(r=>[r.locationId,{...r.location,organizationName:r.organizationName}])).values()];
 const mapped=locations.filter(l=>mapLinks(l)),chosen=mapped.find(l=>l.id===ctx.mapLocationId)||mapped[0],links=mapLinks(chosen);
 return `<aside class="map-panel"><h2>Veiklos vietos</h2><p>Šio rezultatų puslapio patvirtinti adresai.</p>${links?`<iframe class="location-map" title="${esc(chosen.organizationName)}: ${esc(chosen.publicAddress)}" src="${esc(links.embed)}" loading="lazy" referrerpolicy="no-referrer"></iframe><p><strong>${esc(chosen.organizationName)}</strong><br>${esc(chosen.publicAddress)} · ${esc(chosen.city)}</p><a class="link" href="${esc(links.external)}" target="_blank" rel="noopener noreferrer">Atidaryti OpenStreetMap</a>`:'<div class="empty"><h3>Koordinatės dar nepatvirtintos</h3><p>Vietas gali palyginti pagal adresus ir pasirinkti sąraše.</p></div>'}<div class="map-addresses">${locations.map(l=>`<div><strong>${esc(l.organizationName)}</strong><p>${esc(l.publicAddress||'Adresas tikslinamas')} · ${esc(l.city)}</p>${mapLinks(l)?btn('map-location','Rodyti žemėlapyje',`data-id="${esc(l.id)}" aria-pressed="${l.id===chosen?.id}"`,'button outline small'):'<span class="hint">Koordinatės dar nepatvirtintos</span>'}</div>`).join('')}</div>${links?'<p class="hint">Žemėlapį pateikia OpenStreetMap. Jame rodoma veiklos vieta. Tavo pasirinkta atskaitos vieta lieka paieškoje.</p>':''}</aside>`;
}

export function locationDialog(ctx){
 const point=ctx.searchPoint;
 return `<p>Atstumą skaičiuojame tiesia linija nuo tavo pasirinkto taško. Jis naudojamas tik šioje atvertoje paieškoje.</p>${btn('search-geolocation','Naudoti mano vietą','','button outline')}<p class="hint">Naršyklė paprašys leidimo. Gali vietą įvesti ir pats.</p><form id="search-location"><div class="field"><label for="search-latitude">Platuma</label><input class="input" id="search-latitude" name="latitude" type="number" min="-90" max="90" step="any" value="${esc(point?.latitude)}" required></div><div class="field"><label for="search-longitude">Ilguma</label><input class="input" id="search-longitude" name="longitude" type="number" min="-180" max="180" step="any" value="${esc(point?.longitude)}" required></div><button class="button accent">Naudoti šį tašką</button></form>${point?btn('clear-search-location','Išvalyti pasirinktą vietą','','button outline'):''}`;
}
