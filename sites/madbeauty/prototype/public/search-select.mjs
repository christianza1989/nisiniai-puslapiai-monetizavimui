import {normalizeSearch} from '/taxonomy.mjs';
import {SERVICES_MEDIA} from '/services-media.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chevron='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const categoryArt={veidas:'veido-prieziura',kunas:'kuno-prieziura',spa:'spa-ir-poilsis',verimas:'auskaru-verimas',estetika:'estetines-proceduros'};

// Supplied catalogue is authoritative: operator-created categories work too.
export function serviceTree(options){
 const index=new Map();
 for(const n of options)if(n.id&&n.enabled!==false&&!n.archived&&!index.has(n.id))index.set(n.id,n);
 const nodes=[...index.values()],parents=new Map(),children=new Map();
 for(const n of nodes){
  const parent=n.kind==='category'?null:[n.parentId,n.categoryId].find(id=>id&&id!==n.id&&index.has(id));
  parents.set(n.id,parent||null);
 }
 // A malformed extension must not hide choices or create an infinite branch.
 for(const n of nodes){let id=n.id;const seen=new Set();while(id){if(seen.has(id)){parents.set(n.id,null);break;}seen.add(id);id=parents.get(id);}}
 for(const n of nodes){const parent=parents.get(n.id);if(!children.has(parent))children.set(parent,[]);children.get(parent).push(n);}
 const ancestors=id=>{const result=[];while(parents.get(id)){id=parents.get(id);result.unshift(index.get(id));}return result;};
 const path=n=>ancestors(n.id).map(x=>x.label).join(' · ')|| (n.kind==='category'?'Kategorija':n.pathLabel||'');
 const count=id=>(children.get(id)||[]).reduce((sum,n)=>sum+(n.kind==='treatment'?1:count(n.id)),0);
 return {nodes,index,parents,children,ancestors,path,count};
}

export function serviceTreeItems(model,expanded=new Set(),query=''){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 if(terms.length){
  const q=normalizeSearch(query),score=n=>normalizeSearch(n.label)===q?0:normalizeSearch(n.label).startsWith(q)?1:2;
  return model.nodes.filter(n=>terms.every(t=>normalizeSearch([n.label,model.path(n),...(n.aliases||[]),...model.ancestors(n.id).flatMap(x=>x.aliases||[])].join(' ')).includes(t)))
   .sort((a,b)=>score(a)-score(b)).map(n=>({key:'pick:'+n.id,node:n,level:1,path:model.path(n)}));
 }
 const result=[];
 const visit=(siblings,level,parentKey=null)=>siblings.forEach((n,i)=>{
  const descendants=model.children.get(n.id)||[],branch=descendants.length>0,key=(branch?'branch:':'pick:')+n.id;
  result.push({key,node:n,level,parentKey,branch,pos:i+1,size:siblings.length});
  if(branch&&expanded.has(n.id)){
   result.push({key:'pick:'+n.id,node:n,level:level+1,parentKey:key,broad:true,pos:1,size:descendants.length+1});
   const start=result.length;visit(descendants,level+1,key);
   for(let j=start;j<result.length;j++)if(result[j].parentKey===key){result[j].pos++;result[j].size++;}
  }
 });
 visit(model.children.get(null)||[],1);return result;
}

export function searchSelect({id,name,label,options,value}){
 const chosen=options.find(x=>x.id===value&&x.enabled!==false&&!x.archived),tree=name==='paslauga';
 return `<div class="search-select" data-search-select="${esc(id)}" data-combo-kind="${tree?'service':'city'}"><label for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" type="text" name="${esc(name)}Text" role="combobox" aria-haspopup="${tree?'tree':'listbox'}" aria-autocomplete="list" aria-expanded="false" aria-controls="${esc(id)}-options" autocomplete="off" spellcheck="false" maxlength="120" value="${esc(chosen?.label||'')}" placeholder="${tree?'Ieškoti paslaugos':'Ieškoti miesto'}" data-combo-input><input type="hidden" name="${esc(name)}" value="${esc(chosen?.id||'')}"><template data-combo-options>${JSON.stringify(options).replace(/</g,'\\u003c').replace(/&/g,'\\u0026')}</template></div>`;
}

