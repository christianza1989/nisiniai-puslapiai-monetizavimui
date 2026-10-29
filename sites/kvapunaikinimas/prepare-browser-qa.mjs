import {readFile,writeFile} from 'node:fs/promises';
const source=JSON.parse(await readFile(new URL('./source/pages.json',import.meta.url),'utf8'));
const output=process.argv[2],base=process.argv[3]||'http://127.0.0.1:8918';if(!output||new URL(base).hostname!=='127.0.0.1')throw Error('Provide an own output file and loopback origin for the browser QA function.');
const code=`async page => {
 const source=${JSON.stringify(source.pages)};
 const results=[];
 for(const s of source){
  const r=await page.goto(${JSON.stringify(base)}+s.path,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(()=>{const main=document.querySelector('main')?.cloneNode(true);for(const e of main?.querySelectorAll('p,h1,h2,h3,h4,li,summary')||[])e.before(document.createTextNode(' '));return{canonical:document.querySelector('link[rel=canonical]')?.href,description:document.querySelector('meta[name=description]')?.content,h1:[...document.querySelectorAll('h1')].map(e=>e.innerText),text:main?.textContent?.replace(/\\s+/g,' ').trim()||'',schema:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(e=>JSON.parse(e.textContent)['@graph']||[]),externalScripts:[...document.scripts].map(s=>s.src).filter(s=>s&&!s.startsWith(location.origin)),contactsPreserved:(location.pathname==='/musu-slapuku-politika'?['+37064819979']:['+37064819979','+37069199833','+37068460688','+37065354982']).every(t=>document.querySelector('a[href="tel:'+t+'"]'))&&!!document.querySelector('a[href="mailto:sales@kvapunaikinimas.lt"]')};});
  let beforeContact=true;const expected=[];
  if(s.path!=='/musu-slapuku-politika/')for(const w of s.widgets){if(w.kind==='heading.default'&&w.text==='KONTAKTAI')beforeContact=false;if(!beforeContact)continue;for(const b of w.blocks){if(b.type==='list')expected.push(...b.items);else if(b.text?.trim())expected.push(b.text);}if(w.kind==='button.default'&&w.text)expected.push(w.text);}
  const missing=expected.filter(t=>!result.text.includes(t.replace(/\\s+/g,' ').trim()));
  const internalRedirects=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(e=>new URL(e.href)).filter(u=>u.origin===location.origin&&u.pathname!=='/'&&u.pathname.endsWith('/')).map(u=>u.pathname));
  results.push({path:s.path,finalPath:new URL(page.url()).pathname,status:r.status(),canonical:result.canonical,contactsPreserved:result.contactsPreserved,descriptionPresent:!!result.description,h1Count:result.h1.length,sourceTextChecks:expected.length,missing,internalRedirects,externalScripts:result.externalScripts,serviceSchemaUrl:result.schema.find(n=>n['@type']==='Service')?.url});
 }
 await page.evaluate(value=>{window.__kvapRouteChecks=value},results);
 return results.map(({missing,...r})=>({...r,missingCount:missing.length}));
}`;
await writeFile(output,code);console.log(JSON.stringify({prepared:output,routes:source.pages.length}));

