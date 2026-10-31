# Preparing an admitted content site for its real domain

An owner-authorized hosted review is not a production admission. Keep its exact
host boundary, noindex and dedicated review database while preparing the target.
Do not change nameservers or bind real-domain routes during preparation.

`CONTENT_PRODUCTION=1` selects `scripts/content-production-config.mjs` from
`vite.config.ts`. It reads ignored `.openai/content-production.json` and the
normal compiler's generated admissions. The target must match a package already
admitted as `production`; local/hosted receipts and test-only content are refused.
The existing 13 admission checks remain authoritative. No helper fabricates their
PASS evidence or an owner activation instruction.

Target fields: `siteId`, `canonicalHost`, `workerName`, `accountId`,
`inquiryDatabaseId`, `mailboxId`, `rateLimitNamespaceId`, `sender`, `recipient`.
The recipient must equal the reviewed package contact. IDs and addresses are
non-secret configuration; the API credential is a Worker secret. Generate
binding types with Wrangler against the actual configuration after admission.

The production profile disables workers.dev / Version URLs, local host
overrides, voice and alternative mail transports. It binds the explicit
production D1, mailbox and rate namespace, enables Logs and Traces, and prepares
the apex plus `www` Custom Domains. Native media/favicon paths remain
Worker-first; framework CSS/JS can use normal static asset delivery.

`configuredInquiryRequest` is opt-in for that exact production site/HTTPS host.
It preserves the hosted inquiry origin, resource and approximate per-edge rate
guard before native form storage. Native validation, durable send claim and
replay handling remain unchanged. It does not assume a global 10/min mail budget.
No existing site's unconfigured handler changes behavior.

Before activation, retain the actual DNS record set, including IPv6 and all
mail/verification records. A prepared DNS import or target file does not prove
an active zone, TLS or successful routing. Only a separately authorized cutover
can establish those facts. After activation, verify actual canonical-domain
HTML, all retained URLs, indexing directives, metadata, assets, inquiry delivery
and DNS/mail preservation. A successful dry run does not replace these tests.

Public prose follows the owner's author/review/approval workflow. Missing legal
operator or retention facts stay unresolved; technical access to a hosting
account does not establish the site's legal controller. Do not invent identities,
retention periods, human approvals or production acceptance to complete a build.

## Signaturepads operations prepared on 2026-10-31

- Review Worker: `signaturepads-preview`; no real-domain routes. Production
  target `signaturepads-site` is not deployed. Do not deploy the D1-only
  `database.wrangler.json` as a website configuration.
- Production D1 `signaturepads-inquiries` has the canonical schema and zero
  leads. Keep it separate from `signaturepads-preview-inquiries` and its one
  marked delivery test. The EU jurisdiction is not a claim that all platform,
  mail and log data remain in the EU.
- Capture, target, DNS import and cutover plan are in
  `D:/Core/output/signaturepads-migration-20261029/prelaunch-20261031/`.
  DNS import is unapplied. Preserve current apex IPv4 AND IPv6 until the
  separately authorized change; preserve Google mail and verification records.
- The current native package remains review-only. Final privacy/operator facts
  and exact new content approval precede a new production admission/compile.
- Current preview secret stays installed. For the eventual first production
  deploy, upload `LEAD_HOSTINGER_API_KEY` with that version using the installed
  Wrangler `deploy --secrets-file` option (verified in its actual CLI help).
  Create that one-key file privately from the already scoped mailbox credential
  at deployment time; restrict access, never print its value, and remove the
  temporary duplicate afterwards. Do not deploy a public mail-enabled Worker
  without its secret or copy all metadata keys from the credential record.
- After the explicit cutover instruction: re-fetch/gate both repos, rebuild the
  exact admitted package/profile, dry-run, check target/config/assets/secrets,
  deploy, then test both real-domain hostnames, canonical redirects, TLS,
  all retained routes/legacy URLs, indexability/GSC meta and the bounded own-mail
  form test against the production DB. Retain a matching delivery receipt.
  Do not carry over preview `noindex` or preview/test acceptance as launch proof.
- Record actual field CWV and GSC checks separately after launch; no automatic
  monitor, paid service or scheduled task was enabled by this preparation.
- If postcutover acceptance fails, restore the saved apex A/AAAA/www direction
  to the unchanged Hostinger original and verify HTTPS and mail records. This
  configuration rollback is not a WordPress backup; that backup was explicitly
  excluded by the owner. Do not uninstall/delete the original WordPress.
- Unconverted inquiries and sender/recipient email copies have no newly set
  deletion period. The owner must set it first; deleting a D1 row alone does not
  erase mail copies. Review native `mail_unknown` claims manually before any
  resend to avoid duplicate mail. Do not promise automatic retention or recovery.

Full dependency audit and runtime reachability review are required, alongside
the production-only view. This preparation found bundled React Server Components
inside devDependencies; omit-dev zero did not cover the actual Worker. Patched
runtime/tree and remaining trusted-input lint/Drizzle CLI issues are documented
in DEPENDENCY-HARDENING-20261031.md. Do not force incompatible downgrades simply
to obtain a zero report. Use the current lock with a fresh canonical installer.
