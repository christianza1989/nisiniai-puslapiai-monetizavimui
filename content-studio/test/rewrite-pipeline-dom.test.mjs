import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { captureNativeDom, nativeDomFunctionSource } from '../src/rewrite-pipeline/native-dom.mjs';

// Deliberate page/DOM doubles, not a claim of live browser or pixel verification.
const url = id => `http://127.0.0.1:56811/native/${id}`;
const item = id => ({ pageId: id, canonicalRevision: `revision-${id}`, url: url(id) });
class FakePage {
  constructor(fixtures = {}, options = {}) {
    this.fixtures = fixtures;
    this.options = options;
    this.width = 1920;
    this.height = 855;
    this.url = 'about:blank';
    this.calls = [];
    this.closed = false;
    this.moved = false;
  }
  env(arg) {
    const f = this.fixtures[this.url] ?? {}, width = this.width;
    const paragraph = (text, cta = false) => ({ textContent: text, querySelector: selector => selector === '.cta' && cta ? {} : null });
    const anchor = (label, href) => ({ textContent: label, href });
    const sourceAnchor = anchor('Modelio kortelė', 'https://example.test/source');
    const contactAnchor = anchor('Susisiekti', 'https://example.test/contact');
    const source = { textContent: 'Modelio kortelė — Konkretus gamintojo dokumentas.', querySelector: s => s === 'a' ? sourceAnchor : null };
    const list = { querySelectorAll: s => s === 'li' ? [source] : [] };
    const heading = { textContent: f.wrongHeading ? 'Other heading' : 'Šaltiniai peržiūrai', nextElementSibling: f.missingList ? null : list };
    const image = { src: 'http://127.0.0.1/image.webp', currentSrc: 'http://127.0.0.1/image390.webp', alt: 'Tikras variantas',
      complete: !(f.brokenImage || f.brokenImage390 && width === 390),
      naturalWidth: f.brokenImage ? 0 : 800, naturalHeight: 600,
      getBoundingClientRect: () => ({ width: f.zeroImageWidth ? 0 : Math.min(width, 800), height: 300 }) };
    const main = {
      querySelector: s => s === 'h1' && !f.missingH1 ? { textContent: 'Puslapio antraštė' } : null,
      querySelectorAll: s => ({
        ':scope > p': [paragraph('Trumpas aprašymas'), paragraph('Pirma pastraipa.'), paragraph('Antra pastraipa.'), paragraph('CTA ne pagrindinė pastraipa', true)],
        h2: f.missingHeading ? [] : [heading], a: [contactAnchor, sourceAnchor], img: f.noImages ? [] : [image],
      })[s] ?? [],
    };
    const document = {
      visibilityState: this.options.hidden ? 'hidden' : 'visible',
      documentElement: { clientWidth: width, scrollWidth: width + (f.overflow || f.overflow390 && width === 390 ? 12 : 0), scrollHeight: 1735 },
      querySelector: s => s === 'main' && !f.missingMain ? main : null,
      querySelectorAll: s => s === 'main img' && !f.missingMain && !f.noImages ? [image] : [],
    };
    return { __arg: arg, innerWidth: width, innerHeight: this.height, devicePixelRatio: 1,
      document, location: { href: this.url }, URL };
  }
  async evaluate(fn, arg) {
    this.calls.push({ method: 'evaluate' });
    return structuredClone(runInNewContext(`(${fn.toString()})(__arg)`, this.env(arg)));
  }
  async setViewportSize(size) {
    this.calls.push({ method: 'setViewportSize', size });
    if (this.options.failRestore && this.moved && size.width === 1920) throw new Error('Mock restore failure');
    if (size.width !== 1920) this.moved = true;
    if (this.options.ignoreMobileResize && size.width === 390) return;
    this.width = size.width;
    this.height = size.height;
  }
  async goto(target, options) {
    this.calls.push({ method: 'goto', target, options });
    if (this.fixtures[target]?.navigationError) throw new Error('Mock navigation timeout');
    this.url = this.fixtures[target]?.redirect ?? target;
  }
  async waitForFunction(fn, arg, options) {
    this.calls.push({ method: 'waitForFunction', options });
    assert.ok(options.timeout > 0 && options.timeout <= 15000);
    assert.equal(options.polling, 100, 'hidden pages must not rely on requestAnimationFrame');
    if (!runInNewContext(`(${fn.toString()})(__arg)`, this.env(arg))) throw new Error('Mock bounded polling timeout');
  }
  async screenshot(options) {
    this.calls.push({ method: 'screenshot', options });
    if (this.options.failScreenshots) throw new Error('Mock screenshot failure');
    return new Uint8Array();
  }
  isClosed() { return this.closed; }
}

