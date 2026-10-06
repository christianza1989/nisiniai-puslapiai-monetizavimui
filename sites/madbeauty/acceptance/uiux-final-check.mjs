import {readFile, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const site = path.resolve(import.meta.dirname, '..');
const workspace = path.resolve(site, '../..');
const research = path.join(workspace, 'research/madbeauty-implementation');
const publicDir = path.join(site, 'prototype/public');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n');
const receipt = await json(path.join(research, 'uiux-functional-final-v1.json'));
const syntax = [];
for (const file of Object.keys(receipt.sourceSHA256)) {
  const absolute = path.join(publicDir, file);
  receipt.sourceSHA256[file] = createHash('sha256').update(await readFile(absolute)).digest('hex');
  if (file.endsWith('.mjs')) {
    const result = spawnSync(process.execPath, ['--check', absolute], {encoding:'utf8'});
    syntax.push({file, passed:result.status === 0});
    if (result.status !== 0) throw Error('Syntax check failed: ' + file);
  }
}

const credentials = [];
for (const entry of await readdir(path.join(site, 'runtime'))) {
  if (!/^lighthouse-auth-headers-v\d+\.json$/.test(entry)) continue;
  const headers = await json(path.join(site, 'runtime', entry));
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== 'string' || !/cookie|csrf|authorization/i.test(key)) continue;
    credentials.push(value);
    if (/cookie/i.test(key)) credentials.push(...value.split(';').map(v => v.slice(v.indexOf('=') + 1).trim()));
  }
}
const files = [];
for (const directory of [research, publicDir]) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.isFile() && /\.(json|html|md|tap|txt|mjs|css)$/.test(entry.name)) files.push(path.join(directory, entry.name));
  }
}
const findings = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (credentials.some(value => value.length > 20 && content.includes(value))) findings.push({file:path.relative(workspace, file), kind:'local authentication credential'});
  if (/(?:sk-[A-Za-z0-9_-]{32,}|ghp_[A-Za-z0-9]{30,})/.test(content)) findings.push({file:path.relative(workspace, file), kind:'credential-shaped token'});
}
const privatePaths = [];
for (const url of ['/backend/store.mjs', '/runtime/platform-preview.sqlite', '/runtime/browser-test-code.json', '/runtime/lighthouse-auth-headers-v8.json']) {
  const response = await fetch('http://127.0.0.1:8788' + url);
  privatePaths.push({path:url, status:response.status});
  if (response.status !== 404) throw Error('Private path exposed');
}
const focus = await json(path.join(research, 'uiux-draft-discard-focus-v1.json'));
if (focus.result.focused !== 'name' || focus.result.recoveryNotice || focus.result.formValues.some(field => field.value !== '')) throw Error('Draft discard UI check failed');
const at = new Date().toISOString();
const result = {at, scope:'Own public source and research text; private loopback preview. No demo media review.', syntax, scannedTextFiles:files.length, credentialFindings:findings, privateHttpPaths:privatePaths, draftDiscardFocus:focus};
await save(path.join(research, 'uiux-final-safety-v1.json'), result);
if (findings.length) throw Error('Credential scan failed');
receipt.sourceVerifiedAt = at;
receipt.finalSafety = 'uiux-final-safety-v1.json';
receipt.draftDiscardFocus = 'uiux-draft-discard-focus-v1.json';
receipt.handoff = {screenshot:'uiux-calendar-final-desktop.png', width:1280, height:720, viewportOverrideReset:true, note:'Separate handoff screenshot, excluded from the 33 acceptance captures. First capture retained mobile paint immediately after viewport reset; corrected after desktop DOM and paint updated.'};
await save(path.join(research, 'uiux-functional-final-v1.json'), receipt);
console.log(JSON.stringify({syntaxPassed:syntax.length, scannedTextFiles:files.length, credentialFindings:findings.length, privatePaths404:privatePaths.length, draftDiscardFocus:'PASS'}));
