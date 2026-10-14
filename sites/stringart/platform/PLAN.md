# MemoryString partner operations — current implementation plan

14 October 2026. Mode: persistent local supplier demonstration. Owner: this isolated `codex/memorystring-platform-20261014` workstream. siteId: `stringart`. Source dependency: draft [PR126](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/126), commit `5aa9eab3e355292f2f0ee725e74e9029520e1467`; fetched core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39`. No public companion interface is used or changed.

The owner authorized the next local frontend/backend phase through the collaborating chat on 14 October. This document is the single current platform plan. The business plan, Android contract and historical mobile acceptance remain separate. Local completion is recorded in ACCEPTANCE.md, not inferred from this plan.

## Outcome and boundaries

### Current extension: a complete synthetic month

Owner instruction, 14 October 2026: fill all ten studios with a complete month of mock data. Root owns this follow-up on `codex/memorystring-month-fixtures-20261014`. Use 1–30 September 2026 (UTC), with different studio volumes, orders on every day, completed and active portrait/kit journeys, exact preview histories, refund/return/cancellation/rework cases, weekly assembly, stock counts, supplier receipts, transfers, machine service and several referral sources. Build records by replaying the existing atomic commands with a fixture-only clock and deterministic IDs. Opening balances remain identifiable; current stock must reconcile to every movement. August opening orders support mature commission examples and are excluded from September sales.

Keep all UI and data labels in English. Show the selected period and daily/partner totals in the existing overview; paginate long orders/audit/movement lists without hiding records. Preserve the Quiet Workbench text roles, inspect the changed overview and populated tables at desktop/320px and 200% text/spacing, and self-edit the final copy. Verify all ten role projections, chronology, daily coverage, state/reservation/machine/commission consistency, restart and a continued business action after loading. Preserve the prior local database and load only the named synthetic adapter. Existing historical acceptance remains unchanged; this extension receives a separate dated record within ACCEPTANCE.md. Retail, real authentication and all live adapters stay deferred.

Demonstrate one operating system for a proposed EU studio network: operator oversight, isolated partner workspaces, supplier demand and purchase orders, portrait fulfilment, DIY kits, material accounting and referral commissions. All contacts, addresses, assets, sales and stock in this demonstration are synthetic. No real network, exclusivity, hardware compatibility or available supply is asserted.

Retail/subdomain websites, production identity, customer activation, live telemetry/machine files, payments/payouts, mail, shipping, paid services and deployment remain later phases. Every external adapter is simulated and live off. The app's `memorystring.instructions/v1` JSON is validated through its unchanged model, retained as a revision-bound hand-threading project, and never called a manufacturer file.

## Architecture and existing-core boundary

Node 24 with built-in `node:sqlite`, HTTP and static English HTML/CSS/JavaScript. SQLite is a local business adapter: one versioned state document plus command receipts, updated under `BEGIN IMMEDIATE`, with WAL, full synchronous commits and a busy timeout. Each mutation reloads current state inside the transaction. Stock, order state, audit and idempotency receipt commit together or roll back together. No generic publisher, CRM, mailer or scheduler is introduced.

The local server binds only to 127.0.0.1 and refuses nonlocal Host and cross-origin mutation requests. Demonstration sessions are random HttpOnly SameSite cookies selected through an explicit test identity chooser; roles are resolved server-side. This chooser is a local test adapter, not production authentication. All routes are noindex and there is no sitemap, public profile/schema, outbound network call or fallback to fake production data. Production mode is refused. Runtime DB and captures are ignored local files.

Reuse prepared original brand SVGs, icons, local Roboto/Libre Baskerville and their licences directly from the unchanged mobile kit. Reuse the unchanged mobile JSON validator. Public content/contact/SEO/media contracts remain owned by the shared core; this private module does not import or edit them. Future adapters must maintain the same siteId and approved-revision model, with separate runtime acceptance before admission.

## Entities and ownership

Partner: synthetic studio ID, country, city, distinct business profile, fictional address and .example contact. Machine: owned serial, location, service/warranty record, readiness, assigned job and illustrative capacity. SKU: units/metres, reorder point, versioned kit and portrait BOM. Balance: partner/SKU on-hand and reserved; available is always their difference. Movement: signed changes, reason, actor, link, time and transaction ID. Assembly: versioned BOM consumption and packed output. Transfer: source/destination, reserved quantity, dispatch and receipt. Purchase order: assigned supplier, agreed lines/prices, intended studio, ETA and receipt. Order: seller/tenant, type, photo suitability, preview revisions, approval, simulated payment, reservations, production/quality, packing, shipment, delivery, refund and return. Referral: one winning eligible source, immutable award basis and one commission row per order; partial/full refund updates that row with adjustment history. Audit: command and linked business entity, role/tenant and server UTC timestamp.

Seed fixture `eu-ten-v1` has exactly the plan's Lithuania/Vilnius 2/80, Germany/Berlin 3/120, Netherlands/Amsterdam 2/95, France/Lyon 1/70, Poland/Warsaw 2/150, Spain/Valencia 1/60, Italy/Milan 1/85, Sweden/Stockholm 2/55, Denmark/Copenhagen 1/65 and Finland/Helsinki 1/45 machine/packed-kit counts. Total: ten studios, 16 machines, 825 packed kits before demo actions. Separate raw boards, nails, thread, covers, boxes and instruction inserts support assembly and portraits. Historical fixture orders explain all reported sales; initial stock is explicitly an opening balance, not inferred from those sales.

## Server permissions

| Role | Read | Write |
| --- | --- | --- |
| Operator | All fixture studios, orders, stock, machines, financial assumptions and audit | All business commands, purchases, cross-studio transfers and reset |
| Partner | Own studio, own orders/materials/machines, own linked transfers/purchases/commission and audit | Own orders, assembly, stock adjustments, machine service and receipt of its inbound transfers |
| Supplier | Only explicitly agreed SKU demand aggregates and its assigned purchase orders | Acknowledge and dispatch its assigned purchase orders; cannot receive stock |

No caller-provided role is trusted. Supplier projections omit customer names/photos/projects, individual partner records, revenue and private audit payloads. Direct foreign ID read/write attempts return a bounded authorization error. Participant transfer fields expose only the minimum counterpart label/ID. Customer approval and payments are explicitly simulated operator/partner actions, without production customer accounts.

## State and inventory rules

Portrait: inquiry → suitable (or needs_photo) → preview → approved exact revision → paid (simulated) → reserved → producing on a ready own machine → quality passed → packed → shipped → delivered. Reservation binds the approved project hash/revision to a declared hypothetical mono42/200-clockwise-pin profile, production BOM and separate packing BOM. Colour, other diameters/layouts and material allowance mismatches are rejected. Thread quantity is the ceiling of geometric spans ×1.15 plus 50 metres, a hypothetical wrapping/waste allowance capped at 600 metres. Physical compatibility is unverified.

Production consumes its board/pins/thread once when issued, while packing cover/box stay reserved until packing. Failed quality requires explicit rework with a full replacement production BOM and reason, or cancellation. Cancellation releases unused reservations; issued production materials remain consumed with traceable write-off entries. Machine assignment is released at quality acceptance/cancellation without clearing another job. Updating a preview invalidates approval and is forbidden after payment. Production retains the exact approved file. Returns never manufacture raw portrait materials.

Kit: inquiry → simulated paid → packed-kit reservation → packing → shipment → delivery. It consumes the packed SKU only. Assembly checks all available components, consumes the complete versioned BOM and creates packed kits atomically. Repeating a command never assembles twice. Transfers reserve source stock; dispatch removes it, and the receiving studio gains stock only on receipt. Purchase acknowledgement/dispatch affects incoming, never on-hand; only operator receipt does. Adjustments require a reason and cannot remove reserved stock. Returned packed kits are restocked once only after a recorded inspection.

All mutation requests require an idempotency key; reuse with different input is a conflict. Current authorization runs before cached responses, with receipts scoped to authenticated principal/role/tenant. Orders/transfers/purchases/machines carry versions; stale edits return 409 with a reload path. Stock insufficiency rolls back the entire command. Competing reservations of the last units have at most one winner. Refunds are cumulative bounded integer-cent goods and delivery amounts, cannot exceed collected sums, and revise one commission ledger. Eligible commission is 10% of simulated goods excluding hypothetical 21% VAT and refunded goods, excludes delivery, and is held until delivery plus the assumed 30-day review period. Shipping-only refunds preserve goods commission; partial/full goods refunds revise the same row. A later refund after simulated payout records the recovery amount. Historical MS-LT-100 was delivered 5 September, with review ending 5 October, to demonstrate eligibility without changing the server clock. Newly delivered orders remain held. Payouts never move money. These are fixture assumptions, not tax/legal terms.

## API, navigation and states

`GET /api/identities`, `POST /api/session`, `DELETE /api/session`, `GET /api/state`, `GET /api/orders/:id`, `POST /api/commands`, `GET /api/health`. Commands have `{type, key, ...entity inputs, version}`. Errors use `{error, code}` and appropriate 400/401/403/404/409. Cookie session defines permissions, responses use no-store, and body size is bounded. IDs are server-generated. Decimal money is represented in integer cents; stock quantities are integer units/metres. Server timestamps are UTC, UI labels UTC. Demo fixtures use a fixed opening date; new actions use actual time.

Navigation: Overview, Studios, Orders, Inventory, Machines, Supply, Referrals, Activity. Partner routes filter the same authoritative server model; supplier has Demand and Purchase orders. Order detail provides the full step journey, revision preview and visible stock/commission effects. Inventory provides assembly, transfers, receipts, adjustments and movement history. Reset and identity switching sit in one clearly labelled local fixture control area.

Every dynamic view has a pending state, recoverable error and useful empty state. Forms retain values on conflict, explain stock/permission/version failures and offer refresh. Buttons show pending state and suppress accidental repeat clicks; server safety does not depend on this. Query/search and navigation preserve role boundaries. No decorative metrics claim unrecorded sales.

## Visual and typography plan

Operate mode in the existing Quiet Workbench identity: ivory workspace, forest navigation/actions, restrained copper thread accent, original circle mark. Compare compositions: a large chart dashboard (declined: hides operations), a dense spreadsheet shell (useful for stock, insufficient overview), a studio directory with action queue (selected). Overview combines geographic studio coverage, a compact truthful ledger summary and a next-action queue; inner screens use purpose-built tables, detail panels, timeline and forms.

Libre Baskerville 400 for brand/display at 28–36px; real Roboto 400/500/600/700 for headings 18–24px, body 16px/1.5, labels/table metadata 14px/1.45. Numerals are tabular; title spacing -0.02em; prose max 70ch. Copper is decoration, not low-contrast text. Focus is visible, fields/buttons ≥44px, labels explicit, status written as well as coloured. Tables deliberately scroll with visible affordance on narrow screens; general copy wraps, navigation becomes horizontal on phones. No compressed unreadable stock columns.

Before acceptance inspect all normal role/page families at desktop and 390/320px, long studio names, a narrow intermediate layout, actual 200% text resizing and simultaneous text-spacing overrides. Inspect forms, errors, no-results, loading and conflict states; measure both document and individual container overflow. Use a single batched review and one repair/confirmation pass; retain original failures. Sequential review is not independent review or blanket WCAG certification.

## Build, run and reset

From repo root: `node sites/stringart/platform/server.mjs` (default port 8946). No npm install or build required. Open `http://127.0.0.1:8946`. The runtime DB defaults to platform `.local/operations.sqlite`; `MEMORYSTRING_DB` may select an isolated test path; `PORT` may choose a free local port. Reset through the operator fixture control or `node sites/stringart/platform/reset.mjs` while the server is stopped. Destructive reset affects only this module's named synthetic database.

Backend/HTTP regression: `node --test sites/stringart/platform/tests/*.test.mjs`. Browser verification and its actual capture paths are described in ACCEPTANCE.md. The runbook will provide a repeatable 7–10 minute journey from pristine seed through portrait, kit/BOM, transfer/purchase receipt and referral reversal.

## Acceptance and stopping criteria

Implement the persistent portrait path first and prove restart and foreign-tenant rejection before completing all screens. Test seed totals, precise approval, illegal transitions, multi-component rollback, last-unit contention, idempotency/body mismatch, stale versions, no double BOM consumption, cancel release, transfer dispatch/receive, purchase receive, partial/full refunds, one commission row, supplier sanitization, machine readiness/service, authentication/HTTP boundaries and persistence through an actual process restart. Then execute all primary journeys in a rendered browser and inspect adverse states.

Local work finishes only when the complete authorized supplier journey and relevant rendered states are verified or a specific unavailable capability is recorded. A test count does not replace missing screens. Physical machine/frame acceptance, production auth/adapters, wider device coverage, commercial facts and launch remain UNVERIFIED/deferred outside this local scope. Report observed core integration issues in CORE_FEEDBACK; repair an executable shared defect under CORE_IMPROVEMENT only if one is actually established.
