import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'), id='autoelektrikaivilniuje';
const names=['autoelektrikaivilniuje','fasadopastoliai','metalo-tvoros'];
for(const name of names){
 const dir=path.join(root,'sites',name); await mkdir(path.join(dir,'snapshots'),{recursive:true});
 const rel=`domain-sorter/output/top200-research-20261001/selected/analizes/${name}-lt.md`, bytes=await readFile(path.join(root,rel));
 await writeFile(path.join(dir,'INPUT-PROVENANCE.json'),JSON.stringify({originalPath:path.join(root,rel),sha256:createHash('sha256').update(bytes).digest('hex'),analysisDate:bytes.toString().match(/Tyrimas: ([^|]+)/)?.[1]?.trim(),readAt:new Date().toISOString(),buildType:'analysis-informed; original analysis read before own business decision',status:name===id?'read-completely':'reserved-not-yet-read',domain:`${name}.lt`},null,2));
 const instructions=['AGENTS.md','START_HERE.md','CORE_BUILD_CONTRACT.md','WORKSTREAMS.md','RESEARCH_INPUTS.md','SKILLS/PROJECT_CONTRACT.md','SKILLS/niche-site-builder/SKILL.md','SKILLS/niche-content-planner/SKILL.md','SKILLS/impeccable/SKILL.md','SKILLS/impeccable/PROJECT_ADAPTATION.md','SKILLS/niche-site-audit/SKILL.md'];
 const rows=[];for(const rel of instructions){const b=await readFile(path.join(root,rel));rows.push({path:rel,sha256:createHash('sha256').update(b).digest('hex')});}
 await writeFile(path.join(dir,'instructions-fingerprint.json'),JSON.stringify({capturedAt:new Date().toISOString(),timing:'after initial instruction reading and reservation, before site content/design code; not a dispatch-time immutable snapshot',files:rows},null,2));
}
await copyFile(path.join(root,'content-studio/data/sites',`${id}.json`),path.join(root,'sites',id,'snapshots','studio-before-build.json'));
await copyFile(path.join(root,'sites',`${id}.md`),path.join(root,'sites',id,'snapshots','brief-before-build.md'));
console.log('Three input hashes recorded; first studio/brief preserved.');
