import { chromium } from 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out=new URL('./research/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const sites=[['hobbycraft','https://www.hobbycraft.co.uk/ideas/get-started-in-card-making.html'],['clairefontaine','https://www.clairefontaine.com/fr/contenu/12/loisirs-creatifs'],['hobbycompany','https://www.hobbycompany.de/papierbasteln-fuer-anfaenger/'],['jurasta','https://jurasta.com/'],['uga','https://uga.lt/produktas/atviruku-gamyba/'],['creavea','https://blog.creavea.com/comment-fabriquer-une-carte-danniversaire']];
const evidence=[];
for(const [name,url] of sites){for(const [kind,width] of [['desktop',1440],['mobile',390]]){
 const page=await browser.newPage({viewport:{width,height:1000}});try{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(1500);await page.screenshot({path:new URL(name+'-'+kind+'.png',out).pathname.replace(/^\/C:/,'C:'),fullPage:false});evidence.push({name,url,kind,width,status:r?.status(),title:await page.title(),text:(await page.locator('body').innerText()).slice(0,14000)});}catch(e){evidence.push({name,url,kind,width,error:e.message});}await page.close();
}}
await browser.close();await writeFile(new URL('retrieval.json',out),JSON.stringify({at:new Date().toISOString(),evidence},null,2));console.log(JSON.stringify(evidence.map(({name,kind,status,title,error})=>({name,kind,status,title,error}))));