test('one function invocation captures both actual widths and restores initial viewport', async () => {
  const page = new FakePage({ [url('a')]: {} });
  const nativeInput = { path: 'native.json', sha256: 'pinned-input' };
  const visualTemplateReference = { path: 'prior-accepted.json', sha256: 'pinned-template' };
  const result = await captureNativeDom(page, { pages: [item('a')], nativeInput, visualTemplateReference });
  assert.equal(result.ok, true);
  assert.equal(result.pages.length, 1);
  assert.deepEqual(result.pages[0].viewports.map(v => [v.innerWidth, v.innerHeight]), [[1440, 1000], [390, 1000]]);
  assert.equal(result.pages[0].canonicalRevision, 'revision-a');
  assert.equal(result.nativeInput, nativeInput);
  assert.equal(result.visualTemplateReference, visualTemplateReference);
  assert.deepEqual(page.calls.filter(c => c.method === 'setViewportSize').map(c => c.size), [
    { width: 1440, height: 1000 }, { width: 390, height: 1000 }, { width: 1920, height: 855 },
  ]);
  assert.equal(page.calls.filter(c => c.method === 'goto').length, 1);
  assert.equal(page.calls.filter(c => c.method === 'screenshot').length, 0);
  assert.equal(result.extraScreenshots, 0);
  assert.equal(result.viewportRestored, true);
});

test('extracts actual main content/source heading and omits CTA paragraphs/header links', async () => {
  const page = new FakePage({ [url('a')]: {} });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  const view = result.pages[0].viewports[0];
  assert.equal(view.h1, 'Puslapio antraštė');
  assert.equal(view.description, 'Trumpas aprašymas');
  assert.deepEqual(view.body, ['Pirma pastraipa.', 'Antra pastraipa.']);
  assert.equal(view.sourceHeading, 'Šaltiniai peržiūrai');
  assert.deepEqual(view.sourceItems, [{ url: 'https://example.test/source', label: 'Modelio kortelė', reason: 'Konkretus gamintojo dokumentas.' }]);
  assert.deepEqual(view.orderedLinks.map(a => a.label), ['Susisiekti', 'Modelio kortelė']);
  assert.equal(view.images[0].currentSrc, 'http://127.0.0.1/image390.webp');
  assert.equal(view.scrollHeight, 1735);
});

test('page A passes, B fails, C still passes; only errors get unique bounded screenshots', async () => {
  const page = new FakePage({ [url('a')]: {}, [url('b')]: { overflow: true }, [url('c')]: {} });
  const result = await captureNativeDom(page, { pages: [item('a'), item('b'), item('c')], errorScreenshotPrefix: 'D:/Core/own-qa/error' });
  assert.equal(result.ok, false);
  assert.deepEqual(result.pages.map(p => p.pageId), ['a', 'c']);
  assert.deepEqual(result.partialPages.map(p => p.pageId), ['b']);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.errors.map(e => e.width), [1440, 390]);
  assert.ok(result.errors.every(e => e.pageId === 'b' && /overflow/u.test(e.message)));
  assert.equal(result.extraScreenshots, 2);
  const shots = page.calls.filter(c => c.method === 'screenshot');
  assert.equal(new Set(shots.map(c => c.options.path)).size, 2);
  assert.ok(shots.every(c => c.options.path.startsWith('D:/Core/own-qa/error-') && c.options.fullPage === false && c.options.timeout === 15000));
  assert.equal(page.width, 1920);
  assert.equal(page.height, 855);
});

test('success at one width remains partial and cannot masquerade as a completed page', async () => {
  const page = new FakePage({ [url('a')]: { overflow390: true } });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  assert.equal(result.pages.length, 0);
  assert.equal(result.partialPages[0].viewports.length, 1);
  assert.equal(result.partialPages[0].viewports[0].innerWidth, 1440);
  assert.equal(result.errors[0].width, 390);
  assert.equal(result.extraScreenshots, 0, 'no caller prefix means no screenshots even on errors');
});

