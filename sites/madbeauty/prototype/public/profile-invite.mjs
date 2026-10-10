import {esc,btn,photo} from './ui.mjs';
export function invitation(profile,origin){
 if(!profile?.approved||!profile.id||!['solo','salon'].includes(profile.kind))throw Error('Viešas profilis nerastas.');
 const base=new URL(origin);
 if(!['https://madbeauty.lt','https://bandymas.madbeauty.lt'].includes(base.origin)&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Netinkamas profilio domenas.');
 const url=new URL(`/${profile.kind==='salon'?'salonai':'meistrai'}/${encodeURIComponent(profile.id)}`,base.origin).href;
 return {url,title:profile.name+' · Madbeauty',text:'Atrask '+profile.name+' Madbeauty platformoje.',facebook:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url)};
}
export function inviteDialog(ctx,data,{deviceShare=false}={}){
 return `<div class="invite-content"><div class="invite-art" aria-hidden="true">${photo(ctx,'auth-beauty-kit','','200px')}</div><p>Pasidalink meistro profiliu. Draugas galės peržiūrėti paslaugas ir darbus, prisijungti bei išsisaugoti meistrą.</p><div class="invite-actions"><a class="button invite-facebook" href="${esc(data.facebook)}" target="_blank" rel="noopener noreferrer">Pasidalinti per Facebook</a>${deviceShare?btn('invite-device','Pasidalinti telefonu','','button outline'):''}</div><label class="invite-url-label" for="invite-url">Meistro profilio nuoroda</label><div class="invite-copy"><input id="invite-url" class="input" value="${esc(data.url)}" readonly autocomplete="off" spellcheck="false">${btn('invite-copy','Kopijuoti','','button accent')}</div><p class="hint">Meistro išsaugojimas tavo paskyroje yra privatus.</p></div>`;
}
export async function invitationAction(ctx,action,{navigator:nav=globalThis.navigator,origin=globalThis.location?.origin}={}){
 if(action==='invite-profile'){
  const data=invitation(ctx.currentProfile,origin);ctx.invitation=data;
  ctx.openDialog('Pakviesk draugą',inviteDialog(ctx,data,{deviceShare:typeof nav?.share==='function'}),{restore:false});return true;
 }
 if(action==='invite-copy'){
  if(!ctx.invitation)return true;
  try{await nav.clipboard.writeText(ctx.invitation.url);ctx.toast('Meistro nuoroda nukopijuota.');}
  catch{ctx.toast('Kopijuoti nepavyko. Pažymėk nuorodą ir nukopijuok ją pats.');}
  return true;
 }
 if(action==='invite-device'){
  if(!ctx.invitation||typeof nav?.share!=='function')return true;
  try{const {url,title,text}=ctx.invitation;await nav.share({url,title,text});}
  catch(e){if(e.name!=='AbortError')ctx.toast('Pasidalinti nepavyko. Gali nukopijuoti meistro nuorodą.');}
  return true;
 }
 return false;
}
