# MemoryString Android screen specification

Current selected direction, 13 October 2026. The owner selected the warm ivory, forest green and copper-thread concept. All app copy is English. This folder contains one current screen set and its generation prompts; the live layouts are now implemented in the creator. This folder records concept/asset provenance; device acceptance is recorded separately in ../ACCEPTANCE.md.

## Visual and interaction system

- Operate mode: clear pin numbers and comfortable controls take priority during building. Home and preview give the artwork more space.
- Colour: ivory `#F7F5EF`, forest `#164D40`, dark ink `#183D35`, copper `#B57859`. Warning and destructive actions have restrained amber/red treatment, labels and icons; colour alone never carries their meaning.
- Type: Android system sans serif for body, labels, instructions and numbers. Serif for the wordmark and home display headline only. Functional body starts at 16 sp, secondary hints 14 sp, screen titles 22–24 sp and current pin numbers approximately 52–56 sp. Respect Android font scale; expanded text can make screens scroll.
- Geometry: nominal 390 × 844 dp portrait, 20 dp side margins, an 8 dp spacing rhythm, minimum 48 dp touch areas, native status/gesture/keyboard insets. Primary buttons stay reachable; the guide's essential numbers and actions fit the normal portrait viewport.
- Navigation: Android Back follows the app history. Back in an editor preserves the draft; leaving a running calculation requires cancellation; leaving the guide stops narration. Bottom sheets close before navigation. Cancellation and deletion require distinct, explicit actions.
- Selection tiles use an outline and radio/check mark. Disabled actions remain readable and cannot run. Errors explain how to recover. A long artwork name wraps rather than covering controls.

## Individual screens

Each numbered PNG is one screen or one important screen state. Native Android file pickers, permission panels and speech settings are supplied by Android and are not rebranded app screens.

| File | Screen | Required behaviour |
| --- | --- | --- |
| [01-home.png](screens/01-home.png) | Home | Create opens the Android image picker, My projects opens local projects, sample loads a clearly identified sample, gear opens Settings. |
| [02-photo-editor.png](screens/02-photo-editor.png) | Photo editor | JPG/PNG/WebP up to 8 MB; zoom 1–3×, horizontal/vertical position, rotate in 90° steps, brightness −50 to 50, contrast 0.5–2.0, reset. Continue requires a decoded photo. |
| [03-frame-and-thread.png](screens/03-frame-and-thread.png) | Frame & thread | 42 cm/200 pins, 50 cm/240 pins, 60 cm/300 pins; black or separate C/M/Y/K layers; limits 1,400/2,400/3,500. Match an actual frame before physical use. |
| [04-generating.png](screens/04-generating.png) | Generation | Real worker progress and connection count; cancellation discards partial output. Do not invent a remaining-time estimate. Completion can precede the chosen connection limit. |
| [05-preview-ready.png](screens/05-preview-ready.png) | Preview | Toggle original/thread view, edit title (maximum 80 characters), inspect frame/count/straight-chord thread estimate, return to adjustments, save locally or save and begin. Estimates exclude wraps and knots. |
| [06-build-guide.png](screens/06-build-guide.png) | Paused guide | Current from/to pins, instruction, diagram, completed progress, previous/mark done, repeat, voice options, local save status. Marking done advances and persists; simply reading a connection does not mark it complete. |
| [07-guide-playing.png](screens/07-guide-playing.png) | Narration running | Explicit pause; advance only after the speech callback and chosen pause. Manual movement stops automatic speech. Hidden/locked app pauses guidance. No microphone or speech recognition. |
| [08-voice-options.png](screens/08-voice-options.png) | Voice options sheet | Installed offline English voice, rate 0.7–1.3×, pause 3–20 seconds (default 5), test voice. Keep awake only while guidance runs. Changes stop old speech/timers. |
| [09-colour-layer.png](screens/09-colour-layer.png) | Colour change | Show the new thread colour and starting pin. Require Ready before continuing over a layer boundary. This confirmation gate is implemented. |
| [10-completed.png](screens/10-completed.png) | Completed instructions | Full completed count, kit-specific finishing reminder, local projects, backup export, new artwork. The app records instruction progress; it cannot certify the physical result. |
| [11-my-projects.png](screens/11-my-projects.png) | Populated library | Real local thumbnails, frame/layers/count/progress, continue/start/view, project actions, new and import. The three illustrated cards are design fixtures, not real customers. |
| [12-empty-projects.png](screens/12-empty-projects.png) | Empty library | Create, sample or import, plus concise local-backup guidance. |
| [13-project-actions.png](screens/13-project-actions.png) | Project actions sheet | Resume/view, rename, export JSON, delete, cancel. Rename is a planned addition. Completed projects show View rather than Continue. |
| [14-delete-confirmation.png](screens/14-delete-confirmation.png) | Delete confirmation | Identify the exact project, offer export, cancel or delete only that local project. Export opens Android's document picker and does not itself delete the project. |
| [15-settings.png](screens/15-settings.png) | Settings | English interface, voice options, import/export help, local privacy, frame guide, About and licences. No account/cloud controls in this local creator scope. |
| [16-frame-help.png](screens/16-frame-help.png) | Frame guide | Explain pin 1 at the top, clockwise numbering, wrapping and thread changes. The illustrated quarter labels apply to a 200-pin frame; other frames use their own labels. |
| [17-about.png](screens/17-about.png) | About | MemoryString identity, local storage, actual included MIT solver attribution, full licence action, physical validation status and approved operator contact. |
| [18-photo-error.png](screens/18-photo-error.png) | Invalid photo | Correct format/size guidance, choose another, return home; Continue unavailable until valid input. |
| [19-import-error.png](screens/19-import-error.png) | Invalid project import | Strict MemoryString JSON validation, maximum 400 KB, retry/back; existing projects remain intact. Successful imports receive a new local ID. |
| [20-voice-unavailable.png](screens/20-voice-unavailable.png) | Missing offline voice | Open Android speech settings, check again, or continue manually. The native settings recovery action is implemented. |
| [21-rename-artwork.png](screens/21-rename-artwork.png) | Rename with keyboard | Named input, 80-character limit, Cancel/Save remain visible above the native keyboard. |
| [22-open-source-licences.png](screens/22-open-source-licences.png) | Licence viewer | Full bundled MIT notice and font OFL notices in live, scrollable text; preserve the original wording. |

