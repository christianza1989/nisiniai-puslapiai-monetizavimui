import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createDemoState, changeDemoState, demoAssemblyKey, demoFinishCode, demoColors, demoArmrests} from './demo-state.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(directory, '../..');
const assets = JSON.parse(fs.readFileSync(path.join(directory, 'demo-assets.json'), 'utf8'));
const approvedFiles = JSON.parse(fs.readFileSync(path.join(directory, 'asset-checksums.json'), 'utf8'));
const files = new Map();
const states = new Set();
let headrestReturnChecks = 0;
for (const headrest of [true, false]) for (const armrests of demoArmrests) for (const color of demoColors) {
  const state = changeDemoState(changeDemoState(changeDemoState(createDemoState(), 'headrest', headrest), 'armrests', armrests), 'color', color);
  states.add(JSON.stringify(state));
  for (const field of ['CUPHSEATCOLOR', 'CUPHBACKRESTCOLOR', 'CHEADRESTUPHCHCOLOR']) assert.equal(demoFinishCode(state, field), color);
  for (const nextColor of demoColors) {
    const returned = changeDemoState(changeDemoState(changeDemoState(state, 'headrest', false), 'color', nextColor), 'headrest', true);
    assert.equal(demoFinishCode(returned, 'CHEADRESTUPHCHCOLOR'), demoFinishCode(returned, 'CUPHBACKRESTCOLOR'));
    ++headrestReturnChecks;
  }
  const assembly = assets.assemblies[demoAssemblyKey(state)];
  assert.ok(assembly, 'Missing assembly');
  for (const asset of [assembly.base, ...assembly.patches.flatMap(patch => patch.geometries || (patch.geometry ? [patch.geometry] : []))]) files.set(asset.asset, {sha256: asset.assetSha256, geometry: true});
}
for (const material of Object.values(assets.materials)) {
  assert.equal(material.approximate, false, 'Only original measured upholstery belongs in this illustration');
  if (material.image) files.set(material.image, {geometry: false});
  if (material.normalImage) files.set(material.normalImage, {geometry: false});
}
let totalBytes = 0;
for (const [url, expected] of files) {
  assert.ok(url.startsWith('/models/') || url.startsWith('/media/'), 'Asset paths must use existing public originals');
  const bytes = fs.readFileSync(path.join(web, 'public', url));
  totalBytes += bytes.length;
  assert.ok(approvedFiles[url], 'Missing approved asset checksum');
  assert.equal(bytes.length, approvedFiles[url].bytes, url + ' bytes');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), approvedFiles[url].sha256, url + ' approved checksum');
  if (expected.sha256) assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, url + ' checksum');
  if (expected.geometry) { assert.equal(bytes.toString('utf8', 0, 4), 'glTF'); assert.equal(bytes.readUInt32LE(4), 2); }
}
assert.equal(states.size, 30);
assert.equal(headrestReturnChecks, 150);
assert.throws(() => changeDemoState(createDemoState(), 'armrests', 'invalid'));
const source = fs.readFileSync(path.join(directory, 'configurator-demo.js'), 'utf8');
assert.ok(!/expanded-configurator|stateToken|localStorage|sessionStorage|document\.querySelector/.test(source), 'The browser module must remain scoped and independent');
assert.ok(!/['"]\.demo-/.test(source), 'Every demo class selector needs the hp prefix');
const module = await import(pathToFileURL(path.join(web, 'public/media/home-final/demo.js')).href);
assert.deepEqual(Object.keys(module), ['mountDemo']);

// Exercise teardown before lazy WebGL initialization with native abortable events.
class Element extends EventTarget {
  dataset = {};
  attributes = {};
  disabled = true;
  hidden = false;
  querySelector(selector) { return this.selectors?.[selector] || null; }
  querySelectorAll(selector) { return this.lists?.[selector] || []; }
  setAttribute(name, value) { this.attributes[name] = value; }
  matches(selector) { return selector === '#konfiguratorius' && this.isSection; }
}
const observerInstances = [];
class Observer {
  constructor(callback) { this.callback = callback; this.disconnected = false; observerInstances.push(this); }
  observe(element) { this.element = element; }
  disconnect() { this.disconnected = true; }
}
const document = new EventTarget();
document.hidden = false;
document.defaultView = {
  AbortController, IntersectionObserver: Observer, ResizeObserver: Observer,
  matchMedia() { return Object.assign(new EventTarget(), {matches: false}); },
  requestAnimationFrame() { throw new Error('A lazy uninitialized demo must not animate'); },
  cancelAnimationFrame() {},
};
const root = Object.assign(new Element(), {ownerDocument: document, isSection: true});
const host = new Element(), canvas = new Element(), status = new Element(), rotate = new Element(), colors = new Element(), reset = new Element();
const armButtons = demoArmrests.map(armrests => Object.assign(new Element(), {dataset: {armrests}}));
const headButtons = ['with', 'without'].map(headrest => Object.assign(new Element(), {dataset: {headrest}}));
const swatches = demoColors.map(code => Object.assign(new Element(), {dataset: {code}}));
host.selectors = {canvas};
colors.lists = {button: swatches};
root.selectors = {'.hp-demo-stage': host, '.hp-demo-status': status, '.hp-demo-rotation': rotate, '.hp-demo-swatches': colors, '.hp-demo-reset': reset};
root.lists = {
  'button[data-armrests]': armButtons,
  'button[data-headrest]': headButtons,
  '.hp-demo-controls button, .hp-demo-swatches button, button[data-armrests], button[data-headrest]': [...armButtons, ...headButtons, ...swatches],
};
const firstCleanup = module.mountDemo(root);
assert.equal(host.dataset.armrests, '4D');
armButtons[0].dispatchEvent(new Event('click'));
assert.equal(host.dataset.armrests, '2D');
const firstObservers = observerInstances.slice();
const secondCleanup = module.mountDemo(root);
assert.ok(firstObservers.every(observer => observer.disconnected), 'Remount must tear down the previous observers');
assert.equal(host.dataset.armrests, '4D', 'Each mount starts with independent illustration state');
firstCleanup();
headButtons[1].dispatchEvent(new Event('click'));
assert.equal(host.dataset.headrest, 'false', 'The old cleanup must not disable the current mount');
secondCleanup();
secondCleanup();
assert.ok(observerInstances.every(observer => observer.disconnected));
const finalData = JSON.stringify(host.dataset);
armButtons[2].dispatchEvent(new Event('click'));
headButtons[0].dispatchEvent(new Event('click'));
rotate.dispatchEvent(new Event('click'));
for (const observer of observerInstances) observer.callback([{isIntersecting: true, intersectionRatio: 1}]);
assert.equal(JSON.stringify(host.dataset), finalData, 'Disposed listeners and late observer callbacks must not touch the root');
console.log(JSON.stringify({exampleStates: states.size, headrestReturnChecks, originalGeometryFiles: [...files.values()].filter(asset => asset.geometry).length, originalTextureFiles: [...files.values()].filter(asset => !asset.geometry).length, assetsChecked: files.size, totalAssetBytes: totalBytes, exports: Object.keys(module), lazyMountCleanup: 'passed', repeatedMount: 'passed'}));
