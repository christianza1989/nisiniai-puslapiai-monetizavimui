# GitHub string-art assessment

13 October 2026. The [user-supplied topic](https://github.com/topics/string-art) showed 24 entries; the live GitHub API returned 25, incomplete_results=false. This is a dated inventory, not every string-art project on the Internet.

## Scope and decision

Collected README, tree and licence-file information for all 25, including two lowercase readme.md files. Classification: 13 identified MIT, three GPL-3.0, nine with reuse rights unconfirmed. Six selected projects received targeted solver/guide/export/licence inspection. Halfmonty, MarginallyClever, Vrellis and kmmeerts were additional resources. This is not an all-engine benchmark or exhaustive security audit.

Selected initial engine: [TrevorPeters0n/string-art-studio](https://github.com/TrevorPeters0n/string-art-studio), MIT, commit `004a7b7481e45a951d2348a11870c531d926b29f`. Only its self-contained worker was copied, with attribution. Its anti-aliased thread model scores pixel-error reduction, handles separate colour layers and stops when no useful move remains. We add bounds validation, our own UI, exact frame metadata, full-project persistence and speech state control. No upstream UI, photos or packages are copied.

Different engines have different numbering, start angles, thread models, continuity and licences. Combining them blindly can generate instructions that cannot be made from a continuous physical thread. Machine control needs a separate supplier format and physical acceptance.

## Complete dated topic inventory

| Repository | Rights inspected | Selection/use |
| --- | --- | --- |
| [piellardj/image-stylization-threading](https://github.com/piellardj/image-stylization-threading) | GPL-3.0, LICENSE.md | Mono/colour/SVG reference; no copied code |
| [neumann-mlucas/StringArt.jl](https://github.com/neumann-mlucas/StringArt.jl) | MIT file | RGB/palette/adaptive restart study; Julia not initial phone runtime |
| [spejamchr/string_art](https://github.com/spejamchr/string_art) | MIT file | Rust, multiple threads/backgrounds/JSON; alternative engine |
| [omar-abdelgawad/string-art-app](https://github.com/omar-abdelgawad/string-art-app) | MIT file; archived | Rust/WASM/Tauri; requires maintenance assessment |
| [nitograph/nitograph](https://github.com/nitograph/nitograph) | UNVERIFIED | Digit model, different customer job |
| [wp-xyz/StringArt](https://github.com/wp-xyz/StringArt) | MIT file | Desktop Pascal comparison candidate |
| [ndbaker1/string-bean](https://github.com/ndbaker1/string-bean) | MIT file | Rust library/CLI/SVG, possible WASM track |
| [loiccoyle/strandify](https://github.com/loiccoyle/strandify) | MIT file | Rust/WASM and beam search; future speed/quality comparison |
| [fjzll/StringArtGeneratorLili](https://github.com/fjzll/StringArtGeneratorLili) | README says MIT; LICENSE not found | Clarify rights before integration |
| [afnan-nex/cats-cradle](https://github.com/afnan-nex/cats-cradle) | MIT file | Gesture/virtual-pattern experiment, different workflow |
| [Hvrnbi/p2sa](https://github.com/Hvrnbi/p2sa) | MIT file | Rust library/CLI, not full mobile guide |
| [zhonglinxin/StringAr](https://github.com/zhonglinxin/StringAr) | MIT file | Small repo; product link does not prove full engine access |
| [arijit4/String-Art](https://github.com/arijit4/String-Art) | UNVERIFIED | Processing; not selected for initial integration |
| [241120nzdjjx/StringArtHelper](https://github.com/241120nzdjjx/StringArtHelper) | GPL-3.0 plus additional terms | Android voice/buttons/archive/template UX reference |
| [vxjnc/StringArt](https://github.com/vxjnc/StringArt) | GPL-3.0 file | C++/OpenCL/colour; not initial phone engine |
| [BeanLiu1994/grey_lines](https://github.com/BeanLiu1994/grey_lines) | UNVERIFIED | Linear optimization; README discusses simplified constraints |
| [TrevorPeters0n/string-art-studio](https://github.com/TrevorPeters0n/string-art-studio) | MIT file | Selected worker: anti-alias, SSE gain, colour layers |
| [mahdijamshidpour/String-Art](https://github.com/mahdijamshidpour/String-Art) | MIT file | Simple browser baseline candidate |
| [atomAltera/string-art-studio](https://github.com/atomAltera/string-art-studio) | UNVERIFIED | Rust/WASM, anti-alias/SSE; integration deferred |
| [dylanatl15/StringArtGenerator](https://github.com/dylanatl15/StringArtGenerator) | UNVERIFIED | Python/Streamlit, average density/taboo; no copied code |
| [malandereideen/stringartmaker](https://github.com/malandereideen/stringartmaker) | MIT file | Arbitrary pin coordinates, manual SVG/JSON designer |
| [cristianrubioa/stringweave](https://github.com/cristianrubioa/stringweave) | MIT file | Worker/cache/edge boost/player; targeted reference |
| [IamOumarIbrahim/digital-filography](https://github.com/IamOumarIbrahim/digital-filography) | UNVERIFIED | Recognition study, not complete continuous-thread guide |
| [ThetaMogwai/String-Art-Generator](https://github.com/ThetaMogwai/String-Art-Generator) | UNVERIFIED | Radon, author describes discontinuous lines; not direct physical instructions |
| [Artovalack/string-art-studio](https://github.com/Artovalack/string-art-studio) | UNVERIFIED | Interactive pin/line editor; no copied code |

UNVERIFIED means a suitable reuse basis was not established for this adoption; it does not claim the author has never licensed anything elsewhere. GPL permits commercial use under its applicable terms; it is not equivalent to MIT. Licence notices do not automatically license third-party images, branding, proprietary services or dependencies.

## Targeted inspection and lessons

- Trevor: full worker and guide inspected. Its short initial-pin fingerprint is not adopted; our saved UUID and full layers remain distinct. Actual mono/RGB worker regression is executed.
- Cristian: algorithm, test and export paths inspected at fe7070d27ecb97d79e460b9ce93a0eabfb8726b3. Inferring pin count from the largest used pin fails when the sequence never uses the last pin; our JSON declares its frame.
- Strandify: pather.rs, line.rs and WASM paths at 20a4eb033206ce5b3757c90df7daf4083e6907e4. Greedy/beam phone performance needs measurement before adoption.
- Julia: src/StringArt.jl reviewed for RGB/palette/adaptive restart. Physical continuity across restarts needs a separate check.
- StringArtHelper: Android README.en and additional terms inspected. Offline CN/EN voice, volume/headset/wearable controls and tiled templates are useful references. No code, APK, Xiaomi SDK or identity copied. Additional conditions concern notices, marking changes and no false endorsement.
- Piellardj: actual GPL-3.0 LICENSE.md and colour/SVG description inspected. Not used in our package.

## Extra user-provided sources

[halfmonty/StringArtGenerator](https://github.com/halfmonty/StringArtGenerator), MIT, commit f9c996fd1cd5a3d1f8c4f90aa0dc9f98e3fd67b0: the older generator is indexold.html; current index.html points to a separate StringRing commercial product. The repo's MIT licence does not grant that later product's proprietary source. Its greedy principle was studied; current implementation uses Trevor's worker.

[Petros Vrellis](https://artof01.com/vrellis/works/knit.html) describes 200 supports, thousands of spans and computer-guided manual making. This page is not an open-source licence. Its mention of the MIT institution is different from an MIT software licence. The physical and digital thread model must agree; photographs/code are not freely adopted by implication.

[MarginallyClever/weaving_algorithm](https://github.com/MarginallyClever/weaving_algorithm) uses Processing and greedy/Radon approaches under GPL-2.0. No code is copied into our current app.

[kmmeerts on Reddit](https://www.reddit.com/r/DIY/comments/au0ilz/made_a_string_art_portrait_out_of_a_continuous_2/) describes continuous sequence, line weight, progress/resume and tangling. His roughly twenty-hour example is not a universal manufacturing time. A commenter/user estimate of frame forces is not an engineering safety specification.

## Acceptance and remaining comparison

Current source-bound outcome is in sites/stringart/mobile/ACCEPTANCE.md: real worker tests, browser image processing, local save/reload, English voice callbacks, responsive text checks and Android build/package evidence. Compile, phone, frame and machine states remain separate.

No blind real-portrait quality comparison across all 25 engines was run. No physical frame or NOVA machine was tested. Selection is based on clear rights, bounded computation, continuity and actual local tests; it is not a claim of the world's best engine.

Next comparison uses the same 3-5 permitted face/pet/couple photos, frame, thread and constraints. Measure runtime, span/thread estimate, recognition and physical result. Adjust alpha, connections and contrast against those outcomes; pixel-error reduction alone does not accept a physical portrait.

Raw API, README, targeted sources and hashes stay in private tmp. Third-party pictures, telemetry and document instructions are not imported as our product facts or task authorization.
