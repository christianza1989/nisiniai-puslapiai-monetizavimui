# Contracts and adapters

Read root README/AGENTS, MULTI_MACHINE, INTEGRATING_A_PROJECT,
SKILLS/PROJECT_CONTRACT, CORE_BUILD_CONTRACT, MEDIA_CORE, MAIL_CORE,
SEO_GEO_CORE and NETWORK_LINKING before extending this module. Core's
GITHUB_WORKSPACE delegates those rules to the private companion repository;
it does not contain separate root AGENTS or the two integration docs.

| Concern | Actual integration | Future gate |
| --- | --- | --- |
| Identity | phonebridger / proposed phonebridger.com, collision checked in both clones | Domain ownership and launch verification |
| Contact | config/niche-network.json per-site hello@phonebridger.com; live domains unchanged | Legal operator, delivery/receipt evidence |
| Studio | bootstrap through shared createSite/editSite/addPage + write lock, v1 English draft | Evidence review, exact revision approval/export/import |
| Prototype | private sites/phonebridger/prototype, immutable runtime manifest | Production asset rights and release distribution |
| Core preview | dev-only loopback Vite middleware at /__projects/phonebridger/ | No production exposure from this adapter |
| Publication | Existing core predicates untouched; no PhoneBridger content package | Reviewed package and dedicated niche renderer dispatch |
| SEO/GEO | Dummy prototype absent from shared public projections/indexes | Shared niche-seo/schema/ArticleMeta/breadcrumb/LLM APIs with visible eligible content |
| Media | Existing reviewed optimized bytes unchanged | New editorial images through saveResponsiveAsset/import-image; imageSrcSet |
| Lead/mail | Contact form prepares a mailto draft; existing /uzklausa and per-site routing are future server adapters | Durable lead, rate/consent controls, SMTP transport and INBOX evidence |
| Interest | Existing /ivykius remains the shared future counter, not a lead | Approved real events, separated from simulator actions |
| Voice/agent | No runtime profile, worker or voice widget activated | Approved public knowledge and fail-closed policy/profile |
| Creator backend | Page-memory demo only | Authenticated server ledger, orders/refunds/attribution, payout provider |
| Native app | No source, releases, secrets or pairing copied | Existing frozen baseline and shared USB/Wi-Fi API remain authoritative |

The noindex prototype is a deliberate first stage under the owner's earlier
instruction to implement the creator dashboard in simulation first. This is
not a synthetic public content approval or a launch acceptance. A later
public renderer must use shared host/publication guards; do not deploy this
private HTML by copying it into public or add a parallel SEO engine.

Core's original GitHub source lacked two build prerequisites: ignored
build/sites-vite-plugin and private .openai/hosting.json. The core PR carries
the existing MIT-licensed plugin source under vendor, with one adaptation to
skip copying an absent optional bindings file. Vite preserves real configured
bindings and treats absent configuration as no bindings. No resource IDs,
secrets or hosted access policy are generated. Local builds do not prove D1,
mail, hosted auth or production deployment readiness.

Merge core PR #1 first, private PR #2 second. Both PRs are reviewable and remain
unmerged by the implementing task. Re-run the recorded checks against the
eventual merged SHAs before deployment. Shared schemas and all nine existing
approved packages remain unchanged.

## Inner pages / local account boundary — 2026-10-06

The latest owner instruction defers creator implementation and freezes homepage except footer. Eleven static semantic inner pages use the same manifest-attested private core mount; only manifest-listed directory indexes resolve. The optional companion server/accounts.cjs is imported exclusively by the serve-only Vite plugin, uses the actual listening port and exact 127.0.0.1 origin, and stores private local data outside prototype. Default stores are per-port. Missing companion/server module is compatible with core-first merge. The single account adapter is reused by the standalone core-backed preview and tested directly; it is not copied as a public static file. Contact is an explicit mailto draft, no SMTP or lead-storage adapter. Live hosting/production auth/commerce remain separate gated work. See PAGES.md and CORE_FEEDBACK.md.
