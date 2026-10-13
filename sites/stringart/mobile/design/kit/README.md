# MemoryString app asset kit

Prepared 13 October 2026 for the owner's selected warm ivory / forest / copper Android design. App copy is English. One current kit; the parent folder contains the 22 individually reviewed screen references and their exact prompts.

## Contents and use

| Folder | Contents | Use |
| --- | --- | --- |
| brand/ | Editable mark, monochrome mark, outlined Libre Baskerville wordmark, PNG exports, splash mark | Home, About, header and launch identity |
| icons/svg/ | 45 original 24 × 24 SVG icons, 1.8-unit rounded stroke | Navigation and every named app action |
| icons/png/ | Forest and white icons at 24/36/48/72/96 pixels | Raster fallback at Android density scales; SVG/vector is preferred |
| android/res/ | Matching vector drawables, fonts, colours, type, button/field/tile/sheet shapes, strings and adaptive launcher | Copy/merge into Android resources; references compile and link against SDK 35 |
| android/play-store-icon-512.png | Square, full-background 512-pixel icon | Prepared icon export; does not publish an app |
| fonts/ | Roboto variable and Libre Baskerville variable, TTF/WOFF2, full OFL notices, glyph/axis verification | Self-hosted offline typography |
| frames/ | 42 cm/200, 50 cm/240, 60 cm/300 exact pin diagrams, SVG/PNG; 200-pin numbering help | Frame choices and help |
| threads/ | Black/Cyan/Magenta/Yellow SVG/PNG swatches | Thread choice and current layer indicators |
| rasters/ | Transparent home string portrait, clean AI sample photo, transparent black/C/M/Y spool PNGs | Home, sample editor, thread choice and layer change |
| illustrations/ | Original geometric empty-project frame, SVG/transparent PNG | Empty library |
| detail/ | Three actual solver-generated SVG/PNG samples and actual counts | Detail choice examples; Detailed/Fine can coincide |
| samples/ | Three valid full-path MemoryString project JSON fixtures | Explicitly labelled sample/import testing, never seeded as real customer projects |
| tokens/ | Named colour, space, type, radius and touch tokens; offline font CSS | Shared implementation values |
| strings/en.json | English static copy and dynamic message templates | Live UI text; fill templates with actual data |
| licences/ | Exact bundled MIT solver notice | In-app licence viewer |
| asset-prompts.json | Built-in ImageGen prompts and source filenames for illustrative rasters | Provenance and later targeted edits |
| manifest.json | Per-file byte counts and SHA-256 | Integrity and handoff |

## Map to all screens

- Home: mark + live wordmark, home-dog-string-art PNG, plus/folder/settings icons.
- Photo editor: real chosen photo or clearly labelled sample PNG; image/rotate/zoom/movement/sun/contrast/reset icons. Crop/grid/sliders are live code.
- Frame/thread: exact frame diagrams, spool-black PNG, CMYK swatches, actual detail thumbnails, info/radio states.
- Generation: live solver canvas/progress and close/back controls; no static fake-progress bitmap.
- Preview: live algorithm result, image/eye icons, title field, save actions. Thread length uses actual stored paths.
- Guide idle/running: live pin geometry, arrow/play/pause/speaker/repeat/settings/check/clock; number and progress text remain live.
- Voice options/unavailable: speaker/speaker-off/lock/moon/external-link/retry icons; installed voice metadata and live controls.
- Colour stop: matching C/M/Y/K spool PNG, named swatches, current actual layer pin and explicit confirmation.
- Completed: live completed result + check/thread/download/folder/plus.
- Projects/empty/actions/rename/delete: actual thumbnails, empty-project SVG, folder/plus/upload/file-json/play/pencil/download/trash/close icons; keyboard is native.
- Settings/help/About/licences/errors: lock/info/alert/phone/code/flask/hand-heart/frame/thread/help icons and live English copy.

## Implementation rules

Use Roboto for operations and numbers. Use Libre Baskerville for the brand and home display only. The wordmark SVG contains outlines and needs no external font to render; an accessible brand label must still be provided. Use bundled font files offline rather than requesting Google Fonts in runtime. Normal body is 16 sp, hints 14 sp, titles 24 sp and guide pins around 56 sp. Respect system text scale, safe insets, native Back and keyboard resizing.

SVGs use currentColor when inlined. External SVG image tags do not inherit a surrounding text colour; use the supplied forest/white PNG or inline the SVG. Android drawables can be tinted with ImageView.setImageTintList. Their 24 dp artwork belongs inside a minimum 48 dp touch area. Do not use icon names or Unicode characters as visible replacement icons.

Merge Android resources by the ms_ prefix; select the new launcher/theme deliberately when implementing the design. Existing app files are not overwritten by this preparation. The adaptive foreground stays within the central safe area; API 33 resources add a monochrome themed icon. Legacy density icons are also included. Runtime lists, fields, selection, focus, disabled/error states, speech, persistence and dialogs must be implemented as working code.

Do not ship the screen PNGs as full-screen UI. Render user photos, thread paths, thumbnails, pin labels and progress from real data. Frames match the declared counts; pin 1 is at the top, clockwise. A 200-pin frame has quarter pins 1/51/101/151. Different frames must derive their own labels.

ImageGen home art and spool photos are decorative illustrations, not a physical kit sample or supplier product specification. The generated dog portrait must not stand in for an algorithm output. The clean dog photo is an AI sample. Actual pinned solver outputs reach 1,400 connections for Quick and 1,430 for both Detailed and Fine on this input; chosen limits are maxima. The reference image's 1,832/490 m values are design fixtures. Actual straight thread estimates for the real sample are recorded in detail/solver-results.json and exclude wraps/knots.

The thumbnail renderer draws each connection separately so overlap accumulates opacity. Its visual stroke is a display choice; kit/portrait physical acceptance and final on-device rendering are still separate app work.

## Rights and regeneration

Fonts were downloaded from google/fonts commit 66928797f271fed5ee428544e7229685e2d90127. Keep both fonts' full SIL Open Font License 1.1 notices when redistributing. The solver's MIT notice is retained. Icons, geometric diagrams and mark are original code-drawn artwork; generated rasters use built-in ImageGen. No competitor UI assets or proprietary application code were extracted.

Sources: [Roboto](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/roboto), [Libre Baskerville](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/librebaskerville). Licence text and files are included locally; no runtime network is needed.

From the parent design/ directory, build-kit.mjs regenerates vector/density/font exports and manifest, and build-samples.mjs runs the actual pinned solver on the included sample. Dependencies used: Node 24, bundled Sharp, Python 3.12, FontTools 4.66.1 and Brotli 1.2.0. FontTools/Brotli were installed in a task-specific cache, not the shared Python runtime. Point PYTHONPATH to that cache, pass --python for the bundled Python and --modules for a different Sharp package directory. --fetch-fonts is optional; normal regeneration uses the included font originals. The completed kit and screen files can be used directly without running these tools.

Prepared assets are ready for integration. This is not evidence that all new app screens or the final physical threading workflow have been implemented and accepted.
