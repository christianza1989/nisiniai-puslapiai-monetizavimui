# Native Cloudflare migration checkpoint · 2026-10-30

The owner accepted the exact Codex-written point13 draft and instructed its
publication plus real-domain migration. Changes1–6 and13 are applied;7–12 and
14–20 are retained as selected. Point12's original cookie consent remains.
Retained scientific/legal assertions were not independently certified and old
audit failures have not been relabeled PASS.

Point13 was inserted through `editPage`. Actual limited preservation review,
native approval and `releaseContent` produced23pages/108assets in release
`31e1099c-2f44-4781-9f32-09df5274bcac`, package SHA256
`a21bb0b76e5e4b197986affd0b45309ba7f4be7c6968231d1ebb5ab8ef748c9c`.
No approval hash was rewritten. The public package importer/compiler was used.
Earlier checkpoints saying all23 pages are drafts are now superseded.

## Uploaded runtime; actual-domain cutover pending

- Account `1c0a7407abfb959d5ff46540f5f7009d`, Worker `o3tech-site`.
  Code upload `b8840958-94a8-4a1b-aa12-7b6d1d817512`; attaching secrets produced
  deployed version `df11dae6-7d7f-4599-9dd3-4dda86925df0`.
- Dedicated EU D1 `o3tech-site-leads`, ID
  `919ecdf3-4a13-4430-907d-b992758e9e53`; standard lead migration applied.
- SMTP enabled with two secret bindings. Authenticated sender is the owner's
  central Hostinger mailbox, destination `sales@o3tech.lt`, client is Reply-To.
  Secret values are absent from source and receipts.
- UI routes `o3tech.lt/*` and `www.o3tech.lt/*` both select `o3tech-site`.
- Full(strict), Always Use HTTPS and minimum TLS1.2 selected. Universal SSL
  currently has no certificate while nameserver activation is pending.
- Registrar API returns `darwin.ns.cloudflare.com` / `sue.ns.cloudflare.com`;
  update requested exactly once. Recursive public NS still returned DNS Parking.
- Five web records remain DNS-only with original Hostinger targets while zone
  and certificate are pending. Copied MX/SPF/DKIM/DMARC and verification values
  match Hostinger. Google Workspace mail has not been redirected.

After zone AND universal certificate are active, enable proxy on the five web
records. Then verify actual-domain HTTPS/WWW,23pages, SEO endpoints and hosted
form delivery. Until then the new runtime is prepared, not serving o3tech.lt.
The retained WordPress origin is rollback: restore the five DNS-only switches.
Do not delete or cancel Hostinger during acceptance.

## Actual checks and limits

- 306 public tests pass with full source registry; TypeScript passes.
- All framework build stages and two RSC asset manifests pass. Upload4316.50KiB,
  gzip1157.08KiB, startup35ms; owned site asset stage264files.
- Compiled workerd SEO smoke passes all23 pages, canonical, schemas, robots,
  sitemap, LLM endpoints, favicon/host isolation and404.
- 10 native HTTP checks pass: valid local durable form submission; origin,
  consent, email, body, honeypot and foreign-host checks; exact hero image size,
  foreign-host image denial and WWW redirect. Local SMTP was deliberately off.
  No real mail was sent in this checkpoint. Earlier owner-confirmed local inbox
  receipt is separate from future hosted delivery qualification.
- An initial one-site runtime failed against another site's publication pause.
  Compiler now emits matched scoped settings; regression proves canonical
  eligibility equivalence with and without scoping and retains unknown-site
  validation. Full-registry fixtures failed under a deliberately one-site input;
  normal regeneration yields306/306 without weakening their assertions.

Private evidence: `private/launch-20261030/`. Public noindex review cookie page
contains exact approved point13 in version `9111a20a-648e-4885-8bf5-6098534b3e2b`.
Its HTML came from the qualified native response with review noindex added.
The static review cannot send mail and is not the production runtime.
