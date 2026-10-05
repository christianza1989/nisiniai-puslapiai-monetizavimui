import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const scanner=fileURLToPath(new URL('./repository-safety.mjs',import.meta.url));
function git(root,...args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'pinet-git-safety-'));git(root,'init','-q');await fs.writeFile(path.join(root,'.gitignore'),'.env\n');return root;}
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
