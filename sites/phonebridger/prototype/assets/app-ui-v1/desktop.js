/* Complete website-only app demo. No real device, file or OS configuration. */
(() => {
  const demo = window.PhoneBridgerDemo;
  const hero = document.querySelector('.interactive-hero');
  const scene = hero.querySelector('.demo-scene');
  const pc = hero.querySelector('[data-screen=pc]');
  const base = 'assets/app-ui-v1/';
  const icon = name => `<svg class="pb-icon" aria-hidden="true"><use href="${base}icons.svg#pb-${name}"></use></svg>`;
  const chromeIcon = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#ea4335" d="M24 3a21 21 0 0 1 18.2 10.5H24L15 29 6 13.5A21 21 0 0 1 24 3Z"/><path fill="#fbbc05" d="M42.2 13.5A21 21 0 0 1 24 45l9-15.6-9-15.9Z"/><path fill="#34a853" d="M24 45A21 21 0 0 1 6 13.5L15 29h18Z"/><circle cx="24" cy="24" r="10" fill="#4285f4" stroke="#fff" stroke-width="2"/></svg>';
  const names = {top:'Main phone',left:'Left phone',right:'Right phone'};
  const tabs = [['devices','phone','Devices'],['mouse','keyboard','Mouse & keyboard'],['audio','waveform','Audio'],['browser','browser','Browser'],['files','folder','Files']];
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const defaults = () => ({speed:150,keyboard:true,audio:false,volume:72,mute:true,playback:'balanced',cursor:'Default',position:'Above monitor',browser:'default',google:true,destination:'Downloads',pcFolder:'Downloads / PhoneBridger',overwrite:true,openFolder:true});
  const phoneDefaults = key => ({...defaults(),position:{top:'Above monitor',left:'Left of monitor',right:'Right of monitor'}[key]});
  let settings = Object.fromEntries(Object.keys(names).map(key => [key,phoneDefaults(key)]));
  let selected = 'top', tab = 'devices', controlling = true, folder = '', query = '', filePage=0, chosen = new Set(), transfer = null, transferTimer = null, feedbackTimer = null, drag = null, rangeDrag = null;
  let launchAtLogin = true, autoUsb = true;
  const files = {
    top:[{name:'weekly-recap.pdf',size:'2.4 MB',type:'pdf',folder:'Documents'},{name:'desk-photo.jpg',size:'3.1 MB',type:'image',folder:'Photos'},{name:'project-assets.zip',size:'18 MB',type:'zip',folder:'Downloads'}],
    left:[{name:'chat-export.pdf',size:'1.2 MB',type:'pdf',folder:'Documents'},{name:'holiday-photo.jpg',size:'4.8 MB',type:'image',folder:'Photos'},{name:'notes-backup.zip',size:'6 MB',type:'zip',folder:'Downloads'}],
    right:[{name:'meeting-notes.pdf',size:'920 KB',type:'pdf',folder:'Documents'},{name:'launch-photo.jpg',size:'2.8 MB',type:'image',folder:'Photos'},{name:'invoices.zip',size:'8 MB',type:'zip',folder:'Downloads'}]
  };
  const pcSamples = [{name:'presentation.pdf',size:'4.2 MB',type:'pdf'},{name:'workspace.jpg',size:'3 MB',type:'image'}];
  const browser = document.createElement('section');
  browser.className = 'desktop-browser'; browser.setAttribute('aria-label','Chrome demo window');
  for (const child of [...pc.children]) if (!child.matches('.portal,.desktop-taskbar,.mini-window,.demo-cursor')) browser.append(child);
  browser.querySelector('.browser-minimized').hidden = true;
  pc.append(browser);
  const desktop = document.createElement('div'); desktop.className = 'demo-desktop';
  desktop.innerHTML = `<div class="desktop-shortcuts"><button type="button" data-launch="chrome" aria-label="Open Chrome from desktop">${chromeIcon}<span>Google Chrome</span></button><button type="button" data-launch="phonebridger" aria-label="Open PhoneBridger from desktop"><img src="${base}icons/brand.svg" alt=""><span>PhoneBridger</span></button><button type="button" data-launch="files" aria-label="Open Files from desktop">${icon('folder')}<span>Phone files</span></button></div><div class="desktop-signature">A little more room. A lot more flow.</div>`;
  pc.prepend(desktop);
  const app = document.createElement('section'); app.className = 'pb-window'; app.setAttribute('aria-label','PhoneBridger demo window');
  app.innerHTML = `<div class="pb-ui pb-canvas"><header class="pb-titlebar"><img src="${base}icons/brand.svg" alt=""><span>PhoneBridger</span><div class="pb-window-actions"><button type="button" data-pb-window="minimize" aria-label="Minimize PhoneBridger">−</button><button type="button" data-pb-window="maximize" aria-label="Maximize PhoneBridger">□</button><button type="button" data-pb-window="close" aria-label="Close PhoneBridger">×</button></div></header><div class="pb-body"><nav class="pb-sidebar" aria-label="PhoneBridger sections">${tabs.map(([key,i,label])=>`<button type="button" class="pb-nav-item" data-pb-tab="${key}">${icon(i)}${label}</button>`).join('')}<div class="pb-sidebar-bottom"><button type="button" class="pb-nav-item" data-pb-tab="settings">${icon('settings')}Settings</button><button type="button" class="pb-nav-item" data-pb-tab="help">${icon('help')}Help</button></div></nav><main class="pb-main"></main><aside class="pb-inspector"></aside></div><footer class="pb-footer">${icon('monitor')}<span class="pb-dot"></span><span data-pb-control-status>Controlling: This PC</span><span class="pb-footer-demo">· Demo</span><button class="pb-button" type="button" data-pb-action="pause-control">${icon('pause')}Pause control</button></footer><p class="pb-feedback" hidden role="status"></p></div>`;
  pc.append(app);
  const canvas = app.querySelector('.pb-canvas'), main = app.querySelector('.pb-main'), inspector = app.querySelector('.pb-inspector');
  const taskbar = pc.querySelector('.desktop-taskbar');
  const chromeTask = taskbar.querySelector('[data-open-desktop=browser]');
  delete chromeTask.dataset.openDesktop; chromeTask.dataset.launch = 'chrome'; chromeTask.innerHTML = chromeIcon; chromeTask.setAttribute('aria-label','Open Chrome on PC');
  const appTask = document.createElement('button'); appTask.type='button'; appTask.dataset.launch='phonebridger'; appTask.setAttribute('aria-label','Open PhoneBridger on PC'); appTask.innerHTML=`<img src="${base}icons/brand.svg" alt="">`; taskbar.insertBefore(appTask,chromeTask);
  const fileTask = document.createElement('button'); fileTask.type='button'; fileTask.dataset.launch='files'; fileTask.setAttribute('aria-label','Open phone Files on PC'); fileTask.innerHTML=icon('folder'); taskbar.insertBefore(fileTask,chromeTask.nextSibling);
  const windows = {chrome:browser,phonebridger:app};
  const running = {chrome:true,phonebridger:true};
  browser.querySelector('[data-chrome=maximize]').setAttribute('aria-label','Restore demo browser size');
  app.querySelector('[data-pb-window=maximize]').setAttribute('aria-label','Restore PhoneBridger size');
  function fit() {
    if(!app.clientWidth||!app.clientHeight)return;
    const scale = Math.min(app.clientWidth / 1100,app.clientHeight / 700);
    canvas.style.height = `${app.clientHeight / scale}px`; canvas.style.transform = `scale(${scale})`;
    canvas.style.left = `${(app.clientWidth-1100*scale)/2}px`;
  }
  new ResizeObserver(fit).observe(app); fit();
  function paintTaskbar() { taskbar.querySelectorAll('[data-launch]').forEach(b=>{if(b.dataset.launch==='files'&&window.PhoneBridgerSimulator)return;b.dataset.running=String(running[b.dataset.launch==='files'?'phonebridger':b.dataset.launch]);}); }
  function raise(win) { pc.querySelectorAll('.desktop-browser,.pb-window,.mini-window').forEach(w=>w.style.zIndex='2');win.style.zIndex='10'; }
  function open(name) {
    if(name==='files'&&window.PhoneBridgerSimulator){window.PhoneBridgerSimulator.open('pc','files',{explorer:true});return;}
    if(name==='files'){tab='files';render();name='phonebridger';}
    const win=windows[name]; if(!win)return;
    win.hidden=false;raise(win);running[name]=true;pc.classList.remove('browser-is-minimized');paintTaskbar();if(name==='phonebridger')fit();
  }
  function hide(name, close=false) { windows[name].hidden=true;if(close)running[name]=false;paintTaskbar(); }
  function toggleSize(name) {
    const win=windows[name],restored=win.classList.toggle(name==='chrome'?'desktop-window-restored':'pb-window-restored');
    win.querySelector(name==='chrome'?'[data-chrome=maximize]':'[data-pb-window=maximize]').setAttribute('aria-label',`${restored?'Maximize':'Restore'} ${name==='chrome'?'demo browser':'PhoneBridger'}${restored?'':' size'}`);
    if(name==='phonebridger')fit();
  }
  function message(text) { const el=app.querySelector('.pb-feedback'); el.textContent=text;el.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>el.hidden=true,3000); }
  function dropdown(key,label,value,values) {
    return `<div class="pb-dropdown"><button type="button" class="pb-dropdown-trigger" data-pb-menu="${key}" aria-label="${label}" aria-expanded="false">${icon(key==='phone'?'phone':key==='position'?'monitor':'folder')}<span>${escape(value)}</span>${key==='phone'?'<span class="pb-dot"></span>':''}${icon('chevron-down')}</button><div class="pb-dropdown-menu" hidden>${values.map(([v,title])=>`<button type="button" data-pb-choice="${key}" data-value="${v}" aria-pressed="${String(title===value)}">${title}</button>`).join('')}</div></div>`;
  }
  const phoneSelect = () => dropdown('phone','Selected phone',names[selected],Object.entries(names));
  function toggle(key,label) { return `<div class="pb-row"><span>${label}</span><label class="pb-switch"><input type="checkbox" data-pb-setting="${key}" aria-label="${label}" ${settings[selected][key]?'checked':''}><span class="pb-switch-track"></span></label></div>`; }
  function range(key,label,min,max) { const value=settings[selected][key];return `<label class="pb-row" for="pb-${key}"><span>${label}</span><output data-pb-output="${key}">${value}%</output></label><input class="pb-range" id="pb-${key}" type="range" min="${min}" max="${max}" value="${value}" data-pb-setting="${key}" aria-label="${label}" style="--pb-progress:${(value-min)/(max-min)*100}%">`; }
  const button = (label,action,primary=false,i='') => `<button type="button" class="pb-button ${primary?'pb-button-primary':''}" data-pb-action="${action}">${i?icon(i):''}${label}</button>`;
  const title = (heading,sub) => `<h2>${heading}</h2><p class="pb-subtitle">${sub}</p>`;
  function card(heading,body,i='') {return `<section class="pb-card"><h3>${i?icon(i):''}${heading}</h3>${body}</section>`;}
  function previewPhone() {return `<img class="pb-phone-preview" src="${base}phone-preview-green-v1.png" alt="${names[selected]} preview">`;}
  function render() {
    app.dataset.pbView=tab;
    app.querySelectorAll('[data-pb-tab]').forEach(b=>{if(b.dataset.pbTab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    app.querySelector('.pb-feedback').hidden=true;
    const s=settings[selected];
    if(tab==='devices') {
      main.innerHTML=title('Your devices','One mouse. Three phone positions.')+`<div class="pb-row"><span class="pb-badge">${icon(autoUsb?'usb':'wifi')}Automatic · USB / Wi-Fi</span>${button('Add phone','add-phone',true,'plus')}</div><div class="pb-device-map"><img src="${base}devices-group-v1.png" alt="This PC with three connected phones">${Object.entries(names).map(([key,name])=>`<button type="button" class="pb-phone-hit" data-pb-phone="${key}" aria-label="Select ${name}" aria-pressed="${key===selected}"><span>${name}</span></button>`).join('')}</div><p class="pb-device-tip">${icon('cursor')}Move through an edge. Click a phone to manage it.</p>`;
      inspector.innerHTML=`<h3>${names[selected]}</h3><span class="pb-badge"><span class="pb-dot"></span>Connected</span><hr><span>Position</span>${dropdown('position','Phone position',s.position,['Left of monitor','Above monitor','Right of monitor'].map(v=>[v,v]))}<div class="pb-row"><span>Orientation</span><strong>${selected==='top'?'Landscape':'Portrait'}</strong></div><hr><h3>Controls</h3>${toggle('keyboard','Mouse & keyboard')}${toggle('audio','Audio to PC')}${button('Edit transition zone','zone',false,'zone')}${button('Test transition','test',true,'play')}<hr><p>Pair once. Reconnect automatically.</p>`;
    } else if(tab==='mouse') {
      main.innerHTML=title('Mouse & keyboard','Make your phone feel like your PC.')+phoneSelect()+card('Mouse',range('speed','Pointer speed',10,400),'mouse')+card('Keyboard',toggle('keyboard','Use PC keyboard')+`<input class="pb-key-demo" aria-label="Try typing in the demo" placeholder="Try typing here…" value="${escape(s.typed||'')}">`,'keyboard')+card('Shortcuts',`<div class="pb-row"><span>Return to PC<br><kbd class="pb-key">Ctrl + Alt + S</kbd></span><span>Screenshot<br><kbd class="pb-key">Print Screen</kbd></span></div>`);
      inspector.innerHTML=`<h3>Preview</h3><p>${names[selected]}</p>${previewPhone()}<hr><h3>Quick speed</h3><div class="pb-quick-speeds">${[100,150,200].map(v=>`<button type="button" class="pb-button" data-pb-speed="${v}" aria-pressed="${v===s.speed}">${v}%</button>`).join('')}</div><hr><h3>Cursor size</h3><div class="pb-cursor-sizes">${['Small','Default','Large'].map((v,i)=>`<button type="button" class="pb-button" data-pb-cursor="${v}" aria-pressed="${v===s.cursor}"><span style="transform:scale(${.7+i*.2})">${icon('cursor')}</span>${v}</button>`).join('')}</div><hr>${button('Reset settings','reset-settings',false,'reset')}${button('Test transition','test',true,'cursor')}`;
    } else if(tab==='audio') {
      main.innerHTML=title('Audio','Hear your phone through your PC.')+phoneSelect()+`<div class="pb-card"><img class="pb-audio-art" src="${base}audio-flow-v1.png" alt="Phone audio routed to PC speakers"></div>`+card('Audio routing',toggle('audio','Audio to PC')+range('volume','Volume',0,100)+toggle('mute','Mute phone media'),'speaker')+card('Playback',`<div class="pb-segment">${['low','balanced','stable'].map(v=>`<label><input type="radio" name="pb-playback" data-pb-setting="playback" value="${v}" ${v===s.playback?'checked':''}><span>${{low:'Low latency',balanced:'Balanced',stable:'Stable'}[v]}</span></label>`).join('')}</div>`);
      inspector.innerHTML=`<h3>Session status</h3><span class="pb-badge"><span class="pb-dot"></span>Connected</span><hr><div class="pb-row">${icon('speaker')}<span data-pb-audio-status>${s.audio?'PC playback on':'PC playback off'}</span></div><div class="pb-row">${icon('shield')}<span>Permission granted</span></div><div class="pb-audio-meter" data-on="${s.audio}">${[25,50,76,42,85,60,32,65,44].map((h,i)=>`<i style="--bar:${h}px;--delay:${i*.13}s"></i>`).join('')}</div><p>Demo routing only. The top phone has its own video controls.</p>${button(s.audio?'Stop streaming':'Start streaming','audio-stream',true,'waveform')}`;
    } else if(tab==='browser') {
      main.innerHTML=title('Browser','Send a tab to your phone.')+phoneSelect()+card('Desktop browser',`<div class="pb-browser-tile">${icon('browser-window')}<div><strong>Chrome extension</strong><p>Your browser, connected.</p></div></div><div class="pb-inline-buttons">${button('Open Chrome','open-chrome',true,'browser')}${button('Test link','test-link',false,'link')}</div>`,'browser')+card('Open links on phone',`<label class="pb-radio"><input type="radio" name="pb-browser" data-pb-setting="browser" value="default" ${s.browser==='default'?'checked':''}><span>Default browser</span></label><label class="pb-radio"><input type="radio" name="pb-browser" data-pb-setting="browser" value="chrome" ${s.browser==='chrome'?'checked':''}><span>Always use Chrome</span></label>${toggle('google','Open Google links in apps')}`,'link');
      inspector.innerHTML=`<h3>How it works</h3><div class="pb-flow-diagram">${icon('browser-window')}<span class="pb-arrow">${icon('arrow-right')}</span>${icon('phone')}</div>${[['Pick a tab','Choose Sheets, Gmail or another tab.'],['Drag to your phone','Move it through a phone edge.'],['Continue there','The link opens on your phone.']].map(([a,b],i)=>`<div class="pb-step"><b>${i+1}</b><span><strong>${a}</strong><br>${b}</span></div>`).join('')}<hr>${button('Try Google Sheets','test-link',true,'app-sheets')}`;
    } else if(tab==='files') {
      main.innerHTML=title('Files','Browse your phone. Bring files to your PC.')+phoneSelect()+`<section class="pb-card"><div class="pb-file-toolbar"><h3>Phone files</h3>${button('Refresh','refresh',false,'reset')}${button('Download selected','download',true,'download')}</div><div class="pb-file-path">${icon('folder')}<button type="button" data-pb-folder="">Internal storage</button>${folder?`<span>›</span><strong>${folder}</strong>`:''}</div><input class="pb-file-search" type="search" aria-label="Search phone files" placeholder="Search phone files" value="${escape(query)}">${!folder?`<div class="pb-folder-grid">${['Photos','Documents','Downloads'].map(v=>`<button type="button" data-pb-folder="${v}"><img src="${base}icons/folder-color.svg" alt="">${v}</button>`).join('')}</div>`:''}<div class="pb-file-list"></div></section><div class="pb-transfer-card"></div>`;
      inspector.innerHTML=`<h3>PC → phone</h3><div class="pb-flow-diagram">${icon('monitor')}<span class="pb-arrow">${icon('arrow-right')}</span>${icon('phone')}</div><p>Drag a PC file onto a phone.</p><span>Save to on phone</span>${dropdown('destination','Phone receiving folder',s.destination,['Downloads','Documents','Photos'].map(v=>[v,v]))}${toggle('overwrite','Ask before overwrite')}${toggle('openFolder','Open folder after transfer')}<hr><h3>Phone → PC</h3>${dropdown('pcFolder','PC download folder',s.pcFolder,['Downloads / PhoneBridger','Desktop / Phone files'].map(v=>[v,v]))}<p>Try dragging a demo PC file:</p><div class="pb-pc-files">${pcSamples.map((f,i)=>`<button type="button" draggable="true" data-pb-pc-file="${i}" aria-label="Drag ${f.name} to a phone"><img src="${base}icons/file-${f.type}-color.svg" alt="">${f.name} ${icon('upload')}</button>`).join('')}</div>`;
      renderFileList();paintTransfer();
    } else if(tab==='settings') {
      main.innerHTML=title('Settings','A workspace that stays ready.')+card('Connection',`<div class="pb-row"><span>Prefer USB automatically</span><label class="pb-switch"><input type="checkbox" data-pb-global="autoUsb" aria-label="Prefer USB automatically" ${autoUsb?'checked':''}><span class="pb-switch-track"></span></label></div><p>USB and Wi-Fi use the same features.</p>`,'usb')+card('Startup',`<div class="pb-row"><span>Launch at login</span><label class="pb-switch"><input type="checkbox" data-pb-global="launchAtLogin" aria-label="Launch at login" ${launchAtLogin?'checked':''}><span class="pb-switch-track"></span></label></div>`,'settings')+card('Demo preferences',button('Reset demo settings','reset-all',false,'reset'));
      inspector.innerHTML='<h3>Your workspace</h3><p>Three paired phones.</p><hr><span class="pb-badge"><span class="pb-dot"></span>Ready</span><p>Demo choices stay here while you browse this page.</p>';
    } else {
      main.innerHTML=title('Welcome to PhoneBridger','One mouse. A little more room.')+`<div class="pb-help-steps">${[['Connect once','Scan the QR code in the real app. Pairing is remembered.'],['Choose your positions','Keep your phones beside or above your monitor.'],['Move, type and transfer','Your mouse and keyboard follow you across screens.'],['Return to the website','Press Escape to release demo mouse control. Scroll to move around the page.']].map(([a,b])=>card(a,`<p>${b}</p>`)).join('')}</div>`;
      inspector.innerHTML=`<h3>Explore the demo</h3><p>Try each sidebar section, change settings or close this window to explore the desktop.</p>${button('Open Chrome','open-chrome',true,'browser')}${button('Browse phone files','open-files',false,'folder')}<hr><p>Need help?<br>hello@phonebridger.com</p>`;
    }
    paintControlStatus();
  }
  function renderFileList() {
    const list=main.querySelector('.pb-file-list');if(!list)return;list.replaceChildren();
    const found=files[selected].filter(f=>(!folder||f.folder===folder)&&f.name.toLowerCase().includes(query.toLowerCase()));
    const pages=Math.max(1,Math.ceil(found.length/3));filePage=Math.min(filePage,pages-1);
    main.querySelector('.pb-file-paging')?.remove();
    if(pages>1){const pager=document.createElement('span');pager.className='pb-file-paging';pager.innerHTML=`<button type="button" data-pb-page="previous" aria-label="Previous phone files" ${filePage===0?'disabled':''}>‹</button><span>${filePage+1} / ${pages}</span><button type="button" data-pb-page="next" aria-label="Next phone files" ${filePage===pages-1?'disabled':''}>›</button>`;main.querySelector('.pb-file-path').append(pager);}
    for(const f of found.slice(filePage*3,filePage*3+3)) {
      const row=document.createElement('div');row.className='pb-file-row';
      row.innerHTML=`<input type="checkbox" data-pb-file="${escape(f.name)}" id="pb-file-${files[selected].indexOf(f)}" aria-label="Select ${escape(f.name)}" ${chosen.has(f.name)?'checked':''}><img src="${base}icons/file-${f.type}-color.svg" alt=""><label for="pb-file-${files[selected].indexOf(f)}">${escape(f.name)}<small>${f.size}</small></label><button type="button" data-pb-download="${escape(f.name)}" aria-label="Download ${escape(f.name)} to PC">${icon('download')}</button>`;
      list.append(row);
    }
    if(!found.length)list.innerHTML='<p class="pb-file-empty">No files found in this folder.</p>';
    const download=main.querySelector('[data-pb-action=download]');download.disabled=chosen.size===0;
  }
  function paintControlStatus() { const b=app.querySelector('[data-pb-action=pause-control]');b.innerHTML=icon(controlling?'pause':'play')+(controlling?'Pause control':'Resume control');app.querySelector('[data-pb-control-status]').textContent=controlling?'Controlling: This PC':'Control paused'; }
  function stopTransferTimer(){clearInterval(transferTimer);transferTimer=null;}
  function showPhoneFolder(phone,path) {
    if(window.PhoneBridgerSimulator){window.PhoneBridgerSimulator.open(phone,'files',{page:'list',folder:path});return;}
    const body=document.createElement('div');body.className='pb-phone-file-manager';
    body.innerHTML=`<h3>${escape(path)}</h3>${files[phone].filter(f=>f.folder===path).map(f=>`<div class="received-file"><img src="${base}icons/file-${f.type}-color.svg" alt=""><span>${escape(f.name)}</span><button type="button" data-pb-received-download="${escape(f.name)}" data-phone="${phone}" aria-label="Download received ${escape(f.name)} to PC">${icon('download')}</button></div>`).join('')}`;
    demo.openPhonePanel(phone,'Files',body);
  }
  function paintTransfer(){
    const area=main.querySelector('.pb-transfer-card');if(!area)return;
    if(window.PhoneBridgerSimulator){window.PhoneBridgerSimulator.renderTransfers(area);return;}
    if(!transfer){area.innerHTML='<p style="color:#969bad">No active transfers · Demo files only</p>';return;}
    area.innerHTML=`<div class="pb-row"><strong>${escape(transfer.label)}</strong><span>${transfer.progress}%</span></div><p>${escape(transfer.direction)}${transfer.done?' · Complete':transfer.paused?' · Paused':''}</p><div class="pb-progress" role="progressbar" aria-label="Demo file transfer progress" aria-valuenow="${transfer.progress}" aria-valuemin="0" aria-valuemax="100" style="--pb-progress:${transfer.progress}%"><div class="pb-progress-fill"></div></div>${transfer.done?'<p style="color:#d0ff63">Demo complete. No real file was transferred.</p>':`<div class="pb-inline-buttons">${button(transfer.paused?'Resume':'Pause','pause-transfer',false,transfer.paused?'play':'pause')}${button('Cancel','cancel-transfer',false,'close')}</div>`}`;
  }
  function runTransfer(){stopTransferTimer();transferTimer=setInterval(()=>{
    if(!transfer||transfer.paused)return;
    transfer.progress=Math.min(100,transfer.progress+5);
    if(transfer.progress===100){
      transfer.done=true;stopTransferTimer();
      if(transfer.upload){
        const f=transfer.upload;if(!files[transfer.phone].some(item=>item.name===f.name))files[transfer.phone].push({...f,folder:transfer.destination});
        if(settings[transfer.phone].openFolder){showPhoneFolder(transfer.phone,transfer.destination);if(selected===transfer.phone&&tab==='files'){folder=transfer.destination;query='';chosen.clear();render();}}
        if(tab==='files')renderFileList();
      }
      demo.notify(`Demo transfer complete: ${transfer.direction}`);
    }
    paintTransfer();
  },200);}
  function startTransfer(items,phone=selected,upload=false){
    if(window.PhoneBridgerSimulator){return window.PhoneBridgerSimulator.desktopTransfer(items,phone,upload);}
    if(transfer&&!transfer.done){message('Finish or cancel the current transfer first.');return;}
    if(!items.length)return;
    const s=settings[phone];transfer={phone,label:items.length>1?`${items.length} selected files`:items[0].name,direction:upload?`PC → ${names[phone]} / ${s.destination}`:`${names[phone]} → PC / ${s.pcFolder}`,progress:0,paused:false,done:false,upload:upload?items[0]:null,destination:s.destination};
    if(upload){selected=phone;tab='files';folder='';query='';filePage=0;chosen.clear();open('phonebridger');render();}
    runTransfer();paintTransfer();
  }
  function choosePhone(key){if(!names[key])return;selected=key;folder='';query='';filePage=0;chosen.clear();render();}
  function updateSetting(input){
    const s=settings[selected],key=input.dataset.pbSetting;
    if(key){s[key]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;if(input.type==='range'){input.style.setProperty('--pb-progress',`${(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);app.querySelector(`[data-pb-output=${key}]`).textContent=`${input.value}%`;if(key==='speed')app.querySelectorAll('[data-pb-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.pbSpeed)===s.speed)));}}
    if(key==='audio'){const meter=inspector.querySelector('.pb-audio-meter');if(meter)meter.dataset.on=String(s.audio);const status=inspector.querySelector('[data-pb-audio-status]');if(status)status.textContent=s.audio?'PC playback on':'PC playback off';const b=inspector.querySelector('[data-pb-action=audio-stream]');if(b)b.innerHTML=icon('waveform')+(s.audio?'Stop streaming':'Start streaming');}
    if(input.dataset.pbGlobal==='autoUsb')autoUsb=input.checked;if(input.dataset.pbGlobal==='launchAtLogin')launchAtLogin=input.checked;
    if(key)window.PhoneBridgerSimulator?.setSetting(selected,key,s[key]);
  }
  app.addEventListener('input',e=>{if(e.target.dataset.pbSetting)updateSetting(e.target);if(e.target.matches('.pb-key-demo'))settings[selected].typed=e.target.value;if(e.target.matches('.pb-file-search')){query=e.target.value;filePage=0;renderFileList();}});
  app.addEventListener('change',e=>{if(e.target.dataset.pbSetting||e.target.dataset.pbGlobal)updateSetting(e.target);if(e.target.dataset.pbFile){if(e.target.checked)chosen.add(e.target.dataset.pbFile);else chosen.delete(e.target.dataset.pbFile);main.querySelector('[data-pb-action=download]').disabled=chosen.size===0;}});
  function handleDesktopClick(e){
    if(e.desktopHandled)return;e.desktopHandled=true;
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.launch){open(b.dataset.launch);return;}
    if(b.dataset.pbReceivedDownload){choosePhone(b.dataset.phone);tab='files';const items=files[selected].filter(f=>f.name===b.dataset.pbReceivedDownload);folder=items[0].folder;render();open('phonebridger');startTransfer(items);return;}
    if(!app.contains(b))return;
    if(b.dataset.pbWindow){if(b.dataset.pbWindow==='maximize')toggleSize('phonebridger');else hide('phonebridger',b.dataset.pbWindow==='close');return;}
    if(b.dataset.pbTab){tab=b.dataset.pbTab;render();return;}
    if(b.dataset.pbPhone){choosePhone(b.dataset.pbPhone);return;}
    if(b.dataset.pbMenu){const menu=b.nextElementSibling,on=menu.hidden;app.querySelectorAll('.pb-dropdown-menu').forEach(m=>m.hidden=true);app.querySelectorAll('[data-pb-menu]').forEach(t=>t.setAttribute('aria-expanded','false'));menu.hidden=!on;b.setAttribute('aria-expanded',String(on));return;}
    if(b.dataset.pbChoice){if(b.dataset.pbChoice==='phone')choosePhone(b.dataset.value);else{settings[selected][b.dataset.pbChoice]=b.dataset.value;window.PhoneBridgerSimulator?.setSetting(selected,b.dataset.pbChoice,b.dataset.value);render();}return;}
    if(b.dataset.pbSpeed){settings[selected].speed=Number(b.dataset.pbSpeed);window.PhoneBridgerSimulator?.setSetting(selected,'speed',settings[selected].speed);render();return;}
    if(b.dataset.pbCursor){settings[selected].cursor=b.dataset.pbCursor;window.PhoneBridgerSimulator?.setSetting(selected,'cursor',settings[selected].cursor);render();return;}
    if(b.hasAttribute('data-pb-folder')){folder=b.dataset.pbFolder;query='';filePage=0;chosen.clear();render();return;}
    if(b.dataset.pbPage){filePage+=b.dataset.pbPage==='next'?1:-1;renderFileList();return;}
    if(b.dataset.pbDownload){startTransfer(files[selected].filter(f=>f.name===b.dataset.pbDownload));return;}
    const action=b.dataset.pbAction;
    if(action==='pause-control'){controlling=!controlling;paintControlStatus();e.stopPropagation();window.PhoneBridgerSimulator?.pauseActivity(!controlling);if(controlling)demo.resumeMouseControl();else demo.pauseMouseControl();return;}
    if(action==='add-phone')message('Three demo phones are already connected. Select one to manage it.');
    if(action==='zone'){b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));message('The demo uses the visible phone edges as transition zones.');}
    if(action==='test')message(`Move through the ${selected==='top'?'top':selected} edge of the PC into ${names[selected]}.`);
    if(action==='reset-settings'){settings[selected]=phoneDefaults(selected);for(const [k,v] of Object.entries(settings[selected]))window.PhoneBridgerSimulator?.setSetting(selected,k,v);render();}
    if(action==='audio-stream'){settings[selected].audio=!settings[selected].audio;window.PhoneBridgerSimulator?.setSetting(selected,'audio',settings[selected].audio);render();}
    if(action==='open-chrome')open('chrome');
    if(action==='open-files'){tab='files';render();}
    if(action==='test-link'){demo.openGoogle('sheets',selected);message(`Google Sheets opened on ${names[selected]}.`);}
    if(action==='refresh'){renderFileList();message('Phone files refreshed.');}
    if(action==='download')startTransfer(files[selected].filter(f=>chosen.has(f.name)));
    if(action==='pause-transfer'&&transfer&&!transfer.done){transfer.paused=!transfer.paused;if(transfer.paused)stopTransferTimer();else runTransfer();paintTransfer();}
    if(action==='cancel-transfer'){stopTransferTimer();transfer=null;paintTransfer();}
    if(action==='reset-all'){settings=Object.fromEntries(Object.keys(names).map(key=>[key,phoneDefaults(key)]));for(const key of ['left','right'])for(const [k,v] of Object.entries(settings[key]))window.PhoneBridgerSimulator?.setSetting(key,k,v);launchAtLogin=autoUsb=true;render();message('Demo settings reset.');}
  }
  [app,desktop,taskbar,hero].forEach(root=>root.addEventListener('click',handleDesktopClick));
  document.addEventListener('click',e=>{if(!e.target.closest('.pb-dropdown')){app.querySelectorAll('.pb-dropdown-menu').forEach(m=>m.hidden=true);app.querySelectorAll('[data-pb-menu]').forEach(b=>b.setAttribute('aria-expanded','false'));}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){rangeDrag=null;clearFileDrag();app.querySelectorAll('.pb-dropdown-menu').forEach(m=>m.hidden=true);}});
  function pointerRange(input,p){const rect=input.getBoundingClientRect();const min=Number(input.min),max=Number(input.max),step=Number(input.step)||1;input.value=String(min+Math.round(Math.max(0,Math.min(1,(p.x-rect.left)/rect.width))*(max-min)/step)*step);input.dispatchEvent(new Event('input',{bubbles:true}));}
  const dragGhost=document.createElement('div');dragGhost.className='pb-drag-file';dragGhost.hidden=true;scene.append(dragGhost);
  function clearFileDrag(){drag=null;dragGhost.hidden=true;hero.querySelectorAll('.device').forEach(d=>d.classList.remove('drop-target'));}
  function moveFileDrag(p){if(!drag)return;drag.point=p;drag.moved ||= Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>4;const r=scene.getBoundingClientRect(),scale=r.width/scene.clientWidth;dragGhost.textContent=drag.file.name;dragGhost.hidden=!drag.moved;dragGhost.style.left=`${(p.x-r.left)/scale+12}px`;dragGhost.style.top=`${(p.y-r.top)/scale+10}px`;hero.querySelectorAll('.device').forEach(d=>{const screen=d.querySelector('[data-screen]'),b=screen.getBoundingClientRect();d.classList.toggle('drop-target',screen.dataset.screen!=='pc'&&p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom);});}
  function finishFileDrag(){if(!drag)return;const drop=[...hero.querySelectorAll('.device.drop-target [data-screen]')][0],file=drag.file;if(drop&&drag.moved){const key=drop.dataset.screen;if(!window.PhoneBridgerSimulator&&settings[key].overwrite&&files[key].some(f=>f.name===file.name)){message('This demo file already exists. No file was overwritten.');}else startTransfer([file],key,true);}clearFileDrag();}
  // Pointer dragging uses the same destinations with or without Pointer Lock.
  // Avoid native HTML drag ownership, which would steal the simulated cursor.
  let suppressFileClick=false;
  app.addEventListener('pointerdown',e=>{
    const b=e.target.closest('[data-pb-pc-file]');if(!b||demo.isDriving()||e.button!==0)return;
    e.preventDefault();b.draggable=false;b.setPointerCapture(e.pointerId);
    drag={file:pcSamples[Number(b.dataset.pbPcFile)],start:{x:e.clientX,y:e.clientY},point:{x:e.clientX,y:e.clientY},moved:false,native:true};
  });
  document.addEventListener('pointermove',e=>{if(drag?.native)moveFileDrag({x:e.clientX,y:e.clientY});});
  document.addEventListener('pointerup',e=>{if(!drag?.native)return;moveFileDrag({x:e.clientX,y:e.clientY});suppressFileClick=drag.moved;finishFileDrag();setTimeout(()=>suppressFileClick=false,0);});
  document.addEventListener('pointercancel',()=>clearFileDrag());
  scene.addEventListener('click',e=>{if(suppressFileClick&&e.isTrusted){suppressFileClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('visibilitychange',()=>{rangeDrag=null;clearFileDrag();if(document.hidden&&transfer&&!transfer.done&&!transfer.paused){transfer.paused=true;stopTransferTimer();paintTransfer();}});
  window.PhoneBridgerDesktop={
    open,hide,raise,toggleSize,
    syncFiles(entries){for(const key of ['left','right'])files[key]=entries[key].map(f=>({fileId:f.file,name:f.name,size:f.size>=1?f.size.toFixed(1)+' MB':Math.round(f.size*1000)+' KB',type:['image','zip'].includes(f.type)?f.type:'pdf',folder:f.folder}));if(tab==='files')renderFileList();},
    syncSettings(key,values){if(settings[key]){Object.assign(settings[key],values);if(selected===key)render();}},
    refreshTransfers:paintTransfer,
    focusRoot(){return [...pc.querySelectorAll('.desktop-browser,.pb-window,.mini-window')].filter(w=>!w.hidden).sort((a,b)=>Number(b.style.zIndex||2)-Number(a.style.zIndex||2))[0]||pc;},
    virtualDown(target,p){
      const range=target.closest('.pb-window input[type=range]');if(range){rangeDrag=range;range.focus({preventScroll:true});pointerRange(range,p);return true;}
      const file=target.closest('[data-pb-pc-file]');if(file){drag={file:pcSamples[Number(file.dataset.pbPcFile)],start:p,point:p,moved:false};return true;}return false;
    },
    virtualMove(p){if(rangeDrag){pointerRange(rangeDrag,p);return true;}if(drag)moveFileDrag(p);return false;},
    virtualUp(p){rangeDrag=null;if(drag&&p)moveFileDrag(p);finishFileDrag();},
    reset(){stopTransferTimer();transfer=null;rangeDrag=null;clearFileDrag();settings=Object.fromEntries(Object.keys(names).map(key=>[key,phoneDefaults(key)]));selected='top';tab='devices';folder=query='';filePage=0;chosen.clear();controlling=true;autoUsb=launchAtLogin=true;app.classList.remove('pb-window-restored');browser.classList.remove('desktop-window-restored');for(const key of Object.keys(files))files[key].splice(3);app.querySelector('[data-pb-window=maximize]').setAttribute('aria-label','Restore PhoneBridger size');browser.querySelector('[data-chrome=maximize]').setAttribute('aria-label','Restore demo browser size');render();open('chrome');open('phonebridger');}
  };
  render();paintTaskbar();open('phonebridger');
})();
