# Homepage illustration module

The approved standalone homepage source is `research/header-hero-html-2026-10-10/src/configurator-demo.js`. Its `demo-state.mjs` and `demo-assets.json` are preserved byte for byte here. The illustration offers five original upholstery colors, three armrests and two headrest states (30 examples), with independent state for every mount.

`configurator-demo.js` adapts that source to `mountDemo(rootElement)`, which returns an idempotent cleanup function. Pass the `#konfiguratorius` element (or its enclosing homepage root). The required scoped descendants are `.hp-demo-stage` with a canvas, `.hp-demo-status`, `.hp-demo-rotation`, `.hp-demo-swatches`, and `.hp-demo-reset`. Armrest and headrest buttons keep their existing `data-armrests` and `data-headrest` values; swatches keep `data-code`.

Load `/media/home-final/demo.js` in the browser from the React effect, using `webpackIgnore`, `turbopackIgnore`, and `@vite-ignore` comments for the applicable bundlers. The module exports only `mountDemo`, has no DOM effects before mounting, and initializes WebGL when the stage approaches the viewport. Return its cleanup from the effect. If an import finishes after the effect has unmounted, do not call `mountDemo`.

Cleanup aborts GLB fetches, invalidates late parsing results, removes native listeners with an AbortController, disconnects both IntersectionObservers and the ResizeObserver, stops animation, and disposes OrbitControls, assembly and room geometry/materials, original and cached textures, the contact shadow, environment render target, light shadow, and renderer. A repeated mount on the same root cleans up the earlier instance. Hover, focus, dragging, page visibility and reduced motion still pause rotation.

Rendering uses the existing `src/lib/viewer-materials.ts`, `finish-materials.ts`, `viewer-camera.ts`, `contact-shadow.ts`, and `showroom.ts` helpers. The manifest points directly to the existing `/models/...` and `/media/...` public assets; it neither copies geometry nor links illustrative choices to product configuration, URLs, or browser storage.

From the web directory, run:

```powershell
node scripts/home-final-demo/build.mjs
node scripts/home-final-demo/verify.mjs
```

The build uses the already installed `node_modules/esbuild/lib/main.js` and adds no dependencies. `asset-checksums.json` records the actual approved public bytes from the prototype's `configurator-demo-provenance.json`; the material manifest's `sourceSha256` describes supplier source images before their existing optimization. Verification checks all 30 states, 150 headrest/color return combinations, public asset availability, approved geometry/texture hashes, runtime isolation, the final ESM export, lazy cleanup and repeated mounts. Browser integration is checked with the mounted homepage separately.
