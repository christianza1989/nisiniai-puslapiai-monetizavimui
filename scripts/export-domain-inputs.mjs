import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const source=path.join(root,'domain-sorter/output/top200-research-20261001/selected');
const dest=path.join(root,'inputs/domain-research-20261001');
await fs.mkdir(path.join(dest,'analizes'),{recursive:true});
const names=['top200_su_dr.csv','top200_pilna_analize.csv'];
for(const file of await fs.readdir(path.join(source,'analizes')))if(file.endsWith('.md'))names.push('analizes/'+file);
const rows=[];
for(const name of names){const bytes=await fs.readFile(path.join(source,name));await fs.writeFile(path.join(dest,name),bytes);rows.push({file:name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile(path.join(dest,'MANIFEST.json'),JSON.stringify({source:'domain-sorter/output/top200-research-20261001/selected',snapshotDate:'2026-10-05',generatedAt:new Date().toISOString(),recordsAreResearchNotDemandProof:true,rows},null,2)+'\n');
console.log(JSON.stringify({files:rows.length}));
