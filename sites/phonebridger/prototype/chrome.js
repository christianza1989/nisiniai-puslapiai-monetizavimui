/* Chrome and Google app replicas use local sample data only. */
(() => {
  const demo=window.PhoneBridgerDemo, utilities=window.PhoneBridgerUtilities;
  const hero=document.querySelector('.interactive-hero'), pc=hero.querySelector('[data-screen=pc]');
  const scene=hero.querySelector('.demo-scene'), popover=pc.querySelector('.chrome-popover');
  const titles={drive:'Drive',google:'Google'};
  const logo=name=>`<svg class="app-logo" aria-hidden="true"><use href="#app-${name}"/></svg>`;
  const samples=[{id:'sheets',name:'Team weekly recap',type:'Google Sheets',owner:'You',date:'10:12 AM'}, {id:'calendar',name:'Weekly planning',type:'Google Calendar',owner:'Alex',date:'Oct 4, 2026'}];
  let folders=[], mailFolder='Inbox', history=['market'], historyIndex=0, navigating=false;
  const starred=new Set(), bookmarks=new Set();
  const element=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls||'';if(text!==undefined)node.textContent=text;return node;};
  function appHeader(name){const head=element('header','google-app-topbar');head.innerHTML=`<span class="app-menu">☰</span>${logo(name)}<strong>${titles[name]}</strong><span class="google-avatar">J</span>`;return head;}
  function makeDrive(){
    const app=element('div','google-replica drive-app');app.append(appHeader('drive'));
    app.insertAdjacentHTML('beforeend','<div class="drive-layout"><aside class="drive-sidebar"><button type="button" data-drive-new>+ &nbsp; New</button><span class="selected">⌂ &nbsp; Home</span><span>▣ &nbsp; My Drive</span><span>♧ &nbsp; Shared with me</span><span>◷ &nbsp; Recent</span><span>☆ &nbsp; Starred</span><span>▱ &nbsp; Trash</span><small>Storage<br>0.3 GB of 15 GB used</small></aside><div class="drive-main"><input class="drive-search" type="search" aria-label="Search in Drive" placeholder="Search in Drive"><h3>Welcome to Drive</h3><div class="drive-filters"><span>Type ▾</span><span>People ▾</span><span>Modified ▾</span></div><strong class="drive-section-title">Suggested files</strong><div class="drive-file-list"></div><form class="drive-folder-form" hidden><input aria-label="Folder name" maxlength="60" required placeholder="Untitled folder"><button type="submit">Create folder</button></form></div></div>');renderDrive(app);return app;
  }
  function renderDrive(app){
    const query=app.querySelector('.drive-search').value.toLowerCase(), list=app.querySelector('.drive-file-list');list.replaceChildren();
    for(const file of [...samples,...folders].filter(file=>file.name.toLowerCase().includes(query))){
      const row=element('div','drive-file');const open=element('button','drive-file-open');open.type='button';if(file.id)open.dataset.navigate=file.id;else open.dataset.folderOpen=file.name;
      open.innerHTML=file.id?logo(file.id):'<span class="folder-icon">▰</span>';open.append(element('span','',file.name));
      const star=element('button','drive-star',starred.has(file.name)?'★':'☆');star.type='button';star.dataset.driveStar=file.name;star.setAttribute('aria-label',`Star ${file.name}`);star.setAttribute('aria-pressed',String(starred.has(file.name)));
      row.append(open,element('small','drive-file-owner',file.owner),element('small','drive-file-date',file.date),star);list.append(row);
    }
    if(!list.childElementCount)list.append(element('p','app-empty','No matching files.'));
  }
  function makeGoogle(){
    const app=element('div','google-replica google-app');app.innerHTML='<div class="google-links"><button type="button" data-navigate="gmail">Gmail</button><button type="button" data-navigate="drive">Drive</button><span>▦</span><span class="google-avatar">J</span></div><div class="google-wordmark" aria-label="Google">Google</div><form class="google-search-form"><span>⌕</span><input aria-label="Search Google demo" placeholder="Search Google or type a URL" maxlength="150" autocomplete="off"><button type="submit" aria-label="Search">↵</button></form><div class="google-shortcuts"></div><div class="google-results" hidden></div>';
    const shortcuts=app.querySelector('.google-shortcuts');for(const name of ['sheets','gmail','drive']){const b=element('button');b.type='button';b.dataset.navigate=name;b.innerHTML=logo(name);b.append(element('span','',demo.tabNames[name].replace('Google ','')));shortcuts.append(b);}return app;
  }
  function makeApp(name){
    if(name==='drive')return makeDrive();if(name==='google')return makeGoogle();
    const root=element('div',`google-replica google-${name}`);root.append(appHeader(name));
    const app=utilities.makeApp(name);
    root.append(app);return root;
  }
  function rebuildPages(){for(const name of Object.keys(titles))pc.querySelector(`[data-pc-page=${name}]`).replaceChildren(makeApp(name));}
  function openPhone(name,key){if(window.PhoneBridgerSimulator){window.PhoneBridgerSimulator.open(key,name);return;}demo.openPhonePanel(key,demo.tabNames[name],makeApp(name));hero.querySelectorAll('.phone-launcher').forEach(el=>el.hidden=true);demo.notify(`${demo.tabNames[name]} opened on the ${key} phone.`);}
  function go(name){if(!demo.tabNames[name])return window.PhoneBridgerSimulator?.open('pc',name);window.PhoneBridgerDesktop?.open('chrome');pc.classList.remove('browser-is-minimized');pc.querySelector('.browser-minimized').hidden=true;demo.selectTab(name);}
  function updateNavigation(){pc.querySelector('[data-chrome=back]').disabled=historyIndex<=0;pc.querySelector('[data-chrome=forward]').disabled=historyIndex>=history.length-1;const b=pc.querySelector('[data-chrome=bookmark]');b.textContent=bookmarks.has(demo.getTab())?'★':'☆';b.setAttribute('aria-pressed',String(bookmarks.has(demo.getTab())));}
  scene.addEventListener('demo-tab-change',e=>{if(!navigating&&history[historyIndex]!==e.detail){history=history.slice(0,historyIndex+1);history.push(e.detail);historyIndex=history.length-1;}popover.hidden=true;updateNavigation();});
  function showMenu(kind){
    const same=popover.dataset.menu===kind&&!popover.hidden;popover.hidden=same;popover.dataset.menu=kind;if(same)return;popover.replaceChildren();
    if(kind==='tabs'){popover.append(element('strong','','Search tabs'));for(const [key,title]of Object.entries(demo.tabNames)){const b=element('button','',title);b.type='button';b.dataset.navigate=key;if(pc.querySelector(`[data-link=${key}]`).hidden)b.append(element('small','',' · Closed — reopen'));popover.append(b);}}
    else if(kind==='profile'){popover.innerHTML='<div class="chrome-profile-card"><span class="google-avatar">J</span><strong>Jamie</strong><small>Local demo profile</small><span>Sync is off</span></div>';}
    else{popover.innerHTML='<button type="button" data-chrome="new">New tab <small>Ctrl + T</small></button><button type="button" data-chrome="tabs">Open tabs</button><button type="button" data-chrome="bookmark">Bookmark this tab</button><hr><button type="button" data-action="reset">Reset workspace</button>';}pc.querySelectorAll('[data-chrome=menu],[data-chrome=tabs]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.chrome===kind&&!popover.hidden)));
  }
  function filterMail(query=''){
    let visible=0;pc.querySelectorAll('.inbox-row').forEach(row=>{row.hidden=(mailFolder==='Drafts'||mailFolder==='Sent')||!row.textContent.toLowerCase().includes(query.toLowerCase())||(mailFolder==='Starred'&&!row.classList.contains('mail-starred'));if(!row.hidden)visible++;});
    const empty=pc.querySelector('.mail-empty');empty.hidden=visible>0;empty.textContent=mailFolder==='Drafts'?'Your draft is open below.':mailFolder==='Sent'?'No sent conversations in this sample inbox.':'No conversations found.';
  }
  function handleChromeClick(e){
    if(e.chromeHandled)return;e.chromeHandled=true;
    const close=e.target.closest('[data-close-tab]');if(close){const tab=close.closest('[data-link]');tab.hidden=true;const next=[...pc.querySelectorAll('.browser-tab')].find(t=>!t.hidden);if(demo.getTab()===tab.dataset.link)go(next?.dataset.link||'google');return;}
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.navigate)go(b.dataset.navigate);
    if(b.dataset.googlePhone)openPhone(b.dataset.googlePhone,b.dataset.phone);
    if(b.dataset.googleMobile)openPhone(b.dataset.googleMobile,demo.getMobilePhone());
    if(b.dataset.chrome){const action=b.dataset.chrome;
      if(action==='new')go('google');
      if(action==='back'||action==='forward'){const next=historyIndex+(action==='back'?-1:1);if(next>=0&&next<history.length){historyIndex=next;navigating=true;go(history[next]);navigating=false;updateNavigation();}}
      if(action==='reload')demo.notify('Page is up to date. Your edits are saved in this workspace.');
      if(['tabs','menu','profile'].includes(action))showMenu(action);
      if(action==='bookmark'){const key=demo.getTab();if(bookmarks.has(key))bookmarks.delete(key);else bookmarks.add(key);updateNavigation();}
      if(action==='minimize'||action==='close'){if(window.PhoneBridgerDesktop)window.PhoneBridgerDesktop.hide('chrome',action==='close');else{pc.classList.add('browser-is-minimized');pc.querySelector('.browser-minimized').hidden=false;}popover.hidden=true;}
      if(action==='restore'){window.PhoneBridgerDesktop?.open('chrome');pc.classList.remove('browser-is-minimized');pc.querySelector('.browser-minimized').hidden=true;}
      if(action==='maximize'){if(window.PhoneBridgerDesktop)window.PhoneBridgerDesktop.toggleSize('chrome');else{pc.classList.toggle('browser-maximized');b.setAttribute('aria-label',pc.classList.contains('browser-maximized')?'Restore demo browser size':'Maximize demo browser');}}
    }
    if(b.hasAttribute('data-drive-new')){const form=b.closest('.drive-app').querySelector('.drive-folder-form');form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input').focus();}
    if(b.dataset.driveStar){const name=b.dataset.driveStar;if(starred.has(name))starred.delete(name);else starred.add(name);hero.querySelectorAll('.drive-app').forEach(renderDrive);}
    if(b.dataset.folderOpen)demo.notify(`“${b.dataset.folderOpen}” is empty. Open a sample file to continue.`);
    if(b.dataset.gmail){const panel=pc.querySelector('.gmail-compose-panel');panel.hidden=b.dataset.gmail==='hide-compose';if(!panel.hidden)panel.querySelector('textarea').focus();}
    if(b.dataset.mailFolder){mailFolder=b.dataset.mailFolder;pc.querySelectorAll('[data-mail-folder]').forEach(row=>row.classList.toggle('selected',row===b));filterMail(pc.querySelector('.mail-search').value);if(mailFolder==='Drafts')pc.querySelector('.gmail-compose-panel').hidden=false;}
    if(b.dataset.mailId){if(e.target.closest('.inbox-row>span:first-child')){b.classList.toggle('mail-starred');filterMail(pc.querySelector('.mail-search').value);}else{pc.querySelector('.gmail-compose-panel').hidden=false;pc.querySelector('.compose-subject').textContent=b.querySelector('b').textContent;}}
  }
  [pc.querySelector('.browser-tabs'),pc.querySelector('.browser-address'),popover,hero].forEach(root=>root.addEventListener('click',handleChromeClick));
  hero.addEventListener('focusin',e=>{if(e.target.dataset.cell!==undefined){scene.querySelectorAll('[data-selected-cell]').forEach(cell=>delete cell.dataset.selectedCell);e.target.dataset.selectedCell='true';scene.querySelector('.sheet-formula span').textContent=e.target.textContent;}});
  hero.addEventListener('input',e=>{if(e.target.matches('.drive-search'))renderDrive(e.target.closest('.drive-app'));if(e.target.matches('.mail-search'))filterMail(e.target.value);});
  hero.addEventListener('submit',e=>{
    if(e.target.matches('.chrome-omnibox')){e.preventDefault();const q=e.target.querySelector('input').value.toLowerCase();const key=q.includes('sheet')?'sheets':q.includes('gmail')||q.includes('mail.google')?'gmail':q.includes('drive')?'drive':q.includes('calendar')?'calendar':q.includes('tasks')?'tasks':'google';go(key);if(key==='google'&&window.PhoneBridgerSimulator){window.PhoneBridgerSimulator.open('pc','google',{query:q});return;}if(key==='google'){const form=pc.querySelector('.google-search-form');form.querySelector('input').value=q;form.requestSubmit();}}
    if(e.target.matches('.google-search-form')){e.preventDefault();const app=e.target.closest('.google-app'),query=e.target.querySelector('input').value.trim(),results=app.querySelector('.google-results');results.replaceChildren();results.hidden=false;for(const [key,title]of Object.entries(demo.tabNames).filter(([key,title])=>key!=='market'&&(title.toLowerCase().includes(query.toLowerCase())||!query))){const b=element('button','search-result');b.type='button';b.dataset.navigate=key;b.append(element('small','','Google Workspace'),element('strong','',title),element('span','',`Open ${title} in your connected workspace.`));results.append(b);}if(!results.childElementCount)results.append(element('p','app-empty',`No sample apps match “${query}”. Try “Sheets”, “Drive” or “Calendar”.`));}
    if(e.target.matches('.drive-folder-form')){e.preventDefault();const input=e.target.querySelector('input');if(input.value.trim()){folders.push({name:input.value.trim(),owner:'You',date:'Just now'});input.value='';e.target.hidden=true;hero.querySelectorAll('.drive-app').forEach(renderDrive);}}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){popover.hidden=true;pc.querySelector('.tab-destinations').hidden=true;}});
  window.PhoneBridgerChrome={openPhone,reset(){folders=[];starred.clear();bookmarks.clear();history=['market'];historyIndex=0;mailFolder='Inbox';pc.querySelectorAll('.browser-tab').forEach(tab=>tab.hidden=false);pc.classList.remove('browser-is-minimized','browser-maximized');pc.querySelector('.browser-minimized').hidden=true;pc.querySelector('.gmail-compose-panel').hidden=false;pc.querySelector('.compose-subject').textContent='Weekly recap';pc.querySelectorAll('[data-mail-folder]').forEach(b=>b.classList.toggle('selected',b.dataset.mailFolder==='Inbox'));pc.querySelector('.mail-search').value='';pc.querySelectorAll('.inbox-row').forEach(row=>row.classList.remove('mail-starred'));filterMail();rebuildPages();updateNavigation();}};
  hero.querySelectorAll('.phone-app-grid').forEach(grid=>{const key=grid.closest('[data-screen]').dataset.screen;for(const name of ['drive','google']){const b=element('button');b.type='button';b.dataset.googlePhone=name;b.dataset.phone=key;b.setAttribute('aria-label',`Open ${titles[name]} on ${key} phone`);b.innerHTML=logo(name);b.append(element('small','',titles[name]));grid.append(b);}});
  for(const name of ['drive','google']){const b=element('button','',titles[name]);b.type='button';b.dataset.googleMobile=name;hero.querySelector('.mobile-utilities').append(b);}
  rebuildPages();updateNavigation();
})();
