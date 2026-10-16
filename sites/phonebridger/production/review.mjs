// Run only after reviewing the changed copy against the owner's launch scope.
// Studio creates revisions; build.mjs only consumes the committed exact edition.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transform} from './transform.mjs';
import {productionSource} from './source.mjs';
const project=path.resolve(import.meta.dirname,'..'),companion=path.resolve(project,'../..'),core=path.resolve(companion,'../dovanos-memorycasting');
if(!process.argv[2])throw Error('Supply the isolated editorial workspace with the reviewed PhoneBridger edition.');
process.env.STUDIO_DATA_DIR=path.resolve(process.argv[2]);process.env.STUDIO_OUTPUT_DIR=path.join(process.env.STUDIO_DATA_DIR,'output');process.env.STUDIO_NETWORK_SETTINGS=path.join(core,'config/niche-network.json');
const studio=await import(pathToFileURL(path.join(companion,'content-studio/src/model.mjs')));
await studio.initialize();const site=await studio.getSite('phonebridger');
const decode=text=>text.replace(/<[^>]*>/g,' ').replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replace(/\s+/g,' ').trim();
for(const page of site.pages.filter(p=>['','contact','privacy','shop','terms'].includes(p.slug))){
 const file=page.slug?`${page.slug}/index.html`:'index.html',html=transform(file,await productionSource(file,await readFile(path.join(project,'prototype',file),'utf8')));
 const desired=page.slug===''?{title:decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1])}:{body:[...html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1].matchAll(/<(p|h2|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[1]==='h2'?{type:'heading',level:2,text:decode(m[2])}:{type:'paragraph',text:decode(m[2])}).filter(b=>b.text),description:page.slug==='privacy'?'How MB Memocasting handles PhoneBridger enquiries, accounts, payments, supplier delivery, reviews and limited measurement.':page.slug==='terms'?'PhoneBridger purchase, licence, free shipping and cancellation terms from MB Memocasting.':page.slug==='shop'?'Compare PhoneBridger Windows app setups with one, two or three optional magnetic holders. Check compatibility, delivery and purchase terms.':page.description};
 if(Object.entries(desired).some(([k,v])=>JSON.stringify(page[k])!==JSON.stringify(v))){await studio.editPage('phonebridger',page.id,desired);await studio.approvePage('phonebridger',page.id,'owner-authorized-production-review-20261006');}
}
await studio.exportPackage('phonebridger');const pkg=await readFile(path.join(process.env.STUDIO_OUTPUT_DIR,'phonebridger/content-package.json'),'utf8');await mkdir(path.join(import.meta.dirname,'package'),{recursive:true});await writeFile(path.join(import.meta.dirname,'package/content-package.json'),pkg);console.log('Reviewed production edition exported; private originals remain in Studio.');
