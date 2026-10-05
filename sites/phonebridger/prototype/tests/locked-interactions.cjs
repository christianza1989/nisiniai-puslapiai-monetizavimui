const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual simulation and local media controller together.
// Media loading is mocked; real decoding and controls are reviewed in the browser.
async function workspace({lockDenied = false, mobileView = false, desktop = undefined} = {}) {
  const classes = () => {
    const values = new Set();
    return { add: (...items) => items.forEach(item => values.add(item)), remove: (...items) => items.forEach(item => values.delete(item)),
      contains: item => values.has(item), toggle(item, on = !values.has(item)) { on ? values.add(item) : values.delete(item); return on; } };
  };
  const element = (rect = {}) => ({
    dataset:{}, style:{setProperty() {}}, classList:classes(), hidden:false, disabled:false, attributes:{},
    listeners:{}, value:'', innerHTML:'', textContent:'', clientLeft:0, clientTop:0,
    addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); },
    querySelectorAll() { return []; }, querySelector() { return element(); },
    setAttribute(key,value) { this.attributes[key] = value; }, getBoundingClientRect() { return rect; },
    toggleAttribute(key,on) { if (on) this.attributes[key] = ''; else delete this.attributes[key]; },
    cloneNode() { return element(rect); },
    contains(target) { return target === this; }, closest() { return null; }, matches() { return false; },
    append(...children) { children.forEach(child => { child.parentElement = this; }); }, replaceChildren() {}, focus() {}, scrollIntoView() {}, setPointerCapture() {},
  });
  const rect = (left,top,right,bottom) => ({left,top,right,bottom,width:right-left,height:bottom-top});
  const scene = element(rect(0,0,1200,880));
  scene.parentElement = {clientWidth:1200,style:{}}; scene.offsetHeight = 880;
  const regions = {pc:rect(300,200,900,530),left:rect(130,190,270,500),right:rect(930,190,1070,500),top:rect(450,30,750,165)};
  const screens = Object.fromEntries(Object.entries(regions).map(([key,area]) => [key,element(area)]));
  for (const [key,screen] of Object.entries(screens)) { screen.dataset.screen = key; screen.closest = selector => selector === '[data-screen]' ? screen : null; }
  const apps = Object.fromEntries(['left','right','top'].map(key => [key,element(regions[key])]));
  const shared = Object.fromEntries(['left','right','top'].map(key => [key,element()]));
  for (const key of ['left','right','top']) {
    apps[key].parentElement = shared[key].parentElement = screens[key]; shared[key].hidden = true;
    screens[key].querySelector = selector => selector === '[data-phone-app]' ? apps[key] : shared[key];
  }
  const cursor = element(), ghost = element(), hint = element(), toast = element(), tour = element();
  const mouse = element(); mouse.dataset.action = 'mouse'; mouse.closest = () => mouse;
  const surface = element(regions.top), media = element(regions.top), seek = element(rect(465,140,735,162));
  seek.closest = selector => selector === '[data-video-seek]' ? seek : null;
  const volume = element(rect(706,45,728,150)), volumePanel = element(), volumeValue = element(), volumeControls = element();
  volumePanel.hidden = true;
  volume.closest = selector => selector === '[data-video-volume]' ? volume : selector === '[data-video-volume-controls]' ? volumeControls : null;
  const controls = Object.fromEntries(['previous','play','next','volume','mute'].map(action => {
    const button = element(); button.dataset.videoControl = action;
    button.closest = selector => selector === '[data-video-control]' ? button : selector === '[data-video-volume-controls]' && ['volume','mute'].includes(action) ? volumeControls : null;
    return [action,button];
  }));
  const title = element(), author = element(), elapsed = element(), total = element(), count = element(), status = element();
  const videoElements = {'.demo-video-player':surface,video:media,'[data-video-seek]':seek,'[data-video-title]':title,'[data-video-author]':author,
    '[data-video-volume]':volume,'[data-video-volume-panel]':volumePanel,'[data-video-volume-value]':volumeValue,
    '[data-video-time]':elapsed,'[data-video-duration]':total,'[data-video-count]':count,'[data-video-status]':status,
    '[data-play-icon]':element(),'[data-pause-icon]':element(),'.sound-waves':element(),'.sound-off':element()};
  apps.top.querySelector = selector => videoElements[selector];
  apps.top.querySelectorAll = selector => selector === '[data-video-control]' ? Object.values(controls) : [];
  const inVideo = target => target === apps.top || Object.values(videoElements).includes(target) || Object.values(controls).includes(target);
  apps.top.contains = inVideo;
  volumePanel.contains = target => target === volume || target === volumeValue || target === volumePanel || target === controls.mute;
  const textarea = element(), messages = element();
  apps.right.querySelector = () => textarea; apps.left.querySelector = selector => selector === '.chat-messages' ? messages : element();
  scene.contains = target => target === scene || inVideo(target);
  scene.querySelector = selector => selector === '.demo-cursor' ? cursor : selector === '.drag-ghost' ? ghost : element();
  scene.querySelectorAll = selector => selector === '[data-screen]' ? Object.values(screens) : [];
  const hero = element(), root = element(), page = element(), wrapper = element();
  wrapper.querySelector = selector => ({'[data-hint]':hint,'.demo-toast':toast})[selector] || mouse;
  hero.querySelector = selector => selector === '[data-action="tour"]' ? tour : element();
  page.documentElement = root; page.pointerLockElement = null;
  page.querySelector = selector => ({'.interactive-hero':hero,'.workspace':wrapper,'.demo-scene':scene,'[data-phone-app=video]':apps.top})[selector];
  let hit = media;
  page.elementFromPoint = (x,y) => x >= regions.top.left && x <= regions.top.right && y >= regions.top.top && y <= regions.top.bottom ? hit : scene;
  const emit = (target,type,event = {}) => (target.listeners[type] || []).forEach(callback => callback(event));
  let lockRequests = 0;
  scene.requestPointerLock = () => { lockRequests++; if (lockDenied) throw new Error('Capture unavailable'); page.pointerLockElement = scene; emit(page,'pointerlockchange'); };
  page.exitPointerLock = () => { page.pointerLockElement = null; emit(page,'pointerlockchange'); };
  const scrolls = [], mediaCalls = [], loads = [];
  Object.assign(media,{duration:NaN,currentTime:0,paused:true,ended:false,muted:false,buffered:{length:0}});
  media.load = () => { loads.push(media.src); media.duration = NaN; media.currentTime = 0; media.paused = true; media.ended = false; };
  media.play = () => { mediaCalls.push('play'); media.paused = false; media.ended = false; emit(media,'play'); return Promise.resolve(); };
  media.pause = () => { if (!media.paused) mediaCalls.push('pause'); media.paused = true; emit(media,'pause'); };
  const window = {innerHeight:900,scrollBy:amount => scrolls.push(amount),
    PhoneBridgerDesktop:desktop,
    PhoneBridgerUtilities:{virtualUp() {},virtualMove() { return false; },virtualDown() { return false; }} };
  const context = vm.createContext({document:page,window,matchMedia:query => ({matches:mobileView && query.includes('max-width'),addEventListener() {}}),
    ResizeObserver:class {observe() {}},IntersectionObserver:class {observe() {}},setTimeout:fn => fn,clearTimeout() {}});
  for (const file of ['simulation.js','assets/video/playlist.js','video.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  const ready = () => { media.duration = 30; emit(media,'loadedmetadata'); };
  const start = () => { emit(hero,'click',{target:mouse}); assert.equal(page.pointerLockElement,scene); };
  const videoPointer = () => { emit(page,'mousemove',{movementX:0,movementY:0}); emit(page,'mousemove',{movementX:0,movementY:-267.5}); };
  const event = properties => ({button:0,isTrusted:true,target:scene,preventDefault() {this.prevented = true;},stopImmediatePropagation() {},...properties});
  const down = () => emit(page,'mousedown',event());
  const up = () => { emit(page,'mouseup'); emit(scene,'click',event()); };
  const click = () => { down(); up(); };
  const wheel = properties => { let prevented = false; emit(page,'wheel',{deltaX:0,deltaY:0,deltaMode:0,ctrlKey:false,preventDefault() {prevented = true;},...properties}); return prevented; };
  const screenClick = (key,target,point,isTrusted = true) => {
    const e = event({target,clientX:point.x,clientY:point.y,detail:1,isTrusted});
    if (apps[key]) emit(apps[key],'click',e);
    emit(screens[key],'click',e);
  };
  return {start,ready,videoPointer,click,down,up,wheel,scrolls,mediaCalls,loads,root,scene,page,apps,media,seek,volume,volumePanel,volumeValue,controls,title,count,status,elapsed,videoElements,
    screenClick,
    hit:name => {hit = name === 'seek' ? seek : name === 'volume-slider' ? volume : name === 'surface' ? media : controls[name];},
    move:(x,y=0) => emit(page,'mousemove',{movementX:x,movementY:y}),
    escape:() => emit(page,'keydown',{key:'Escape',target:scene}),leave:() => emit(hero,'pointerleave'),
    nativeClick:target => emit(apps.top,'click',{target}),input:value => {seek.value = String(value); emit(seek,'input');},
    volumeInput:value => {volume.value = String(value); emit(volume,'input');},
    volumePointer:(type,y) => emit(volume,type,event({clientY:y,pointerId:1})),
    ended:() => {media.ended = true; media.paused = true; emit(media,'ended');},error:() => emit(media,'error'),
    reset:() => window.PhoneBridgerVideo.reset(),
    requests:() => lockRequests,cursor:() => {
      const host = cursor.parentElement.getBoundingClientRect();
      return {x:parseFloat(cursor.style.left)+host.left+cursor.parentElement.clientLeft,y:parseFloat(cursor.style.top)+host.top+cursor.parentElement.clientTop};
    },
  };
}

test('the first screen Play click plays once and starts capture at the clicked location', async () => {
  const demo = await workspace(); demo.ready();
  demo.screenClick('top',demo.controls.play,{x:610,y:100});
  assert.deepEqual(demo.mediaCalls,['play']); assert.equal(demo.requests(),1);
  assert.equal(demo.page.pointerLockElement,demo.scene); assert.deepEqual(demo.cursor(),{x:610,y:100});
  demo.move(0); demo.hit('play'); demo.click();
  assert.deepEqual(demo.mediaCalls,['play','pause']); assert.equal(demo.requests(),1);
});

test('every device screen starts capture where clicked, including after Escape', async () => {
  const demo = await workspace();
  const points = {pc:{x:700,y:400},left:{x:180,y:260},right:{x:990,y:320},top:{x:680,y:70}};
  let requests = 0;
  for (const [key,point] of Object.entries(points)) {
    demo.screenClick(key,demo.scene,point);
    assert.equal(demo.requests(),++requests); assert.equal(demo.page.pointerLockElement,demo.scene);
    assert.deepEqual(demo.cursor(),point); demo.escape(); assert.equal(demo.page.pointerLockElement,null);
  }
});

test('synthetic screen clicks do not capture and rejected capture preserves the first media action', async () => {
  const demo = await workspace({lockDenied:true}); demo.ready();
  demo.screenClick('pc',demo.scene,{x:700,y:400},false); assert.equal(demo.requests(),0);
  demo.screenClick('top',demo.controls.play,{x:600,y:100});
  assert.deepEqual(demo.mediaCalls,['play']); assert.equal(demo.requests(),1); assert.equal(demo.page.pointerLockElement,null);
  assert.equal(demo.root.classList.contains('demo-pointer-locked'),false);
  demo.nativeClick(demo.controls.play); assert.deepEqual(demo.mediaCalls,['play','pause']);
});

test('mobile playback remains a native touch action without requesting pointer capture', async () => {
  const demo = await workspace({mobileView:true}); demo.ready();
  demo.screenClick('top',demo.controls.play,{x:600,y:100});
  assert.deepEqual(demo.mediaCalls,['play']); assert.equal(demo.requests(),0); assert.equal(demo.page.pointerLockElement,null);
});

test('pixel, line and page wheels scroll the website while capture stays active', async () => {
  const demo = await workspace(); demo.start(); demo.videoPointer();
  for (const properties of [{deltaX:4,deltaY:150},{deltaY:-3,deltaMode:1},{deltaY:1,deltaMode:2}]) assert.equal(demo.wheel(properties),true);
  assert.deepEqual(JSON.parse(JSON.stringify(demo.scrolls)),[{top:150,left:4,behavior:'instant'},{top:-48,left:0,behavior:'instant'},{top:900,left:0,behavior:'instant'}]);
  assert.equal(demo.page.pointerLockElement,demo.scene);
});
test('browser zoom and released-mode wheel handling remain native', async () => {
  const demo = await workspace(); demo.start(); assert.equal(demo.wheel({ctrlKey:true,deltaY:120}),false);
  demo.escape(); assert.equal(demo.wheel({deltaY:120}),false); assert.equal(demo.scrolls.length,0);
});
test('video button clicks play and pause exactly once without releasing mouse capture', async () => {
  const demo = await workspace(); demo.ready(); demo.start(); demo.videoPointer(); demo.hit('play');
  demo.click(); assert.deepEqual(demo.mediaCalls,['play']); assert.equal(demo.apps.top.dataset.videoState,'playing');
  assert.equal(demo.videoElements['[data-play-icon]'].attributes.hidden,'');
  assert.equal(demo.videoElements['[data-pause-icon]'].attributes.hidden,undefined);
  demo.click(); assert.deepEqual(demo.mediaCalls,['play','pause']); assert.equal(demo.apps.top.dataset.videoState,'paused');
  assert.equal(demo.videoElements['[data-play-icon]'].attributes.hidden,undefined);
  assert.equal(demo.videoElements['[data-pause-icon]'].attributes.hidden,'');
  assert.equal(demo.page.pointerLockElement,demo.scene); assert.equal(demo.loads.length,1);
});
test('clicks before metadata are harmless and the player works once ready', async () => {
  const demo = await workspace(); demo.start(); demo.videoPointer(); demo.click(); assert.equal(demo.mediaCalls.length,0);
  demo.ready(); demo.click(); assert.deepEqual(demo.mediaCalls,['play']); demo.leave(); assert.equal(demo.page.pointerLockElement,demo.scene);
});
test('a paused video can be scrubbed in both directions with clamped endpoints', async () => {
  const demo = await workspace(); demo.ready(); demo.start(); demo.videoPointer(); demo.hit('seek');
  demo.down(); assert.equal(demo.media.currentTime,15);
  demo.move(54); assert.equal(demo.media.currentTime,21); assert.equal(demo.cursor().x,654);
  demo.move(-500); assert.equal(demo.media.currentTime,0); assert.equal(demo.cursor().x,450);
  demo.move(600); assert.equal(demo.media.currentTime,30); assert.equal(demo.cursor().x,750);
  demo.up(); assert.equal(demo.media.paused,true); assert.equal(demo.page.pointerLockElement,demo.scene);
});
test('scrubbing a playing video resumes it once on release without exiting the phone', async () => {
  const demo = await workspace(); demo.ready(); demo.start(); demo.videoPointer(); demo.hit('play'); demo.click();
  demo.hit('seek'); demo.down(); assert.equal(demo.media.paused,true); demo.move(54); demo.up();
  assert.deepEqual(demo.mediaCalls,['play','pause','play']); assert.equal(demo.media.currentTime,21);
  assert.equal(demo.media.paused,false); assert.equal(demo.page.pointerLockElement,demo.scene);
});
test('next and previous switch actual media sources and obey playlist boundaries', async () => {
  const demo = await workspace(); demo.ready(); demo.start(); demo.videoPointer();
  assert.equal(demo.controls.previous.disabled,true); demo.hit('next'); demo.click();
  assert.match(demo.media.src,/kato.mp4$/); demo.ready(); assert.equal(demo.media.paused,false);
  assert.equal(demo.count.textContent,'2 / 2'); assert.equal(demo.controls.next.disabled,true);
  demo.hit('previous'); demo.click(); assert.match(demo.media.src,/relax1.mp4$/); demo.ready();
  assert.equal(demo.count.textContent,'1 / 2'); assert.equal(demo.media.currentTime,0); assert.equal(demo.page.pointerLockElement,demo.scene);
});
test('normal controls, keyboard seeking, ending and reset use the same controller', async () => {
  const demo = await workspace(); demo.ready(); demo.nativeClick(demo.controls.play); assert.equal(demo.media.paused,false);
  demo.input(12.5); assert.equal(demo.media.currentTime,12.5); assert.equal(demo.elapsed.textContent,'0:12');
  demo.nativeClick(demo.controls.mute); assert.equal(demo.media.muted,true);
  demo.ended(); assert.match(demo.media.src,/kato.mp4$/); demo.ready();
  demo.reset(); demo.ready(); assert.match(demo.media.src,/relax1.mp4$/);
  assert.equal(demo.media.currentTime,0); assert.equal(demo.media.paused,true); assert.equal(demo.media.muted,false);
  demo.start(); demo.escape(); demo.click(); assert.equal(demo.requests(),1); assert.equal(demo.page.pointerLockElement,null);
});
test('media errors leave Next available and a healthy clip recovers the controls', async () => {
  const demo = await workspace(); demo.ready(); demo.error(); assert.equal(demo.controls.play.disabled,true); assert.equal(demo.status.hidden,false);
  demo.nativeClick(demo.controls.next); demo.ready(); assert.equal(demo.controls.play.disabled,false); assert.equal(demo.status.hidden,true);
});

test('volume opens vertically, changes actual audio and restores the last audible level', async () => {
  const demo = await workspace(); demo.ready();
  demo.nativeClick(demo.controls.volume);
  assert.equal(demo.volumePanel.hidden,false); assert.equal(demo.controls.volume.attributes['aria-expanded'],'true');
  assert.equal(demo.media.muted,false); assert.equal(demo.media.volume,0.7);
  demo.volumeInput(35); assert.equal(demo.media.volume,0.35); assert.equal(demo.volumeValue.textContent,'35%');
  demo.nativeClick(demo.controls.mute); assert.equal(demo.media.muted,true); assert.equal(demo.volume.value,'0');
  assert.equal(demo.videoElements['.sound-waves'].attributes.hidden,'');
  assert.equal(demo.videoElements['.sound-off'].attributes.hidden,undefined);
  demo.nativeClick(demo.controls.mute); assert.equal(demo.media.muted,false); assert.equal(demo.volume.value,'35');
  demo.volumeInput(0); assert.equal(demo.media.volume,0); assert.equal(demo.media.muted,true);
  demo.nativeClick(demo.controls.mute); assert.equal(demo.media.volume,0.35); assert.equal(demo.media.muted,false);
  demo.nativeClick(demo.controls.volume); assert.equal(demo.volumePanel.hidden,true);
});

test('virtual vertical volume dragging clamps endpoints without pausing, seeking or releasing capture', async () => {
  const demo = await workspace(); demo.ready(); demo.start(); demo.videoPointer();
  demo.move(0,35);
  demo.hit('play'); demo.click(); demo.input(8);
  demo.hit('volume'); demo.click(); assert.equal(demo.volumePanel.hidden,false);
  demo.hit('volume-slider'); demo.down(); assert.equal(demo.media.volume,0.5);
  demo.move(0,-100); assert.equal(demo.media.volume,1); assert.equal(demo.media.muted,false);
  demo.move(0,300); assert.equal(demo.media.volume,0); assert.equal(demo.media.muted,true);
  demo.move(0,-57); assert.equal(demo.media.volume,0.4); demo.up();
  assert.equal(demo.media.paused,false); assert.equal(demo.media.currentTime,8); assert.deepEqual(demo.mediaCalls,['play']);
  assert.equal(demo.page.pointerLockElement,demo.scene); demo.escape(); assert.equal(demo.volumePanel.hidden,true);
  demo.reset(); demo.ready(); assert.equal(demo.media.volume,0.7); assert.equal(demo.media.muted,false);
});

test('native vertical dragging and cancellation preserve playback and dismiss outside the popup', async () => {
  const demo = await workspace(); demo.ready(); demo.nativeClick(demo.controls.play); demo.nativeClick(demo.controls.volume);
  demo.volumePointer('pointerdown',97.5); assert.equal(demo.media.volume,0.5);
  demo.volumePointer('pointermove',66); assert.equal(demo.media.volume,0.8);
  demo.volumePointer('pointercancel',66); demo.volumePointer('pointermove',140);
  assert.equal(demo.media.volume,0.8); assert.equal(demo.media.paused,false); assert.deepEqual(demo.mediaCalls,['play']);
  demo.start(); demo.videoPointer(); demo.hit('surface'); demo.click(); assert.equal(demo.volumePanel.hidden,true);
});

test('app slider dragging owns movement until release and retains pointer capture', async () => {
  let held=false; const positions=[];
  const desktop={virtualDown(){held=true;return true;},virtualMove(p){if(held)positions.push({...p});return held;},virtualUp(){held=false;}};
  const demo=await workspace({desktop});demo.start();demo.move(0);demo.down();demo.move(400);
  assert.equal(positions.length,1);assert.equal(demo.cursor().x,900);
  assert.equal(demo.page.pointerLockElement,demo.scene);demo.up();assert.equal(held,false);
  demo.move(-.5);assert.equal(demo.cursor().x,899.5);
});

test('file drag release receives the final phone position after an edge transition', async () => {
  const releases=[];let held=false;
  const desktop={virtualDown(){held=true;return true;},virtualMove(){return false;},virtualUp(p){if(held&&p)releases.push({...p});held=false;}};
  const demo=await workspace({desktop});demo.start();demo.move(0);demo.down();demo.move(-400);
  const final=demo.cursor();assert.ok(final.x<300);demo.up();
  assert.deepEqual(releases,[final]);assert.equal(demo.page.pointerLockElement,demo.scene);
});
