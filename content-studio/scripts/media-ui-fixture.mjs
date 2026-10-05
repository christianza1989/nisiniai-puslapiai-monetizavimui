// Isolated localhost GUI acceptance fixture. Never imports into the public core.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const fixture=path.resolve(import.meta.dirname,'../tmp/media-ui-2026-09-30');
process.env.STUDIO_DATA_DIR=path.join(fixture,'data');
process.env.STUDIO_OUTPUT_DIR=path.join(fixture,'output');
process.env.STUDIO_PORT='4327';
const model=await import('../src/model.mjs');
await model.initialize();await mkdir(fixture,{recursive:true});
let site=await model.getSite('media-ui-test').catch(()=>null);
if(!site){
 site=await model.createSite({canonicalHost:'media-ui-test.invalid',name:'Izoliuotas vaizdų GUI bandymas',offer:'Sintetinis QA, ne veikiantis verslas'});
 await model.editSite(site.id,{facts:'Tik izoliuotas QA. Nekelti šio turinio į realią svetainę.',contact:{email:'qa@example.invalid',phone:''}});
 await model.addPage(site.id,{type:'home',slug:'',title:'Vaizdo šeimos GUI bandymas',description:'Tik sintetinis privatus QA',intent:'Test',body:[{type:'paragraph',text:'Tai izoliuotas bandymo puslapis, ne viešas turinys.'}]});
}
await writeFile(path.join(fixture,'fixture.png'),await sharp({create:{width:1800,height:900,channels:4,background:{r:55,g:85,b:65,alpha:0.75}}}).png().toBuffer());
const {createServer}=await import('../src/server.mjs');const server=await createServer();
server.listen(4327,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:4327',siteId:site.id,fixture:path.join(fixture,'fixture.png')})));
