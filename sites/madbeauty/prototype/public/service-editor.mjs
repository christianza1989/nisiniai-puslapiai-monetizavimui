import {esc,field,select,btn} from './ui.mjs';
import {serviceDraftShape,saveDraft} from './form-state.mjs';
export function serviceEditorDialog(ctx,service){
 const inPlace=!!document.querySelector('#service-editor');if(!inPlace)service=serviceDraftShape(ctx,service);
 const d=ctx.workspace;ctx.serviceDraft=service;
 ctx.openDialog('Paslauga, priedai ir kompetencija',`<form id="service-editor">
 ${field('Paslaugos pavadinimas','label',service.label,'text','required maxlength="100"')}
 <div class="grid-2">${field('Kaina (€)','price',service.priceMinor/100,'number','required min="0" max="1000" step="0.01"')}${field('Trukmė (min.)','durationMin',service.durationMin,'number','required min="15" max="480" step="5"')}</div>
 <div class="grid-2">${field('Buferis prieš (min.)','bufferBeforeMin',service.bufferBeforeMin,'number','required min="0" max="120" step="5"')}${field('Buferis po (min.)','bufferAfterMin',service.bufferAfterMin,'number','required min="0" max="120" step="5"')}</div>
 ${select('Šį variantą atliekantis meistras','practitionerId',d.practitioners.filter(p=>p.active||p.id===service.practitionerId).map(p=>[p.id,p.name+(p.active?'':' · neaktyvus')]),service.practitionerId)}
 ${select('Procedūros resursas','resourceId',d.resources.filter(r=>r.active||r.id===service.resourceId).map(r=>[r.id,r.label+(r.active?'':' · neaktyvus')]),service.resourceId)}
 <label class="check-label"><input type="checkbox" name="active" ${service.active!==false?'checked':''}><span>Paslauga prieinama naujoms registracijoms</span></label>
 <h3>Priedai</h3>${service.addons.map((a,i)=>`<fieldset class="addon-editor"><legend>Priedas ${i+1}</legend><input type="hidden" name="addonId" value="${esc(a.id)}">
 ${field('Priedo pavadinimas','addonLabel-'+i,a.label,'text','required maxlength="100"')}
 <div class="grid-2">${field('Trukmė (min.)','addonDuration-'+i,a.durationMin,'number','required min="0" max="240" step="5"')}${field('Kaina (€)','addonPrice-'+i,a.priceMinor/100,'number','required min="0" max="1000" step="0.01"')}</div>
 ${btn('service-addon-remove','Pašalinti šį priedą',`data-id="${i}"`,'button outline small')}</fieldset>`).join('')||'<p>Ši paslauga neturi papildomų priedų.</p>'}
 ${service.addons.length<12?btn('service-addon-add','Pridėti priedą','','button outline'):''}
 <div class="divider"></div><button class="button accent">Išsaugoti variantą</button></form>`,{restore:!inPlace});
 saveDraft(ctx,document.querySelector('#service-editor'));
}
export function serviceEditorValues(fd){
 return {active:fd.has('active'),label:fd.get('label'),priceMinor:Math.round(Number(fd.get('price'))*100),durationMin:Number(fd.get('durationMin')),bufferBeforeMin:Number(fd.get('bufferBeforeMin')),bufferAfterMin:Number(fd.get('bufferAfterMin')),practitionerId:fd.get('practitionerId'),resourceId:fd.get('resourceId'),addons:fd.getAll('addonId').map((id,i)=>({id,label:fd.get('addonLabel-'+i),durationMin:Number(fd.get('addonDuration-'+i)),priceMinor:Math.round(Number(fd.get('addonPrice-'+i))*100)}))};
}
