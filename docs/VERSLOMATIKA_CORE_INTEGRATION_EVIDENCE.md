# Verslomatika integration: source evidence and planning QA

Date: 2026-10-10, Europe/Vilnius. Scope: the owner's request for a correct integration plan jointly with the existing Verslomatika coordinator. No new runtime, auth provider, DB migration, app UI, paid inference, deployment or customer operation was executed. [Core plan](VERSLOMATIKA_CORE_INTEGRATION_PLAN.md), [proposed contract](contracts/verslomatika-portfolio.openapi.json), [scope issue64](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/64).

## Sources and freshness

| Source | Exact inspected version | Evidence and limitation |
| --- | --- | --- |
| Private core | `d4ea8bf7384b70c4ea62a344001e3f8158812c56` | Canonical `scripts/git-freshness.mjs --phase start` fetched current main and returned PASS_FRESH_BASE; clean managed worktree; own `codex/verslomatika-core-integration-plan-20261010` branch |
| Public companion | `d0fd6b7d296303bfcaafadc4071945e675a72b96` | Fresh dedicated clone of the requested GitHub repo; same start gate PASS, read-only evidence. The old Documents/dovanos-memorycasting origin is a different historical host and was preserved |
| Private PR59 | `87fcf4c34a4e1b1dab488bb193a1c1716bb51627` | Fetched `origin/codex/acquisition-core-20261009`; inspected actual plan files and GitHub status. Open unmerged reference, not runtime/main adoption |
| Portal integration plan | `e98b0ddf92d4d663bd1431657789fa286a67db91` at [Verslomatika draft PR62](https://github.com/christianza1989/verslomatika/pull/62) | Coordinator-provided commit, local HEAD verified; plan and ADR read, jointly reviewed. Portal implementation remains absent |
| Portal main/release | main `50e00bebc2408b906c763d07b45d868aeabea98c`; reported deployed source `e2897f8c6ac23fb493039517721f88e44e96f1b6` | Main/version recorded by the portal coordinator. Read its plan and package; no independent hosted/browser/deployment acceptance here |
| Installed CLI | `codex-cli 0.139.0` | `codex --version` and `codex app-server --help` read. Help is availability evidence, not an inference/isolation/production test |

Explicitly read fresh core AGENTS, README, WORKSTREAMS, docs/MULTI_MACHINE, docs/GITHUB, docs/CODEX_GIT_WORKFLOW, docs/INTEGRATING_A_PROJECT, PLATFORM_BUILD_CONTRACT and SKILLS/PROJECT_CONTRACT. Relevant existing BUSINESS_TOOLS_CORE/niche-business-tools and automation-planner instructions were inspected to keep new-business/onboarding scope separate. This technical first bridge does not choose a new niche commercial model or activate those workflows/providers.

## Main source inventory

| Actual source | Finding used in the plan |
| --- | --- |
| [models.py](../agent-business-core/runtime/src/pinet_core/models.py) | Business UUID/site/host; no implemented organization/membership/portfolio or AgentDefinition/Instance model. Job/Event/Artifact/Outbox inherit ConversationChild: generic director/creation tasks cannot silently reuse that schema |
| [db.py](../agent-business-core/runtime/src/pinet_core/db.py), [first migration](../agent-business-core/runtime/migrations/versions/0001_core.py) | Transaction-local business/environment scope; registry transaction is metadata scope. Current business/environment RLS does not prove organization membership isolation |
| [security.py](../agent-business-core/runtime/src/pinet_core/security.py) | Distinct signed-edge, worker and global operator credentials; no customer sessions. Portal assertions require a separate reviewed control adapter |
| [api.py](../agent-business-core/runtime/src/pinet_core/api.py) | `/operator/mail/sites` exists and returns site/host to global operator; planned `/operator/v2` paths do not exist |
| [bootstrap.py](../agent-business-core/runtime/scripts/bootstrap.py) | Initially seeds only traktoriupadangos and greitossvetaines; runtime role cannot mutate businesses |
| [network_bootstrap.py](../agent-business-core/runtime/scripts/network_bootstrap.py), [profiles.py](../agent-business-core/runtime/src/pinet_core/profiles.py) | Local disabled-channel registrar checks six supported profiles and conflicts. It is not a whole-portfolio/customer ownership importer |
| [studio server](../content-studio/src/server.mjs), [model](../content-studio/src/model.mjs) | Local host/origin guard and listSites/createSite/release; no customer memberships. Do not expose localhost studio as a SaaS backend |
| [public generated packages at pinned SHA](https://github.com/christianza1989/niche-public-core/blob/d0fd6b7d296303bfcaafadc4071945e675a72b96/lib/generated/content-packages.json) | Nine V1 IDs read directly; mapping is a source inventory, not a live-site or ownership claim |
| [public admission at pinned SHA](https://github.com/christianza1989/niche-public-core/blob/d0fd6b7d296303bfcaafadc4071945e675a72b96/lib/generated/content-admissions.json) | Empty `{}`; Dovanos123 V2 candidate is in staging, not currently admitted by this main source |
| [public network config](https://github.com/christianza1989/niche-public-core/blob/d0fd6b7d296303bfcaafadc4071945e675a72b96/config/niche-network.json) | MB Pinet/info@pinet.lt defaults and domain lists; not a grants registry or live deployment inventory |
| [public ChatGPT auth helper](https://github.com/christianza1989/niche-public-core/blob/d0fd6b7d296303bfcaafadc4071945e675a72b96/app/chatgpt-auth.ts) | Reads deployment-injected oai-authenticated headers. This is not evidence of Verslomatika account/provider authority |

No runtime DB/customer rows, private site data or existing Codex credential contents were read/exported for this inventory. Actual Business UUID mapping is an I1 private migration task. Standalone and branch-only projects require their own current source/evidence; the nine package entries cannot be reported as the owner's entire live portfolio.

## Existing and joint proposals

PR59 README/AUDIT/ARCHITECTURE/ROADMAP/TOOLS/INTEGRATION_HANDOFF were inspected. Its proposed organization/portfolio/site/legal-entity distinction, generic durable objects and D1+D2 early vertical path are preserved. New portfolio GETs use its planned `/operator/v2` prefix. No existing PR59 plan file was edited; wider screens, acquisition and finance remain there.

The coordinator's [portal plan at its proposal branch](https://github.com/christianza1989/verslomatika/blob/codex/core-portal-integration/docs/plans/core-portal-integration.md) and ADR0015 were reviewed locally. Direct authorized messages agreed: portal login/session/UI ownership, core issuer/subject mapping and current membership/grants; explicit operator bootstrap; host-independent server contract; first read-only portfolio and synthetic two-organization negative tests; keep current Vercel during local bridge; separate persistent Codex worker. Provider/session setup, migrations/routes and customer jobs are proposed implementation work, not completed capabilities.

Bilateral review receipt: the Verslomatika coordinator reviewed the actual core draft and reported no blocking model/ownership/hosting mismatch. Requested clarifications were incorporated: exactly nine clean site IDs, a new assertion/jti on each gateway transport retry, and the read-only bridge as a narrower D1 slice rather than full D1/D2 completion. Core reviewed the portal plan and agreed with its first-bridge model. This is document peer review, not runtime acceptance or permission from another agent to activate operations.

## Official documentation checked

OpenAI Docs search and actual page retrieval were used, with no inference call. Vendor hosting pages were opened and the relevant commercial/beta passages checked on 2026-10-10.

| Source | Limited conclusion used |
| --- | --- |
| [Vercel Functions limits](https://vercel.com/docs/functions/limitations) | Requests have finite duration, including streaming; durable creation jobs must survive a request independently |
| [Vercel commercial use](https://vercel.com/docs/limits/fair-use-guidelines) | Hobby is non-commercial; this review did not inspect/upgrade the actual account's plan |
| [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) | Current vinext path is beta and requires compatibility testing for an existing app; no migration performed |
| [Codex app-server](https://learn.chatgpt.com/docs/app-server) | Rich-client thread/turn/event interface; app-server/WebSocket experimental production limitation and out-of-sandbox shell/process methods require an explicit broker boundary |
| [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) | `codex exec --json`, structured final outputs and bounded automated jobs; saved authentication is sensitive and cannot become a customer auth pool |
| [SIWC app-server token sharing](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server) | Official per-user OAuth child-process route exists; application eligibility, scopes, model entitlement and billing remain unverified here |

## Planning validation

Document/contract checks: PASS_DOCUMENT_STRUCTURE for 2 new Markdown documents, 37 references with no missing local targets/unclosed fences; 4 GET routes/4 unique operation IDs/48 resolved JSON $refs, required properties/path parameters and per-response cache declarations. All 9 actual V1 IDs occur in the plan. `git diff --check` PASS. This is targeted proposal structure QA, not full OpenAPI conformance certification or a running API test.

Corrections preserved: initial inspection commands used nonexistent helper paths and one wrong-worktree lookup; exact source was located and read without mutation. A draft test-suite reference named nonexistent `test_security.py`; actual files were checked and the plan now correctly points to auth/isolation in `test_core.py`. No failed runtime run or old PASS was relabelled.

The plan's P1–P19 are **PLANNED and unexecuted**. Existing runtime/portal suite were not rerun for a documentation-only change. Source inspection does not inherit historic suite counts as new PASS. Two-org DB/browser isolation, actual login, generic job persistence, real Codex reply, actual hosting and restore are future implementation gates.

## Handoff

Only three new planning/contract files and one own WORKSTREAMS entry are scoped. Final handoff gate fetched both repositories successfully: private main `d4ea8bf7384b70c4ea62a344001e3f8158812c56`, public main `d0fd6b7d296303bfcaafadc4071945e675a72b96`, both in their HEAD bases; no source rewrite. Exact-staged repository safety PASS for four text files with zero findings, including comparison to configured local secret values without printing them; staged whitespace PASS. Bilateral review complete. Push/PR is the Git delivery; merge/adoption and every runtime gate remain separate.

Private raw tool results, deployment/account IDs, customers, secret files, databases and temporary issue/PR bodies are excluded from Git. Until reviewed merge and the next consumer freshness check, this proposal is available through its PR rather than adopted main.
