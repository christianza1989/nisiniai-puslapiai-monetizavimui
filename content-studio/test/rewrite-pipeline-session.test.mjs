import test from 'node:test';import assert from 'node:assert/strict';
import {startGeminiSession,sessionStartupSource} from '../src/rewrite-pipeline/session-startup.mjs';
const url='https://gemini.google.com/u/3/app',options={ownGroupTitle:'OWN GROUP',expectedGeminiUrl:url,expectedWindowId:10};
function fixture({welcome=false,extra=false,hidden=false,adoptError=false}={}){
 const events=[];let pages=[];
 const gem={url:()=>url,context:()=>context,bringToFront:async()=>events.push('active-gemini'),evaluate:async()=>({url,visibilityState:hidden?'hidden':'visible',hasFocus:false})};
 const initial={url:()=> 'chrome-extension://own/connect.html',context:()=>context,evaluate:async()=>{events.push('adopt-existing');if(adoptError)throw Error('Own retained group/window ambiguous; stop');pages=[initial,gem];return {createdTabs:0,movedWindows:0};},close:async()=>{assert(pages.includes(gem),'Gemini must survive closing Welcome');events.push('close-welcome');pages=pages.filter(p=>p!==initial);}};
 const context={pages:()=>pages};pages=welcome?[initial]:[gem];if(extra)pages.push({url:()=> 'https://unrelated.test/'});
 return {page:welcome?initial:gem,context,events};
}
test('already initialized session retains sole visible Gemini without creating another Welcome',async()=>{const f=fixture();for(let i=0;i<3;i++)assert.equal((await startGeminiSession(f.page,options)).welcomeClosed,false);assert.deepEqual(f.events,['active-gemini','active-gemini','active-gemini']);});
test('startup attaches existing Gemini before closing Welcome, never closes last target',async()=>{const f=fixture({welcome:true});const r=await startGeminiSession(f.page,options);assert.equal(r.welcomeClosed,true);assert.deepEqual(f.events,['adopt-existing','close-welcome','active-gemini']);assert.equal(f.context.pages().length,1);});
test('foreign targets, hidden state and ambiguous group cannot authorize a pilot',async()=>{for(const props of [{extra:true},{hidden:true},{welcome:true,adoptError:true}]){const f=fixture(props);await assert.rejects(startGeminiSession(f.page,options));}});
test('startup source is self contained; no launch, navigation, new tab or prompt send',()=>{const source=sessionStartupSource(options);assert.equal(typeof new Function(`return (${source})`)(),'function');assert.doesNotMatch(source,/connectOverCDP|\.goto\(|\.newPage\(|\.press\(|\.fill\(/);});
