// Page-only: usable with the caller's existing official Playwright MCP tab.
// No launch, filesystem, CDP, DOM mutation or synthesized screenshot content.
export async function captureNativeDom(page, request) {
  if (!request || !Array.isArray(request.pages) || !request.pages.length) throw new Error('Native DOM pages required');
  const ids = new Set();
  for (const item of request.pages) {
    if (!item || typeof item.pageId !== 'string' || !item.pageId || ids.has(item.pageId) ||
        typeof item.canonicalRevision !== 'string' || !item.canonicalRevision || typeof item.url !== 'string' ||
        !/^https?:\/\//u.test(item.url)) throw new Error('Invalid or duplicate native page request');
    ids.add(item.pageId);
  }
  if (request.errorScreenshotPrefix !== undefined && (typeof request.errorScreenshotPrefix !== 'string' || !request.errorScreenshotPrefix))
    throw new Error('Nonempty caller-owned error screenshot prefix required');
  const initial = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
  if (!Number.isInteger(initial.width) || !Number.isInteger(initial.height) || initial.width <= 0 || initial.height <= 0)
    throw new Error('Actual initial viewport unavailable');
  const result = { version: 1, kind: 'ACTUAL_NATIVE_DESKTOP_MOBILE_DOM', at: new Date().toISOString(),
    nativeInput: request.nativeInput, visualTemplateReference: request.visualTemplateReference,
    pages: [], partialPages: [], errors: [], extraScreenshots: 0, initialViewport: initial, viewportRestored: false,
    limitation: 'Actual DOM, geometry and image loading; no pixel/fullsite acceptance claimed. Screenshots only on errors.' };
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const message = error => String(error?.message ?? error).slice(0, 2000);
  try {
    for (let pageIndex = 0; pageIndex < request.pages.length; pageIndex++) {
      const item = request.pages[pageIndex], viewports = [];
      let navigationFailed = false;
      for (const width of [1440, 390]) {
        let phase = 'viewport';
        try {
          await page.setViewportSize({ width, height: 1000 });
          await page.waitForFunction(w => innerWidth === w && innerHeight === 1000, width, { timeout: 10000, polling: 100 });
          if (width === 1440) {
            phase = 'navigation';
            try { await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 }); }
            catch (error) { navigationFailed = true; throw error; }
          }
          phase = 'images';
          await page.waitForFunction(() => [...document.querySelectorAll('main img')]
            .every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), null,
          { timeout: 10000, polling: 100 });
          phase = 'dom';
          const dom = await page.evaluate(() => {
            const main = document.querySelector('main');
            if (!main) throw new Error('Missing actual native main');
            const paragraphs = [...main.querySelectorAll(':scope > p')].filter(p => !p.querySelector('.cta'));
            const heading = [...main.querySelectorAll('h2')].find(h => h.textContent.trim() === 'Šaltiniai peržiūrai');
            if (!heading || !heading.nextElementSibling) throw new Error('Missing actual source heading/list');
            const sourceItems = [...heading.nextElementSibling.querySelectorAll('li')].map(li => {
              const anchor = li.querySelector('a');
              if (!anchor) throw new Error('Missing actual source anchor');
              const label = anchor.textContent.trim(), whole = li.textContent.trim();
              if (!whole.startsWith(label + ' — ')) throw new Error('Unexpected actual source structure');
              return { url: anchor.href, label, reason: whole.slice(label.length + 3) };
            });
            return { at: new Date().toISOString(), url: location.href, visibilityState: document.visibilityState,
              innerWidth, innerHeight, dpr: devicePixelRatio,
              clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
              scrollHeight: document.documentElement.scrollHeight,
              overflowX: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, 0),
              h1: main.querySelector('h1')?.textContent.trim(), description: paragraphs[0]?.textContent.trim(),
              body: paragraphs.slice(1).map(p => p.textContent.trim()), sourceHeading: heading.textContent.trim(), sourceItems,
              orderedLinks: [...main.querySelectorAll('a')].map(a => ({ url: a.href, label: a.textContent.trim() })),
              images: [...main.querySelectorAll('img')].map(image => ({ src: image.src, currentSrc: image.currentSrc, alt: image.alt,
                complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
                width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height })) };
          });
          phase = 'validation';
          if (dom.innerWidth !== width || dom.innerHeight !== 1000) throw new Error('Actual viewport does not match requested size');
          if (dom.url !== new URL(item.url).href) throw new Error('Actual native URL differs from requested page');
          if (!dom.h1 || !dom.description || !dom.body.length || !dom.sourceItems.length) throw new Error('Actual native content incomplete');
          if (dom.overflowX !== 0) throw new Error(`Horizontal overflow: ${dom.overflowX}px`);
          if (dom.images.some(image => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || image.width <= 0 || image.height <= 0))
            throw new Error('Actual native image not loaded or visible');
          viewports.push(dom);
        } catch (error) {
          const failure = { pageId: item.pageId, width, phase, message: message(error) };
          if (request.errorScreenshotPrefix) {
            const id = item.pageId.replace(/[^a-zA-Z0-9_-]/gu, '_').slice(0, 80);
            const path = `${request.errorScreenshotPrefix}-${runId}-${pageIndex}-${id}-${width}.png`;
            try {
              await page.screenshot({ path, fullPage: false, timeout: 15000 });
              failure.screenshot = path;
              result.extraScreenshots++;
            } catch (screenshotError) { failure.screenshotError = message(screenshotError); }
          }
          result.errors.push(failure);
        }
        if (navigationFailed) break; // Do not capture a prior page as the failed target.
      }
      const captured = { pageId: item.pageId, canonicalRevision: item.canonicalRevision, viewports };
      if (viewports.length === 2) result.pages.push(captured); else result.partialPages.push(captured);
    }
  } finally {
    try {
      if (typeof page.isClosed === 'function' && page.isClosed()) throw new Error('Own page closed before viewport restore');
      await page.setViewportSize({ width: initial.width, height: initial.height });
      await page.waitForFunction(s => innerWidth === s.width && innerHeight === s.height, initial, { timeout: 10000, polling: 100 });
      const restored = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      if (restored.width !== initial.width || restored.height !== initial.height) throw new Error('Actual initial viewport not restored');
      result.viewportRestored = true;
    } catch (error) { result.errors.push({ pageId: null, width: initial.width, phase: 'restore', message: message(error) }); }
  }
  result.ok = result.errors.length === 0 && result.viewportRestored;
  return result;
}

// Without request: self-contained (page, request) function source. With request:
// directly pasteable async(page) function for official browser_run_code.
export function nativeDomFunctionSource(request) {
  const source = captureNativeDom.toString();
  return request === undefined ? source : `async (page) => (${source})(page, ${JSON.stringify(request)})`;
}
