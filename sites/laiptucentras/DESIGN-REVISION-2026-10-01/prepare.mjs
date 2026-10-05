import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const network=process.cwd();
const core='C:/Users/lenovo/Documents/dovanos-memorycasting';
const revision=path.join(network,'sites/laiptucentras/DESIGN-REVISION-2026-10-01');
const target=path.join(core,'output/laiptucentras-redesign-20261001');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(path.join(revision,'baseline'),{recursive:true});
const files=[
 [core,'components/niche/laiptucentras-site.tsx'],[core,'components/niche/laiptucentras-site.module.css'],
 [core,'content-packages/laiptucentras/content-package.json'],
 [network,'sites/laiptucentras/DESIGN.md'],[network,'sites/laiptucentras/MEDIA.json'],
 [network,'sites/laiptucentras/MEDIA-ACCEPTANCE.json']
];
const manifest=[];
for(const [root,rel] of files){const b=await fs.readFile(path.join(root,rel));const dest=path.join(revision,'baseline',rel);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);manifest.push({source:path.join(root,rel),snapshot:path.relative(revision,dest),sha256:hash(b),bytes:b.length});}
await fs.writeFile(path.join(revision,'BASELINE.json'),JSON.stringify({capturedAt:new Date().toISOString(),files:manifest,previousReview:'research/autonomy/laiptucentras-review/',historicalEvidenceModified:false},null,2)+'\n');
const start=JSON.parse(await fs.readFile(path.join(network,'research/autonomy/miniekskavatoriai-review/START.json'),'utf8'));
const checks=[];
for(const f of start.instructionFingerprints)checks.push({path:f.path,matchesAtCheck:hash(await fs.readFile(path.join(network,f.path)))===f.sha256});
checks.push({path:start.sourcePath,matchesAtCheck:hash(await fs.readFile(path.join(network,start.sourcePath)))===start.sourceSha256});
checks.push({path:'INPUT-ANALYSIS.md',matchesAtCheck:hash(await fs.readFile(path.join(network,'research/autonomy/miniekskavatoriai-review/INPUT-ANALYSIS.md')))===start.sourceSha256});
await fs.writeFile(path.join(network,'research/autonomy/miniekskavatoriai-review/HANDOFF-CHECK.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks,passed:checks.every(c=>c.matchesAtCheck),originalFingerprintsUnmodified:true,runtimeNotTested:true},null,2)+'\n');
if(!checks.every(c=>c.matchesAtCheck))throw new Error('Handoff fingerprint differs; inspect rather than rewriting history.');
if(path.dirname(path.resolve(target))!==path.resolve(core,'output'))throw new Error('Isolated copy must stay in core/output');
try{await fs.access(target);throw new Error('New target already exists; do not overwrite.');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(target,{recursive:true});
const skip=p=>!/(^|[\\/])(\.env[^\\/]*|\.dev\.vars[^\\/]*|node_modules|\.git|\.wrangler|output)([\\/]|$)/.test(p)&&!p.endsWith('.previous.json');
for(const folder of ['app','build','components','config','content-packages','db','drizzle','hooks','lib','public','scripts','tests','vendor'])await fs.cp(path.join(core,folder),path.join(target,folder),{recursive:true,filter:skip});
for(const file of ['cloudflare-env.d.ts','components.json','drizzle.config.ts','eslint.config.mjs','next-env.d.ts','next.config.ts','package-lock.json','package.json','postcss.config.mjs','proxy.ts','tsconfig.json','vercel.json','vite.config.ts'])await fs.copyFile(path.join(core,file),path.join(target,file));
await fs.mkdir(path.join(target,'.openai'),{recursive:true});await fs.copyFile(path.join(core,'.openai/hosting.json'),path.join(target,'.openai/hosting.json'));
await fs.mkdir(path.join(target,'.sites-runtime'),{recursive:true});await fs.writeFile(path.join(target,'.sites-runtime/execution-profile.json'),JSON.stringify({executionProfile:'portable'},null,2));
await fs.symlink(path.join(core,'node_modules'),path.join(target,'node_modules'),'junction');
console.log(JSON.stringify({baselineFiles:manifest.length,handoffChecks:checks.length,passed:true,target}));