## Core flow

Home → native photo picker → Photo editor → Frame & thread → Generation → Preview → Build guide → Completed. My projects can resume the guide at its last completed connection. Settings and Help are reachable from Home; the guide can open Voice options. Four-colour guides insert a colour-change stop between separate thread layers.

Cancellation returns to the editor with the draft intact. Regeneration never overwrites a saved project silently. Back from Preview retains the photo and settings. Native picker cancellation keeps the existing state. Imported projects open from their validated full paths, not a re-created image approximation.

## Additional states to implement with the same components

- Photo picker cancelled: unchanged draft; no error message needed.
- Generation failure: readable worker error, Retry and Adjust settings. Keep the source photo; discard incomplete output.
- Storage save failure: state **Save failed**, retry or export; never show Saved before IndexedDB confirms success.
- Export cancelled/failed: retain project, allow retry, do not imply a file was written.
- Rename: text input prefilled with the title, maximum 80 characters, Save/Cancel, blank name validation. Keyboard-safe sheet/dialog using the established form and button components.
- Speech engine error: stop auto-advance, show a message, manual Next remains available. A watchdog and speech epochs prevent stalled or old callbacks from advancing.
- Layer confirmation: never read/advance the next colour before user readiness. Show the actual starting pin from the stored layer path.
- Library completed/empty states: derive from actual local data; no placeholder records in the released app.
- Licence viewer: scrollable exact bundled MIT notice, preserving its attribution and full terms.

## Asset production map

| Reusable element | Production form | Used in |
| --- | --- | --- |
| MemoryString circular thread mark | Own vector drawable/SVG, with small-size legibility check | Home, About, app icon |
| Intro golden retriever illustration | Separate high-resolution bitmap, cropped to circle; retain generated-art provenance | Home only |
| User photograph, preview and guide | Live on-device canvas rendering, never a hardcoded screenshot | Editor, Preview, Guide, completion, library thumbnails |
| Frame options / pin diagram | Parameterised vector/canvas with actual pin counts | Frame setup and Help |
| Thread swatches | Native/vector black and actual cyan/magenta/yellow/black indicators | Setup and layer stop |
| Detail thumbnails | One consistent sample at three solver settings, with labelled limits | Frame setup |
| Navigation / document / speaker / trash icons | One consistent own/native vector icon family | All screens |
| Controls, sheets, dialogs and status treatments | Editable native/code components | All screens and errors |
| Empty-project illustration | Own simple thread-frame vector | Empty library |

The screen PNGs guide layout and appearance. They are not shipped as whole-screen raster UI. The app must use live text, working controls and actual algorithm output. The prepared asset pack is in [kit/](kit/), with its [integration guide](kit/README.md) and file manifest. The selected runtime assets are bundled by ../build.mjs; unused density exports remain available in the kit.

## Precision and review

Exact intended copy, constraints and the original built-in ImageGen prompts are maintained in [screens.json](screens.json). Generated pixels can deviate in labels or positions; the written functional specification and actual data take priority during implementation. Counts, names and thread estimates shown in these design images are illustrative fixtures.

All 22 selected images were inspected sequentially after generation, including their final repairs. Required English actions, CMYK, current/completed counts, recovery and keyboard visibility were checked. Targeted repairs removed incorrect quarter labels from the guide, reduced its diagram, replaced invented library backgrounds/dates in dialogs, and put voice sheets over the actual guide. The guide uses 113 → 27; 112/1,832 completed rounds to 6%. The 200-pin help uses 1/51/101/151.

Generated typography and illustrated pin dots are concept guidance; exact fonts and geometric pin counts are supplied by the kit. Functional headings use Roboto even where the image generator used a serif. Source photo, portrait counts and sample names in screen images remain illustrative. The actual sample solver finishes Quick at 1,400 connections and both Detailed/Fine at 1,430; do not replace these real results with the more photorealistic generated illustration.

Actual Android captures, font enlargement, keyboard/Back and device workflow evidence are recorded in ../ACCEPTANCE.md. Mockup inspection is separate from that runtime evidence.
