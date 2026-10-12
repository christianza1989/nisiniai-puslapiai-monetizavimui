import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const scanner=fileURLToPath(new URL('./repository-safety.mjs',import.meta.url));
const fixtureParent=fileURLToPath(new URL('../agent-business-core/runtime/artifacts/repository-safety-fixtures/',import.meta.url));
function git(root,...args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;}
async function fixture(){await fs.mkdir(fixtureParent,{recursive:true});const root=await fs.mkdtemp(path.join(fixtureParent,'pinet-git-safety-'));git(root,'init','-q');await fs.writeFile(path.join(root,'.gitignore'),'.env\n');return root;}
function scan(root,...args){const r=spawnSync(process.execPath,[scanner,root,...args],{encoding:'utf8'});return{code:r.status,stdout:r.stdout,report:JSON.parse(r.stdout)};}
test('candidate secrets are detected without printing credential values',async()=>{
 const root=await fixture(),key='ghp_'+'A'.repeat(36);await fs.writeFile(path.join(root,'bad.js'),`const token='${key}';`);
 const r=scan(root);assert.equal(r.code,1);assert.equal(r.report.findings[0].rule,'github-token');assert.ok(!r.stdout.includes(key));
});
test('exact staged blobs are checked even after working file becomes harmless',async()=>{
 const root=await fixture(),key='sk-proj-'+'B'.repeat(40);await fs.writeFile(path.join(root,'config.json'),JSON.stringify({key}));git(root,'add','config.json');await fs.writeFile(path.join(root,'config.json'),'{}');
 assert.equal(scan(root).code,0);const staged=scan(root,'--staged');assert.equal(staged.code,1);assert.ok(staged.report.findings.some(x=>x.rule==='openai-key'));assert.ok(!staged.stdout.includes(key));
});
test('custom local secret exact match fails without credential disclosure',async()=>{
 const root=await fixture(),secret='private-credential-value-unique-72841';await fs.writeFile(path.join(root,'.env'),`CUSTOM_API_KEY=${secret}\n`);await fs.writeFile(path.join(root,'notes.md'),secret);
 const r=scan(root);assert.equal(r.code,1);assert.ok(r.report.findings.some(x=>x.rule==='matches-local-secret-value'));assert.ok(!r.stdout.includes(secret));
});
test('blocked database filename fails; clean code and env template pass',async()=>{
 const root=await fixture();await fs.writeFile(path.join(root,'main.mjs'),'export const enabled=false;');await fs.writeFile(path.join(root,'.env.example'),'TOKEN=\n');assert.equal(scan(root).code,0);await fs.writeFile(path.join(root,'customers.sqlite'),'not a real database');assert.equal(scan(root).code,1);
});

for(const modified of [false,true])test(`exact staged ${modified?'modified':'unchanged'} rename is scanned without credential disclosure`,async()=>{
 const root=await fixture(),key='ghp_'+'R'.repeat(36),body='Ordinary source line\n'.repeat(80);
 await fs.writeFile(path.join(root,'original.md'),body+(modified?'':key+'\n'));
 git(root,'add','original.md');git(root,'-c','user.name=Safety Fixture','-c','user.email=source-safety@example.test','-c','commit.gpgsign=false','commit','-qm','synthetic baseline');
 git(root,'mv','original.md','renamed.md');
 if(modified){await fs.appendFile(path.join(root,'renamed.md'),key+'\n');git(root,'add','renamed.md');}
 assert.match(git(root,'-c','diff.renames=true','diff','--cached','--name-status'),/^R\d+\s/);
 const r=scan(root,'--staged');assert.equal(r.code,1);assert.equal(r.report.files,1);
 assert.ok(r.report.findings.some(f=>f.file==='renamed.md'&&f.rule==='github-token'));assert.ok(!r.stdout.includes(key));
});

test('clean staged rename still has a nonempty exact-byte safety check',async()=>{
 const root=await fixture();await fs.writeFile(path.join(root,'before.md'),'Ordinary harmless source\n');
 git(root,'add','before.md');git(root,'-c','user.name=Safety Fixture','-c','user.email=source-safety@example.test','-c','commit.gpgsign=false','commit','-qm','synthetic baseline');
 git(root,'mv','before.md','after.md');const r=scan(root,'--staged');
 assert.equal(r.code,0);assert.equal(r.report.files,1);assert.equal(r.report.textFiles,1);assert.deepEqual(r.report.findings,[]);
});
