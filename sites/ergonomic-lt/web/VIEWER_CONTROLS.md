# Shared product 3D controls

Owner request: apply the approved DUO-BACK interaction to all product
configurators, after coordination with the material grouping work (#313).
Source reservation: #314. Published starting point: `483220d31c721f2f3d7314beb332d735a1dba307`.

## Independent preparation

`src/lib/viewer-controls.ts` contains camera and page-input behavior only.
It does not import or mutate chair/desk material plans, source assets, mesh
identity, selections, URLs, quotes or PDFs. The renderer integration is a
separate step and must preserve the later material grouping commit.

- `bindProductPageScroll(canvas)` runs after OrbitControls connects. It keeps
  wheel events uncancelled for native page scroll and permits vertical touch
  scroll. Dispose it before disposing the controls.
- `createProductViewControls(camera, controls)` disables pan and cursor zoom,
  locks target/cursor to the actual product center, and permits underside
  rotation. `frame(bounds, aspect)` initializes a visible assembly.
- `resize(aspect)` preserves close inspection or adapts whole-product framing.
  The renderer owns projection/aspect/view offsets and calls its render after
  these operations. Its aspect input excludes the floating toolbar width.
- `geometry(visibleBounds)` reframes after an admitted part swap, including
  after a surface disappears. A material-only change must not reframe.
- `move(action)` keeps zoom bounded and rotation centered.
- `toggleInspection(findProvedSurface)` inspects at 0.18 m; the second call
  restores the whole product and rotation. `reset()` also restores it.
- `upholsteryInspectionTarget(meshes)` raycasts only caller-proved upholstery
  meshes. It returns an actual source triangle hit, including split pads,
  or `undefined`. It never identifies fabric from a name, color or hash.
- `below` allows the renderer to hide only its showroom/contact-shadow
  receivers when looking from underneath. Original product meshes stay intact.

## Controls-only integration

The public candidate branch `codex/ergonomic-controls-public-20261031` wires
this helper into the common Viewer3D on top of the published `483220d3` source.
It does not include the material grouping draft's UI, engine, PDF or original
material clone changes. The combined draft was tested separately and is not
the public candidate's acceptance record.

Implemented in the controls-only candidate:

1. The shared Viewer3D uses the helper while preserving the published
   original-material restoration, chair extras and desk assembly logic.
2. Resolve upholstery candidates from own source primitive roles; disable
   disable inspection where there is no proved upholstery target. Desks do not
   acquire a fabricated fabric target.
3. Remove the fullscreen toolbar button for all product viewer paths; do not
   carry the old pilot's fullscreen CSS or overwrite the material controls.
4. Name the contact shadow receiver without changing its object-only projection
   or restoration behavior. Update center only after actual geometry changes.
5. Test old/PC2 chairs, 4ME mesh and a wide desk in the actual
   browser on desktop/phone. The unit tests below are not browser/touch proof.
6. The main 3D chat performs the single coordinated publication, after source
   and D60/E150 gates. No Native or separate publisher is authorized here.

## Regressions

`node --import tsx --test tests/viewer-controls.test.ts tests/viewer-depth.test.ts tests/viewer-quality.test.ts tests/viewer-assembly.test.ts`

The initial helper's 19 cases passed with actual Three.js cameras and OrbitControls. They cover
chair/desk framing, attempted target displacement, close-view toggle and zoom
limits, portrait resize, underside orbit, geometry replacement, page-event
cleanup and real ray intersections. EventTarget input fixtures do not replace
native browser wheel or physical phone gesture acceptance.

The controls-only candidate adds `viewer-upholstery.ts`: full asset SHA/byte
verification occurs before inspecting the parsed source node, exact primitive
association, original finishField and single-material primitive. Unknown or
mixed roles do not become upholstery. No primitive or source material changes.
37 focused controls/roles/assembly/color-admission/contact-shadow tests passed.
Final candidate browser evidence is stored separately from combined-draft
evidence under the task's local output, with physicalPhone false. Public
publication remains a separate acceptance by the main 3D chat.
