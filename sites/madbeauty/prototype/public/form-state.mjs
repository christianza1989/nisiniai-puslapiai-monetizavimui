// Short-lived drafts stay in this tab and exclude credentials and files; keys bind each draft to its account and record version.
const prefix='madbeauty:form-draft:v1:',ttl=8*60*60*1000;
const supported=new Set(['menu-group','procedure-selection','offer-editor','procedure-request','provider-create','customer-profile','profile-revision','booking-contact','new-client','new-staff','new-resource','new-service','time-block','onboarding','service-editor','schedule-editor','resource-editor','team-editor','status-editor','conversation-message','message-form','cancel-visit','review-form','inquiry-form','report-form','moderation','review-moderation']);
const pending=new Set();
const controls=form=>[...form.elements].filter(e=>e.name&&!e.disabled&&!e.readOnly&&!['hidden','password','file','submit','button'].includes(e.type)&&e.name!=='code');
export function draftKey(ctx,form){
 if(!supported.has(form.id))return null;
 const user=ctx.realAdapter.session?.user?.id||'guest',org=ctx.state.session.organizationId||'';
 const edit=ctx.editing?.entity;
 const revision=form.id==='menu-group'?ctx.editingMenuGroup?.id+':'+ctx.editingMenuGroup?.version:form.id==='offer-editor'?ctx.offerDraft?.id+':'+ctx.offerDraft?.version:form.id==='procedure-selection'?ctx.workspace?.selectionVersion:form.id==='booking-contact'?ctx.state.booking?.hold?.id||ctx.state.booking?.serviceId:form.id==='onboarding'?ctx.state.onboardingStep:form.id==='profile-revision'?ctx.workspace?.organizations[0]?.version:form.id==='customer-profile'?ctx.workspace?.client?.version:
 ['service-editor','schedule-editor','resource-editor','team-editor','status-editor'].includes(form.id)?edit?.id+':'+edit?.version:
 form.id==='conversation-message'?ctx.state.chatBookingId:['message-form','cancel-visit','review-form'].includes(form.id)?ctx.dialogBooking?.id:
 form.id==='moderation'?ctx.reviewing?.id:form.id==='review-moderation'?ctx.reviewingComment?.id:
 form.id==='inquiry-form'?[...form.querySelectorAll('input[type=hidden]')].map(e=>e.value).join(':'):form.id==='report-form'?form.querySelector('input[name=target]')?.value:'';
 return prefix+JSON.stringify([user,org,form.id,revision||'']);
}
export function saveDraft(ctx,form){
 const key=draftKey(ctx,form);if(!key||pending.has(key))return;
 try{sessionStorage.setItem(key,JSON.stringify({at:Date.now(),fields:controls(form).map(e=>({name:e.name,value:e.value,checked:['checkbox','radio'].includes(e.type)?e.checked:undefined})),...(form.id==='offer-editor'?{variantIds:[...form.querySelectorAll('input[name=variantId]')].map(e=>e.value),variantShapes:[...form.querySelectorAll('input[name=variantId]')].map((e,i)=>({id:e.value,addonIds:[...form.querySelectorAll('input[name=addonId-'+i+']')].map(e=>e.value),groupIds:[...form.querySelectorAll('input[name=groupId-'+i+']')].map(e=>e.value)}))}:{}),...(form.id==='service-editor'?{addonIds:[...form.querySelectorAll('input[name=addonId]')].map(e=>e.value)}:{})}));}catch{}
}
export function serviceDraftShape(ctx,service){
 try{const draft=JSON.parse(sessionStorage.getItem(draftKey(ctx,{id:'service-editor'})));if(draft&&Date.now()-draft.at<ttl&&Array.isArray(draft.addonIds)&&draft.addonIds.length<=12)return{...service,addons:draft.addonIds.map(id=>({id,label:'',durationMin:15,priceMinor:0}))};}catch{}
 return service;
}
export function restoreDrafts(ctx,root){
 for(const form of root.querySelectorAll('form')){
  form.noValidate=true;syncConditionalFields(form);const key=draftKey(ctx,form);if(!key||pending.has(key))continue;
  try{const draft=JSON.parse(sessionStorage.getItem(key));if(!draft||Date.now()-draft.at>ttl){sessionStorage.removeItem(key);continue;}
   let restored=false;for(const e of controls(form)){const saved=draft.fields.find(f=>f.name===e.name&&(f.checked===undefined||f.value===e.value));if(!saved)continue;
    if(saved.checked!==undefined?e.checked!==saved.checked:e.value!==saved.value)restored=true;
    if(saved.checked!==undefined)e.checked=saved.checked;else if(e.tagName!=='SELECT'||[...e.options].some(o=>o.value===saved.value))e.value=saved.value;
   }
   if(restored&&!form.querySelector('.draft-recovery')){const notice=document.createElement('div');notice.className='draft-recovery';notice.innerHTML='<p role="status">Atkurta neįrašyta forma.</p><button type="button" class="button outline small" data-action="discard-form-draft">Atmesti juodraštį</button>';form.prepend(notice);}
  }catch{}syncConditionalFields(form);
 }
}
export function suspendDraft(ctx,form){const key=draftKey(ctx,form);if(key)pending.add(key);return key;}
export function finishDraft(key,success){if(!key)return;if(success)try{sessionStorage.removeItem(key);}catch{}pending.delete(key);}
export function discardDraft(ctx,form){const key=draftKey(ctx,form);if(key)try{sessionStorage.removeItem(key);}catch{}form.querySelector('.draft-recovery')?.remove();form.querySelectorAll('.error-box').forEach(e=>e.remove());for(const field of controls(form))clearFieldError(field);form.reset();controls(form)[0]?.focus();}
export function clearDrafts(){try{for(const key of Object.keys(sessionStorage))if(key.startsWith(prefix))sessionStorage.removeItem(key);}catch{}pending.clear();}
export function clearFieldError(field){
 if(!field?.getAttribute)return;field.removeAttribute('aria-invalid');
 const id=field.dataset.errorId;if(id){document.getElementById(id)?.remove();field.setAttribute('aria-describedby',(field.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&x!==id).join(' '));delete field.dataset.errorId;}
}
export function syncConditionalFields(form){
 for(const field of form.querySelectorAll('[data-required-if]')){
  const [name,value]=field.dataset.requiredIf.split(':');
  field.required=form.elements.namedItem(name)?.value===value;
  if(!field.required)clearFieldError(field);
 }
}
function validationMessage(e){
 const v=e.validity;if(v.valueMissing)return e.type==='checkbox'?'Pažymėk šį patvirtinimą, kad galėtum tęsti.':'Užpildyk šį lauką.';
 if(v.typeMismatch)return e.type==='email'?'Įrašyk el. pašto adresą, pvz., vardas@example.com.':'Patikrink įvestą reikšmę.';
 if(v.patternMismatch)return e.name==='code'?'Įrašyk visus 6 kodo skaitmenis.':e.getAttribute('maxlength')==='5'?'Įrašyk laiką 24 valandų formatu, pvz., 17:00.':'Patikrink įvesties formatą.';
 if(v.rangeUnderflow)return `Mažiausia reikšmė: ${e.min}.`;if(v.rangeOverflow)return `Didžiausia reikšmė: ${e.max}.`;
 if(v.stepMismatch)return `Leistinas žingsnis: ${e.step}.`;if(v.tooLong)return `Naudok iki ${e.maxLength} simbolių.`;
 return 'Patikrink šio lauko reikšmę.';
}
export function validateForm(form){
 syncConditionalFields(form);let first=null;for(const e of [...form.elements]){if(!e.willValidate)continue;clearFieldError(e);const blank=e.required&&['text','textarea','email','search'].includes(e.type)&&!e.value.trim();if(e.validity.valid&&!blank)continue;
  const id=form.id+'-error-'+e.name,copy=document.createElement('p');copy.id=id;copy.className='field-error';copy.textContent=blank?'Užpildyk šį lauką.':validationMessage(e);e.dataset.errorId=id;e.setAttribute('aria-invalid','true');e.setAttribute('aria-describedby',[e.getAttribute('aria-describedby'),id].filter(Boolean).join(' '));
  const group=e.closest('.field');if(group)group.append(copy);else(e.closest('.check-label')||e).insertAdjacentElement('afterend',copy);first||=e;
 }
 if(first){first.focus();return false;}return true;
}

export function offerDraftShape(ctx,offer){try{const draft=JSON.parse(sessionStorage.getItem(draftKey(ctx,{id:'offer-editor'})));if(draft&&Date.now()-draft.at<ttl&&Array.isArray(draft.variantIds)&&draft.variantIds.length<=24&&new Set(draft.variantIds).size===draft.variantIds.length)return {...offer,variants:draft.variantIds.map(id=>{const v=offer.variants.find(v=>v.id===id)||{id,label:'',priceMinor:null,durationMin:null,staffOptions:[],addons:[]},shape=draft.variantShapes?.find(x=>x.id===id);return !shape?v:{...v,addons:(shape.addonIds||[]).slice(0,12).map(id=>v.addons.find(a=>a.id===id)||{id,label:'',priceMinor:null,durationMin:null}),addonGroups:(shape.groupIds||[]).slice(0,8).map(id=>v.addonGroups?.find(g=>g.id===id)||{id,label:'',min:0,max:1})};})};}catch{}return offer;}
