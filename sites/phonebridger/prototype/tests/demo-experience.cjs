const test = require('node:test');
const assert = require('node:assert/strict');
const {scrollScreen, fitDisplays} = require('../assets/simulator-v2/demo-experience.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('nested scroll containers consume wheel distance without leaking beyond their screen', () => {
  const page = {scrollTop:0, scrollLeft:0, clientHeight:400, scrollHeight:3000};
  const screen = {parentElement:page, clientHeight:330, contains:n=>[screen,outer,inner].includes(n)};
  const outer = {parentElement:screen, scrollTop:50, scrollLeft:0, clientHeight:200, scrollHeight:800};
  const inner = {parentElement:outer, scrollTop:90, scrollLeft:0, clientHeight:100, scrollHeight:200};
  const style = n => n === screen ? {} : {overflowY:'auto'};
  scrollScreen(inner,screen,{deltaY:30,deltaX:0,deltaMode:0},720,style);
  assert.equal(inner.scrollTop,100); assert.equal(outer.scrollTop,70);
  scrollScreen(inner,screen,{deltaY:-130,deltaX:0,deltaMode:0},720,style);
  assert.equal(inner.scrollTop,0); assert.equal(outer.scrollTop,40);
  scrollScreen(inner,screen,{deltaY:5000,deltaX:0,deltaMode:0},720,style);
  assert.equal(outer.scrollTop,600); assert.equal(page.scrollTop,0);
});

test('short laptop viewports fit the entire display group with breathing room', () => {
  for (const height of [480,600,632,720,900]) {
    const width=fitDisplays(1132,height,634);
    assert.ok(width<=1132);
    assert.ok(634*width/1200<=height-32+0.001);
  }
  assert.equal(fitDisplays(1132,900,634),1132);
});

test('fixed app tools scroll their visible content, while content edges stay isolated', () => {
  const screen={clientHeight:330,contains:()=>true};
  const content={parentElement:screen,scrollTop:0,scrollLeft:0,scrollHeight:600,clientHeight:200,
    getClientRects:()=>[{}]};
  const app={querySelector:()=>null,querySelectorAll:()=>[content],getClientRects:()=>[{}]};
  const toolbar={parentElement:screen,closest:()=>app};
  const style=n=>n===content?{overflowY:'auto'}:{};
  scrollScreen(toolbar,screen,{deltaY:160,deltaX:0,deltaMode:0},632,style);
  assert.equal(content.scrollTop,160);
  content.scrollTop=400;
  scrollScreen(content,screen,{deltaY:100,deltaX:0,deltaMode:0},632,style);
  assert.equal(content.scrollTop,400);
});

test('capture aligns displays smoothly, handles viewport changes and restores header access on exit', () => {
  for (const reduced of [false,true]) {
    const listeners={},frames=new Map(),scrolls=[],style=new Map();
    let sequence=0,width=1132,now=0;
    const parent={clientWidth:1156};
    const shell={parentElement:parent,style:{setProperty:(k,v)=>{style.set(k,v);width=parseFloat(v);},removeProperty:k=>{style.delete(k);width=1132;}}};
    const displays=[{top:22,bottom:166},{top:196,bottom:612},{top:197,bottom:525}];
    const window={innerHeight:600,scrollY:400,addEventListener:(t,f)=>listeners['window:'+t]=f,
      scrollTo:o=>{scrolls.push({...o,now});window.scrollY=o.top;}};
    const scene={parentElement:shell,offsetWidth:1200,getBoundingClientRect:()=>({width}),
      querySelectorAll:()=>displays.map(r=>({getBoundingClientRect:()=>({top:450-window.scrollY+r.top*width/1200,bottom:450-window.scrollY+r.bottom*width/1200})}))};
    const header={inert:false};
    const document={pointerLockElement:null,querySelector:s=>s==='.demo-scene'?scene:header,addEventListener:(t,f)=>listeners[t]=f};
    const context=vm.createContext({window,document,matchMedia:()=>({matches:reduced}),
      getComputedStyle:()=>({paddingLeft:'12',paddingRight:'12'}),
      requestAnimationFrame:f=>{const id=++sequence;frames.set(id,f);return id;},cancelAnimationFrame:id=>frames.delete(id)});
    const tick=()=>{now+=100;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now));};
    const flush=()=>{let limit=50;while(frames.size){assert.ok(limit-->0,'animation must finish');tick();}};
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/simulator-v2/demo-experience.js'),'utf8'),context);
    // An unsuccessful capture leaves presentation untouched.
    listeners.pointerlockchange();flush();assert.equal(scrolls.length,0);assert.equal(header.inert,false);
    document.pointerLockElement=scene;listeners.pointerlockchange();flush();
    assert.equal(header.inert,true);
    assert.ok(scrolls.every(s=>s.behavior==='instant'));
    if (reduced) assert.equal(scrolls.length,1);
    else {
      assert.ok(scrolls.length>5,'alignment advances through intermediate positions');
      assert.equal(scrolls.at(-1).now-scrolls[0].now,1100);
      assert.equal(scrolls[0].top,400);
      for(let i=1;i<scrolls.length;i++) assert.ok(scrolls[i].top>scrolls[i-1].top);
      const distances=scrolls.slice(1).map((s,i)=>s.top-scrolls[i].top);
      assert.ok(distances[0]<Math.max(...distances)/2,'gentle start');
      assert.ok(distances.at(-1)<Math.max(...distances)/2,'gentle finish');
    }
    assert.ok((612+28-22+16)*width/1200<=568.001);
    assert.ok(Math.abs(450+(22-16)*width/1200-window.scrollY-16)<0.001);
    window.innerHeight=480;listeners['window:resize']();flush();
    assert.ok((612+28-22+16)*width/1200<=448.001);
    // Exit while a new alignment is still running: no delayed scroll may continue.
    window.innerHeight=720;listeners['window:resize']();tick();tick();tick();tick();
    const count=scrolls.length,position=window.scrollY;
    document.pointerLockElement=null;listeners.pointerlockchange();flush();
    assert.equal(scrolls.length,count);assert.equal(window.scrollY,position);
    assert.equal(header.inert,false);assert.equal(style.size,0);assert.equal(width,1132);
  }
});
