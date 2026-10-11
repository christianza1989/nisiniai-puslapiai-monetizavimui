import {renderAuthEntry} from './auth-entry.mjs';
import {CITY_NAMES} from '/cities.mjs';
import {esc,link,btn,field,textarea,select,crumbs} from './ui.mjs';
const challengeKey='madbeauty:auth-challenge:v1';
function persistChallenge(ctx,value){ctx.authChallenge=value;try{if(value)sessionStorage.setItem(challengeKey,JSON.stringify(value));else sessionStorage.removeItem(challengeKey);}catch{}}
export async function accountEntry(ctx,target='/paskyra/vizitai'){
  const a=ctx.realAdapter,s=a.session||await a.refreshSession();ctx.authTarget=target;
  const facebookQuery=new URL(location.href).searchParams,facebookState=facebookQuery.get('facebook');
  ctx.facebookNotice=facebookState==='cancelled'?'Facebook prisijungimas atšauktas. Gali bandyti dar kartą arba tęsti el. paštu.':facebookState==='failed'?'Facebook prisijungimo patvirtinti nepavyko. Pradėk iš naujo arba tęsk el. paštu.':'';
  const facebookReturn=facebookQuery.get('grizti');if(s.facebook?.pending&&facebookReturn&&/^\/(paskyra|meistrui|bendruomene|meistrai|salonai|paieska|rezervuoti)(\/|\?|#|$)/.test(facebookReturn)&&!/[\\\r\n]/.test(facebookReturn))ctx.authTarget=facebookReturn;
  if(!s.user&&!ctx.authChallenge)try{const c=JSON.parse(sessionStorage.getItem(challengeKey));if(c&&Date.parse(c.expiresAt)>Date.now())ctx.authChallenge=c;else sessionStorage.removeItem(challengeKey);}catch{}
  if(!s.user){await ctx.ensureMedia?.();ctx.testEmail=ctx.temporaryTest?new URL(location.href).searchParams.get('bandymo_pastas')||'':'';return renderAuthEntry(ctx);}
  ctx.state.session={...ctx.state.session,role:target.startsWith('/operatorius')&&s.operator?'operator':target.startsWith('/meistrui')?'professional':'customer',clientId:s.user.id,organizationId:ctx.state.session.organizationId&&s.organizations.some(o=>o.id===ctx.state.session.organizationId)?ctx.state.session.organizationId:s.organizations[0]?.id||null};
  if(target.startsWith('/operatorius')&&!s.operator)return `<div class="page container"><h1>Prieiga ribota</h1><p>Ši darbo vieta skirta platformos operatoriui.</p>${link('/paskyra','Grįžti į paskyrą')}</div>`;
  if(target.startsWith('/meistrui')&&!s.organizations.length)return providerStart(ctx);
  if(target!=='/paskyra')return null;
  const facebookSettings=s.facebook?.enabled||s.facebook?.linked?`<section class="facebook-settings"><h2>Facebook prisijungimas</h2><p>${s.facebook.linked?'Facebook susietas su tavo paskyra. Gali prisijungti ir el. pašto kodu.':'Prijunk Facebook prie šios paskyros. Tavo vizitai ir meistrai liks vienoje vietoje.'}</p>${btn(s.facebook.linked?'facebook-unlink':'facebook-link',s.facebook.linked?'Atsieti Facebook':'Prijungti Facebook','','button outline')}</section>`:'';
  return`<div class="page container"><h1 class="page-title">Tavo paskyra</h1><p>${esc(s.user.email)}</p><div class="account-options"><article class="panel"><h2>Tavo vizitai</h2><p>Registracijos, pokalbiai ir išsaugoti meistrai.</p>${link('/paskyra/vizitai','Atidaryti vizitus')}</article><article class="panel"><h2>Tavo darbo vieta</h2><p>Paslaugos, grafikas ir klientų vizitai vienoje vietoje.</p>${link(s.organizations.length?'/meistrui':'/meistrui/pradzia',s.organizations.length?'Atidaryti darbo vietą':'Sukurti meistro profilį')}</article></div>${facebookSettings}<div class="toolbar">${s.operator?link('/operatorius','Operatoriaus darbo vieta','button outline'):''}${btn('account-logout','Atsijungti','','button outline')}</div></div>`;
}
export function providerStart(ctx){return`<div class="page container account-page"><section class="account-intro"><h1>Vieta tavo darbui.</h1><p>Sukurk profilį, pridėk paslaugas ir darbo grafiką. Klientai galės pasirinkti visam vizitui tinkantį laiką.</p><ol><li>Veikla ir vieta</li><li>Paslaugos bei kainos</li><li>Grafikas ir profilio peržiūra</li></ol></section><section class="panel account-card"><h2>Pradėk nuo profilio</h2><form id="provider-create">${select('Veiklos tipas','kind',[['solo','Dirbu savarankiškai'],['salon','Salonas / komanda']],'solo')}${field('Profilio pavadinimas','name','','text','required maxlength="100"')}${field('Meistro vardas','practitionerName','','text','required maxlength="100"')}${select('Miestas','city',CITY_NAMES.map(x=>[x,x]),'Vilnius')}${field('Rajonas','area','','text','maxlength="80"')}${field('Veiklos adresas','address','','text','maxlength="200"')}${textarea('Apie tavo veiklą','bio','','required maxlength="600"')}<button class="button accent">Sukurti profilį ir tęsti</button></form><p class="hint">Vieša tampa tik priimta profilio versija. Darbus ir veiklos informaciją pateik tik turėdamas viešinimo teisę.</p></section></div>`;}
export async function accountAction(ctx,action){
  if(action==='facebook-login'||action==='facebook-link'){const result=await ctx.realAdapter.facebookStart({intent:action==='facebook-link'?'link':'login',returnPath:ctx.authTarget||'/paskyra'});location.assign(result.url);return true;}
  if(action==='facebook-unlink'){await ctx.realAdapter.facebookUnlink();ctx.toast('Facebook atsietas. Prisijungimas el. paštu veikia.');await ctx.render();return true;}
  if(action==='auth-register'||action==='auth-login'){ctx.authMode=action==='auth-register'?'register':'login';await ctx.render();return true;}
  if(action==='email-resend'){const c=await ctx.realAdapter.authStart(ctx.authChallenge.email);persistChallenge(ctx,{...c,email:ctx.authChallenge.email});ctx.toast(c.message);await ctx.render();return true;}
  if(action==='email-again'){persistChallenge(ctx,null);await ctx.render();return true;}
  if(action==='account-logout'){await ctx.realAdapter.logout();ctx.clearDrafts();persistChallenge(ctx,null);ctx.state.session={role:'guest',organizationId:null,clientId:null};ctx.state.booking=null;ctx.state.favorites=[];ctx.state.onboarding={};ctx.state.onboardingStep=0;ctx.state.calendarStaff='';ctx.state.calendarResource='';ctx.state.chatBookingId=null;ctx.state.clientFilter='';ctx.state.uploads=[];ctx.closeDialog();await ctx.navigate('/');return true;}
  return false;
}
export async function accountForm(ctx,form,fd){
  if(form.id==='email-start'){const c=await ctx.realAdapter.authStart(fd.get('email'));persistChallenge(ctx,{...c,email:String(fd.get('email')).trim()});ctx.toast(c.message);await ctx.render();return true;}
  if(form.id==='email-verify'){const s=await ctx.realAdapter.authVerify(ctx.authChallenge.challengeId,fd.get('code')),target=ctx.authTarget||'/paskyra';persistChallenge(ctx,null);ctx.authTarget=null;ctx.state.afterAuth=null;ctx.state.session={role:'customer',clientId:s.user.id,organizationId:s.organizations[0]?.id||null};await ctx.navigate(target);return true;}
  if(form.id==='provider-create'){const o=await ctx.realAdapter.createOrganization(Object.fromEntries(fd));await ctx.realAdapter.refreshSession();ctx.state.session={role:'professional',organizationId:o.id,clientId:ctx.realAdapter.session.user.id};await ctx.navigate('/meistrui/paslaugos');return true;}
  return false;
}
