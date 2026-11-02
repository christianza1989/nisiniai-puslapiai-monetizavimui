# Common product performance candidate

Issue319; based on the published99eda1f release, with256chairs and88desks.

This candidate preserves automatic3D, model registries, all original geometry and
material identities, source validation, controls, choice availability and reset.
Native collection and pending material-group PR316 are outside its scope.

Changes:
- Native streaming HTTP gzip for models; original decoded SHA and MIME retained.
  Negotiate using Cloudflare's original client encoding, preserve ranges/errors,
  and cache only content-addressed model/environment paths as immutable.
- One baked RGBA16F CubeUV environment from the unchanged RoomEnvironment/PMREM
  recipe. No8bit conversion, texture reduction or model changes. A960000-channel
  representative PBR render comparison had zero differences. Bind its exact
  original source, dependency and preset hashes; fail the build after changes.
  A missing or invalid environment uses the original full-quality generator.
- Reuse the renderer/environment while changing geometry. Prepare the unchanged
  projection/blur and product shader programs asynchronously before first draw.
- A24MB LRU retains verified bytes; each mutable model scene is still parsed
  independently. Every cache hit is rehashed before parsing. Length/SHA checks,
  the32MB input cap and abort behaviour remain.
- Full-resolution HTML material images are decoded asynchronously into bitmaps
  with the same orientation/alpha/colour-space behaviour. Pre-upload each active
  texture in separate tasks, including the original environment texels; preserve
  all image dimensions and sampling. Unsupported bitmap decoding retains the
  original image path. Never reinitialize existing render-target textures.
- Separate quote display labels and the selected-model selector from catalog/
  editorial modules so generic site clients avoid these dependency graphs.
- Shared logos use responsive variants from the canonical Core media pipeline;
  the original owner artwork, text, native ratio and dimensions remain.

Reproduction and publication:
1. Run the focused viewer/material/control/identity/quote regressions, both
   TypeScript checks and scripts/check-product-environment.mjs.
2. Compile with a fresh isolated E-backed ERGONOMIC_BUILD_ROOT exposed under
   D:/Core/output; preserve the currently deployed and rollback builds.
3. Retain all344 current configurators, every original model asset and rollback
   chunk in the existing asset manifest. Add the five Core logo variants and the baked
   environment from COMMON-NEW-ASSET-ROWS-v2.json (exact SHA/size required).
   Keep Wrangler assets.run_worker_first for /models/configurator/*; a custom
   multipart publisher must preserve it in metadata.assets.config.run_worker_first.
   The asset JWT alone does not carry this routing setting. Preserve the existing
   html/not-found handling, bindings, compatibility, secrets and preview headers.
4. Test the actual built Worker on a desk and contrasting chair paths, desktop/
   phone, choice changes, original reset, zoom/orbit/scroll and PDF. Compare cold
   and warm performance against the same baseline on the same machine.
5. Reconcile the sole preview publisher, exact live version/source and rollback
   before a preview publication. Production Launch remains excluded.

Offline regeneration uses scripts/bake-product-environment.ts with the same
Three version and unchanged scene recipe. Read every original half-float texel,
qualify representative actual model renders against the generated environment,
then save a new content-addressed binary and descriptor. Do not silently rewrite
an existing immutable asset. This asset is a shared lighting derivative, never
a replacement for supplier model source.

Detailed runtime measurements and qualification evidence are under
D:/Core/output/ergonomic-performance-20261102. Public performance scores are not
claimed by a successful build or a local measurement.

Final local qualification of code eda22b4b (same-machine alternating cold Chrome
profiles, Lighthouse13.6.0): desktop67/68 to95/96, TBT1065–1241ms to115–127ms;
mobile47 to55, TBT4932ms to1176ms. Total initial transfer12,169,998B to7,475,017B.
Mobile still warrants later model/texture analysis; this is not a public PSI score.
Four actual models on desktop/phone retain controls and choices; twenty stage
comparisons and four additional DPR2 phone comparisons are pixel-identical.
Geometry changes reuse one renderer context instead of creating three on a
change/restore cycle. Both TypeScript checks and source-bound environment check pass.
Of52 focused unit cases,51 pass; the remaining preexisting quality case requires
an untracked historical .impeccable report/public media projection absent from this
isolated checkout. It was not weakened or marked passed. Separately, all eight
original1024px albedos retain their manifest SHA/size/dimensions, all six shared
derivatives retain exact SHA/size, and actual model images remain identical.
Three model PDFs return200 with the same byte counts; KEM2013WW009 default PDF
already returns400 in baseline and the existing public preview as well as this
candidate. That unrelated failure is recorded, not claimed fixed.
