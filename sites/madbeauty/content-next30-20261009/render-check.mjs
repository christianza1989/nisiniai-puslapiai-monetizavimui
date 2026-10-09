import fs from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {v2RevisionHash} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const require=createRequire('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const site=JSON.parse(await fs.readFile(sel.privateStudio+'/sites/madbeauty.json','utf8'));
await fs.mkdir(new URL('screenshots/',here),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
try{
 for(const [device,width] of [['desktop',1440],['mobile',390]]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
  for(const i of sel.pages){
   await page.goto(pathToFileURL(fileURLToPath(new URL(i.planId+'.html',here))).href);
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
   const observation=await page.evaluate(()=>({title:document.querySelector('h1').textContent,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,images:[...document.images].map(img=>({alt:img.alt,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,currentSrc:img.currentSrc,renderWidth:img.getBoundingClientRect().width})),foreign:(document.querySelector('main').innerText.match(/[\u0400-\u04ff]+/g)||[]),rawMarkdown:/\[[^\]]+\]\(https?:/.test(document.querySelector('main').innerText)}));
   if(observation.documentWidth>width||observation.images.length!==1||observation.images.some(img=>!img.alt||!img.naturalWidth)||observation.foreign.length||observation.rawMarkdown)throw Error('Rendered check failed '+i.planId+' '+device+' '+JSON.stringify(observation));
   const screenshot=fileURLToPath(new URL('screenshots/'+i.planId+'-'+device+'.png',here));await page.screenshot({path:screenshot,fullPage:true});
   results.push({planId:i.planId,device,revisionHash:v2RevisionHash(site.pages.find(p=>p.id===i.pageId)),htmlSha256:createHash('sha256').update(await fs.readFile(new URL(i.planId+'.html',here))).digest('hex'),checkedAt:new Date().toISOString(),...observation,screenshot});
  }
  await page.goto(pathToFileURL(fileURLToPath(new URL('index.html',here))).href);await page.locator('#search').fill('pedikiūr');const visible=await page.locator('article:visible').count();if(visible!==2)throw Error('Index search mismatch');await page.locator('#search').fill('');await page.screenshot({path:fileURLToPath(new URL('screenshots/index-'+device+'.png',here)),fullPage:true});await page.close();
 }
}finally{await browser.close();}
await fs.writeFile(new URL('RENDER-CHECK.json',here),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Private native shared-studio previews; no production deployment evidence',browser:'Installed Chrome via Playwright',views:results},null,2)+'\n');
console.log(JSON.stringify({views:results.length,overflow:0,brokenImages:0,foreignWords:0,indexSearch:true}));
