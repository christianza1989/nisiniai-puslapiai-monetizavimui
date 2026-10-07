import {esc,btn,money} from './ui.mjs';

// These are a salon's display groups. National procedure IDs remain on each offer.
export function profileServiceMenu(p){
 const rows=p.services.slice().sort((a,b)=>String(a.locationId).localeCompare(String(b.locationId))||(a.menuGroupRank??10000)-(b.menuGroupRank??10000)||String(a.menuGroupId||'').localeCompare(String(b.menuGroupId||''))||(a.rank||0)-(b.rank||0)||a.label.localeCompare(b.label,'lt'));
 const groups=[];
 for(const s of rows){
  let group=groups.at(-1);const groupId=s.menuGroupId||'';
  if(!group||group.locationId!==s.locationId||group.groupId!==groupId){
   group={id:'services-group-'+groups.length,locationId:s.locationId,groupId,label:s.menuGroupLabel||'Paslaugos',location:s.location,city:s.city,services:[]};groups.push(group);
  }
  group.services.push(s);
 }
 if(!groups.length)return '<p>Paslaugos dar nepaskelbtos.</p>';
 const multiplePlaces=new Set(groups.map(g=>g.locationId)).size>1;
 const nav=groups.length>1?`<nav class="service-menu-nav" aria-label="Paslaugų grupės">${groups.map(g=>`<a href="#${g.id}">${esc(g.label)}${multiplePlaces?' · '+esc(g.location?.label||g.city):''}</a>`).join('')}</nav>`:'';
 return nav+groups.map((g,i)=>`${groups[i-1]?.locationId!==g.locationId?'<h3 class="service-group-heading">'+esc(g.location?.label||g.city)+' · '+esc(g.location?.publicAddress||'')+'</h3>':''}<section id="${g.id}" class="service-menu-group" aria-labelledby="${g.id}-title" tabindex="-1"><h3 id="${g.id}-title" class="service-group-heading">${esc(g.label)}</h3>${g.services.map(s=>`<div class="service-line"><div><h4>${esc(s.label)}</h4><p>${s.durationMin}${s.durationToMin>s.durationMin?'–'+s.durationToMin:''} min. · ${esc(p.practitioners.find(x=>x.id===s.practitionerId)?.name||'')}<br>Paruošimas ${s.bufferBeforeMin} min. · po procedūros ${s.bufferAfterMin} min.</p></div><div class="row"><strong>${money(s.priceMinor)}${s.priceToMinor>s.priceMinor?'–'+money(s.priceToMinor):''}</strong>${btn('service-option',s.bookingMode==='consultation'?'Prašyti konsultacijos':s.bookingMode==='inquiry'?'Pateikti užklausą':'Pasirinkti',`data-id="${esc(s.id)}"`,'button accent small')}</div></div>`).join('')}</section>`).join('');
}
