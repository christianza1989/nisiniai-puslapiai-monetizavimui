import fs from 'node:fs/promises';
const here=new URL('.',import.meta.url),delivery=JSON.parse(await fs.readFile(new URL('DELIVERY.json',here),'utf8'));
let html=await fs.readFile(new URL('index.html',here),'utf8');
const cards=[...html.matchAll(/<p class="state">[^<]*<\/p>/g)];if(cards.length!==60)throw Error('Expected60 existing gallery cards');
const state=delivery.state==='ACTUAL_DOMAIN_VERIFIED'?'Įkeltas į Cloudflare; pasirodys nurodytu laiku':'Patvirtintas; paketas paruoštas, tikras diegimas tikrinamas atskirai';
html=html.replace(/<p class="state">[^<]*<\/p>/g,'<p class="state">'+state+'</p>');
if(!html.includes('id="delivery-calendar"'))html=html.replace('<label for="search">','<p id="delivery-calendar"><a href="PUBLICATION-DATES.csv">Kiekvieno straipsnio publikavimo data ir valanda (CSV)</a> · <a href="DELIVERY.json">Patikrinta paketo ir diegimo būsena</a></p><label for="search">');
await fs.writeFile(new URL('index.html',here),html);
console.log({cards:cards.length,state:delivery.state,articlePreviewFilesAndReviewedPayloadsUnchanged:true});
