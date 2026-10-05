import { chromium } from 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
for(const concept of ['a','b','c'])for(const [kind,width] of [['desktop',1440],['mobile',390]]){const p=await browser.newPage({viewport:{width,height:1000}});await p.goto('http://127.0.0.1:8898/'+concept+'.html');await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await p.screenshot({path:new URL('./studies/'+concept+'-'+kind+'.png',import.meta.url).pathname.replace(/^\/C:/,'C:'),fullPage:true});await p.close();}
await browser.close();console.log('6 study screenshots');
