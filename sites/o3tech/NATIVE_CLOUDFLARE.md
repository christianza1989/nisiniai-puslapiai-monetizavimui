# Native Cloudflare migration checkpoint · 2026-10-31

**2026-10-31: actual-domain cutover completed.** Zone and universal certificate
are active; all five web records are proxied. Native o3tech.lt and www serve the
owned Worker, HTTPS redirects and21-page live SEO smoke pass. Original mail DNS
values are preserved. The earlier waiting-state section below is historical.

Direct Workers TCP to smtp.hostinger.com failed before AUTH because its address
was in Cloudflare's prohibited outbound TCP range. A new authenticated Node22
relay on kontaktuforma.lt uses the existing Cloud Professional plan and central
mailbox, the maintained mail gateway/SMTP modules and a durable MySQL acceptance
ledger. No purchase, new mail provider, plugin or WordPress modification.
Worker version `815eba1c-4c86-4bb4-90b8-9e996c005fb1` selects HTTPS relay
explicitly; direct SMTP is off. Secret values are absent from source/receipts.

Actual browser form test `O3-CF-LIVE-20261031-B1` stored D1 lead
`fe042284-a764-454b-9d87-e7882980a5e6` as notified, after exact SMTP acceptance
through the relay at sales@o3tech.lt, with the owner-confirmed client address
as Reply-To. Current connected info@azprekyba.lt Gmail search found no forwarded
copy; recipient INBOX placement for this hosted test is not independently seen.
Do not conflate the earlier owner-confirmed local test with hosted receipt.
The preceding hosted A1 test remains saved/new and was proven not to reach SMTP;
it is synthetic and was not resent. Do not import these tests as real demand.

313 public tests, TypeScript, build and2RSC manifests pass. Live21-page SEO,
HTTPS/WWW, desktop1280/mobile390, menu, sticky header and visible mobile form
pass without horizontal overflow. Private proof: `private/launch-20261031/`.
Rollback retains original WordPress files and all original DNS targets; restore
only the five web proxy switches if needed. Hostinger must remain available for
the central mailbox and relay. See public docs/NICHE_HOSTINGER_MAIL_RELAY.md.

## Owner catalogue cleanup and PageSpeed follow-up · 2026-10-31

Direct owner request removes `/taisykles` and `/garantija-ir-grazinimas`.
Maintained `revokePage` preserves their historical revisions; edited dependencies
were reviewed/approved and released through the normal Studio workflow. Release
`65d68ca1-6338-433c-b783-44c57f68f3fc` has21pages/104assets, SHA256
`fd352075d4859fb544bdc75a992f0c42270ccb38b11fbd57397d3677c4b76f29`.
The two routes now404 and are absent from links and sitemap. MB Anvera's owner
provided company and VAT identifiers remain visible at contacts and in footers.

Cookie adaptation uses registered deletions and heading formatting: remove the
obsolete browse-implies-consent introduction, preserve the previously accepted
point13, and retain existing removal guidance. This supersedes the earlier
point12 retention below; it does not certify a complete privacy notice.

Product-card image links and quick views now have title-derived accessible names;
small text/buttons meet measured contrast requirements. Gallery frames reserve
space, original regular fonts preload, and only the first visible catalogue
product image starts eagerly at high priority. Related/below-fold cards stay lazy.
Original hero pixels and product prose are unchanged. See
[PageSpeed evidence](PAGESPEED_20261031.md). Private current delivery/evidence:
`private/catalogue-cleanup-20261031/`; old23-page launch evidence is preserved.

Desktop/category follow-up fixes active/hover link contrast, removes the nested
interactive link from the native menu disclosure (catalogue link remains inside
its dropdown), and separates min/max price sliders into visibly labelled,
non-overlapping rows. Targets are24px high,44px on coarse pointers. Actual
catalogue and industrial category reports show mobile98/100 and desktop100/100
performance/accessibility, with100Best Practices/SEO. Live1280px and draft320px
keyboard/range/menu checks pass without overflow;10focused renderer tests pass.
No additional mail was sent.

## Earlier accepted copy checkpoint · historical

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
