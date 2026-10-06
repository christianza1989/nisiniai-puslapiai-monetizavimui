import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'../../../../dovanos-memorycasting'),target=path.resolve(import.meta.dirname,'../runtime/output/content-core');
const files=['scripts/import-content-package.mjs','scripts/compile-content-packages.mjs','scripts/content-package-core.mjs','scripts/content-package-v2.mjs','scripts/content-v2-admission.mjs','schemas/content-package.v2.schema.json','tests/seo-core-smoke.mjs','lib/niche-links.mjs','config/niche-network.json','public/favicon.svg'];
const provenance=[];
for(const relative of files){const dest=path.join(target,relative);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(source,relative),dest);provenance.push({source:path.join(source,relative),destination:dest,sha256:createHash('sha256').update(await readFile(dest)).digest('hex')});}
await mkdir(path.join(target,'content-packages'),{recursive:true});await writeFile(path.join(import.meta.dirname,'CORE_SANDBOX_PROVENANCE.json'),JSON.stringify({date:'2026-10-05',scope:'local isolated exact common importer copy, no deployment',files:provenance},null,2)+'\n');console.log(target);
