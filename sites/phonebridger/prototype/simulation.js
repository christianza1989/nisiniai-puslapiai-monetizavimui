/* Standalone browser demo: local sample data, no native control or app pairing. */
(() => {
  function transitionPointer(point, active, dx, dy, regions) {
    const pc = regions.pc, left = regions.left, right = regions.right, top = regions.top;
    let next = { x: point.x + dx, y: point.y + dy };
    const inside = (value, start, end) => value >= start && value <= end;
    if (active === 'pc') {
      if (next.x < pc.left && inside(next.y, left.top, left.bottom)) {
        next.x = left.right + next.x - pc.left; active = 'left';
      } else if (next.x > pc.right && inside(next.y, right.top, right.bottom)) {
        next.x = right.left + next.x - pc.right; active = 'right';
      } else if (next.y < pc.top && inside(next.x, top.left, top.right)) {
        next.y = top.bottom + next.y - pc.top; active = 'top';
      }
    } else if (active === 'left' && next.x > left.right) {
      next.x = pc.left + next.x - left.right; active = 'pc';
    } else if (active === 'right' && next.x < right.left) {
      next.x = pc.right + next.x - right.left; active = 'pc';
    } else if (active === 'top' && next.y > top.bottom) {
      next.y = pc.top + next.y - top.bottom; active = 'pc';
    }
    const r = regions[active];
    next.x = Math.max(r.left, Math.min(r.right, next.x));
    next.y = Math.max(r.top, Math.min(r.bottom, next.y));
    return { point: next, active };
  }
  // The displays share a virtual edge even though their bezels are separated.
  // Paint the overhanging cursor fragment in the adjacent display as well.
  function cursorFragments(point, active, regions) {
    const pc = regions.pc, here = regions[active], fragments = {};
    const inside = (value, start, end) => value >= start && value <= end;
    if (!inside(point.x, here.left, here.right) || !inside(point.y, here.top, here.bottom)) return fragments;
    const sideOpen = phone => inside(point.y, Math.max(pc.top, phone.top), Math.min(pc.bottom, phone.bottom));
    const topOpen = () => inside(point.x, Math.max(pc.left, regions.top.left), Math.min(pc.right, regions.top.right));
    if (active === 'pc') {
      if (sideOpen(regions.left)) fragments.left = {x:regions.left.right + point.x - pc.left,y:point.y};
      if (sideOpen(regions.right)) fragments.right = {x:regions.right.left + point.x - pc.right,y:point.y};
      if (topOpen()) fragments.top = {x:point.x,y:regions.top.bottom + point.y - pc.top};
    } else if (active === 'left' && sideOpen(here)) fragments.pc = {x:pc.left + point.x - here.right,y:point.y};
    else if (active === 'right' && sideOpen(here)) fragments.pc = {x:pc.right + point.x - here.left,y:point.y};
    else if (active === 'top' && topOpen()) fragments.pc = {x:point.x,y:pc.top + point.y - here.bottom};
    return fragments;
  }
  if (typeof document === 'undefined') { module.exports = { transitionPointer, cursorFragments }; return; }
  const hero = document.querySelector('.interactive-hero');
  const workspace = document.querySelector('.workspace');
  const scene = document.querySelector('.demo-scene');
  if (!scene) return;
  const cursor = scene.querySelector('.demo-cursor');
  const ghost = scene.querySelector('.drag-ghost');
  const hint = workspace.querySelector('[data-hint]');
  const toast = workspace.querySelector('.demo-toast');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const screens = Object.fromEntries([...scene.querySelectorAll('[data-screen]')].map(el => [el.dataset.screen, el]));
  const apps = Object.fromEntries(['left', 'right', 'top'].map(key => [key, screens[key].querySelector('[data-phone-app]')]));
  const shared = Object.fromEntries(['left', 'right', 'top'].map(key => [key, screens[key].querySelector('.shared-app')]));
  const homes = new Map([...Object.values(apps), ...Object.values(shared)].map(app => [app, app.parentElement]));
  const cursorCopies = Object.fromEntries(Object.entries(screens).map(([key, screen]) => {
    const copy = cursor.cloneNode(true);
    copy.dataset.cursorCopy = key; copy.hidden = true; copy.classList.remove('idle');
    screen.append(copy); return [key, copy];
  }));
  for (const [key, app] of Object.entries(apps)) app.dataset.origin = key;
  for (const [key, app] of Object.entries(shared)) app.dataset.origin = key;
  const originalMail = apps.right.querySelector('textarea').value;
  const initialMessages = apps.left.querySelector('.chat-messages').innerHTML;
  let scale = 1, active = 'pc', point = { x: 617, y: 339 };
  let driving = false, suspended = false, previous = null, drag = null, tourId = 0;
  let captured = false, capturePending = false, captureEntry = null;
  let firstLockedMove = false;
  let lastRegion = null;
  let selectedTab = 'market', usb = false, selectedMobile = 'left';
  let mounted = null, placeholder = null, toastTimer;
  let chatTimers = [], mailTimers = [];
  const sheetValues = new Map();
  scene.querySelectorAll('.sheet-page tbody tr:not(:first-child) td').forEach((cell, index) => {
    cell.dataset.cell = index; cell.contentEditable = 'plaintext-only'; cell.setAttribute('role', 'textbox');
    cell.setAttribute('aria-label', `Desktop sheet cell ${index + 1}`); sheetValues.set(String(index), cell.textContent);
  });
  const initialSheetValues = new Map(sheetValues);
  const addresses = { market: 'creators.phonebridger.demo', sheets: 'docs.google.com/spreadsheets/d/weekly-recap/edit', gmail: 'mail.google.com/mail/u/0/#inbox', drive: 'drive.google.com/drive/u/0/home', calendar: 'calendar.google.com/calendar/u/0/r/month', tasks: 'tasks.google.com', google: 'google.com' };
  const tabNames = {market:'Creators',sheets:'Google Sheets',gmail:'Gmail',drive:'Google Drive',calendar:'Google Calendar',google:'Google'};
  let cellHistory = [], cellFuture = [];

  function resize() {
    scale = scene.parentElement.clientWidth / 1200;
    scene.style.transform = `scale(${scale})`;
    scene.parentElement.style.height = `${scene.offsetHeight * scale}px`;
    updatePortals();
    Object.values(screens).forEach(el => el.inert = mobile.matches && !captured);
    if (driving && lastRegion) {
      const next = bounds(active), old = lastRegion;
      setPoint({ x: next.left + Math.max(0,Math.min(1,(point.x-old.left)/old.width))*next.width,
        y: next.top + Math.max(0,Math.min(1,(point.y-old.top)/old.height))*next.height });
    }
    if (mobile.matches && !driving) hint.textContent = 'Choose a phone below. Tap, type, or open a Google tab.';
    mountMobile();
  }
  const sceneObserver = new ResizeObserver(resize);
  sceneObserver.observe(scene.parentElement); sceneObserver.observe(scene);
  function bounds(key) {
    const r = screens[key].getBoundingClientRect(), s = scene.getBoundingClientRect();
    return { left: (r.left - s.left) / scale, top: (r.top - s.top) / scale,
      right: (r.right - s.left) / scale, bottom: (r.bottom - s.top) / scale,
      width: r.width / scale, height: r.height / scale };
  }
  function updatePortals() {
    const pc = bounds('pc');
    for (const key of ['left', 'right']) {
      const phone = bounds(key), start = Math.max(pc.top, phone.top), end = Math.min(pc.bottom, phone.bottom);
      scene.style.setProperty(`--${key}-entry-top`, `${(start - pc.top) / pc.height * 100}%`);
      scene.style.setProperty(`--${key}-entry-height`, `${Math.max(0, end - start) / pc.height * 100}%`);
    }
    const top = bounds('top'), start = Math.max(pc.left, top.left), end = Math.min(pc.right, top.right);
    scene.style.setProperty('--top-entry-left', `${(start - pc.left) / pc.width * 100}%`);
    scene.style.setProperty('--top-entry-width', `${Math.max(0, end - start) / pc.width * 100}%`);
  }
  const center = r => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });
  function paintCursor(node, p, key, region) {
    const screen = screens[key];
    if (node.parentElement !== screen) screen.append(node);
    node.style.left = `${p.x - region.left - screen.clientLeft}px`;
    node.style.top = `${p.y - region.top - screen.clientTop}px`;
  }
  function setPoint(p, key = active) {
    point = p; active = key;
    const regions = Object.fromEntries(Object.keys(screens).map(name => [name, bounds(name)]));
    lastRegion = regions[key];
    paintCursor(cursor, p, key, lastRegion);
    const label = 'Demo';
    cursor.querySelector('[data-cursor-label]').textContent = label;
    const fragments = cursorFragments(p, key, regions);
    for (const [name, copy] of Object.entries(cursorCopies)) {
      copy.hidden = !fragments[name];
      if (copy.hidden) continue;
      copy.querySelector('[data-cursor-label]').textContent = label;
      paintCursor(copy, fragments[name], name, regions[name]);
    }
    scene.querySelectorAll('[data-device]').forEach(el => el.dataset.active = String(el.dataset.device === key));
    if (drag?.moving) {
      ghost.hidden = false; ghost.style.left = `${p.x + 19}px`; ghost.style.top = `${p.y + 14}px`;
      scene.querySelectorAll('.device').forEach(el => el.classList.toggle('drop-target', el.dataset.device === key && key !== 'pc'));
    }
  }
  function move(dx, dy) {
    let next = { x: point.x + dx, y: point.y + dy };
    const sceneRect = scene.getBoundingClientRect();
    if (window.PhoneBridgerDesktop?.virtualMove({x:sceneRect.left+next.x*scale,y:sceneRect.top+next.y*scale})) {
      const screen = bounds(active);
      setPoint({x:Math.max(screen.left,Math.min(screen.right,next.x)),y:Math.max(screen.top,Math.min(screen.bottom,next.y))}, active);
      return;
    }
    if (window.PhoneBridgerVideo?.virtualMove({x:sceneRect.left+next.x*scale,y:sceneRect.top+next.y*scale})) {
      const phone = bounds(active);
      setPoint({x:Math.max(phone.left,Math.min(phone.right,next.x)),y:Math.max(phone.top,Math.min(phone.bottom,next.y))}, active);
      return;
    }
    const pc = bounds('pc');
    if (window.PhoneBridgerUtilities?.virtualMove(next)) {
      setPoint({x:Math.max(pc.left+2,Math.min(pc.right-3,next.x)),y:Math.max(pc.top+2,Math.min(pc.bottom-3,next.y))},'pc'); return;
    }
    const result = transitionPointer(point, active, dx, dy,
      { pc, left:bounds('left'), right:bounds('right'), top:bounds('top') });
    next = result.point;
    if (drag && Math.hypot(next.x - drag.start.x, next.y - drag.start.y) > 7) drag.moving = true;
    setPoint(next, result.active);
  }
  function startDriving(capture = false) {
    if (!capture || mobile.matches || suspended) return;
    captured = capture; firstLockedMove = capture; cancelTour(); clearDrag(); driving = true; previous = null;
    document.documentElement.classList.toggle('demo-pointer-locked', captured);
    scene.classList.remove('is-free'); scene.classList.add('is-controlling'); hero.classList.add('is-driving');
    cursor.classList.remove('idle');
    const entry = captureEntry; captureEntry = null;
    const region = bounds(entry?.key || 'pc');
    setPoint(entry ? {x:region.left + entry.x * region.width,y:region.top + entry.y * region.height} : center(region), entry?.key || 'pc');
    hint.textContent = 'Scroll to move the page. Click the video to play or pause. Press Esc to leave.';
    workspace.querySelector('[data-action="mouse"]').textContent = 'Mouse control active · Esc to leave';
  }
  function stopDriving(suspend = true, force = false) {
    if ((captured || capturePending) && !force) return;
    captured = false; capturePending = false; captureEntry = null;
    document.documentElement.classList.remove('demo-pointer-locked');
    driving = false; suspended = suspend; previous = null; clearDrag();
    scene.classList.remove('is-controlling'); hero.classList.remove('is-driving'); scene.classList.add('is-free');
    workspace.querySelector('[data-action="mouse"]').innerHTML = 'Try mouse control <span aria-hidden="true">↗</span>';
    if (document.pointerLockElement === scene) document.exitPointerLock();
    hint.textContent = mobile.matches ? 'Choose a phone below. Tap, type, or open a Google tab.' : 'Click any screen or Try mouse control to begin. Press Esc to leave.';
  }
  function captureFailed() {
    if (!capturePending) return;
    stopDriving(true, true);
    notify('Mouse capture is unavailable here. Open the demo in Chrome or Edge and try again.');
  }
  function requestMouseControl(entry = null) {
    if (mobile.matches || captured || capturePending) return;
    if (!scene.requestPointerLock) { capturePending = true; captureFailed(); return; }
    suspended = false; cancelTour(); clearDrag(); capturePending = true; captureEntry = entry;
    if (!entry) {
      scene.scrollIntoView({ block: 'center', behavior: 'instant' });
      scene.focus({ preventScroll: true });
    }
    workspace.querySelector('[data-action="mouse"]').textContent = 'Starting mouse control…';
    try { scene.requestPointerLock()?.catch(captureFailed); } catch (_) { captureFailed(); }
  }
  // Bubble after the screen's native action, so the initial Play click is used
  // once and input focus stays where the visitor clicked.
  for (const [key, screen] of Object.entries(screens)) screen.addEventListener('click', e => {
    if (!e.isTrusted || mobile.matches || captured || capturePending) return;
    const r = screen.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const fraction = (value, start, size) => Math.max(0, Math.min(1, (value - start) / size));
    requestMouseControl({key,x:e.detail === 0 ? 0.5 : fraction(e.clientX,r.left,r.width),y:e.detail === 0 ? 0.5 : fraction(e.clientY,r.top,r.height)});
  });
  function elementAtPoint() {
    const r = scene.getBoundingClientRect();
    return document.elementFromPoint(r.left + point.x * scale, r.top + point.y * scale);
  }
  function nativeVideoAt(x, y) {
    const video = apps.top;
    if (video.hidden || !video.querySelector('video')) return false;
    const r = video.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  hero.addEventListener('pointerleave', () => { if (!captured && !capturePending) stopDriving(false); });
  document.addEventListener('pointermove', e => {
    if (!driving) return;
    if (document.pointerLockElement === scene) return;
    if (!captured && nativeVideoAt(e.clientX, e.clientY)) { stopDriving(true); return; }
    if (!hero.contains(e.target) && !document.pointerLockElement) { stopDriving(false); return; }
    const dx = previous ? e.clientX - previous.x : 0;
    const dy = previous ? e.clientY - previous.y : 0;
    previous = { x: e.clientX, y: e.clientY };
    move(dx / scale, dy / scale);
  });
  // Locked browsers deliver relative mouse events, even beyond the viewport.
  document.addEventListener('mousemove', e => {
    if (!driving || document.pointerLockElement !== scene) return;
    if (firstLockedMove) { firstLockedMove = false; return; }
    move(e.movementX / scale, e.movementY / scale);
  });
  function drivingDown(e) {
    if (!driving || e.button !== 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const target = elementAtPoint();
    if (!target || !scene.contains(target)) return;
    const sceneRect = scene.getBoundingClientRect();
    if (window.PhoneBridgerDesktop?.virtualDown(target,{x:sceneRect.left+point.x*scale,y:sceneRect.top+point.y*scale})) return;
    if (window.PhoneBridgerVideo?.virtualDown(target,{x:sceneRect.left+point.x*scale,y:sceneRect.top+point.y*scale})) return;
    if (window.PhoneBridgerUtilities?.virtualDown(target, point)) return;
    const closeTab=target.closest('[data-close-tab]');
    if(closeTab){closeTab.click();return;}
    const tab = target.closest('[data-link]');
    if (tab) { selectTab(tab.dataset.link); drag = { link: tab.dataset.link, start: { ...point }, moving: false }; updateGhost(tab.dataset.link); return; }
    if (target.matches('input,textarea,[contenteditable]')) {
      target.focus();
      if (target.type === 'checkbox' || target.type === 'radio') target.click();
      else if (target.type === 'range') { const b = target.getBoundingClientRect(), s = scene.getBoundingClientRect(); target.value = Number(target.min) + Math.round(Math.max(0, Math.min(1, (s.left + point.x * scale - b.left) / b.width)) * (Number(target.max) - Number(target.min))); target.dispatchEvent(new Event('input', { bubbles: true })); }
      else if (target.tagName === 'TEXTAREA' || ['text','search','url','tel','password'].includes(target.type)) target.setSelectionRange(target.value.length, target.value.length);
    } else (target.closest('button') || target.closest('label'))?.click();
  }
  scene.addEventListener('pointerdown', e => { if (!captured) drivingDown(e); }, true);
  document.addEventListener('mousedown', e => { if (captured) drivingDown(e); }, true);
  // Virtual clicks have already been handled above. Avoid clicking whatever is
  // under the hidden OS pointer, which may be a different device.
  scene.addEventListener('click', e => {
    if ((driving || capturePending) && e.isTrusted) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  function drivingUp() {
    const r = scene.getBoundingClientRect();
    if (driving) window.PhoneBridgerDesktop?.virtualUp({x:r.left+point.x*scale,y:r.top+point.y*scale});
    window.PhoneBridgerVideo?.virtualUp();
    window.PhoneBridgerUtilities?.virtualUp();
    if (!driving || !drag) return;
    if (drag.moving && active !== 'pc') openLink(drag.link, active);
    clearDrag();
  }
  document.addEventListener('pointerup', () => { if (!captured) drivingUp(); });
  document.addEventListener('mouseup', () => { if (captured) drivingUp(); });
  document.addEventListener('wheel', e => {
    if (captured || capturePending) {
      if (e.ctrlKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      window.scrollBy({ top: e.deltaY * unit, left: e.deltaX * unit, behavior: 'instant' });
      return;
    }
    cancelTour(); stopDriving();
  }, { passive: false });
  document.addEventListener('contextmenu', e => { if (captured) e.preventDefault(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cancelTour(); stopDriving(true, true); scene.querySelector('.tab-destinations').hidden = true; return; }
    if (e.key === 'Tab' && captured) {
      e.preventDefault();
      const focusRoot = active === 'pc' ? window.PhoneBridgerDesktop?.focusRoot() || screens[active] : screens[active];
      const choices = [...focusRoot.querySelectorAll('button,input,textarea,[contenteditable],a[href]')].filter(el => !el.disabled && el.getClientRects().length && !el.closest('[hidden]'));
      if (choices.length) {
        const at = choices.indexOf(document.activeElement), next = choices[(at + (e.shiftKey ? -1 : 1) + choices.length) % choices.length];
        next.focus({ preventScroll: true });
        const b = next.getBoundingClientRect(), r = scene.getBoundingClientRect();
        setPoint({ x: (b.left + b.width / 2 - r.left) / scale, y: (b.top + b.height / 2 - r.top) / scale });
      }
    } else if (e.key === 'Tab') stopDriving();
    if (captured && !e.target.matches('input,textarea,[contenteditable]') && ['PageUp','PageDown','Home','End','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === scene) {
      if (capturePending) { capturePending = false; suspended = false; startDriving(true); }
      else if (!captured) document.exitPointerLock();
    } else if (captured) stopDriving(true, true);
  });
  document.addEventListener('pointerlockerror', captureFailed);

  function notify(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.hidden = true, 3000); }
  function selectTab(link) {
    if (!addresses[link]) return;
    selectedTab = link;
    scene.querySelectorAll('[data-link]').forEach(el => { const on = el.dataset.link === link; el.classList.toggle('active', on); el.setAttribute('aria-pressed', String(on)); if(on) el.hidden=false; });
    scene.querySelectorAll('[data-pc-page]').forEach(el => el.hidden = el.dataset.pcPage !== link);
    scene.querySelector('[data-address]').value = addresses[link];
    scene.dispatchEvent(new CustomEvent('demo-tab-change',{detail:link}));
  }
  function updateGhost(link) {
    ghost.querySelector('[data-drag-name]').textContent = tabNames[link];
    ghost.querySelector('span').className = link === 'gmail' ? 'gmail-symbol' : 'sheets-symbol';
    ghost.querySelector('span').textContent = link === 'gmail' ? 'M' : '▦';
  }
  function clearDrag() { drag = null; ghost.hidden = true; scene.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target')); window.PhoneBridgerUtilities?.virtualUp(); window.PhoneBridgerVideo?.virtualUp(); window.PhoneBridgerDesktop?.virtualUp(); }
  window.PhoneBridgerDemo = {
    notify,
    selectTab,
    getTab: () => selectedTab,
    tabNames,
    registerTabs(entries) { for (const [key,value] of Object.entries(entries)) { tabNames[key]=value.title; if(!addresses[key]) addresses[key]=value.address; } },
    openPhonePanel(key, titleText, body) {
      unmountMobile(); const panel = shared[key]; panel.replaceChildren(); panel.dataset.openApp=body.dataset.utility||'google';
      const header = document.createElement('div'); header.className = 'shared-header';
      const back = document.createElement('button'); back.type = 'button'; back.dataset.back = key; back.textContent = '‹'; back.setAttribute('aria-label','Return to original phone app');
      const title = document.createElement('strong'); title.textContent = titleText; header.append(back,title); panel.append(header,body);
      apps[key].hidden = true; panel.hidden = false; if(key==='top') window.PhoneBridgerVideo?.pause(); mountMobile();
    },
    openGoogle: openLink,
    getMobilePhone: () => selectedMobile,
    isDriving: () => driving,
    pauseMouseControl: () => stopDriving(true, true),
    resumeMouseControl: () => requestMouseControl(),
  };
  function openLink(link, key) {
    if(window.PhoneBridgerSimulator) { window.PhoneBridgerSimulator.open(key,link); scene.querySelector('.tab-destinations').hidden=true;scene.querySelector('.send-tab').setAttribute('aria-expanded','false');return; }
    if (link === 'market') { notify('Try dragging the Google Sheets or Gmail tab.'); return; }
    if (!addresses[link]) return;
    if (link !== 'sheets' && link !== 'gmail') {
      window.PhoneBridgerChrome?.openPhone(link,key);
      scene.querySelector('.tab-destinations').hidden=true;
      scene.querySelector('.send-tab').setAttribute('aria-expanded','false');
      return;
    }
    unmountMobile();
    const panel = shared[key]; panel.replaceChildren();
    const header = document.createElement('div'); header.className = 'shared-header';
    const back = document.createElement('button'); back.type = 'button'; back.dataset.back = key; back.textContent = '‹'; back.setAttribute('aria-label', 'Return to original phone app');
    const title = document.createElement('strong'); title.textContent = link === 'sheets' ? 'Google Sheets' : 'Gmail';
    header.append(back, title); panel.append(header); panel.dataset.openApp=link;
    if (link === 'sheets') {
      const sheetTitle = scene.querySelector('.sheet-page .sheet-title').cloneNode(true);
      const table = scene.querySelector('.sheet-page .sheet-table').cloneNode(true);
      table.querySelectorAll('tbody tr:not(:first-child) td').forEach((cell, i) => { cell.contentEditable = 'plaintext-only'; cell.setAttribute('role', 'textbox'); cell.setAttribute('aria-label', `${key} phone sheet cell ${i + 1}`); cell.textContent = sheetValues.get(String(i)); });
      const note = document.createElement('div'); note.className = 'sheet-bottom'; note.innerHTML = '<span>+</span><strong>Sheet1 ▾</strong><small>✓</small>';
      panel.append(sheetTitle, table, note);
    } else {
      const mail = apps.right.cloneNode(true); mail.hidden=false; mail.querySelector('textarea').value = apps.right.querySelector('textarea').value;
      panel.append(mail);
    }
    apps[key].hidden = true; panel.hidden = false;
    scene.querySelector('.tab-destinations').hidden = true;
    scene.querySelector('.send-tab').setAttribute('aria-expanded', 'false');
    if (key === 'top') window.PhoneBridgerVideo?.pause();
    setPoint(center(bounds(key)), key); mountMobile();
    notify(`${link === 'sheets' ? 'Google Sheets' : 'Gmail'} opened in the ${key} phone app.`);
  }
  function restorePhone(key) { if(window.PhoneBridgerSimulator&&key!=='top'){window.PhoneBridgerSimulator.home(key);return;} unmountMobile(); shared[key].hidden = true; apps[key].hidden = false; mountMobile(); }
  function sendMessage(form) {
    const input = form.querySelector('input'), text = input.value.trim();
    if (!text) { input.focus(); return; }
    const bubble = document.createElement('div'); bubble.className = 'chat-bubble outgoing'; bubble.textContent = text;
    const time = document.createElement('small'); time.textContent = '10:16 ✓✓'; bubble.append(time);
    const messages = apps.left.querySelector('.chat-messages'); messages.append(bubble); input.value = ''; messages.scrollTop = messages.scrollHeight;
    notify('Message sent in the demo. Same keyboard, another screen.');
    const typing = document.createElement('div'); typing.className = 'typing-indicator'; typing.textContent = 'Alex is typing';
    const dots = document.createElement('span'); dots.textContent = '•••'; typing.append(dots);
    chatTimers.push(setTimeout(() => { messages.append(typing); messages.scrollTop = messages.scrollHeight; }, 750));
    chatTimers.push(setTimeout(() => {
      typing.remove(); const reply = document.createElement('div'); reply.className = 'chat-bubble incoming';
      reply.textContent = 'Perfect, thanks! Let’s go through it together.';
      const stamp = document.createElement('small'); stamp.textContent = '10:16'; reply.append(stamp); messages.append(reply); messages.scrollTop = messages.scrollHeight;
    }, 2200));
  }
  hero.addEventListener('submit', e => { if (e.target.matches('.chat-form')) { e.preventDefault(); sendMessage(e.target); } });

  hero.addEventListener('input', e => {
    if (e.target.dataset.cell !== undefined) {
      const key = e.target.dataset.cell, value = e.target.textContent.slice(0, 120);
      cellHistory.push({key,from:sheetValues.get(key),to:value}); cellHistory=cellHistory.slice(-100);cellFuture=[];sheetValues.set(key, value);
      hero.querySelectorAll('[data-cell]').forEach(cell => { if (cell !== e.target && cell.dataset.cell === key) cell.textContent = value; });
    }
    if (e.target.matches('.gmail-app textarea,.pc-mail textarea')) {
      hero.querySelectorAll('.gmail-app textarea,.pc-mail textarea').forEach(el => { if (el !== e.target) el.value = e.target.value; });
      hero.querySelector('[data-draft-status]').textContent = 'Draft saved';
    }
  });
  function cancelTour() { tourId++; hero.querySelector('[data-action="tour"]').innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-play"/></svg>Watch it work'; }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function animateTo(destination, key, token, duration = 900) {
    const start = { ...point }, begin = performance.now();
    await new Promise(resolve => {
      const tick = now => {
        if (tourId !== token) { resolve(); return; }
        const t = reduced.matches ? 1 : Math.min(1, (now - begin) / duration), eased = t * t * (3 - 2 * t);
        setPoint({ x: start.x + (destination.x - start.x) * eased, y: start.y + (destination.y - start.y) * eased }, key);
        if (t < 1) requestAnimationFrame(tick); else resolve();
      }; requestAnimationFrame(tick);
    });
  }
  async function tour() {
    if (captured || capturePending) return;
    stopDriving(); unmountMobile(); if(window.PhoneBridgerSimulator){window.PhoneBridgerDesktop?.open('chrome');window.PhoneBridgerSimulator.open('left','whatsapp',{thread:'alex'});}else ['left','right','top'].forEach(key => { shared[key].hidden = true; apps[key].hidden = false; }); mountMobile();
    scene.classList.remove('is-free'); cursor.classList.remove('idle');
    const token = ++tourId;
    hero.querySelector('[data-action="tour"]').textContent = 'Stop demo ■';
    setPoint(center(bounds('pc')), 'pc'); hint.textContent = 'One mouse moves from your PC to your phone.';
    await animateTo(center(bounds('left')), 'left', token); if (token !== tourId) return;
    await wait(650); if (token !== tourId) return;
    hint.textContent = 'Use your computer keyboard in your phone’s own apps.';
    if(window.PhoneBridgerSimulator)window.PhoneBridgerSimulator.tourMessage();else{apps.left.querySelector('input').value = 'The recap is ready!'; sendMessage(apps.left.querySelector('.chat-form'));}
    await wait(1000); if (token !== tourId) return;
    await animateTo(center(bounds('pc')), 'pc', token); if (token !== tourId) return;
    selectTab('sheets'); hint.textContent = 'Drag a Google tab to continue in its phone app.';
    drag = { link: 'sheets', start: { ...point }, moving: true }; updateGhost('sheets');
    await animateTo(center(bounds('right')), 'right', token); if (token !== tourId) return;
    openLink('sheets', 'right'); clearDrag(); await wait(1800); if (token !== tourId) return;
    hint.textContent = 'Three phones. One connected workspace.';
    await animateTo(center(bounds('top')), 'top', token); if (token !== tourId) return;
    hint.textContent = 'Try the video controls on the top phone.';
    await wait(1300); if (token !== tourId) return;
    await animateTo(center(bounds('pc')), 'pc', token); if (token !== tourId) return;
    selectTab('market'); cancelTour(); stopDriving(false); cursor.classList.add('idle');
    hint.textContent = mobile.matches ? 'Your turn. Choose a phone below to try it.' : 'Your turn. Click any screen or Try mouse control to begin. Press Esc to leave.';
  }
  function unmountMobile() {
    if (!mounted) return;
    homes.get(mounted).append(mounted); placeholder?.remove(); mounted = null; placeholder = null;
  }
  function mountMobile() {
    const target = workspace.querySelector('.mobile-screen');
    workspace.querySelector('.mobile-send-tab').hidden = selectedMobile === 'top';
    if (!mobile.matches || captured) { unmountMobile(); return; }
    const app = shared[selectedMobile].hidden ? apps[selectedMobile] : shared[selectedMobile];
    if (mounted === app) return;
    unmountMobile(); mounted = app; placeholder = app.cloneNode(true); placeholder.setAttribute('aria-hidden', 'true'); placeholder.inert = true; placeholder.dataset.snapshot = 'true';
    homes.get(app).append(placeholder); target.replaceChildren(app);
    workspace.querySelectorAll('[data-mobile]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mobile === selectedMobile)));
  }
  function reset() {
    if (captured || capturePending) return;
    window.PhoneBridgerUtilities?.reset();
    window.PhoneBridgerChrome?.reset(); cellHistory=[];cellFuture=[];
    cancelTour(); stopDriving(); unmountMobile(); chatTimers.forEach(clearTimeout); chatTimers = []; mailTimers.forEach(clearTimeout); mailTimers = [];
    for (const key of ['left','right','top']) { shared[key].replaceChildren(); shared[key].hidden = true; apps[key].hidden = false; }
    apps.left.querySelector('.chat-messages').innerHTML = initialMessages; apps.left.querySelector('input').value = '';
    hero.querySelectorAll('.gmail-app textarea,.pc-mail textarea').forEach(el => el.value = originalMail);
    hero.querySelector('[data-draft-status]').textContent = 'Draft saved';
    hero.querySelectorAll('[data-action="send-mail"]').forEach(el => { el.disabled = false; if (el.dataset.originalText) el.textContent = el.dataset.originalText; });
    for (const [key, value] of initialSheetValues) sheetValues.set(key, value);
    scene.querySelectorAll('[data-cell]').forEach(cell => {cell.textContent = sheetValues.get(cell.dataset.cell);cell.classList.remove('cell-bold','cell-italic');});
    usb = false; workspace.dataset.connection = 'wifi';
    const connectionButton = hero.querySelector('[data-action="connection"]'); connectionButton.setAttribute('aria-pressed','false'); hero.querySelector('[data-connection-label]').textContent = 'Wi-Fi';
    window.PhoneBridgerVideo?.reset();
    selectTab('market'); selectedMobile = 'left'; mountMobile(); toast.hidden = true;
    window.PhoneBridgerDesktop?.reset();
    window.PhoneBridgerSimulator?.reset();
    cursor.classList.add('idle'); setPoint({ x: 617, y: 339 }, 'pc');
    scene.querySelector('.tab-destinations').hidden = true; scene.querySelector('.send-tab').setAttribute('aria-expanded', 'false'); suspended = false;
    scene.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('selected',b.dataset.period==='month'));
    scene.querySelector('.market-chart').style.filter = ''; notify('Fresh workspace. Click any screen or Try mouse control to begin.');
  }
  function handleWorkspaceClick(e) {
    if(e.workspaceHandled)return;e.workspaceHandled=true;
    const el = e.target.closest('button'); if (!el) return;
    if (el.dataset.link && !e.target.closest('[data-close-tab]')) selectTab(el.dataset.link);
    if(el.dataset.sheetTool){
      const action=el.dataset.sheetTool;
      if(action==='undo'||action==='redo'){
        const item=(action==='undo'?cellHistory:cellFuture).pop();if(item){(action==='undo'?cellFuture:cellHistory).push(item);const value=action==='undo'?item.from:item.to;sheetValues.set(item.key,value);hero.querySelectorAll(`[data-cell="${item.key}"]`).forEach(cell=>cell.textContent=value);}
      }else{const cell=scene.querySelector('.sheet-table td[data-selected-cell]')||scene.querySelector('.sheet-table td[data-cell]');if(cell){const on=!cell.classList.contains(`cell-${action}`);hero.querySelectorAll(`[data-cell="${cell.dataset.cell}"]`).forEach(other=>other.classList.toggle(`cell-${action}`,on));}}
    }
    if (el.dataset.back) restorePhone(el.dataset.back);
    if (el.dataset.sendTo) openLink(selectedTab, el.dataset.sendTo);
    if (el.dataset.mobile) { selectedMobile = el.dataset.mobile; mountMobile(); }
    if (el.dataset.period) { scene.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('selected',b===el)); scene.querySelector('.market-chart').style.filter = el.dataset.period === 'week' ? 'hue-rotate(50deg)' : el.dataset.period === 'year' ? 'hue-rotate(-30deg)' : ''; }
    switch (el.dataset.action) {
      case 'connection': usb = !usb; workspace.dataset.connection = usb ? 'usb' : 'wifi'; el.setAttribute('aria-pressed',String(usb)); hero.querySelector('[data-connection-label]').textContent = usb ? 'USB' : 'Wi-Fi'; notify(usb ? 'USB connected. Same apps, same controls.' : 'USB unplugged. Your workspace continues over Wi-Fi.'); break;
      case 'reset': reset(); break;
      case 'tour': if (el.textContent.includes('Stop')) { cancelTour(); stopDriving(false); } else tour(); break;
      case 'mouse': requestMouseControl(); break;
      case 'send-tab': scene.querySelector('.tab-destinations').hidden = !scene.querySelector('.tab-destinations').hidden; el.setAttribute('aria-expanded', String(!scene.querySelector('.tab-destinations').hidden)); break;
      case 'send-mail': {
        const app = el.closest('.gmail-app,.pc-mail'); const draft = app?.querySelector('textarea');
        if (!draft?.value.trim()) { notify('Write a little something first.'); draft?.focus(); break; }
        hero.querySelector('[data-draft-status]').textContent = 'Sent in demo ✓';
        const previousText = el.textContent; el.dataset.originalText = previousText; el.textContent = '✓'; el.disabled = true;
        mailTimers.push(setTimeout(() => { el.textContent = previousText; el.disabled = false; }, 1800));
        notify('Email sent in the demo. Same keyboard, another app.'); break;
      }
      case 'mobile-tab': openLink('sheets', selectedMobile); break;
    }
  }
  [hero,...scene.querySelectorAll('.browser-tabs,.browser-address,.tab-destinations,.chrome-popover')].forEach(root=>root.addEventListener('click',handleWorkspaceClick));
  // Native drag alternative is used while mouse control is released.
  scene.querySelectorAll('[data-link]').forEach(tab => {
    tab.draggable = true;
    tab.addEventListener('dragstart', e => { stopDriving(); e.dataTransfer.setData('text/plain',tab.dataset.link); e.dataTransfer.effectAllowed = 'copy'; });
  });
  for (const key of ['left','right','top']) {
    screens[key].addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); screens[key].parentElement.classList.add('drop-target'); } });
    screens[key].addEventListener('dragleave', () => screens[key].parentElement.classList.remove('drop-target'));
    screens[key].addEventListener('drop', e => { e.preventDefault(); const link=e.dataTransfer.getData('text/plain'); if (addresses[link]) openLink(link,key); clearDrag(); });
  }
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) { cancelTour(); stopDriving(); window.PhoneBridgerVideo?.pause(); } }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelTour(); stopDriving(); window.PhoneBridgerVideo?.pause(); } });
  mobile.addEventListener('change', () => { window.PhoneBridgerVideo?.reset(); stopDriving(false); mountMobile(); });
  resize(); cursor.classList.add('idle');
})();
