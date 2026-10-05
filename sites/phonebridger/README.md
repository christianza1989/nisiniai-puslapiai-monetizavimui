# PhoneBridger project module

The owner's existing English homepage and interactive simulation now travel
with the private project repository. Native applications remain in
[PhoneBridger](https://github.com/christianza1989/PhoneBridger). This integration
does not create a public content package or a real creator revenue backend.

## Run on another machine

Clone the two repositories as siblings using the names in
[MULTI_MACHINE](../../docs/MULTI_MACHINE.md). Until merged, check out
`codex/phonebridger-integration-20261005` in both. In the private checkout:

```powershell
. ./scripts/activate-workspace.ps1
npm ci --prefix content-studio
node sites/phonebridger/bootstrap.mjs
```

In the sibling `dovanos-memorycasting` checkout:

```powershell
npm run install:ci
npm run dev -- --hostname 127.0.0.1 --port 5188
```

Open `http://127.0.0.1:5188/__projects/phonebridger/`. No extra local source
checkout is needed for the preview. The shared Vite adapter verifies immutable
manifest files, serves only listed assets, supports MP4 range requests and
rejects non-loopback connections and public Host headers. It exists only in
development; nothing from `prototype/` is copied into public/dist. A missing
companion prototype leaves other projects unchanged.

`bootstrap.mjs` uses the shared studio locking/model APIs, registers `en` and
creates one unapproved homepage draft in ignored studio data. Re-running it
does not overwrite an existing project, draft, approval or job. It refuses
identity/contact/locale collisions. It does not approve, export, import, send
email or start a worker. The standard studio can review the draft later.

## Update the prototype deliberately

```powershell
node sites/phonebridger/snapshot.mjs C:/path/to/PhoneBridger/design/website/homepage
node --test sites/phonebridger/prototype/tests/*.cjs
```

Review the exact diff and manifest before committing. Existing responsive
WebP assets and video bytes are copied unchanged; new editorial images must
use the shared [MEDIA_CORE](../../MEDIA_CORE.md) importer. Raster masters,
private generation prompts, release binaries, pairing/configuration, tokens,
native source and unrelated downloads are excluded. The supplied laptop
reference and owner videos are private prototype assets; production rights
must be reviewed separately. Manifest hashes record the authorized working
snapshot, not a claim that the source base commit contained these later edits.

The only HTML adaptations are noindex metadata, an explicit private-preview
notice and installer links to that notice. Simulator engines and pointer
geometry are copied without edits. Existing tests are private verification
files and are not served by the core adapter.

## Integration documents

- [BUSINESS](BUSINESS.md), [PRODUCT](PRODUCT.md), [DESIGN](DESIGN.md)
- [INTEGRATION](INTEGRATION.md), [ROADMAP](ROADMAP.md), [ACQUISITION](ACQUISITION.md)
- [Verification](VERIFY.md), [project identity](project.json)
- [Prototype manifest](prototype/manifest.json)

Core PR: https://github.com/christianza1989/niche-public-core/pull/1
Project PR: https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/2
Merge core first, then the private project. A reviewer/merger completes that
step. No DNS, live deployment, SMTP, voice, Facebook, payments or real referral
attribution is activated by cloning or merging these changes.