let cleanup=()=>{};
export function bindSearchSelects(root=document){
 cleanup();const controllers=[];
 root.querySelectorAll('[data-search-select]').forEach(box=>{
  const input=box.querySelector('[data-combo-input]'),hidden=box.querySelector('input[type=hidden]'),options=JSON.parse(box.querySelector('template').content.textContent),tree=box.dataset.comboKind==='service',model=tree?serviceTree(options):null;
  const controller=new AbortController(),on={signal:controller.signal},expanded=new Set();
  const popup=document.createElement('div');popup.className='search-options combo-popup'+(tree?' service-tree-options':'');popup.hidden=true;
  popup.innerHTML=`<div class="combo-heading"><strong>${tree?'Paslaugos':'Miestai'}</strong><span>${tree?'Kategorija · grupė · procedūra':'Ieškok pagal miesto pavadinimą'}</span></div><div class="combo-items" id="${esc(input.getAttribute('aria-controls'))}" role="${tree?'tree':'listbox'}" aria-label="${esc(box.querySelector('label').textContent)}"></div><div class="combo-status" role="status" aria-live="polite"></div>`;
  document.body.append(popup);
  const list=popup.querySelector('.combo-items'),status=popup.querySelector('.combo-status');
  let items=[],active=-1,chosen=options.find(x=>x.id===hidden.value),opened=false,query='',suppressFocus=false;
  const revealChosen=()=>{if(tree&&chosen){for(const n of [...model.ancestors(chosen.id),...(model.children.has(chosen.id)?[chosen]:[])]){for(const sibling of model.children.get(model.parents.get(n.id))||[])expanded.delete(sibling.id);expanded.add(n.id);}}};
  revealChosen();
  const position=()=>{
   if(!opened)return;
   const r=input.getBoundingClientRect(),viewport=window.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,pageWidth=viewport?.width||document.documentElement.clientWidth,height=viewport?.height||window.innerHeight;
   const width=Math.min(tree?460:380,pageWidth-16),below=top+height-r.bottom-16,above=r.top-top-16,up=below<220&&above>below,room=Math.max(64,Math.min(480,up?above:below));
   popup.style.width=width+'px';popup.style.left=Math.max(left+8,Math.min(r.left,left+pageWidth-width-8))+'px';popup.style.maxHeight=room+'px';
   popup.style.top=(up?Math.max(top+8,r.top-popup.offsetHeight-8):Math.max(top+8,Math.min(r.bottom+8,top+height-room-8)))+'px';
  };
  const highlight=i=>{
   active=items.length?Math.max(-1,Math.min(items.length-1,i)):-1;
   list.querySelectorAll('[data-index]').forEach((n,index)=>{
    n.dataset.active=String(index===active);
    if(index===active){input.setAttribute('aria-activedescendant',n.id);n.scrollIntoView({block:'nearest'});}
   });
   if(active<0)input.removeAttribute('aria-activedescendant');
  };
  const close=()=>{opened=false;popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
  const render=(key=null)=>{
   const terms=normalizeSearch(query).split(' ').filter(Boolean);
   items=tree?serviceTreeItems(model,expanded,query):options.filter(n=>terms.every(t=>normalizeSearch([n.label,...(n.aliases||[])].join(' ')).includes(t))).map(n=>({node:n,key:'pick:'+n.id}));
   list.innerHTML=items.map((item,i)=>{
    const n=item.node,isSelected=!item.branch&&n.id===hidden.value,art=tree&&n.kind==='category'&&!query&&!item.broad?SERVICES_MEDIA[categoryArt[n.id]||n.id]?.variants.find(v=>v.width===360):null;
    const label=item.broad?(n.kind==='category'?'Visos šios kategorijos paslaugos':'Visos šios grupės procedūros'):n.label,sub=item.path||(item.broad?n.label:'');
    return `<button type="button" role="${tree?'treeitem':'option'}" tabindex="-1" id="${esc(input.id)}-item-${i}" data-index="${i}" data-key="${esc(item.key)}" data-level="${item.level||1}" data-broad="${!!item.broad}" aria-selected="${isSelected}" ${tree?`aria-level="${item.level}" ${item.pos?`aria-posinset="${item.pos}" aria-setsize="${item.size}"`:''}`:''} ${item.branch?`aria-expanded="${expanded.has(n.id)}"`:''} class="combo-row ${art?'combo-category':''}" style="--combo-depth:${(item.level||1)-1}">${art?`<img src="/${art.file}" alt="" width="40" height="40" loading="lazy" decoding="async">`:''}<span class="combo-copy"><strong>${esc(label)}</strong>${sub?`<small>${esc(sub)}</small>`:''}</span>${item.branch?`<span class="combo-count" aria-hidden="true">${model.count(n.id)||''}</span><span class="combo-chevron">${chevron}</span>`:isSelected?`<span class="combo-check">${check}</span>`:''}</button>`;
   }).join('')||'<div class="combo-empty"><strong>Atitikmenų nėra</strong><p>Pabandyk trumpesnį pavadinimą arba išvalyk įvestą tekstą.</p></div>';
   status.textContent=query?`${items.length} ${items.length===1?'atitikmuo':'atitikmenų'}`:tree?'Rinkis visą sritį arba konkrečią procedūrą.':'';
   status.hidden=!status.textContent;position();highlight(key?items.findIndex(x=>x.key===key):-1);
  };
  const show=(text='')=>{
   query=text;opened=true;popup.hidden=false;input.setAttribute('aria-expanded','true');
   if(!text)revealChosen();
   render();if(!text)list.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});
  };
  const toggle=item=>{
   if(expanded.has(item.node.id))expanded.delete(item.node.id);
   else{for(const sibling of model.children.get(model.parents.get(item.node.id))||[])expanded.delete(sibling.id);expanded.add(item.node.id);}
   render(item.key);
  };
  const choose=item=>{
   if(!item)return;if(item.branch){toggle(item);return;}
   chosen=item.node;hidden.value=chosen.id;input.value=chosen.label;input.setCustomValidity('');close();hidden.dispatchEvent(new Event('change',{bubbles:true}));
   suppressFocus=true;input.focus({preventScroll:true});suppressFocus=false;
  };
  input.addEventListener('focus',()=>{if(!suppressFocus)show(chosen?.label===input.value?'':input.value);},on);
  input.addEventListener('click',()=>{if(!opened)show(chosen?.label===input.value?'':input.value);},on);
  input.addEventListener('input',()=>{hidden.value='';chosen=null;input.setCustomValidity('Pasirink reikšmę iš sąrašo.');show(input.value);},on);
  input.addEventListener('blur',close,on);
  input.addEventListener('keydown',e=>{
   if(e.isComposing)return;
   if(['ArrowDown','ArrowUp'].includes(e.key)||opened&&active>=0&&['Home','End'].includes(e.key)){
    e.preventDefault();if(!opened)show(chosen?.label===input.value?'':input.value);
    highlight(e.key==='Home'?0:e.key==='End'?items.length-1:active<0?(e.key==='ArrowDown'?0:items.length-1):active+(e.key==='ArrowDown'?1:-1));
   }else if(tree&&opened&&!query&&active>=0&&['ArrowRight','ArrowLeft'].includes(e.key)){
    e.preventDefault();const item=items[active];
    if(e.key==='ArrowRight'){if(item.branch&&!expanded.has(item.node.id))toggle(item);else if(item.branch)highlight(active+1);}
    else if(item.branch&&expanded.has(item.node.id))toggle(item);else if(item.parentKey)highlight(items.findIndex(x=>x.key===item.parentKey));
   }else if(e.key==='Enter'&&opened){e.preventDefault();choose(items[active<0?0:active]);}
   else if(e.key==='Escape'&&opened){e.preventDefault();close();}
   else if(e.key==='Tab')close();
  },on);
  // Preserve input focus on choices, while allowing touch scroll and scrollbar drags.
  popup.addEventListener('pointerdown',e=>{if(e.target.closest('[data-index]'))e.preventDefault();},on);
  popup.addEventListener('click',e=>{const item=e.target.closest('[data-index]');if(item)choose(items[Number(item.dataset.index)]);},on);
  document.addEventListener('pointerdown',e=>{if(!box.contains(e.target)&&!popup.contains(e.target))close();},on);
  window.addEventListener('resize',position,on);window.addEventListener('scroll',position,{...on,capture:true});
  window.visualViewport?.addEventListener('resize',position,on);window.visualViewport?.addEventListener('scroll',position,on);
  controllers.push(()=>{controller.abort();popup.remove();});
 });
 cleanup=()=>controllers.forEach(fn=>fn());
}
