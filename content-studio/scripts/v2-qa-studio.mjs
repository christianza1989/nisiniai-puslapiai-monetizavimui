import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../tmp/dovanos-v2-m1/',import.meta.url));
process.env.STUDIO_DATA_DIR=root+'data';process.env.STUDIO_OUTPUT_DIR=root+'output';process.env.STUDIO_PORT='4338';
const model=await import('../src/model.mjs');
const {v2Fixture}=await import('../test/fixtures/v2.mjs');
await model.initialize();
const f=v2Fixture();
if(!(await model.listSites()).some(s=>s.id===f.siteId)){
  await model.createSite({canonicalHost:f.canonicalHost,name:f.site.name,offer:f.site.offer,schemaVersion:2,renderer:'gift'});
  await model.editSite(f.siteId,{facts:'Tik izoliuotas GUI bandymas.'});
  for(const page of f.pages)await model.addPage(f.siteId,page);
  for(const page of f.pages)await model.approvePage(f.siteId,page.id,'fixture-editor');
}
const {createServer}=await import('../src/server.mjs');
const server=await createServer();await new Promise(resolve=>server.listen(4338,'127.0.0.1',resolve));
console.log(JSON.stringify({pid:process.pid,url:'http://127.0.0.1:4338',scope:'isolated fixture only'}));
