import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export function catalogFromMarkdown(text) {
  return [...text.matchAll(/^- \[ \] ([A-Z]\d+) \| (local|launch|operations) \| (gate|review) \| (.+)$/gm)]
    .map(([,id,stage,priority,criterion])=>({id,stage,gate:priority==='gate',criterion}));
}
export function scoreAudit(audit,catalog) {
  const known=new Set(catalog.map(x=>x.id)); const seen=new Set();
  for(const check of audit.checks||[]) {
    if(!known.has(check.id)||seen.has(check.id)) throw new Error(`Unknown/duplicate criterion ${check.id}`);
    seen.add(check.id);
    if(!['PASS','FAIL','UNVERIFIED','NA'].includes(check.status)) throw new Error(`Invalid status ${check.id}`);
    if(check.status==='PASS'&&(!Array.isArray(check.evidence)||!check.evidence.some(x=>typeof x==='string'&&x.trim()))) throw new Error(`PASS without evidence ${check.id}`);
    if(check.status==='NA'&&!check.notes?.trim()) throw new Error(`NA without scope reason ${check.id}`);
  }
  const missing=catalog.filter(x=>!seen.has(x.id));
  if(missing.length) throw new Error(`Missing criteria: ${missing.map(x=>x.id).join(', ')}`);
  const byId=new Map(audit.checks.map(x=>[x.id,x]));
  const summarize=items=>{
    const applicable=items.filter(x=>byId.get(x.id).status!=='NA');
    const passed=applicable.filter(x=>byId.get(x.id).status==='PASS').length;
    const blockers=applicable.filter(x=>x.gate&&byId.get(x.id).status!=='PASS').map(x=>x.id);
    return {passed,applicable:applicable.length,score:applicable.length?Math.floor(1000*passed/applicable.length)/100:null,
      perfect:applicable.length>0&&passed===applicable.length,gateReady:applicable.length>0&&!blockers.length,blockers};
  };
  return {siteId:audit.siteId,evaluatedAt:audit.evaluatedAt,
    stages:Object.fromEntries(['local','launch','operations'].map(stage=>[stage,summarize(catalog.filter(x=>x.stage===stage))])),
    categories:Object.fromEntries([...new Set(catalog.map(x=>x.id[0]))].map(group=>[group,summarize(catalog.filter(x=>x.id.startsWith(group)))]))};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const catalog=catalogFromMarkdown(await readFile(new URL('../references/checklist.md',import.meta.url),'utf8'));
  const audit=JSON.parse(await readFile(process.argv[2],'utf8'));
  console.log(JSON.stringify(scoreAudit(audit,catalog),null,2));
}
