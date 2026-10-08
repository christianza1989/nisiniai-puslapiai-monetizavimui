import {esc,btn,select,textarea,badge,date,time,status} from './ui.mjs';
const moment=v=>v?date(v)+' '+time(v):'Seno įrašo laikas neužfiksuotas';
const kinds={platform:'Platforma',organization:'Profilis',review:'Atsiliepimas',media:'Vaizdas'};
const targetName=(r,organizations=[])=>r.targetKind==='platform'?'Madbeauty':organizations.find(o=>o.id===r.organizationId)?.name||r.target;
export async function submitReport(ctx,input){
 const accountId=ctx.realAdapter?.session?.user?.id||'guest',fingerprint=JSON.stringify([input.target,input.note]);
 if(ctx.reportIntent?.accountId!==accountId||ctx.reportIntent?.fingerprint!==fingerprint)ctx.reportIntent={accountId,fingerprint,key:'report-'+crypto.randomUUID()};
 const intent=ctx.reportIntent,result=await ctx.adapter.report({...input,idempotencyKey:intent.key});if(ctx.reportIntent===intent)delete ctx.reportIntent;return result;
}
export function reportQueue(ctx,d){
 const rows=d.reports.slice().sort((a,b)=>Number(['resolved','dismissed','hidden'].includes(a.status))-Number(['resolved','dismissed','hidden'].includes(b.status))||String(a.dueAt||'z').localeCompare(String(b.dueAt||'z')));
 return `<h2>Pranešimai apie neatitikimus</h2><p>Patikrink objektą, autorystę ir viešinimo teises. Vidinis pirmos peržiūros orientyras – 72 valandos nuo pateikimo.</p>${rows.map(r=>`<div class="list-row"><div><strong>${esc(kinds[r.targetKind]||'Senas pranešimas')} · ${esc(targetName(r,d.organizations))}</strong><p>${esc(r.note)}</p>${badge(r.status)}<p class="hint">Pateikta: ${moment(r.createdAt)}${r.dueAt?' · Peržiūros orientyras: '+moment(r.dueAt):''}</p></div>${btn('report-status','Peržiūrėti sprendimą',`data-id="${esc(r.id)}"`,'button outline small')}</div>`).join('')||'<p>Pranešimų dar nėra.</p>'}`;
}
export function ownReports(d){return (d.reports||[]).length?`<section class="section"><h2>Mano pranešimai</h2>${d.reports.map(r=>`<article class="panel"><p>${esc(r.note)}</p>${badge(r.status)}${r.reason?'<p>Sprendimas: '+esc(r.reason)+'</p>':''}<p class="hint">${moment(r.createdAt)}</p></article>`).join('')}</section>`:'';}
export async function moderationAction(ctx,action,button){
 if(action!=='report-status'||ctx.adapter.mode!=='real')return false;const r=ctx.workspace.reports.find(r=>r.id===button.dataset.id);ctx.reviewingReport=r;
 const closed=['resolved','dismissed','hidden'].includes(r.status),actions=[['record-only','Užfiksuoti sprendimą']];if(r.targetKind==='review')actions.push(['hide-review','Neviešinti atsiliepimo']);if(r.targetKind==='media')actions.push(['hide-media','Neviešinti vaizdo']);if(r.targetKind==='organization')actions.push(['disable-profile','Pašalinti profilį iš katalogo']);
 ctx.openDialog('Pranešimo peržiūra',`<p><strong>${esc(kinds[r.targetKind]||'Senas pranešimas')}</strong> · ${esc(targetName(r,ctx.workspace.organizations))}</p><p>${esc(r.note)}</p>${badge(r.status)}<p class="hint">Pateikta: ${moment(r.createdAt)}${r.dueAt?' · Peržiūros orientyras: '+moment(r.dueAt):''}</p><h3>Sprendimų istorija</h3>${(r.actions||[]).map(a=>`<p>${moment(a.at)} · ${esc(a.previous?status(a.previous):'Pateikta')} → ${esc(status(a.state))}${a.reason?'<br>'+esc(a.reason):''}</p>`).join('')||'<p>Ankstesnė istorija neužfiksuota.</p>'}${closed?'<p>Peržiūra užbaigta.</p>':`<form id="report-review">${select('Peržiūros būsena','state',[['triage','Peržiūrėti išsamiau'],['resolved','Užbaigti sprendimą'],['dismissed','Atmesti pranešimą']],r.status==='triage'?'triage':'resolved')}${select('Viešinimo veiksmas','action',actions,'record-only')}${textarea('Sprendimo priežastis','reason','','required maxlength="500"')}<p class="hint">Viešinimo pakeitimas priimamas su užbaigtu sprendimu. Esami vizitai išlieka paskyrose.</p><button class="button accent">Išsaugoti peržiūros sprendimą</button></form>`}`);return true;
}
export async function moderationForm(ctx,form,fd){
 if(form.id!=='report-review')return false;await ctx.adapter.reviewReport({id:ctx.reviewingReport.id,version:ctx.reviewingReport.version||0,state:fd.get('state'),action:fd.get('action'),reason:fd.get('reason')});ctx.closeDialog();ctx.toast('Pranešimo sprendimas ir istorija išsaugoti.');await ctx.render();return true;
}
