import {readFile,writeFile} from 'node:fs/promises';
const base='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui';
let s=await readFile(base+'/sites/laiptucentras/verify-local.mjs','utf8');
s=s.replaceAll('C:/Users/lenovo/Documents/dovanos-memorycasting/output/laiptucentras-production',base+'/content-studio/output/miniekskavatoriai-production').replaceAll('8786','8793').replaceAll('laiptucentras','miniekskavatoriai').replaceAll('/laiptu-matavimas','/transejos-kasimas').replaceAll('/laiptu-tureklu-planavimas','/grunto-paliekimas-ar-isvezimas').replaceAll('vidaus laiptų poreikio','tranšėjos kasimo poreikio');
// Deliberate storage failure in this isolated synthetic database, reversible rename.
const marker='const counter=async()=>';
s=s.replace(marker,`await sql('ALTER TABLE niche_leads RENAME TO niche_leads_qa_backup');
try{const failed=await post('/uzklausa',valid);assert.equal(failed.status,503);assert.match(failed.text,/išsaugoti nepavyko/);assert.match(failed.text,/el. paštu/);checks.storageFailure=503;}finally{await sql('ALTER TABLE niche_leads_qa_backup RENAME TO niche_leads');}
`+marker);
await writeFile(base+'/sites/miniekskavatoriai/verify-local.mjs',s);
