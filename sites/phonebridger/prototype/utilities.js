/* Functional sample apps and desktop windows. All state stays in this page. */
(() => {
  const demo = window.PhoneBridgerDemo, hero = document.querySelector('.interactive-hero');
  const pc = hero.querySelector('[data-screen=pc]');
  const appInfo = { notes:['▤','Notepad'], calculator:['＋','Calculator'], tasks:['✓','Tasks'], calendar:['▦','Calendar'], browser:['◎','Chrome'] };
  const initialNote = 'Ideas for today\n\n✓ Send the weekly recap\n✓ Check the launch plan\n\nOne mouse. A little more room to think.';
  let note = initialNote, tasks = [{id:1,text:'Send the weekly recap',done:true},{id:2,text:'Review the new website',done:false},{id:3,text:'Plan the next release',done:false}];
  let nextId = 10, month = new Date(2026,9,1), selectedDay = '2026-10-04';
  let events = [{id:1,day:'2026-10-06',text:'Weekly planning',time:'10:00'}], zIndex = 8, operation = null;
  const windows = new Map(), calculators = new WeakMap(), browsers = new WeakMap();
  const create = (tag, cls, text) => { const el=document.createElement(tag); if(cls)el.className=cls; if(text!==undefined)el.textContent=text; return el; };
  const button = (text, label) => { const el=create('button','',text); el.type='button'; if(label)el.setAttribute('aria-label',label); return el; };
  function taskList(root) {
    const list=root.querySelector('.todo-list'); list.replaceChildren();
    for(const task of tasks){
      const row=create('div','todo-row'), label=create('label'), check=create('input'); check.type='checkbox'; check.checked=task.done; check.dataset.task=task.id;
      const text=create('span','',task.text); label.append(check,text); row.classList.toggle('done',task.done);
      const remove=button('×',`Delete task: ${task.text}`); remove.dataset.deleteTask=task.id; row.append(label,remove); list.append(row);
    }
    root.querySelector('.todo-count').textContent=`${tasks.filter(t=>t.done).length} of ${tasks.length} complete`;
  }
  function calendar(root){
    const title=root.querySelector('.calendar-month'); title.textContent=month.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const grid=root.querySelector('.calendar-grid'); grid.replaceChildren();
    ['M','T','W','T','F','S','S'].forEach(day=>grid.append(create('span','weekday',day)));
    const offset=(month.getDay()+6)%7, total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    for(let i=0;i<offset;i++)grid.append(create('span'));
    for(let day=1;day<=total;day++){
      const key=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const b=button(String(day),key); b.dataset.day=key; b.classList.toggle('selected',key===selectedDay); b.classList.toggle('has-event',events.some(e=>e.day===key)); grid.append(b);
    }
    root.querySelector('.calendar-day-label').textContent=selectedDay;
    const list=root.querySelector('.calendar-events'); list.replaceChildren();
    for(const event of events.filter(e=>e.day===selectedDay)){
      const row=create('div','calendar-event'); row.append(create('span','',`${event.time} · ${event.text}`)); const b=button('×',`Delete event: ${event.text}`); b.dataset.deleteEvent=event.id; row.append(b); list.append(row);
    }
    if(!list.childElementCount)list.append(create('p','empty-agenda','A little breathing room. Add something below.'));
  }
  const articles = {
    news:{title:'A more connected day',tag:'THE DAILY EDIT',body:'Make room for the things that matter. Your notes, conversations and plans can live side by side.',links:[['docs','Three ways to simplify your workspace'],['workspace','One mouse, three phones']]},
    docs:{title:'Small habits, better flow',tag:'WORKSPACE NOTES',body:'Keep a short task list. Write down the next step. Move between screens without switching keyboards.',links:[['news','Back to the daily edit'],['workspace','Explore the workspace']]},
    workspace:{title:'Your phone belongs here',tag:'PHONEBRIDGER',body:'Work on Windows, reply on Android. A shared mouse and keyboard bring your screens together over USB or Wi-Fi.',links:[['news','Read the latest'],['docs','Workspace tips']]},
  };
  function browse(root,address,add=true){
    let state=browsers.get(root); if(!state){state={history:[],index:-1};browsers.set(root,state);}
    let route=address.trim(), article;
    if(!route.startsWith('demo://')&&!/^https?:\/\//i.test(route))route=`demo://news?search=${encodeURIComponent(route)}`;
    if(route.length>500)return;
    if(add){state.history=state.history.slice(0,state.index+1);state.history.push(route);state.index=state.history.length-1;}
    root.querySelector('.demo-address').value=route;
    const page=root.querySelector('.demo-web-page'); page.replaceChildren();
    if(route.startsWith('demo://')){
      const key=route.slice(7).split('?')[0], q=new URLSearchParams(route.split('?')[1]||'').get('search'); article=articles[key]||articles.news;
      page.append(create('small','article-tag',article.tag),create('h3','',q?`Results for “${q.slice(0,80)}”`:article.title),create('p','',article.body));
      for(const [destination,title] of article.links){const b=button(title+' ↗');b.dataset.webRoute=`demo://${destination}`;page.append(b);}
    }else{
      try { const url=new URL(route); if(!['http:','https:'].includes(url.protocol))throw Error();
        page.append(create('small','article-tag','EXTERNAL LINK'),create('h3','',url.hostname),create('p','','This sample browser keeps the demo on this page. Open the real site in a separate browser tab.'));
        const link=create('a','real-site-link','Open real site ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';page.append(link);
      }catch(_){page.append(create('p','','Enter a valid web address or search the sample pages.'));}
    }
    root.querySelector('[data-web-back]').disabled=state.index<=0;root.querySelector('[data-web-forward]').disabled=state.index>=state.history.length-1;
  }
  function makeApp(name){
    const root=create('div',`utility-app utility-${name}`); root.dataset.utility=name;
    if(name==='notes'){
      root.innerHTML='<div class="notes-tools"><span>Personal notes</span><span data-note-status>Saved in this demo</span></div><textarea class="notes-input" aria-label="Personal notes" maxlength="10000" spellcheck="false"></textarea><small class="notes-count"></small>';
      root.querySelector('textarea').value=note;root.querySelector('.notes-count').textContent=`${note.length} characters`;
    }else if(name==='calculator'){
      root.innerHTML='<output class="calc-display" aria-live="polite">0</output><div class="calc-keys"></div>';
      const keys=root.querySelector('.calc-keys');for(const key of ['C','⌫','(',')','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+']){const b=button(key,key==='⌫'?'Backspace':key==='C'?'Clear calculator':key);b.dataset.calc=key;keys.append(b);} calculators.set(root,{expression:'',finished:false});
    }else if(name==='tasks'){
      root.innerHTML='<div class="todo-heading"><strong>Today, at a glance</strong><small class="todo-count"></small></div><div class="todo-list"></div><form class="todo-form"><input aria-label="New task" maxlength="120" placeholder="Add a little next step…" autocomplete="off"><button type="submit" aria-label="Add task">+</button></form>';taskList(root);
    }else if(name==='calendar'){
      root.innerHTML='<div class="calendar-heading"><button type="button" data-month="-1" aria-label="Previous month">‹</button><strong class="calendar-month"></strong><button type="button" data-month="1" aria-label="Next month">›</button></div><div class="calendar-grid"></div><small class="calendar-day-label"></small><div class="calendar-events"></div><form class="calendar-form"><input aria-label="Event title" maxlength="100" placeholder="Add an event" required><input aria-label="Event time" type="time" value="10:00" required><button type="submit">Add</button></form>';calendar(root);
    }else{
      root.innerHTML='<form class="demo-browser-bar"><button type="button" data-web-back aria-label="Browser back">‹</button><button type="button" data-web-forward aria-label="Browser forward">›</button><input class="demo-address" aria-label="Demo browser address or search" maxlength="500"><button type="submit" aria-label="Go to address">↵</button></form><div class="demo-web-page"></div>';browse(root,'demo://news');
    }
    return root;
  }
  function raise(win){if(window.PhoneBridgerDesktop)window.PhoneBridgerDesktop.raise(win);else win.style.zIndex=++zIndex;}
  function openWindow(name){
    if(windows.has(name)){const win=windows.get(name);win.hidden=false;raise(win);return;}
    const win=create('section','mini-window');win.dataset.window=name;win.setAttribute('aria-label',`${appInfo[name][1]} window`);
    win.style.left=name==='calculator'?'45px':'266px';win.style.top=name==='calculator'?'81px':'91px';
    if(name==='calculator'){win.style.width='165px';win.style.height='183px';}else{win.style.width='213px';win.style.height='157px';}
    const head=create('div','window-heading');head.append(create('span','window-icon',appInfo[name][0]),create('strong','',appInfo[name][1]));
    const minimize=button('−',`Minimize ${appInfo[name][1]} window`);minimize.dataset.minimize=name;const close=button('×',`Close ${appInfo[name][1]} window`);close.dataset.close=name;head.append(minimize,close);
    win.append(head,makeApp(name));const resize=create('div','window-resize');resize.setAttribute('aria-hidden','true');win.append(resize);pc.append(win);windows.set(name,win);raise(win);
    win.addEventListener('click',handleUtilityClick);win.addEventListener('pointerdown',()=>raise(win));
    for(const handle of [head,resize])handle.addEventListener('pointerdown',e=>{
      if(demo.isDriving()||e.target.closest('button')||e.button!==0)return;
      e.preventDefault();const scale=pc.getBoundingClientRect().width/pc.clientWidth;begin(win,handle===resize,'native',{x:e.clientX/scale,y:e.clientY/scale});handle.setPointerCapture(e.pointerId);
    });
  }
  function openPhone(name,key){
    if(['sheets','gmail','tasks','calendar'].includes(name)){demo.openGoogle(name,key);return;}
    demo.openPhonePanel(key,appInfo[name][1],makeApp(name));hero.querySelectorAll('.phone-launcher').forEach(el=>el.hidden=true);
  }
  const phoneAppInfo=Object.fromEntries(Object.entries(appInfo).filter(([name])=>name!=='notes'));
  const bar=create('div','desktop-taskbar');bar.append(create('span','taskbar-start','⊞'));
  for(const [name,[icon,title]] of Object.entries(appInfo)){const b=button(icon,`Open ${title} on PC`);b.dataset.openDesktop=name;b.title=title;bar.append(b);}
  bar.append(create('span','taskbar-tip','Open apps'),create('span','taskbar-clock','10:15'));pc.insertBefore(bar,pc.querySelector('.portal'));
  for(const key of ['left','right','top']){
    const screen=hero.querySelector(`[data-screen=${key}]`), menu=create('div','phone-launcher');menu.hidden=true;menu.append(create('strong','','Your apps'));
    const grid=create('div','phone-app-grid');for(const [name,[icon,title]] of Object.entries({...phoneAppInfo,sheets:['▦','Sheets'],gmail:['M','Gmail']})){const b=button('',`Open ${title} on ${key} phone`);b.dataset.openPhone=name;b.dataset.phone=key;b.append(create('span',`app-tile tile-${name}`,icon),create('small','',title));grid.append(b);}menu.append(grid);screen.append(menu);
    const home=screen.querySelector('.gesture-bar');if(home){const b=button('',`Open apps on ${key} phone`);b.className='gesture-bar';b.dataset.apps=key;home.replaceWith(b);}else{const b=button('▦',`Open apps on ${key} phone`);b.className='video-apps-button';b.dataset.apps=key;screen.append(b);}
    const status=screen.querySelector('.phone-status');if(status){const b=button('▦',`Open apps on ${key} phone`);b.dataset.apps=key;status.append(b);}
  }
  const mobile=create('div','mobile-utilities');for(const [name,[icon,title]] of Object.entries(phoneAppInfo)){const b=button(`${icon} ${title}`);b.dataset.mobileUtility=name;mobile.append(b);}hero.querySelector('.demo-mobile').append(mobile);
  function begin(win,resizing,type,p){operation={win,resizing,type,start:p,left:win.offsetLeft,top:win.offsetTop,width:win.offsetWidth,height:win.offsetHeight};raise(win);}
  function operate(p){
    if(!operation)return false;const op=operation,dx=p.x-op.start.x,dy=p.y-op.start.y;
    if(op.resizing){op.win.style.width=`${Math.max(150,Math.min(pc.clientWidth-op.left,op.width+dx))}px`;op.win.style.height=`${Math.max(110,Math.min(pc.clientHeight-op.top,op.height+dy))}px`;}
    else{op.win.style.left=`${Math.max(0,Math.min(pc.clientWidth-op.width,op.left+dx))}px`;op.win.style.top=`${Math.max(54,Math.min(pc.clientHeight-op.height-20,op.top+dy))}px`;}
    return true;
  }
  document.addEventListener('pointermove',e=>{if(operation?.type==='native'){const scale=pc.getBoundingClientRect().width/pc.clientWidth;operate({x:e.clientX/scale,y:e.clientY/scale});}});
  document.addEventListener('pointerup',()=>operation=null);document.addEventListener('pointercancel',()=>operation=null);
  function calculate(source){
    const tokens=source.match(/\d*\.?\d+|[()+\-*/]/g)||[];let at=0;
    function number(){const t=tokens[at++];if(t==='-')return-number();if(t==='+')return number();if(t==='('){const n=expression();if(tokens[at++]!==')')throw Error();return n;}if(!t||!/^\d*\.?\d+$/.test(t))throw Error();return Number(t);}
    function term(){let n=number();while(tokens[at]==='*'||tokens[at]==='/'){const op=tokens[at++],v=number();n=op==='*'?n*v:n/v;}return n;}
    function expression(){let n=term();while(tokens[at]==='+'||tokens[at]==='-'){const op=tokens[at++],v=term();n=op==='+'?n+v:n-v;}return n;}
    const value=expression();if(at!==tokens.length||!Number.isFinite(value))throw Error();return String(Number(value.toPrecision(12)));
  }
  function handleUtilityClick(e){
    if(e.utilityHandled)return;e.utilityHandled=true;
    const b=e.target.closest('button');if(!b)return;const root=b.closest('[data-utility]');
    if(b.dataset.openDesktop)openWindow(b.dataset.openDesktop);
    if(b.dataset.openPhone)openPhone(b.dataset.openPhone,b.dataset.phone);
    if(b.dataset.mobileUtility)openPhone(b.dataset.mobileUtility,demo.getMobilePhone());
    if(b.dataset.apps){const screen=hero.querySelector(`[data-screen=${b.dataset.apps}]`),menu=screen.querySelector('.phone-launcher');menu.hidden=!menu.hidden;}
    if(b.dataset.minimize)windows.get(b.dataset.minimize).hidden=true;
    if(b.dataset.close){windows.get(b.dataset.close).remove();windows.delete(b.dataset.close);}
    if(b.dataset.calc){
      const state=calculators.get(root),key=b.dataset.calc;if(key==='C'){state.expression='';state.finished=false;}else if(key==='⌫'){state.expression=state.expression.slice(0,-1);state.finished=false;}else if(key==='='){try{state.expression=calculate(state.expression);state.finished=true;}catch(_){state.expression='';root.querySelector('output').textContent='Try again';return;}}
      else{const normalized=key.replace('÷','/').replace('×','*').replace('−','-');if(state.finished&&/[\d.(]/.test(normalized))state.expression='';state.finished=false;if(state.expression.length<40)state.expression+=normalized;}
      root.querySelector('output').textContent=state.expression.replaceAll('*','×').replaceAll('/','÷')||'0';
    }
    if(b.dataset.deleteTask){tasks=tasks.filter(t=>String(t.id)!==b.dataset.deleteTask);hero.querySelectorAll('[data-utility=tasks]').forEach(taskList);}
    if(b.dataset.month){month=new Date(month.getFullYear(),month.getMonth()+Number(b.dataset.month),1);selectedDay=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-01`;hero.querySelectorAll('[data-utility=calendar]').forEach(calendar);}
    if(b.dataset.day){selectedDay=b.dataset.day;hero.querySelectorAll('[data-utility=calendar]').forEach(calendar);}
    if(b.dataset.deleteEvent){events=events.filter(ev=>String(ev.id)!==b.dataset.deleteEvent);hero.querySelectorAll('[data-utility=calendar]').forEach(calendar);}
    if(b.dataset.webRoute)browse(root,b.dataset.webRoute);
    if(b.hasAttribute('data-web-back')||b.hasAttribute('data-web-forward')){const state=browsers.get(root);state.index+=b.hasAttribute('data-web-back')?-1:1;browse(root,state.history[state.index],false);}
  }
  bar.addEventListener('click',handleUtilityClick);hero.addEventListener('click',handleUtilityClick);
  hero.addEventListener('input',e=>{if(e.target.matches('.notes-input')){note=e.target.value;hero.querySelectorAll('.notes-input').forEach(el=>{if(el!==e.target)el.value=note;});hero.querySelectorAll('.notes-count').forEach(el=>el.textContent=`${note.length} characters`);}});
  hero.addEventListener('keydown',e=>{
    const root=e.target.closest('[data-utility=calculator]');if(!root)return;
    const key=({'Enter':'=','Escape':'C','Backspace':'⌫','*':'×','/':'÷','-':'−'})[e.key]||e.key;
    if(!/^[0-9.()+÷×−=C]$/.test(key)&&key!=='⌫')return;
    const b=[...root.querySelectorAll('[data-calc]')].find(el=>el.dataset.calc===key);if(b){e.preventDefault();b.click();}
  });
  hero.addEventListener('change',e=>{if(e.target.dataset.task){const task=tasks.find(t=>String(t.id)===e.target.dataset.task);if(task)task.done=e.target.checked;hero.querySelectorAll('[data-utility=tasks]').forEach(taskList);}});
  hero.addEventListener('submit',e=>{
    const form=e.target;if(!form.matches('.todo-form,.calendar-form,.demo-browser-bar'))return;e.preventDefault();const root=form.closest('[data-utility]');
    if(form.matches('.todo-form')){const input=form.querySelector('input');if(input.value.trim()&&tasks.length<40){tasks.push({id:nextId++,text:input.value.trim(),done:false});input.value='';hero.querySelectorAll('[data-utility=tasks]').forEach(taskList);}}
    if(form.matches('.calendar-form')){const text=form.querySelector('[aria-label="Event title"]'),time=form.querySelector('[type=time]');if(text.value.trim()){events.push({id:nextId++,day:selectedDay,text:text.value.trim(),time:time.value});text.value='';hero.querySelectorAll('[data-utility=calendar]').forEach(calendar);}}
    if(form.matches('.demo-browser-bar'))browse(root,form.querySelector('input').value);
  });
  window.PhoneBridgerUtilities={
    makeApp,open:openWindow,
    virtualDown(target,p){const win=target.closest('.mini-window');if(!win||target.closest('button'))return false;const handle=target.closest('.window-heading,.window-resize');if(!handle)return false;begin(win,handle.classList.contains('window-resize'),'virtual',{...p});return true;},
    virtualMove(p){return operation?.type==='virtual'?operate(p):false;}, virtualUp(){operation=null;},
    reset(){operation=null;windows.forEach(win=>win.remove());windows.clear();note=initialNote;tasks=[{id:1,text:'Send the weekly recap',done:true},{id:2,text:'Review the new website',done:false},{id:3,text:'Plan the next release',done:false}];events=[{id:1,day:'2026-10-06',text:'Weekly planning',time:'10:00'}];month=new Date(2026,9,1);selectedDay='2026-10-04';hero.querySelectorAll('.notes-input').forEach(el=>el.value=note);hero.querySelectorAll('[data-utility=tasks]').forEach(taskList);hero.querySelectorAll('[data-utility=calendar]').forEach(calendar);hero.querySelectorAll('.phone-launcher').forEach(el=>el.hidden=true);},
  };
})();
