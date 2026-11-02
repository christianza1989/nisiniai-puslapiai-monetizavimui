import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activateProductViewerWhenNear} from '../src/lib/viewer-activation';

test('offscreen viewers wait, then activate automatically only once; cleanup rejects late observations',()=>{
 const original=globalThis.IntersectionObserver;let callback:(entries:{target:HTMLElement;isIntersecting:boolean;intersectionRatio:number}[])=>void=()=>{},disconnects=0,calls=0;
 class Observer {constructor(cb:typeof callback,readonly options:IntersectionObserverInit){callback=cb;assert.equal(options.rootMargin,'0px');assert.equal(options.threshold,.25);}observe(){}disconnect(){disconnects++;}}
 globalThis.IntersectionObserver=Observer as unknown as typeof IntersectionObserver;
 try{
  const stage=new EventTarget() as HTMLElement,cleanup=activateProductViewerWhenNear(stage,()=>calls++);
  callback([{target:stage,isIntersecting:false,intersectionRatio:0}]);callback([{target:stage,isIntersecting:true,intersectionRatio:.1}]);assert.equal(calls,0);
  callback([{target:stage,isIntersecting:true,intersectionRatio:.25}]);callback([{target:stage,isIntersecting:true,intersectionRatio:1}]);stage.dispatchEvent(new Event('focusin'));assert.equal(calls,1);assert(disconnects>0);
  cleanup();callback([{target:stage,isIntersecting:true,intersectionRatio:1}]);assert.equal(calls,1);
  const later=new EventTarget() as HTMLElement,close=activateProductViewerWhenNear(later,()=>calls++);close();callback([{target:later,isIntersecting:true,intersectionRatio:1}]);assert.equal(calls,1);
 }finally{globalThis.IntersectionObserver=original;}
});

test('keyboard focus activates before intersection and browsers without observation retain immediate full3D',()=>{
 const original=globalThis.IntersectionObserver;let calls=0;
 class Observer {observe(){}disconnect(){}}
 try{
  globalThis.IntersectionObserver=Observer as unknown as typeof IntersectionObserver;
  const stage=new EventTarget() as HTMLElement,close=activateProductViewerWhenNear(stage,()=>calls++);stage.dispatchEvent(new Event('focusin'));assert.equal(calls,1);close();
  Reflect.deleteProperty(globalThis,'IntersectionObserver');activateProductViewerWhenNear(new EventTarget() as HTMLElement,()=>calls++);assert.equal(calls,2);
 }finally{globalThis.IntersectionObserver=original;}
});
