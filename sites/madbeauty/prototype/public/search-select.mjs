import {normalizeSearch} from '/taxonomy.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function searchSelect({id,name,label,options,value}){
 const chosen=options.find(x=>x.id===value);
 return `<div class="search-select" data-search-select="${esc(id)}"><label for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" type="text" name="${esc(name)}Text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${esc(id)}-options" autocomplete="off" value="${esc(chosen?.label||'')}" placeholder="${name==='miestas'?'Ieškoti miesto':'Ieškoti paslaugos'}" data-combo-input><input type="hidden" name="${esc(name)}" value="${esc(chosen?.id||'')}"><template data-combo-options>${JSON.stringify(options).replace(/</g,'\\u003c').replace(/&/g,'\\u0026')}</template></div>`;
}
let cleanup=()=>{};
export function bindSearchSelects(root=document){
 cleanup();const controllers=[];root.querySelectorAll('[data-search-select]').forEach(box=>{
  const input=box.querySelector('[data-combo-input]'),hidden=box.querySelector('input[type=hidden]'),options=JSON.parse(box.querySelector('template').content.textContent),controller=new AbortController(),on={signal:controller.signal};
  const list=document.createElement('div');list.id=input.getAttribute('aria-controls');list.className='search-options';list.role='listbox';list.setAttribute('aria-label',box.querySelector('label').textContent);list.hidden=true;document.body.append(list);
  let filtered=[],active=-1,chosen=options.find(x=>x.id===hidden.value),opened=false;
  const position=()=>{if(!opened)return;const r=input.getBoundingClientRect();list.style.left=Math.max(8,Math.min(r.left,window.innerWidth- Math.min(440,window.innerWidth-16)-8))+'px';list.style.top=Math.min(r.bottom+8,window.innerHeight-100)+'px';list.style.width=Math.min(440,window.innerWidth-16)+'px';list.style.maxHeight=Math.max(80,Math.min(430,window.innerHeight-r.bottom-16))+'px';};
  const highlight=i=>{active=i;list.querySelectorAll('[role=option]').forEach((n,index)=>{n.setAttribute('aria-selected',index===i);if(index===i){input.setAttribute('aria-activedescendant',n.id);n.scrollIntoView({block:'nearest'});}});if(i<0)input.removeAttribute('aria-activedescendant');};
  const close=()=>{opened=false;list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
  const show=(query='')=>{const terms=normalizeSearch(query).split(' ').filter(Boolean);filtered=options.filter(x=>terms.every(t=>normalizeSearch([x.label,x.pathLabel,...(x.aliases||[])].join(' ')).includes(t)));list.innerHTML=filtered.map((x,i)=>`<button type="button" role="option" tabindex="-1" id="${esc(input.id)}-option-${i}" data-index="${i}" aria-selected="false"><strong>${esc(x.label)}</strong>${x.pathLabel?`<span>${esc(x.pathLabel)}</span>`:''}</button>`).join('')||'<p role="status">Atitikmenų nėra. Pakeisk paieškos tekstą.</p>';opened=true;list.hidden=false;input.setAttribute('aria-expanded','true');position();highlight(-1);};
  const choose=i=>{const x=filtered[i];if(!x)return;chosen=x;hidden.value=x.id;input.value=x.label;input.setCustomValidity('');close();hidden.dispatchEvent(new Event('change',{bubbles:true}));input.focus({preventScroll:true});};
  input.addEventListener('focus',()=>show(chosen?.label===input.value?'':input.value),on);
  input.addEventListener('input',()=>{hidden.value='';chosen=null;input.setCustomValidity('Pasirink reikšmę iš sąrašo.');show(input.value);},on);
  input.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!opened)show('');highlight(e.key==='Home'?0:e.key==='End'?filtered.length-1:Math.max(0,Math.min(filtered.length-1,active+(e.key==='ArrowDown'?1:-1))));}else if(e.key==='Enter'&&opened){e.preventDefault();choose(active<0?0:active);}else if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab')close();},on);
  list.addEventListener('pointerdown',e=>e.preventDefault(),on);list.addEventListener('click',e=>{const item=e.target.closest('[data-index]');if(item)choose(Number(item.dataset.index));},on);
  document.addEventListener('pointerdown',e=>{if(!box.contains(e.target)&&!list.contains(e.target))close();},on);
  window.addEventListener('resize',position,on);window.addEventListener('scroll',position,{...on,capture:true});
  controllers.push(()=>{controller.abort();list.remove();});
 });cleanup=()=>controllers.forEach(fn=>fn());
}