test('screenshot failure preserves primary error without pretending PNG exists', async () => {
  const page = new FakePage({ [url('a')]: { missingMain: true } }, { failScreenshots: true });
  const result = await captureNativeDom(page, { pages: [item('a')], errorScreenshotPrefix: 'D:/Core/error' });
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].message, /Missing actual native main/);
  assert.match(result.errors[0].screenshotError, /Mock screenshot failure/);
  assert.equal(result.errors[0].screenshot, undefined);
  assert.equal(result.extraScreenshots, 0);
  assert.equal(result.viewportRestored, true);
});

test('missing actual source heading fails instead of inventing expected heading', async () => {
  const page = new FakePage({ [url('a')]: { wrongHeading: true } });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  assert.equal(result.pages.length, 0);
  assert.ok(result.errors.every(e => /actual source heading/u.test(e.message)));
});

test('broken/unloaded images and zero rendered image dimensions fail', async () => {
  for (const fixture of [{ brokenImage: true }, { zeroImageWidth: true }]) {
    const page = new FakePage({ [url('a')]: fixture });
    const result = await captureNativeDom(page, { pages: [item('a')] });
    assert.equal(result.pages.length, 0);
    assert.equal(result.errors.length, 2);
    assert.equal(result.viewportRestored, true);
  }
});

test('failed navigation cannot capture previous page under target ID; later pages continue', async () => {
  const page = new FakePage({ [url('a')]: {}, [url('b')]: { navigationError: true }, [url('c')]: {} });
  const result = await captureNativeDom(page, { pages: [item('a'), item('b'), item('c')] });
  assert.deepEqual(result.pages.map(p => p.pageId), ['a', 'c']);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].pageId, 'b');
  assert.equal(result.errors[0].phase, 'navigation');
  assert.equal(result.partialPages[0].viewports.length, 0);
});

test('actual viewport mismatch fails even when requested RPC did not resize', async () => {
  const page = new FakePage({ [url('a')]: {} }, { ignoreMobileResize: true });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  assert.equal(result.pages.length, 0);
  assert.equal(result.errors[0].width, 390);
  assert.equal(result.errors[0].phase, 'viewport');
  assert.equal(result.viewportRestored, true);
});

test('hidden document uses bounded polling and still captures truthful visibility state', async () => {
  const page = new FakePage({ [url('a')]: {} }, { hidden: true });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  assert.equal(result.ok, true);
  assert.equal(result.pages[0].viewports[0].visibilityState, 'hidden');
  assert.ok(page.calls.filter(c => c.method === 'waitForFunction').every(c => c.options.polling === 100));
});

test('restore failure is explicit even if content capture passed', async () => {
  const page = new FakePage({ [url('a')]: {} }, { failRestore: true });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  assert.equal(result.pages.length, 1);
  assert.equal(result.ok, false);
  assert.equal(result.viewportRestored, false);
  assert.equal(result.errors.at(-1).phase, 'restore');
});

test('redirected native URL fails rather than accepting unrelated rendered content', async () => {
  const page = new FakePage({ [url('a')]: { redirect: url('other') }, [url('other')]: {} });
  const result = await captureNativeDom(page, { pages: [item('a')] });
  assert.equal(result.pages.length, 0);
  assert.ok(result.errors.every(e => /URL differs/u.test(e.message)));
});

test('serialized function is self-contained and request-bound variant is pasteable', async () => {
  const request = { pages: [item('a')] };
  const plain = runInNewContext(`(${nativeDomFunctionSource()})`, { URL });
  const page = new FakePage({ [url('a')]: {} });
  assert.equal((await plain(page, request)).ok, true);
  const bound = runInNewContext(`(${nativeDomFunctionSource(request)})`, { URL });
  assert.equal((await bound(page)).ok, true);
});

test('invalid/duplicate requests fail before any viewport mutation', async () => {
  const page = new FakePage();
  await assert.rejects(() => captureNativeDom(page, { pages: [item('a'), item('a')] }), /duplicate/);
  await assert.rejects(() => captureNativeDom(page, { pages: [{ ...item('a'), url: 'file:///data' }] }), /Invalid/);
  assert.equal(page.calls.length, 0);
});
