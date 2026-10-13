import {esc,btn,field,select,badge,empty} from './ui.mjs';
const roles={owner:'Savininkas',manager:'Vadybininkas',reception:'Registratūra',practitioner:'Meistras',staff:'Meistras'};
export function teamAccessView(ctx,d){
 return `<p>Prieiga suteikiama prisijungusiai paskyrai. Meistro darbo grafikas ir jo paskyros teisės valdomi atskirai.</p>${btn('team-access-new','Suteikti prieigą','','button accent')}<div class="section">${d.memberships.map(m=>`<article class="list-row"><div><strong>${esc(m.name||m.email||'Komandos paskyra')}</strong><p>${esc(m.email||'')} · ${esc(roles[m.role])}${m.practitionerId?' · '+esc(d.practitioners.find(p=>p.id===m.practitionerId)?.name||'Meistras'):''}</p>${badge(m.active===false?'Prieiga panaikinta':'Prieiga aktyvi')}</div>${m.role==='owner'?'':`<div class="toolbar">${btn('team-access-edit','Keisti prieigą',`data-id="${m.id}"`,'button outline small')}${m.active===false?'':btn('team-access-revoke','Panaikinti',`data-id="${m.id}"`,'button outline small')}</div>`}</article>`).join('')||empty('Komandos paskyrų nėra','Pridėk kolegą pagal jo prisijungimo el. paštą.')}</div><details><summary>Prieigų istorija</summary>${[...(d.accessChanges||[])].reverse().map(a=>`<p>${esc(a.at)} · ${esc(roles[a.next.role])} · ${a.next.active===false?'Panaikinta':'Suteikta / pakeista'}</p>`).join('')||'<p>Pakeitimų nėra.</p>'}</details>`;
}
export async function teamAccessAction(ctx,action,button){
 if(ctx.adapter.mode!=='real'||!action.startsWith('team-access-'))return false;
 const d=ctx.workspace,m=d.memberships.find(m=>m.id===button.dataset.id);ctx.editingMembership=m||null;
 if(action==='team-access-new'||action==='team-access-edit'){
  ctx.openDialog(m?'Keisti komandos prieigą':'Suteikti komandos prieigą',`<form id="team-access">${field('Prisijungimo el. paštas','email',m?.email||'','email',`required maxlength="254" ${m?'readonly':''}`)}${select('Prieiga','role',[['manager',roles.manager],['reception',roles.reception],['practitioner',roles.practitioner]],m?.role||'reception')}${select('Meistras (meistro prieigai)','practitionerId',[['','Pasirink meistrą'],...d.practitioners.filter(p=>p.active).map(p=>[p.id,p.name])],m?.practitionerId||'')}<p class="hint">Vadybininkas valdo pasiūlymus, komandą ir profilį. Registratūra valdo klientus ir vizitus. Meistras mato savo vizitus bei grafiką.</p><button class="button accent">Išsaugoti prieigą</button></form>`);return true;
 }
 if(action==='team-access-revoke'){
  ctx.openDialog('Panaikinti komandos prieigą',`<p>${esc(m.email)} nebegalės atidaryti šios darbo vietos. Esami vizitai ir darbuotojo grafikas išliks.</p><form id="team-access-revoke"><button class="button accent">Panaikinti šią prieigą</button></form>`);return true;
 }
 return false;
}
export async function teamAccessForm(ctx,form,fd){
 if(form.id==='team-access')await ctx.adapter.grantMembership({organizationId:ctx.state.session.organizationId,email:fd.get('email'),role:fd.get('role'),practitionerId:fd.get('practitionerId')||null,version:ctx.editingMembership?.version||0});
 else if(form.id==='team-access-revoke')await ctx.adapter.revokeMembership({id:ctx.editingMembership.id,version:ctx.editingMembership.version||0});
 else return false;
 ctx.closeDialog();ctx.toast('Komandos prieiga atnaujinta.');await ctx.render();return true;
}
