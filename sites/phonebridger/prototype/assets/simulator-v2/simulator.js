/* Website-only interconnected simulator. Hardware and pointer geometry are owned by simulation.js. */
(() => {
  'use strict';
  const demo=window.PhoneBridgerDemo,D=window.PhoneBridgerDesktop,A=window.PhoneBridgerApps,U=window.PhoneBridgerUI;
  if(!demo||!D||!A)return;
  const m=window.PhoneBridgerState.create(),{esc,icon,logo,brandNames,button:B,ib,avatar}=U;
  const hero=document.querySelector('.interactive-hero'),scene=hero.querySelector('.demo-scene'),pc=hero.querySelector('[data-screen=pc]');
  const observers={},contexts=new Map(),phones={},cache={left:{},right:{}},history={left:[],right:{}},recents={left:[],right:[]};history.right=[];
  let activePc='gmail',visible=true,rangeDrag=null,fileDrag=null,refreshPending=false,resetting=false,activityPaused=false;
  const defaults=app=>({app:app==='market'?'creators':app,page:app==='files'?'home':undefined,query:'',selected:[]});
  const localPcApps=new Set(['photos','tasks','contacts','whatsapp','files','docs','calendar']);
  const copyRoute=u=>JSON.parse(JSON.stringify({...u,modal:undefined}));
  function context(key,app){const id=key==='pc'?'pc:'+app:key;return contexts.get(id);}
  function ctxFor(el){return contexts.get(el.closest('[data-sim-context]')?.dataset.simContext);}
  function fit(key){const root=phones[key];if(!root)return;const canvas=root.querySelector('.sim-android-canvas');if(!root.clientWidth)return;const mobile=!!root.closest('.demo-mobile');const scale=mobile?1:root.clientWidth/360;canvas.style.transform=`scale(${scale})`;canvas.style.height=`${root.clientHeight/scale}px`;}
  function mount(key){
    const root=document.createElement('div');root.className='sim-android';root.dataset.utility='android';root.dataset.simContext=key;
    root.innerHTML=`<div class="sim-android-canvas"><header class="sim-android-status"><button type="button" data-sim-action="notifications" aria-label="Open notifications"><span data-sim-clock>10:15</span> ◷</button><button type="button" data-sim-action="quick-settings" aria-label="Quick settings">${icon('wifi')}<span class="sim-battery">91</span>ϟ</button></header><div class="sim-android-viewport"><section class="sim-surface" data-app="home"></section></div><nav class="sim-android-nav" aria-label="Android navigation"><button type="button" data-sim-action="recents" aria-label="Recent apps"><span class="sim-nav-square"></span></button><button type="button" data-sim-action="home" aria-label="Home"><span class="sim-nav-circle"></span></button><button type="button" data-sim-action="back" aria-label="Back"><span class="sim-nav-triangle"></span></button></nav></div>`;
    root.addEventListener('click',handleClick);demo.openPhonePanel(key,'Android',root);phones[key]=root;const c={key,u:defaults('home'),root,surface:root.querySelector('.sim-surface')};contexts.set(key,c);observers[key]?.disconnect();observers[key]=new ResizeObserver(()=>fit(key));observers[key].observe(root);render(c);fit(key);
  }
  function modal(c,title,body){if(c===winCtx)winPanel.hidden=false;c.u.modal={title,body};paintModal(c);}
  function paintModal(c){let host=c.surface.querySelector('.sim-modal-host');if(!host){host=document.createElement('div');host.className='sim-modal-host';c.surface.append(host);}host.innerHTML=c.u.modal?`<div class="sim-modal-shade"><section class="sim-modal" role="dialog" aria-label="${esc(c.u.modal.title)}"><h3>${esc(c.u.modal.title)}${ib('close-modal','Close menu','close')}</h3>${c.u.modal.body}</section></div>`:'';const edit=host.querySelector('[data-sim-edit]');if(edit&&c.u.modal.inputValue!==undefined)edit.value=c.u.modal.inputValue;host.querySelectorAll('[data-sim-form^=creator-] input[name]').forEach(el=>{if(c.u.creatorFormDraft?.[el.name]!==undefined)el.value=c.u.creatorFormDraft[el.name];});scrollControls(c);}
  function notify(c,text){if(!c)return demo.notify(text);c.surface.querySelector('.sim-toast')?.remove();const el=document.createElement('div');el.className='sim-toast';el.role='status';el.textContent=text;c.surface.append(el);setTimeout(()=>el.remove(),3500);}
  function render(c){
    if(!c?.surface?.isConnected)return;
    const focused=c.surface.contains(document.activeElement)?document.activeElement:null;
    const focusKey=focused?.dataset.simInput,selection=focused?.selectionStart;
    const edit=c.surface.querySelector('[data-sim-edit]');if(edit&&c.u.modal)c.u.modal.inputValue=edit.value;
    const view=[c.u.app,c.u.page,c.u.thread,c.u.preview,c.u.folder,c.u.sheet,c.u.worksheet,c.u.photo,c.u.article,c.u.tab,c.u.creatorTab,c.u.creatorFilter].join(':');
    const oldScroll=[...c.surface.querySelectorAll('.sim-scroll')].map(el=>[el.scrollTop,el.scrollLeft]);
    c.scrolls||(c.scrolls={});if(c.view)c.scrolls[c.view]=oldScroll;const scroll=c.scrolls[view]||[];
    const oldMessages=c.surface.querySelector('[data-scroll=messages]');c.bottoms||(c.bottoms={});if(oldMessages&&c.view)c.bottoms[c.view]=oldMessages.scrollHeight-oldMessages.clientHeight-oldMessages.scrollTop<40;const atBottom=c.bottoms[view]??true;
    c.view=view;
    const video=c.surface.querySelector('[data-sim-video]');if(video){c.u.videoTime=video.currentTime;c.u.videoPaused=video.paused;c.u.videoMuted=video.muted;video.pause();}
    c.surface.dataset.app=c.u.app;c.surface.innerHTML=A.render({m,u:c.u,key:c.key});
    [...c.surface.querySelectorAll('.sim-scroll')].forEach((el,i)=>{el.scrollTop=scroll[i]?.[0]||0;el.scrollLeft=scroll[i]?.[1]||0;});
    if(c.u.app==='whatsapp'&&c.u.thread&&atBottom)c.surface.querySelector('[data-scroll=messages]')?.scrollTo({top:999999});
    else if(c.u.app==='whatsapp'&&c.u.thread){const last=ib('latest-messages','New messages · Jump to latest','download');c.surface.querySelector('.sim-chat-form')?.insertAdjacentHTML('beforebegin',last);}
    if(focusKey){const next=c.surface.querySelector(`[data-sim-input="${focusKey}"]`);next?.focus({preventScroll:true});if(selection!==null&&next?.setSelectionRange&&(next.tagName==='TEXTAREA'||['text','search'].includes(next.type)))next.setSelectionRange(selection,selection);}
    paintModal(c);if(c.u.app==='creators'&&focusKey&&c.u.modal){const next=c.surface.querySelector(`[data-sim-input="${focusKey}"]`);next?.focus({preventScroll:true});if(next?.type==='text'&&selection!==null)next.setSelectionRange(selection,selection);}mountVideo(c);requestAnimationFrame(()=>scrollControls(c));
  }
  function scrollControls(c){
    c.surface.querySelectorAll('.sim-scroll-control,.sim-horizontal-control').forEach(el=>el.remove());
    if(c.key!=='pc')return;
    const targets=[...c.surface.querySelectorAll('.sim-scroll,.sim-modal')].filter(el=>el.scrollHeight>el.clientHeight+5&&el.clientHeight>20);const el=targets.at(-1);
    if(el){const box=document.createElement('label');box.className='sim-scroll-control';box.innerHTML='<input type="range" min="0" max="1000" aria-label="Scroll app content" data-sim-input="scroll">';const input=box.firstElementChild;input.value=el.scrollTop/(el.scrollHeight-el.clientHeight)*1000;input._scrollTarget=el;el.addEventListener('scroll',()=>{input.value=el.scrollTop/(el.scrollHeight-el.clientHeight)*1000;},{passive:true});c.surface.append(box);}
    const grid=c.surface.querySelector('.sim-sheet-grid');if(grid&&grid.scrollWidth>grid.clientWidth){const box=document.createElement('label');box.className='sim-horizontal-control';box.innerHTML='<input type="range" min="0" max="1000" aria-label="Scroll spreadsheet horizontally" data-sim-input="scroll-x">';box.firstElementChild._scrollTarget=grid;box.firstElementChild.value=grid.scrollLeft/(grid.scrollWidth-grid.clientWidth)*1000;c.surface.append(box);}
  }
  function navigate(c,fields){if(c.key!=='pc')history[c.key].push(copyRoute(c.u));else(c.history||(c.history=[])).push(copyRoute(c.u));c.u={...c.u,...fields,modal:undefined};render(c);}
  function remember(c){const video=c.surface.querySelector('[data-sim-video]');if(video){c.u.videoTime=video.currentTime;c.u.videoPaused=video.paused;c.u.videoMuted=video.muted;video.pause();}return copyRoute(c.u);}
  function home(key){const c=contexts.get(key);if(!c)return;cache[key][c.u.app]=remember(c);c.u=defaults('home');history[key]=[];render(c);}
  function open(key,app,fields={}){
    if(['market','creators'].includes(app)&&key!=='pc')return demo.notify('The creator dashboard stays on the PC in this demo.');
    app=app==='creators'?'market':app==='chat'?'whatsapp':app;
    if(key==='top')return demo.notify('The upper phone is the video player.');
    if(key==='pc'){if(app==='phonebridger'){D.open('phonebridger');return;}if(app==='home'){showWin('start');return;}if(app==='files'&&fields.explorer){showExplorer(fields);return;}const c=context('pc',app);if(localPcApps.has(app)){if(c){c.window.hidden=false;D.raise(c.window);Object.assign(c.u,fields);render(c);}return;}D.open('chrome');demo.selectTab(app);if(c){Object.assign(c.u,fields);render(c);}return;}
    const c=contexts.get(key);if(!c||!brandNames[app])return;
    if(c.u.app!==app){cache[key][c.u.app]=remember(c);history[key].push(copyRoute(c.u));recents[key]=[app,...recents[key].filter(x=>x!==app)].slice(0,8);}
    c.u={...(cache[key][app]||defaults(app)),...fields,app,modal:undefined};render(c);m.start();
  }
  function back(c){
    if(c.u.modal){delete c.u.modal;paintModal(c);return;}
    const stack=c.key==='pc'?(c.history||[]):history[c.key],prev=stack.at(-1),u=c.u;
    if(prev?.app===u.app){if(u.app==='chrome'&&u.article)u.lastArticle=u.article;c.u=stack.pop();if(u.app==='chrome')c.u.lastArticle=u.lastArticle;render(c);return;}
    if(u.preview){delete u.preview;render(c);return;}
    if(u.thread){delete u.thread;render(c);return;}
    if(u.article){u.lastArticle=u.article;delete u.article;render(c);return;}
    if(u.sheet){delete u.sheet;render(c);return;}
    if(u.photo){delete u.photo;render(c);return;}
    if(u.document){delete u.document;render(c);return;}
    if(u.folder&&['drive','files'].includes(u.app)){delete u.folder;u.page=u.app==='files'?'home':undefined;render(c);return;}
    if(u.category||u.page==='compose'){delete u.category;delete u.page;render(c);return;}
    if(u.pbPage&&u.pbPage!=='home'){u.pbPage='home';render(c);return;}
    if(prev){c.u=stack.pop();render(c);}else if(c.key!=='pc')home(c.key);else{c.u=defaults(u.app);render(c);}
  }
  function mountVideo(c){const v=c.surface.querySelector('[data-sim-video]');if(!v)return;const item=window.PhoneBridgerVideoPlaylist[c.u.video||0];v.src=item.src;v.poster=item.poster;v.controls=true;v.muted=!!c.u.videoMuted;v.addEventListener('loadedmetadata',()=>{v.currentTime=Math.min(c.u.videoTime||0,v.duration);if(c.u.videoPaused===false)v.play().catch(()=>notify(c,'Press play to start video.'));},{once:true});v.addEventListener('timeupdate',()=>{const seek=c.surface.querySelector('[data-sim-input=side-seek]');if(seek)seek.value=v.currentTime/v.duration*100;});v.addEventListener('play',()=>{const b=c.surface.querySelector('[data-sim-action=side-play]');if(b){b.innerHTML=icon('pause');b.setAttribute('aria-label','Pause video');}});v.addEventListener('pause',()=>{const b=c.surface.querySelector('[data-sim-action=side-play]');if(b){b.innerHTML=icon('play');b.setAttribute('aria-label','Play video');}});}
  function setupPc(){
    const tabrow=pc.querySelector('.chrome-tab-strip'),meta={};
    for(const app of localPcApps)delete demo.tabNames[app];
    ['market','gmail','drive','sheets','calendar','tasks','google','news','photos','files','docs','contacts','youtube','whatsapp'].forEach(app=>{
      const local=localPcApps.has(app);
      let page=pc.querySelector(local?`[data-pc-local="${app}"]`:`[data-pc-page="${app}"]`);if(!page){page=document.createElement('section');page.hidden=true;if(local){page.className='mini-window sim-explorer-window sim-local-window';page.dataset.pcLocal=app;page.dataset.simContext='pc:'+app;page.setAttribute('aria-label',brandNames[app]+' demo window');page.innerHTML=`<header>${logo(app)}<strong>${esc(brandNames[app])} · Demo</strong>${ib('local-window-close','Close '+brandNames[app],'close')}</header>`;page.addEventListener('click',handleClick);pc.append(page);}else{page.className='pc-page';page.dataset.pcPage=app;pc.querySelector('.pc-pages')?.append(page);if(!page.isConnected)pc.querySelector('[data-pc-page=gmail]').parentElement.append(page);}}
      if(!local&&!pc.querySelector(`[data-link="${app}"]`)){const tab=document.createElement('button');tab.type='button';tab.className='browser-tab';tab.dataset.link=app;tab.draggable=true;tab.innerHTML=logo(app)+`<span>${esc(brandNames[app])}</span><span data-close-tab="${app}" aria-label="Close tab">×</span>`;tabrow.insertBefore(tab,tabrow.querySelector('.new-tab'));tab.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',app);e.dataTransfer.effectAllowed='copy';});}
      if(!local)meta[app]={title:app==='market'?'Creators':brandNames[app],address:app==='market'?'creators.phonebridger.demo':app==='news'?'news.google.com':`demo.phonebridger/${app}`};
      let surface=page.querySelector('.sim-pc-surface');if(!surface){surface=document.createElement('div');surface.className='sim-surface sim-pc-surface';surface.dataset.simContext='pc:'+app;surface.addEventListener('click',handleClick);page.append(surface);}
      const old=context('pc',app),c={key:'pc',u:resetting?defaults(app):old?.u||defaults(app),root:surface,surface,window:local?page:undefined,history:resetting?[]:old?.history||[]};if(local&&resetting)page.hidden=true;contexts.set('pc:'+app,c);render(c);
    });demo.registerTabs(meta);
  }
  const explorer=document.createElement('section');explorer.className='mini-window sim-explorer-window';explorer.hidden=true;explorer.setAttribute('aria-label','File Explorer demo');explorer.innerHTML=`<header>${logo('files')}<strong>File Explorer · This PC</strong>${ib('explorer-minimize','Minimize File Explorer','minus')}${ib('explorer-close','Close File Explorer','close')}</header><div class="sim-surface sim-pc-surface" data-sim-context="explorer"></div>`;pc.append(explorer);
  const explorerCtx={key:'pc',u:{...defaults('files'),page:'list'},root:explorer,surface:explorer.lastElementChild,history:[]};contexts.set('explorer',explorerCtx);
  function showExplorer(fields={}){explorer.hidden=false;D.raise(explorer);pc.querySelector('[data-launch=files]').dataset.running='true';explorerCtx.u={...explorerCtx.u,...fields};render(explorerCtx);}
  const winPanel=document.createElement('section');winPanel.className='sim-win-panel';winPanel.hidden=true;winPanel.dataset.simContext='windows';pc.append(winPanel);
  const winCtx={key:'pc',u:defaults('home'),root:winPanel,surface:winPanel};contexts.set('windows',winCtx);
  function showWin(kind){winPanel.hidden=false;winCtx.u.panel=kind;let body='';
    if(kind==='start'||kind==='search')body=`${U.search('Search apps, files and stories','', 'win-search')}<h3>Pinned</h3><div class="sim-win-apps">${['chrome','phonebridger','files','gmail','drive','photos','news','sheets'].map(app=>`<button type="button" data-sim-action="win-launch" data-app="${app}">${logo(app)}<span>${brandNames[app]}</span></button>`).join('')}</div><h3>Recommended</h3><div class="sim-win-results">${B('preview','Proposal.pdf','file','data-id="doc-1"')}</div><h3>Tools</h3><div class="sim-win-tools">${B('win-utility','Notepad','file','data-value="notes"')}${B('win-utility','Calculator','grid','data-value="calculator"')}${B('win-launch','Tasks','check','data-app="tasks"')}${B('win-launch','Calendar','calendar','data-app="calendar"')}</div>${B('quiet',m.data.quiet?'Resume demo activity':'Pause demo activity','pause')}`;
    if(kind==='notifications')body=notificationMarkup();
    if(kind==='settings')body=`<h3>Quick settings</h3>${B('pb-transport','Automatic · USB / Wi-Fi','wifi')}${B('quiet',m.data.quiet?'Resume demo activity':'Pause demo activity','pause')}<p>All activity stays in this website demo.</p><label>Volume <input type="range" min="0" max="100" value="72" data-sim-input="system-volume" aria-label="System volume"></label>`;
    if(kind==='weather')body='<h3>London · 18°</h3><p>Partly sunny. Sunset at 6:40 PM.</p><p>Tuesday 19° · Wednesday 17° · Thursday 18°</p><small>Demo weather</small>';
    winPanel.innerHTML=`<header><strong>${kind==='notifications'?'Notifications':'Jamie’s PC'}</strong>${ib('win-close','Close panel','close')}</header>${body}`;
  }
  function setupTaskbar(){const bar=pc.querySelector('.desktop-taskbar');bar.querySelectorAll('[data-open-desktop]').forEach(b=>b.hidden=true);bar.querySelector('.taskbar-start')?.remove();bar.querySelector('.taskbar-tip')?.remove();bar.querySelector('[data-open-desktop=start]')?.remove();bar.querySelector('.taskbar-hint')?.remove();const start=document.createElement('button');start.type='button';start.className='sim-win-start';start.dataset.simAction='win-start';start.setAttribute('aria-label','Open Start menu');start.innerHTML='<svg viewBox="0 0 20 20"><path fill="currentColor" d="M1 1h8v8H1zm10 0h8v8h-8zM1 11h8v8H1zm10 0h8v8h-8z"/></svg>';bar.prepend(start);const search=document.createElement('button');search.className='sim-win-search';search.type='button';search.dataset.simAction='win-search';search.innerHTML=icon('search')+'Search';bar.insertBefore(search,start.nextSibling);const weather=document.createElement('button');weather.className='sim-win-weather';weather.type='button';weather.dataset.simAction='win-weather';weather.innerHTML=icon('sun')+'<span>18°<small>Partly sunny</small></span>';bar.append(weather);const tray=document.createElement('button');tray.type='button';tray.className='sim-win-tray';tray.dataset.simAction='win-settings';tray.setAttribute('aria-label','Open quick settings');tray.innerHTML=icon('wifi')+icon('volume');bar.append(tray);let clock=bar.querySelector('.taskbar-clock');if(clock){const b=document.createElement('button');b.type='button';b.className=clock.className;b.setAttribute('aria-label','Open Windows notifications');clock.replaceWith(b);clock=b;clock.dataset.simAction='win-notifications';clock.innerHTML='<span data-sim-clock>10:15</span><small>10/5/2026</small>';}}
  function notificationMarkup(){return m.data.notifications.filter(n=>!n.read).map(n=>`<div class="sim-notification-row">${B('notification',n.title+' — '+n.text,'',`data-id="${n.id}"`,'sim-notification')}${ib('dismiss-notification','Dismiss notification','close',`data-id="${n.id}"`)}</div>`).join('')||'<p>You’re all caught up.</p>';}
  function picker(c,mode,onlyPhotos=false,where=c.key){c.u.picker=mode;c.u.pickerPhotos=onlyPhotos;c.u.pickerWhere=where;const list=m.localFiles(where).filter(f=>!onlyPhotos||f.type==='image');modal(c,onlyPhotos?'Choose a photo':'Choose a demo file',`<div class="sim-picker-locations">${B('picker-location',c.key==='pc'?'This PC':'This phone','phone',`data-value="${c.key}"`)}${B('picker-location','Drive','folder','data-value="drive"')}</div>`+list.map(f=>B('pick-file',f.name,'file',`data-id="${f.file}"`)).join(''));}
  function composer(c,fields={}){const draft=m.newDraft(fields);if(c.u.app==='gmail')navigate(c,{page:'compose',draft:draft.id,thread:undefined});else open(c.key,'gmail',{page:'compose',draft:draft.id,thread:undefined});}
  function transfer(c,ids,to,from){if(!ids.length)return notify(c,'Select a file first.');from=from||(c.u.app==='drive'?'drive':c.key);const settings=m.data.settings[to]||m.data.settings[c.key]||m.data.settings.left;const folder=to==='pc'?'Downloads / PhoneBridger':to==='drive'?'Team project':settings.destination;const t=m.transfer(ids,from,to,folder,settings.overwrite?'ask':'keep');notify(c,`Transfer queued → ${to==='pc'?'This PC':to==='drive'?'Drive':to+' phone'}`);return t;}
  function fileIds(c){return(c.u.selected||[]).map(id=>m.data.copies.find(x=>x.id===id)?.file||id);}
  function editDialog(c,title,value,action,extra=''){modal(c,title,`<input aria-label="${esc(title)}" data-sim-edit data-sim-input="dialog-edit" value="${esc(value||'')}" maxlength="160">${extra}${B(action,'Save','check','','sim-modal-primary')}`);c.surface.querySelector('[data-sim-edit]')?.focus({preventScroll:true});}
  function editValue(c){return c.surface.querySelector('[data-sim-edit]')?.value.trim()||'';}
  function share(c,id){c.u.shareId=id;modal(c,'Share',B('share-to-mail','Gmail','mail')+m.data.threads.map(t=>B('share-to-chat',t.name,'people',`data-id="${t.id}"`)).join(''));}
  function createSheet(c,name){const d=m.data,s={id:m.uid('sheet'),name,opened:Date.now(),worksheets:[{id:m.uid('worksheet'),name:'Sheet1',cells:Array.from({length:30},()=>Array(8).fill(''))}]};d.sheets.push(s);const f={id:s.id,name:name+'.gsheet',type:'sheet',size:.03,sheet:s.id};d.files.push(f);m.addCopy(f.id,'drive',c.u.sheetFolder||'Documents','keep');open(c.key,'sheets',{sheet:s.id,worksheet:undefined,row:0,col:0,cellValue:undefined});}
  function selectedSheet(c){const s=m.data.sheets.find(s=>s.id===c.u.sheet);return s?.worksheets.find(w=>w.id===c.u.worksheet)||s?.worksheets[0];}
  function commitCell(c){if(c.u.sheet){m.cell(c.u.sheet,c.u.worksheet,c.u.row||0,c.u.col||0,c.u.cellValue??selectedSheet(c)?.cells[0][0]??'');notify(c,'Cell saved.');}}
  function action(c,a,b){if(a.startsWith('creator-'))return window.PhoneBridgerCreators.action(c,a,b,{m,modal,notify,render});const u=c.u,id=b.dataset.id,value=b.dataset.value,d=m.data;const close=()=>{delete u.modal;paintModal(c);};
    switch(a){
      case 'launch':open(c.key,b.dataset.app);return;
      case 'home':home(c.key);return;
      case 'back':back(c);return;
      case 'close-modal':close();return;
      case 'recents':modal(c,'Recent apps',recents[c.key].map(app=>{const route=cache[c.key][app]||u;const title=route.thread?m.data.threads.find(x=>x.id===route.thread)?.name||'Conversation':route.sheet?m.data.sheets.find(x=>x.id===route.sheet)?.name:route.folder||route.pbPage||brandNames[app];return `<div class="sim-recent-card">${logo(app)}<strong>${brandNames[app]}</strong><small>${esc(title)}</small>${B('recent-open','Open','','data-app="'+app+'"')}${ib('recent-close','Close '+brandNames[app],'close','data-app="'+app+'"')}</div>`;}).join('')+B('clear-recents','Close all','close'));return;
      case 'recent-close':recents[c.key]=recents[c.key].filter(x=>x!==b.dataset.app);delete cache[c.key][b.dataset.app];action(c,'recents',b);return;
      case 'latest-messages':c.surface.querySelector('[data-scroll=messages]')?.scrollTo({top:999999});b.remove();return;
      case 'recent-open':close();open(c.key,b.dataset.app);return;
      case 'clear-recents':recents[c.key]=[];close();home(c.key);return;
      case 'notifications':modal(c,'Notifications',notificationMarkup()+B('clear-notifications','Clear all','check'));return;
      case 'notification':{const n=d.notifications.find(x=>x.id===id);if(n){n.read=true;close();if(n.app==='files'){if(n.target.where==='pc')showExplorer({folder:n.target.folder});else open(c.key,'files',{page:'list',folder:n.target.folder});}else open(c.key,n.app,n.target);}return;}
      case 'dismiss-notification':{const n=d.notifications.find(x=>x.id===id);if(n)n.read=true;if(c===winCtx)showWin('notifications');else action(c,'notifications',b);return;}
      case 'clear-notifications':d.notifications.forEach(n=>n.read=true);if(c===winCtx)showWin('notifications');else action(c,'notifications',b);return;
      case 'quick-settings':modal(c,'Quick settings',B('launch','PhoneBridger','wifi','data-app="phonebridger"')+B('quiet',d.quiet?'Resume demo activity':'Pause demo activity','pause')+B('notifications','Notifications','bell'));return;
      case 'quiet':d.quiet=!d.quiet;close();notify(c,d.quiet?'Demo activity paused.':'Demo activity resumed.');return;
      case 'tab':u.tab=value;u.query='';u.selected=[];if(u.app==='files'){u.page=value==='Home'?'home':'list';delete u.folder;delete u.category;delete u.deleted;}if(u.app==='gmail'&&value==='Meet'){modal(c,'Meet','<p>Your meetings</p>'+d.events.slice(0,3).map(e=>B('meet-event',e.title+' · '+e.time,'video',`data-value="${esc(e.title)}"`)).join('')+B('call','Start demo meeting','video'));return;}if(u.app==='google'&&['Notifications','Activity'].includes(value)){modal(c,value,value==='Notifications'?notificationMarkup():'<p>You explored apps and read stories in this local demo.</p>');return;}if(u.app==='photos'&&value==='Collections'){modal(c,'Collections',['Work','Weekend','Nature'].map(v=>B('album',v,'folder',`data-value="${v}"`)).join(''));return;}if(u.app==='news'&&value==='Newsstand'){modal(c,'Newsstand',[...new Set(d.articles.map(x=>x.publisher))].map(p=>B('publisher',p,'news',`data-value="${esc(p)}"`)).join(''));return;}break;
      case 'filter':u.filter=value;break;
      case 'topic':u.topic=value;break;
      case 'drive-tab':u.driveTab=value;break;
      case 'album':close();u.album=value==='All'?undefined:value;break;
      case 'chat':navigate(c,{thread:id,text:'',replyTo:undefined,attachment:undefined});return;
      case 'new-chat':modal(c,'Start a conversation',d.contacts.filter(x=>x.id!=='jamie').map(x=>B('chat-contact',x.name,'people',`data-id="${x.id}"`)).join(''));return;
      case 'chat-contact':{let t=d.threads.find(t=>!t.group&&t.members.includes(id));if(!t){t={id:m.uid('thread'),name:m.contact(id).name,members:[id],unread:0};d.threads.push(t);}close();open(c.key,'whatsapp',{thread:t.id,text:''});return;}
      case 'chat-menu':modal(c,'Conversation options',u.thread?B('chat-favorite','Favorite conversation','star')+B('chat-mute','Mute / unmute','volume')+B('chat-archive','Archive conversation','archive')+B('chat-export','Export conversation','download'):B('new-chat','New chat','plus')+B('filter','Archived','archive','data-value="Archived"'));return;
      case 'chat-mute':{const t=d.threads.find(x=>x.id===u.thread);t.muted=!t.muted;close();notify(c,t.muted?'Conversation muted.':'Conversation unmuted.');return;}
      case 'chat-favorite':{const t=d.threads.find(x=>x.id===u.thread);t.favorite=!t.favorite;close();notify(c,t.favorite?'Conversation favorited.':'Favorite removed.');return;}
      case 'chat-archive':d.threads.find(x=>x.id===u.thread).archived=true;delete u.thread;close();break;
      case 'chat-export':{const text=d.messages.filter(x=>x.thread===u.thread).map(x=>`${x.at} ${m.contact(x.from)?.name}: ${x.text}`).join('\n');const f={id:m.uid('file'),name:'Conversation.txt',type:'text',size:.01,text};d.files.push(f);m.addCopy(f.id,c.key,'Documents','keep');close();notify(c,'Conversation saved to Files.');return;}
      case 'message-menu':u.message=id;modal(c,'Message',B('message-reply','Reply','reply')+B('message-react','React ♥','heart')+B('message-copy','Copy','file')+B('message-delete','Delete in this demo','trash'));return;
      case 'message-reply':u.replyTo=u.message;close();break;
      case 'message-react':{const msg=d.messages.find(x=>x.id===u.message);msg.reactions=msg.reactions?.length?[]:['♥'];close();m.emit('chat');return;}
      case 'message-copy':d.clipboard=d.messages.find(x=>x.id===u.message)?.text||'';close();notify(c,'Copied in demo.');return;
      case 'message-delete':d.messages.find(x=>x.id===u.message).deleted=true;modal(c,'Message deleted',B('message-undo','Undo delete','undo',`data-id="${u.message}"`)+B('close-modal','Done','check'));m.emit('chat');return;
      case 'message-undo':d.messages.find(x=>x.id===id).deleted=false;close();m.emit('chat');return;
      case 'clear-reply':delete u.replyTo;break;
      case 'clear-attachment':delete u.attachment;break;
      case 'emoji':modal(c,'Choose emoji',['🙂','👍','🎉','❤️','😊','👋'].map(v=>B('pick-emoji',v,'',`data-value="${v}"`)).join(''));return;
      case 'pick-emoji':u.text=(u.text||'')+value;close();break;
      case 'attach':picker(c,u.app==='gmail'?'mail':'chat');return;
      case 'picker-location':picker(c,u.picker,u.pickerPhotos,value);return;
      case 'photo-picker':picker(c,u.app==='gmail'?'mail':'chat',true);return;
      case 'pick-file':if(u.picker==='mail'){const draft=d.drafts.find(x=>x.id===u.draft);if(draft&&!draft.attachments.includes(id))draft.attachments.push(id);}else if(u.picker==='drive')transfer(c,[id],'drive',u.pickerWhere);else if(u.picker==='pc')transfer(c,[id],'pc',u.pickerWhere);else if(u.picker==='lens'){u.query=m.file(id)?.name.split('.')[0]||'Workspace';}else u.attachment=id;close();break;
      case 'voice-note':{const f={id:m.uid('voice'),name:'Voice note.wav',type:'audio',size:.1,voice:true,src:`assets/simulator-v2/media/voice-${1+d.messages.filter(x=>m.file(x.attachment)?.voice).length%3}.wav`};d.files.push(f);m.sendMessage(u.thread,'',f.id);break;}
      case 'voice-play':{const audio=b.parentElement.querySelector('audio');if(audio.paused){hero.querySelectorAll('audio,video').forEach(v=>{if(v!==audio)v.pause();});audio.play().catch(()=>notify(c,'Press play again to hear the note.'));b.innerHTML=icon('pause');audio.onended=()=>b.innerHTML=icon('play');}else{audio.pause();b.innerHTML=icon('play');}return;}
      case 'meet-event':action(c,'call',b);return;
      case 'call':modal(c,'Demo call','<div class="sim-call-preview">'+avatar(m.contact(id)||m.contact('alex'))+'<h3>Connected · Demo call</h3><p>Your camera and microphone stay off.</p></div>'+B('close-modal','End call','call','','sim-modal-primary'));return;
      case 'status':modal(c,m.contact(id)?.name+' · Status',U.image(d.photos[d.contacts.findIndex(x=>x.id===id)%d.photos.length].id,'sim-preview-image','Status photo')+B('close-modal','Close status'));return;
      case 'compose':composer(c);return;
      case 'open-draft':navigate(c,{page:'compose',draft:id,thread:undefined});return;
      case 'recipient':m.saveDraft(u.draft,{to:id});break;
      case 'compose-menu':modal(c,'Compose options',B('mail-cc','Add Cc / Bcc')+B('discard-draft','Discard draft','trash'));return;
      case 'mail-cc':m.saveDraft(u.draft,{cc:'',bcc:''});close();break;
      case 'discard-draft':d.drafts=d.drafts.filter(x=>x.id!==u.draft);u.page=undefined;close();break;
      case 'remove-mail-attachment':{const draft=d.drafts.find(x=>x.id===u.draft);draft.attachments=draft.attachments.filter(x=>x!==id);break;}
      case 'mail-thread':m.mailAction(id,'read');navigate(c,{thread:id,page:undefined});return;
      case 'mail-star-one':m.mailAction(id,'star');return;
      case 'mail-archive':case 'mail-delete':case 'mail-unread':case 'mail-star':m.mailAction(u.thread,a.slice(5));if(a!=='mail-star'){delete u.thread;render(c);}return;
      case 'mail-reply':case 'mail-reply-all':case 'mail-forward':{const mail=d.mail.filter(x=>x.thread===u.thread).at(-1);composer(c,{to:a!=='mail-forward'?(mail.from==='jamie'?mail.to:mail.from):'',subject:(a!=='mail-forward'?'Re: ':'Fwd: ')+mail.subject,thread:a!=='mail-forward'?mail.thread:undefined,text:a==='mail-forward'?mail.text:'',attachments:a==='mail-forward'?[...mail.attachments]:[],...(a==='mail-reply-all'?{cc:'mia@example.test',bcc:''}:{})});return;}
      case 'undo-mail':{const draft=m.undoMail(id);if(draft)open(c.key,'gmail',{page:'compose',draft:draft.id});return;}
      case 'accept-invite':d.events[0].accepted=true;open(c.key,'calendar',{day:6,month:9});return;
      case 'mail-folder':u.folder=value;u.page=undefined;delete u.thread;close();break;
      case 'mail-restore':m.mailAction(u.thread,'restore');delete u.thread;break;
      case 'drawer':modal(c,brandNames[u.app]||'Menu',u.app==='gmail'?['inbox','sent','drafts','starred','archive','trash','all'].map(v=>B('mail-folder',v[0].toUpperCase()+v.slice(1),'mail',`data-value="${v}"`)).join(''):B('home','Home','home')+B('launch','PhoneBridger','wifi','data-app="phonebridger"')+B('deleted-files','Trash','trash')+B('notifications','Notifications','bell'));return;
      case 'profile':modal(c,'Jamie Parker',avatar(m.contact('jamie'))+'<p>jamie@example.test</p><p>Demo account · All changes stay in this browser.</p>'+B('quiet',d.quiet?'Resume demo activity':'Pause demo activity','pause'));return;
      case 'preview':if(c===winCtx){winPanel.hidden=true;showExplorer({preview:id});return;}navigate(c,{preview:id});return;
      case 'category':if(value==='Apps'){modal(c,'Installed demo apps',Object.entries(brandNames).map(([app,name])=>B('launch',name,'',`data-app="${app}"`)).join(''));return;}navigate(c,{page:'list',category:value==='Downloads'?undefined:value,folder:value==='Downloads'?'Downloads':undefined});return;
      case 'all-files':u.page='list';delete u.folder;delete u.category;break;
      case 'starred-files':u.tab='Starred';u.page='list';break;
      case 'deleted-files':u.deleted=true;u.page='list';close();break;
      case 'folder':navigate(c,{folder:value,page:'list',query:''});return;
      case 'view':u.grid=u.app==='sheets'?u.grid===false:!u.grid;break;
      case 'sort':u.desc=!u.desc;u.sort=u.sort==='Modified'?'Name':'Modified';break;
      case 'sort-options':modal(c,'Sort files',B('sort-by','Name','sort','data-value="Name"')+B('sort-by','Modified','clock','data-value="Modified"')+B('sort-reverse','Reverse direction','sort'));return;
      case 'sort-by':u.sort=value;close();break;
      case 'sort-reverse':u.desc=!u.desc;close();break;
      case 'file-menu':u.copy=id;modal(c,'File options',B('file-download','Send to PC','download')+B('file-upload','Upload to Drive','upload')+B('file-send','Send to phone','phone')+B('file-rename','Rename','file')+B('file-move','Move to folder','folder')+B('file-copy','Copy to folder','file')+B('file-favorite','Star / unstar','star')+B('file-share','Share','share')+B('file-access','Manage demo access','people')+B('file-delete',u.deleted?'Restore':'Move to trash','trash'));return;
      case 'file-download':case 'file-upload':{const f=d.copies.find(x=>x.id===u.copy);transfer(c,[f?.file||u.copy],a==='file-download'?'pc':'drive',f?.where);close();return;}
      case 'file-send':u.transferIds=[d.copies.find(x=>x.id===u.copy)?.file||u.copy];modal(c,'Send to phone',B('send-to','Left phone','phone','data-value="left"')+B('send-to','Right phone','phone','data-value="right"'));return;
      case 'send-to':transfer(c,u.transferIds||fileIds(c),value,'pc');close();return;
      case 'file-rename':{const f=d.copies.find(x=>x.id===u.copy);editDialog(c,'Rename file',f?.name,'rename-save');return;}
      case 'rename-save':{const f=d.copies.find(x=>x.id===u.copy),name=editValue(c);if(f&&name){if(d.copies.some(x=>x.id!==f.id&&!x.deleted&&x.where===f.where&&x.folder===f.folder&&x.name===name))return notify(c,'A file with this name already exists.');f.name=name;m.emit('files');}close();break;}
      case 'file-move':case 'file-copy':u.copyMode=a;modal(c,'Choose folder',['Downloads','Documents','Images','Team project','Shared photos'].map(v=>B('copy-folder',v,'folder',`data-value="${v}"`)).join(''));return;
      case 'copy-folder':{const f=d.copies.find(x=>x.id===u.copy);if(f){const result=m.addCopy(f.file,f.where,value,'keep',f.name);if(result.copy&&u.copyMode==='file-move')f.deleted=true;}close();m.emit('files');return;}
      case 'file-favorite':{const f=d.copies.find(x=>x.id===u.copy);if(f)f.favorite=!f.favorite;close();m.emit('files');return;}
      case 'file-delete':{const f=d.copies.find(x=>x.id===u.copy);if(f){f.deleted=!f.deleted;const sheetId=m.file(f.file)?.sheet;if(sheetId&&f.where==='drive')d.sheets.find(s=>s.id===sheetId).deleted=f.deleted;}close();m.emit('files');m.emit('sheet');return;}
      case 'file-share':{const f=d.copies.find(x=>x.id===u.copy);share(c,f?.file||u.copy);return;}
      case 'file-access':modal(c,'Manage demo access',d.contacts.filter(x=>x.id!=='jamie').map(x=>B('access-contact',x.name+' · '+((d.copies.find(f=>f.id===u.copy)?.access||[]).includes(x.id)?'Can view':'No access'),'people',`data-id="${x.id}"`)).join(''));return;
      case 'access-contact':{const file=d.copies.find(f=>f.id===u.copy);file.access||(file.access=[]);file.access=file.access.includes(id)?file.access.filter(x=>x!==id):[...file.access,id];action(c,'file-access',b);return;}
      case 'save-file':transfer(c,[id],c.key==='pc'?'pc':c.key,'drive');return;
      case 'selected-files':modal(c,'Selected files',B('selected-download','Send to PC','download')+B('selected-upload','Upload to Drive','upload')+B('selected-send','Send to phone','phone')+B('selected-delete','Move to trash','trash'));return;
      case 'selected-download':case 'selected-upload':transfer(c,fileIds(c),a==='selected-download'?'pc':'drive');close();return;
      case 'selected-send':u.transferIds=fileIds(c);modal(c,'Send to phone',B('send-to','Left phone','phone','data-value="left"')+B('send-to','Right phone','phone','data-value="right"'));return;
      case 'selected-delete':u.selected.forEach(id=>{const f=d.copies.find(x=>x.id===id);if(f)f.deleted=true;});u.selected=[];close();m.emit('files');return;
      case 'file-tools':modal(c,'Files',B('select-all','Select all','check')+B('selected-files','Manage selection','check')+B('deleted-files','Trash','trash')+B('transfers','Transfer history','download'));return;
      case 'select-all':u.selected=m.localFiles(u.app==='drive'?'drive':c.key,u.folder||null).map(f=>f.id);close();break;
      case 'receiving-folder':d.settings[c.key].destination=value;D.syncSettings(c.key,d.settings[c.key]);close();break;
      case 'transfers':modal(c,'Transfers',A.transferList(m));return;
      case 'safe-folder':modal(c,'Safe folder','<p>This local demo folder contains your private notes.</p>'+B('preview','Private notes.txt','lock','data-id="text-1"'));return;
      case 'files-new':editDialog(c,'New folder','','folder-save');return;
      case 'folder-save':{const name=editValue(c);if(name){d.folders||(d.folders=[]);d.folders.push({where:u.app==='drive'?'drive':c.key,name});u.folder=name;u.page='list';}close();break;}
      case 'drive-new':modal(c,'New in Drive',B('files-new','New folder','folder')+B('drive-upload','Upload from this device','upload')+B('new-sheet','New spreadsheet','sheets'));return;
      case 'drive-upload':picker(c,'drive');return;
      case 'send-pc':picker(c,'pc');return;
      case 'share':share(c,id);return;
      case 'share-to-chat':{const article=d.articles.find(x=>x.id===u.shareId);open(c.key,'whatsapp',{thread:id,text:article?article.title+' · demo://'+article.id:'',attachment:article?undefined:u.shareId});return;}
      case 'share-to-mail':{const article=d.articles.find(x=>x.id===u.shareId);composer(c,{subject:article?.title||'Sharing a file',text:article?article.summary+'\n\ndemo://'+article.id:'Please take a look at the attached file.',attachments:article?[]:[u.shareId]});return;}
      case 'photo':navigate(c,{photo:id});return;
      case 'photo-favorite':d.photos.find(x=>x.id===id).favorite=!d.photos.find(x=>x.id===id).favorite;m.emit('photos');return;
      case 'photo-prev':case 'photo-next':{const i=d.photos.findIndex(x=>x.id===u.photo);u.photo=d.photos[(i+(a==='photo-next'?1:d.photos.length-1))%d.photos.length].id;break;}
      case 'photo-zoom':c.surface.querySelector('.sim-photo-full img')?.classList.toggle('zoomed');return;
      case 'photo-info':{const p=d.photos.find(x=>x.id===id);modal(c,'Photo information',`<p>${p.name}</p><p>Album: ${p.album}</p><p>Original generated photo · Demo gallery</p>`+B('save-file','Save to Files','download',`data-id="${id}"`));return;}
      case 'photo-remove':d.photos.find(x=>x.id===id).deleted=true;delete u.photo;modal(c,'Photo removed',B('photo-undo','Undo remove','undo',`data-id="${id}"`));m.emit('photos');return;
      case 'photo-undo':d.photos.find(x=>x.id===id).deleted=false;close();m.emit('photos');return;
      case 'article':navigate(c,{article:id});return;
      case 'save-article':case 'like-article':{const article=d.articles.find(x=>x.id===id);const key=a==='save-article'?'saved':'liked';article[key]=!article[key];m.emit('news');return;}
      case 'follow-publisher':{const p=d.articles.find(x=>x.id===id).publisher;d.followed=d.followed.includes(p)?d.followed.filter(x=>x!==p):[...d.followed,p];m.emit('news');return;}
      case 'article-menu':u.story=id;modal(c,'Story options',B('share','Share story','share',`data-id="${id}"`)+B('save-article','Save / unsave story','star',`data-id="${id}"`)+B('follow-publisher','Follow publisher','plus',`data-id="${id}"`)+B('hide-story','Hide story','close'));return;
      case 'hide-story':d.articles.find(x=>x.id===u.story).hidden=true;close();m.emit('news');return;
      case 'publisher':u.query=value;u.tab='Home';close();break;
      case 'news-search':u.showSearch=!u.showSearch;break;
      case 'news-info':modal(c,'About this briefing','<p>These fictional articles and photos were created for the PhoneBridger demo. Save, share and explore them without leaving the simulator.</p>');return;
      case 'weather':modal(c,'London · Demo weather','<h3>18° · Partly sunny</h3><p>Sunset 6:40 PM. Tuesday 19°, Wednesday 17°, Thursday 18°.</p>');return;
      case 'ai-mode':editDialog(c,'Ask about this workspace','','ai-answer');return;
      case 'ai-answer':modal(c,'Workspace assistant','<p>Find Proposal.pdf in Drive → Team project. Download it to Files, send it to your PC and attach it in Gmail. Alex will reply to your email.</p>'+B('launch','Open Drive','folder','data-app="drive"'));return;
      case 'voice-search':modal(c,'Voice search demo','<p>Choose a sample query to preview a search.</p>'+['workspace','proposal','garden'].map(v=>B('sample-search',v,'search',`data-value="${v}"`)).join(''));return;
      case 'sample-search':u.query=value;close();break;
      case 'lens':picker(c,'lens',true);return;
      case 'open-sheet':d.sheets.find(s=>s.id===id).opened=Date.now();open(c.key,'sheets',{sheet:id,row:0,col:0,cellValue:undefined,worksheet:undefined,preview:undefined});return;
      case 'cell':u.row=Number(b.dataset.row);u.col=Number(b.dataset.col);u.cellLabel=String.fromCharCode(65+u.col)+(u.row+1);u.cellValue=selectedSheet(c)?.cells[u.row]?.[u.col]||'';render(c);c.surface.querySelector('[data-sim-input=formula]')?.focus({preventScroll:true});return;
      case 'commit-cell':commitCell(c);return;
      case 'sheet-undo':case 'sheet-redo':m.sheetHistory(a.slice(6));u.cellValue=selectedSheet(c)?.cells[u.row||0]?.[u.col||0]||'';break;
      case 'sheet-sort':u.desc=!u.desc;break;
      case 'sheet-sort-menu':modal(c,'Sort spreadsheets',['Date opened by me','Name','Last modified'].map(v=>B('sheet-sort-by',v,'sort',`data-value="${v}"`)).join(''));return;
      case 'sheet-sort-by':u.sheetSort=value;close();break;
      case 'sheet-folders':modal(c,'Sheets in Drive',B('sheet-folder','All spreadsheets','sheets','data-value=""')+[...new Set(m.localFiles('drive').filter(f=>f.type==='sheet').map(f=>f.folder))].map(v=>B('sheet-folder',v,'folder',`data-value="${esc(v)}"`)).join(''));return;
      case 'sheet-folder':u.sheetFolder=value;close();break;
      case 'sheet-menu':u.sheetMenu=id;modal(c,'Spreadsheet',B('sheet-rename','Rename','file')+B('sheet-star','Star / unstar','star')+B('cell-copy','Copy selected cell','file')+B('cell-paste','Paste to selected cell','file')+B('sheet-share','Share','share')+B('sheet-duplicate','Make a copy','file')+B('sheet-delete','Move to trash','trash'));return;
      case 'sheet-star':{const s=d.sheets.find(x=>x.id===u.sheetMenu);s.starred=!s.starred;close();m.emit('sheet');return;}
      case 'cell-copy':d.clipboard=u.cellValue??selectedSheet(c)?.cells[u.row||0]?.[u.col||0]??'';close();notify(c,'Cell copied in demo.');return;
      case 'cell-paste':u.cellValue=d.clipboard;commitCell(c);close();return;
      case 'sheet-rename':editDialog(c,'Spreadsheet name',d.sheets.find(x=>x.id===u.sheetMenu).name,'sheet-rename-save');return;
      case 'sheet-rename-save':{const s=d.sheets.find(x=>x.id===u.sheetMenu),name=editValue(c);if(name){s.name=name;const f=d.files.find(f=>f.sheet===s.id);if(f){f.name=name+'.gsheet';d.copies.filter(c=>c.file===f.id&&c.where==='drive').forEach(c=>c.name=f.name);}}close();m.emit('sheet');m.emit('files');return;}
      case 'sheet-duplicate':{const s=JSON.parse(JSON.stringify(d.sheets.find(x=>x.id===u.sheetMenu)));s.id=m.uid('sheet');s.name+=' (Copy)';s.deleted=false;s.worksheets.forEach(w=>w.id=m.uid('worksheet'));d.sheets.push(s);const f={id:s.id,name:s.name+'.gsheet',type:'sheet',size:.06,sheet:s.id};d.files.push(f);m.addCopy(f.id,'drive',u.sheetFolder||'Documents','keep');close();m.emit('sheet');return;}
      case 'sheet-delete':{const sheet=d.sheets.find(x=>x.id===u.sheetMenu);sheet.deleted=true;const f=d.files.find(f=>f.sheet===sheet.id);if(f)d.copies.filter(c=>c.file===f.id&&c.where==='drive').forEach(c=>c.deleted=true);delete u.sheet;close();m.emit('sheet');m.emit('files');return;}
      case 'sheet-share':{const file=d.files.find(x=>x.sheet===(u.sheet||u.sheetMenu));if(file)share(c,file.id);else notify(c,'This new sheet is saved locally in the demo.');return;}
      case 'new-sheet':createSheet(c,'Untitled spreadsheet');return;
      case 'new-sheet-save':createSheet(c,editValue(c)||'Untitled spreadsheet');return;
      case 'worksheets':modal(c,'Worksheets',d.sheets.find(x=>x.id===u.sheet).worksheets.map(w=>B('worksheet',w.name,'sheets',`data-id="${w.id}"`)).join('')+B('new-worksheet','Add worksheet','plus')+B('rename-worksheet','Rename current worksheet','file')+B('copy-worksheet','Make a copy','file')+B('delete-worksheet','Delete current worksheet','trash'));return;
      case 'worksheet':u.worksheet=id;u.cellValue=undefined;u.row=u.col=0;close();break;
      case 'new-worksheet':editDialog(c,'New worksheet','','new-worksheet-save');return;
      case 'new-worksheet-save':{const name=editValue(c);if(!name)return;const w={id:m.uid('worksheet'),name,cells:Array.from({length:30},()=>Array(8).fill(''))};d.sheets.find(x=>x.id===u.sheet).worksheets.push(w);u.worksheet=w.id;u.cellValue='';close();m.emit('sheet');return;}
      case 'rename-worksheet':editDialog(c,'Worksheet name',selectedSheet(c).name,'rename-worksheet-save');return;
      case 'rename-worksheet-save':{const name=editValue(c);if(name)selectedSheet(c).name=name;close();m.emit('sheet');return;}
      case 'copy-worksheet':{const sheet=d.sheets.find(x=>x.id===u.sheet),w=JSON.parse(JSON.stringify(selectedSheet(c)));w.id=m.uid('worksheet');w.name+=' (Copy)';sheet.worksheets.push(w);u.worksheet=w.id;close();m.emit('sheet');return;}
      case 'delete-worksheet':{const s=d.sheets.find(x=>x.id===u.sheet);if(s.worksheets.length<2)return notify(c,'Keep at least one worksheet.');s.worksheets=s.worksheets.filter(x=>x.id!==u.worksheet);u.worksheet=s.worksheets[0].id;u.cellValue=undefined;close();m.emit('sheet');return;}
      case 'month-prev':case 'month-next':u.month=(u.month??9)+(a==='month-next'?1:-1);u.month=Math.max(0,Math.min(11,u.month));break;
      case 'day':u.day=Number(value);break;
      case 'new-event':editDialog(c,'Event title','','event-save','<input type="time" data-event-time aria-label="Event time" value="10:00">');return;
      case 'event-save':{const title=editValue(c);if(title)d.events.push({id:m.uid('event'),title,day:u.day||6,month:u.month??9,time:c.surface.querySelector('[data-event-time]').value,accepted:true});close();m.emit('calendar');return;}
      case 'event-menu':u.event=id;modal(c,'Event',B('event-accept','Accept invitation','check')+B('event-edit','Edit event','file')+B('event-notes','Create meeting notes','file')+B('event-task','Add preparation task','check')+B('event-delete','Delete event','trash'));return;
      case 'event-edit':{const event=d.events.find(x=>x.id===u.event);editDialog(c,'Edit event',event.title,'event-edit-save',`<input type="time" data-event-time aria-label="Event time" value="${event.time}">`);return;}
      case 'event-edit-save':{const event=d.events.find(x=>x.id===u.event),title=editValue(c);if(title){event.title=title;event.time=c.surface.querySelector('[data-event-time]').value;}close();m.emit('calendar');return;}
      case 'event-accept':d.events.find(x=>x.id===u.event).accepted=true;close();m.emit('calendar');return;
      case 'event-delete':d.events=d.events.filter(x=>x.id!==u.event);close();m.emit('calendar');return;
      case 'event-task':d.tasks.push({id:m.uid('task'),text:'Prepare for '+d.events.find(x=>x.id===u.event).title,done:false});close();open(c.key,'tasks');return;
      case 'event-notes':{const ev=d.events.find(x=>x.id===u.event),f={id:m.uid('file'),name:ev.title+' notes.txt',type:'text',size:.01,text:ev.title+'\n\nAgenda\n• Project update\n• Next steps\n\nNotes\n'};d.files.push(f);m.addCopy(f.id,'drive','Team project','keep');open(c.key,'docs',{document:f.id});return;}
      case 'new-task':c.surface.querySelector('[name=text]')?.focus({preventScroll:true});return;
      case 'delete-task':d.tasks=d.tasks.filter(x=>x.id!==id);m.emit('tasks');return;
      case 'contact-info':{const t=d.threads.find(x=>x.id===id),contact=m.contact(t?.members[0]||id);modal(c,t?.name||contact?.name||'Contact',avatar(contact)+`<p>${esc(contact?.role)}</p><p>${esc(contact?.email)}</p>`+B('chat-contact','Message on WhatsApp','mail',`data-id="${contact.id}"`)+B('email-contact','Compose email','mail',`data-id="${contact.id}"`)+B('call','Demo call','call',`data-id="${contact.id}"`));return;}
      case 'email-contact':composer(c,{to:id});return;
      case 'new-contact':editDialog(c,'Contact name','','contact-save');return;
      case 'contact-save':{const name=editValue(c);if(name)d.contacts.push({id:m.uid('contact'),name,role:'Demo colleague',email:name.toLowerCase().replace(/[^a-z]/g,'')+'@example.test',color:'#ad8dcc'});close();m.emit('contacts');return;}
      case 'open-document':open(c.key,'docs',{document:id});return;
      case 'save-document':notify(c,'Document saved across this demo.');return;
      case 'new-document':editDialog(c,'Document name','','document-save');return;
      case 'document-save':{const name=editValue(c);if(!name)return;const f={id:m.uid('file'),name:name+'.txt',type:'text',size:.01,text:''};d.files.push(f);m.addCopy(f.id,'drive','Documents','keep');open(c.key,'docs',{document:f.id});return;}
      case 'browser-back':back(c);return;
      case 'browser-forward':if(u.lastArticle)navigate(c,{article:u.lastArticle});else notify(c,'No next page in this demo.');return;
      case 'side-video':open(c.key,'youtube',{video:Number(value),videoTime:0,videoPaused:true});return;
      case 'side-video-prev':case 'side-video-next':u.video=(u.video+1)%2;u.videoTime=0;u.videoPaused=true;break;
      case 'side-play':{const v=c.surface.querySelector('video');if(v.paused)v.play().catch(()=>notify(c,'Press play in the video controls.'));else v.pause();return;}
      case 'side-mute':{const v=c.surface.querySelector('video');v.muted=!v.muted;notify(c,v.muted?'Muted.':'Sound on.');return;}
      case 'pb-page':navigate(c,{pbPage:value});return;
      case 'pb-cursor-size':d.settings[c.key].cursor=value;D.syncSettings(c.key,d.settings[c.key]);break;
      case 'pb-test':notify(c,'Move through a visible screen edge to try mouse control.');return;
      case 'pb-audio-preview':{let audio=c.root.querySelector('[data-sim-audio-preview]');if(!audio){audio=document.createElement('audio');audio.dataset.simAudioPreview='';audio.src='assets/simulator-v2/media/voice-3.wav';c.root.append(audio);}if(audio.paused){hero.querySelectorAll('video,audio').forEach(v=>{if(v!==audio)v.pause();});audio.volume=d.settings[c.key].volume/100;audio.play().catch(()=>notify(c,'Press preview again to hear audio.'));}else audio.pause();return;}
      case 'pb-connect':d.settings[c.key].connected=!d.settings[c.key].connected;break;
      case 'pb-transport':{const key=c.key==='pc'?'left':c.key;d.settings[key].transport=d.settings[key].transport==='USB'?'Wi-Fi':'USB';notify(c,'Automatic connection · '+d.settings[key].transport);return;}
      case 'transfer-pause':case 'transfer-resume':case 'transfer-cancel':m.transferAction(id,a.slice(9));return;
      case 'transfer-conflict':u.conflict=id;modal(c,'A file already exists',B('conflict-mode','Keep both','file','data-value="keep"')+B('conflict-mode','Replace in demo','file','data-value="replace"')+B('transfer-cancel','Cancel transfer','close',`data-id="${id}"`));return;
      case 'conflict-mode':m.transferAction(u.conflict,'resume',value);close();return;
      case 'slide-next':u.slide=((u.slide||0)+1)%m.file(u.preview).slides.length;break;
      case 'explorer-close':case 'explorer-minimize':explorer.hidden=true;if(a==='explorer-close')pc.querySelector('[data-launch=files]').dataset.running='false';return;
      case 'local-window-close':c.window.hidden=true;return;
      case 'win-close':winPanel.hidden=true;return;
      case 'win-start':showWin('start');return;
      case 'win-search':showWin('search');return;
      case 'win-weather':showWin('weather');return;
      case 'win-settings':showWin('settings');return;
      case 'win-notifications':showWin('notifications');return;
      case 'win-utility':winPanel.hidden=true;window.PhoneBridgerUtilities.open(b.dataset.value);return;
      case 'win-contact':winPanel.hidden=true;open('pc','contacts');action(context('pc','contacts'),'contact-info',b);return;
      case 'win-story':winPanel.hidden=true;open('pc','news',{article:id});return;
      case 'win-launch':winPanel.hidden=true;open('pc',b.dataset.app,{explorer:b.dataset.app==='files'});return;
      default:notify(c,'This action is available in the demo menu.');return;
    }render(c);
  }
  // Run the app action before the enclosing screen requests Pointer Lock.
  // The existing scene listener continues to reject duplicate trusted clicks during capture.
  function handleClick(e){if(e.simHandled)return;const b=e.target.closest('button');if(!b)return;const form=b.closest('[data-sim-form]');if(b.type==='submit'&&form){e.simHandled=true;e.preventDefault();form.requestSubmit();return;}if(!b.dataset.simAction)return;e.simHandled=true;activityPaused=false;const c=ctxFor(b)||winCtx;m.start();action(c,b.dataset.simAction,b);}
  hero.addEventListener('submit',e=>{const form=e.target.closest('[data-sim-form]');if(!form)return;e.preventDefault();const c=ctxFor(form),u=c.u;m.start();
    if(form.dataset.simForm.startsWith('creator-'))return window.PhoneBridgerCreators.submit(c,form,{m,modal,notify,render});
    if(form.dataset.simForm==='chat'){m.sendMessage(u.thread,u.text||'',u.attachment,u.replyTo);u.text='';delete u.attachment;delete u.replyTo;render(c);}
    if(form.dataset.simForm==='mail'){const result=m.sendMail(u.draft);if(result.error){notify(c,result.error);return;}u.page=undefined;u.folder='sent';render(c);modal(c,'Email sent',B('undo-mail','Undo send','undo',`data-id="${result.email.id}"`)+B('close-modal','Done','check'));}
    if(form.dataset.simForm==='task'){const text=form.elements.text.value.trim();if(text){m.data.tasks.push({id:m.uid('task'),text,done:false});m.emit('tasks');}}
    if(form.dataset.simForm==='google')render(c);
    if(form.dataset.simForm==='browser'){const address=form.elements.address.value.trim();const article=m.data.articles.find(x=>address.includes(x.id)||x.title.toLowerCase().includes(address.toLowerCase()));u.address=address;if(article){u.lastArticle=article.id;navigate(c,{article:article.id});}else open(c.key,'google',{query:address.replace(/^https?:\/\//,'')});}
  });
  function input(el){const c=ctxFor(el);if(!c)return;const u=c.u,name=el.dataset.simInput,id=el.dataset.id;
    if(name?.startsWith('creator-'))return window.PhoneBridgerCreators.input(c,el,{m,modal,notify,render});
    if(name==='scroll'||name==='scroll-x'){const t=el._scrollTarget;if(t)t[name==='scroll'?'scrollTop':'scrollLeft']=(name==='scroll'?t.scrollHeight-t.clientHeight:t.scrollWidth-t.clientWidth)*Number(el.value)/1000;return;}
    if(name==='chat-text')u.text=el.value;
    if(name?.startsWith('mail-'))m.saveDraft(u.draft,{[name.slice(5)==='text'?'text':name.slice(5)]:el.value});
    if(name==='search'){u.query=el.value;render(c);}
    if(name==='win-search'){const query=el.value.toLowerCase();winPanel.querySelectorAll('.sim-win-apps button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(query));winPanel.querySelector('.sim-win-results').innerHTML=query?m.localFiles('pc').filter(f=>f.name.toLowerCase().includes(query)).slice(0,5).map(f=>B('preview',f.name,'file',`data-id="${f.file}"`)).join('')+m.data.articles.filter(a=>a.title.toLowerCase().includes(query)).slice(0,3).map(a=>B('win-story',a.title,'news',`data-id="${a.id}"`)).join('')+m.data.contacts.filter(c=>c.name.toLowerCase().includes(query)).slice(0,3).map(c=>B('win-contact',c.name,'people',`data-id="${c.id}"`)).join(''):B('preview','Proposal.pdf','file','data-id="doc-1"');}
    if(name==='file-select'){u.selected||(u.selected=[]);u.selected=el.checked?[...new Set([...u.selected,id])]:u.selected.filter(x=>x!==id);render(c);}
    if(name==='task'){m.data.tasks.find(x=>x.id===id).done=el.checked;m.emit('tasks');}
    if(name==='formula')u.cellValue=el.value;
    if(name==='document'){const f=m.file(u.document);f.text=el.value;}
    if(name==='keyboard-preview')u.keyboardText=el.value;
    if(name==='setting'){const key=el.dataset.setting;m.data.settings[c.key][key]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;D.syncSettings(c.key,m.data.settings[c.key]);const output=el.closest('label')?.querySelector('output');if(output)output.textContent=el.value+'%';if(el.type!=='range')render(c);}
    if(name==='side-seek'){const v=c.surface.querySelector('video');if(Number.isFinite(v.duration))v.currentTime=Number(el.value)/100*v.duration;}
    if(name==='system-volume'){m.data.systemVolume=Number(el.value);hero.querySelectorAll('[data-sim-video]').forEach(v=>v.volume=Number(el.value)/100);}
  }
  hero.addEventListener('input',e=>{if(e.target.dataset.simInput)input(e.target);});
  hero.addEventListener('keydown',e=>{const c=ctxFor(e.target);if(!c)return;if(e.target.dataset.simInput==='formula'){
    if(e.key==='Enter'){e.preventDefault();commitCell(c);}
    if(e.key==='Tab'||['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();commitCell(c);const row=Math.max(0,Math.min(selectedSheet(c).cells.length-1,(c.u.row||0)+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0))),col=Math.max(0,Math.min(7,(c.u.col||0)+(e.key==='Tab'?(e.shiftKey?-1:1):0)));action(c,'cell',{dataset:{row:String(row),col:String(col)}});}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c')m.data.clipboard=c.u.cellValue||'';
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'&&m.data.clipboard){e.preventDefault();c.u.cellValue=m.data.clipboard;render(c);}
  }if(e.key==='Escape'&&c.u.modal){delete c.u.modal;paintModal(c);}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')activityPaused=true;});
  hero.addEventListener('click',e=>{if(e.target.closest('[data-screen],[data-action=mouse]')){activityPaused=false;m.start();}});
  hero.addEventListener('play',e=>{if(e.target.matches('video,audio'))hero.querySelectorAll('video,audio').forEach(v=>{if(v!==e.target)v.pause();});},true);
  function rangePoint(el,p){const r=el.getBoundingClientRect(),vertical=el.dataset.simInput==='scroll';const ratio=vertical?(p.y-r.top)/r.height:(p.x-r.left)/r.width;const min=Number(el.min),max=Number(el.max),step=Number(el.step)||1;el.value=String(min+Math.round(Math.max(0,Math.min(1,ratio))*(max-min)/step)*step);input(el);}
  const original={down:D.virtualDown,move:D.virtualMove,up:D.virtualUp};
  D.virtualDown=(target,p)=>{const range=target.closest('[data-sim-input][type=range]');if(range){rangeDrag=range;range.focus({preventScroll:true});rangePoint(range,p);return true;}const select=target.closest('select[data-sim-input=setting]');if(select){const c=ctxFor(select);modal(c,'Receiving folder',[...select.options].map(o=>B('receiving-folder',o.value,'folder',`data-value="${esc(o.value)}"`)).join(''));return true;}const f=target.closest('.sim-file-row>button[data-sim-action=preview]');if(f&&ctxFor(f)?.key==='pc'){fileDrag={id:f.dataset.id,start:p,point:p,c:ctxFor(f)};return true;}return original.down(target,p);};
  D.virtualMove=p=>{if(rangeDrag){rangePoint(rangeDrag,p);return true;}if(fileDrag){fileDrag.point=p;return false;}return original.move(p);};
  D.virtualUp=p=>{rangeDrag=null;if(fileDrag){const drag=fileDrag;fileDrag=null;if(p&&Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>5){const side=['left','right'].find(key=>{const r=hero.querySelector(`[data-screen=${key}]`).getBoundingClientRect();return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;});if(side)transfer(drag.c,[drag.id],side,'pc');}else if(p)navigate(drag.c,{preview:drag.id});}original.up(p);};
  scene.addEventListener('demo-tab-change',e=>{activePc=e.detail;const c=context('pc',activePc);if(c)render(c);const strip=pc.querySelector('.chrome-tab-strip'),tab=strip?.querySelector('.browser-tab.active');if(tab){const t=tab.getBoundingClientRect(),s=strip.getBoundingClientRect();if(t.left<s.left)strip.scrollLeft-=s.left-t.left;else if(t.right>s.right)strip.scrollLeft+=t.right-s.right;}});
  hero.addEventListener('dragstart',e=>{const file=e.target.closest('.sim-file-row>button[data-sim-action=preview]');if(file){e.dataTransfer.setData('application/x-phonebridger-file',file.dataset.id);e.dataTransfer.effectAllowed='copy';}});
  for(const key of ['left','right']){const screen=hero.querySelector(`[data-screen=${key}]`);screen.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-phonebridger-file'))e.preventDefault();});screen.addEventListener('drop',e=>{const id=e.dataTransfer.getData('application/x-phonebridger-file');if(id){e.preventDefault();transfer(contexts.get(key),[id],key,'pc');}});}
  function syncFiles(){D.syncFiles(Object.fromEntries(['left','right'].map(k=>[k,m.localFiles(k)])));}
  m.subscribe(topic=>{if(resetting)return;if(topic==='files')syncFiles();D.refreshTransfers?.();if(topic==='transfer'){contexts.forEach(c=>{const list=c.surface.querySelector('.sim-transfer-list');if(list)list.outerHTML=A.transferList(m);});return;}if(refreshPending)return;refreshPending=true;queueMicrotask(()=>{refreshPending=false;contexts.forEach((c,id)=>{if(id==='windows')return;if(c.u.app==='youtube'&&c.u.video!==undefined)return;if(c.root.isConnected&&!c.root.closest('[hidden]'))render(c);});});});
  new IntersectionObserver(entries=>visible=entries[0].isIntersecting).observe(hero);
  const completed=new Set();
  setInterval(()=>{m.tick(500,visible&&!document.hidden&&!activityPaused);hero.querySelectorAll('[data-sim-clock]').forEach(el=>el.textContent=m.clock);for(const t of m.data.transfers){if(t.status==='complete'&&!completed.has(t.id)){completed.add(t.id);const settings=m.data.settings[t.to]||m.data.settings[t.from];if(settings?.openFolder){if(t.to==='pc')showExplorer({folder:t.folder,page:'list',preview:undefined});else if(['left','right'].includes(t.to))open(t.to,'files',{folder:t.folder,page:'list',preview:undefined});}}}},500);
  window.PhoneBridgerSimulator={open,home,tourMessage(){activityPaused=false;m.sendMessage('alex','The proposal is ready. I will send it by email.');},reset(){resetting=true;completed.clear();m.reset();history.left=[];history.right=[];recents.left=[];recents.right=[];cache.left={};cache.right={};['left','right'].forEach(mount);setupPc();explorer.hidden=true;winPanel.hidden=true;syncFiles();resetting=false;},
    pauseActivity(paused){activityPaused=paused;},
    renderTransfers(area){area.innerHTML=A.transferList(m);if(!area.dataset.simWired){area.addEventListener('click',handleClick);area.dataset.simWired='true';}},setSetting(key,field,value){if(!m.data.settings[key])return;m.data.settings[key][field]=value;const c=contexts.get(key);if(c?.u.app==='phonebridger')render(c);},
    desktopTransfer(items,key,upload){if(key==='top'){demo.notify('Choose a side phone for file transfers. The upper phone stays on video.');return;}const ids=items.map(item=>item.fileId||m.data.files.find(f=>f.name===item.name)?.id||(item.type==='image'?'photo-workspace':'doc-1'));return transfer(contexts.get(key),ids,upload?key:'pc',upload?'pc':key);},
  };
  explorer.addEventListener('click',handleClick);winPanel.addEventListener('click',handleClick);pc.querySelector('.desktop-taskbar').addEventListener('click',handleClick);
  ['left','right'].forEach(mount);setupPc();setupTaskbar();syncFiles();render(explorerCtx);
})();
