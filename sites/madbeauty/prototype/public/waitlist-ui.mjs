import {esc,select,field,btn,money,time,date,hhmm,userError,errorHTML} from './ui.mjs';
function focusRequestError(id,error){
 const root=globalThis.document;if(!root)return false;
 const target=root.querySelector(`[data-request-id="${CSS.escape(id)}"]`)?.firstElementChild||root.querySelector('#main');if(!target)return false;
 target.insertAdjacentHTML('afterbegin',errorHTML(error));const alert=target.querySelector('.error-box');alert.setAttribute('tabindex','-1');alert.focus();return true;
}
export const waitlistState=(w,now)=>w.state==='offered'&&Date.parse(w.offer?.expiresAt)<=Date.parse(now)?'expired':w.state;
export function waitlistFields(ctx,s){
 const b=ctx.state.booking?.serviceId===s.id?ctx.state.booking:null,staff=s.staffOptions||[{practitionerId:s.practitionerId,name:s.practitionerName}],day=Number(ctx.state.search.diena??1);
 return `${select('Meistras','practitionerId',[['','Bet kuris šio varianto meistras'],...staff.map(p=>[p.practitionerId,p.name||s.practitionerName||'Meistras'])],b?.practitionerId||'')}${field('Data','dateKey',ctx.dayKey(day),'date',`required min="${ctx.dayKey(0)}" max="${ctx.dayKey(30)}"`)}<div class="form-grid">${field('Nuo','from',ctx.state.search.nuo||'17:00','time','required')}${field('Iki','to',ctx.state.search.iki||'20:00','time','required')}</div>${s.addons?.length?'<fieldset><legend>Paslaugos priedai</legend>'+s.addons.map(a=>`<label class="check-label"><input type="checkbox" name="addon" value="${esc(a.id)}" ${b?.addons?.includes(a.id)?'checked':''}><span>${esc(a.label)} · +${a.durationMin} min. · +${money(a.priceMinor)}</span></label>`).join('')+'</fieldset>':''}<p class="hint">Pasiūlymas galios 15 minučių. Jį pasirinkęs dar peržiūrėsi ir patvirtinsi vizitą. Vienam pageidavimui pateikiami iki 3 skirtingų pasiūlymų.</p>`;
}
export function waitlistSummary(ctx,w,{professional=false}={}){
 if(!w.criteria)return '';
 const c=w.criteria,offer=w.offer,state=waitlistState(w,ctx.adapter.clock.now),available=state==='offered',service=ctx.rows?.find(s=>s.id===w.providerServiceId),staff=service?.staffOptions?.find(p=>p.practitionerId===c.practitionerId),name=staff?.name||service?.practitionerName||'Pasirinktas meistras';
 return `<p>${date(c.dateKey+'T12:00:00Z')} · ${hhmm(c.from)}–${hhmm(c.to)} · ${c.practitionerId?esc(name):'Bet kuris šio varianto meistras'}</p>${available?`<div class="alert"><div><strong>Laiko pasiūlymas</strong><p>${date(offer.candidate.startAt)} · ${time(offer.candidate.startAt)}–${time(offer.candidate.endAt)} · ${money(offer.candidate.priceMinor)}</p><p>Galioja iki ${time(offer.expiresAt)}. Laikas dar nepatvirtintas.</p>${!professional?btn('accept-waitlist','Pasirinkti pasiūlymą',`data-id="${w.id}"`,'button accent'):''}</div></div>`:''}${!['closed','expired'].includes(state)?btn('close-waitlist','Užbaigti pageidavimą',`data-id="${w.id}"`,'button outline small'):''}${state==='expired'?'<p class="hint">Pageidavimo arba pasiūlymo galiojimas baigėsi.'+(professional?'':' Naują intervalą pasirink paslaugos laiko paieškoje.')+'</p>':''}`;
}
export async function waitlistAction(ctx,action,button){
 if(!['accept-waitlist','close-waitlist'].includes(action))return false;
 const w=ctx.workspace.waitlist.find(w=>w.id===button.dataset.id);if(!w)throw userError('Pageidavimas pasikeitė. Atnaujink puslapį.');
 if(action==='close-waitlist'){await ctx.adapter.closeWaitlist({scope:ctx.state.session,id:w.id,version:w.version});ctx.toast('Pageidavimas užbaigtas.');await ctx.render();return true;}
 if(ctx.state.booking?.hold)await ctx.adapter.releaseHold(ctx.state.booking.hold.id);
 let result;try{result=await ctx.adapter.acceptWaitlist({id:w.id,version:w.version,offerId:w.offer.id});}catch(e){if(['VERSION_CONFLICT','OFFER_EXPIRED','SLOT_CONFLICT'].includes(e.code)){await ctx.render();if(!focusRequestError(w.id,e))ctx.toast(e.message);return true;}throw e;}const user=ctx.realAdapter.session.user;
 ctx.state.booking={serviceId:w.providerServiceId,practitionerId:result.candidate.practitionerId,addons:result.candidate.addonIds,candidate:result.candidate,hold:result.hold,contact:{name:user.name||'',email:user.email},idempotencyKey:'waitlist-confirm:'+w.id+':'+w.offer.id,result:null};
 ctx.saveUI();await ctx.navigate('/registracija/duomenys');return true;
}
