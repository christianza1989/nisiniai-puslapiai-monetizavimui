import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = fileURLToPath(new URL('.',import.meta.url));
const manifest = JSON.parse(await readFile(path.join(here,'prototype/manifest.json'),'utf8'));
const project = JSON.parse(await readFile(path.join(here,'project.json'),'utf8'));
assert.equal(manifest.siteId,project.siteId); assert.equal(manifest.mode,'private-prototype');
assert.equal(project.locale,'en'); assert.equal(project.publicPackage,null);
assert.equal(Object.values(project.channels).some(Boolean),false);
for(const item of [...manifest.files,...manifest.verificationFiles]) {
  assert.ok(!item.path.includes('..') && !item.path.startsWith('/'));
  const bytes = await readFile(path.join(here,'prototype',item.path));
  assert.equal(bytes.length,item.bytes,item.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
  if(!item.path.endsWith('.html')) assert.equal(item.sha256,item.sourceSha256,`Source bytes changed: ${item.path}`);
  else {
    const html=bytes.toString('utf8');
    assert.match(html,/<html lang="en"/);assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
    assert.equal((html.match(/id="integration-preview"/g)||[]).length,1,item.path);
    assert.doesNotMatch(html,/href="(?:\.\.\/)+release\//);
  }
}
const html = await readFile(path.join(here,'prototype/index.html'),'utf8');
assert.match(html,/<html lang="en"/); assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
assert.doesNotMatch(html,/href="(?:\.\.\/)+release\//);
assert.equal(manifest.files.some(f=>/\.cjs$|\.json$|\.txt$/.test(f.path)),false);
for(const route of ['shop','contact','help','downloads','about','privacy','terms','login','register','recover','account']) assert.ok(manifest.files.some(f=>f.path===route+'/index.html'),route);
assert.ok(manifest.files.some(f=>f.path==='assets/closing-conversion-v1/holder-silver-640.webp'));
console.log(JSON.stringify({status:'PASS',runtimeFiles:manifest.files.length,privateVerificationFiles:manifest.verificationFiles.length,publicPackage:false,liveChannels:false,sourceEnginesUnchanged:true}));
