# Booking destination — scoped design check

Date: 2026-10-11. Reviewer disposition: **ship for the local booking-channel scope**. Deployment is pending; this record does not establish a live release or whole-platform acceptance.

## Overview

This is an ordinary extension of the existing Madbeauty workspace and provider registration. One organization uses exactly one booking destination: native Madbeauty or a public HTTPS Treatwell Lithuania salon link. The owner controls the setting; registration establishes the initial choice. In external mode the calendar route explains where visits are managed and provides the Treatwell CTA. It does not display imported availability or create a second calendar.

The incumbent black/white/violet identity, DM Sans typography, workspace navigation, panels and form primitives remain the authority. No new visual world, conceptual composition, generated raster or production image asset was introduced. These JPGs are browser evidence, not design assets.

## Evidence examined

Source review covered:

- Existing `../PRODUCT.md` and `../DESIGN.md`, including the current owner-selected identity and explicitly historical sections.
- `../prototype/public/tokens.css` for color, type, button, field, focus and radius primitives; the incumbent workspace, panel, option-choice and checkbox rules in `../prototype/public/app.css`.
- `../prototype/public/booking-channel-ui.mjs` and its dedicated booking-channel / external-calendar CSS block in `app.css`.
- `../prototype/public/workspace-ui.mjs` for navigation capability, settings submission, external calendar substitution and onboarding; `../prototype/public/account-ui.mjs` for reuse in provider registration.
- `../prototype/public/booking-channel-model.mjs`, `../backend/booking-channel.mjs`, relevant `../backend/platform.mjs` guards and `../backend/permissions.mjs` for the UI's underlying destination and owner-access contract. The targeted `../cloudflare/booking-channel-runtime.test.mjs` assertions and this increment's `ROADMAP.md` were read as supporting scope evidence, not rerun by this documentation pass.

The following corrected local screenshots were personally viewed by the root/developer and by the documenter. They show the isolated synthetic local organization, not a real participating salon or a completed external reservation.

| Viewport evidence | What was examined |
| --- | --- |
| [Settings desktop, top](../cloudflare/output/booking-channel-20261011/settings-desktop-top-final.jpg) | Workspace identity, title hierarchy, persisted active destination, both radio choices and selected styling. |
| [Settings desktop, bottom](../cloudflare/output/booking-channel-20261011/settings-desktop-bottom.jpg) | URL field, explanatory text, save button and existing profile-link panel; visible keyboard focus on the profile link. |
| [Settings mobile, settled](../cloudflare/output/booking-channel-20261011/settings-mobile-settled.jpg) | Single-column workspace, wrapped headings, status and upper choice content. |
| [Settings mobile, bottom](../cloudflare/output/booking-channel-20261011/settings-mobile-bottom-final.jpg) | Wrapped selected-choice explanation, URL label and field, transition caveat, save CTA and visible keyboard focus. |
| [External calendar desktop](../cloudflare/output/booking-channel-20261011/external-calendar-desktop.jpg) | Clear external-calendar explanation, one booking CTA, history caveat and change-setting link. |
| [External calendar mobile](../cloudflare/output/booking-channel-20261011/external-calendar-mobile.jpg) | Existing horizontal workspace navigation, readable wrapped content and reachable CTA/change link. |

Full-page capture was unsupported in the browser used. These are viewport captures at distinct scroll positions; the top/bottom pairs are not a stitched full-page image. Earlier candidate captures and `stale-before-candidate` are not final acceptance evidence.

## Colors

The extension references incumbent `--accent`, `--soft`, `--line` and `--muted` rather than declaring a palette. The observed source values are violet (`#7040e8`), pale violet (`#f1edff`), neutral border (`#e3e1e9`) and muted text (`#62616c`). Ink and paper remain the existing black (`#111114`) and white (`#ffffff`).

Selected choices combine a native checked radio with a violet border and pale violet fill. The same selection language already exists in `.option-choice`; the status also names the active system in text. The primary save and external booking controls reuse `.button.accent`, including its incumbent hover treatment. There are no new color tokens.

## Typography

DM Sans is inherited from the incumbent root and form reset. Task headings use the existing compact workspace scale (`1.625rem`, 26px at the normal 16px root), with the existing heading line-height and letter-spacing. Explanatory choice/status copy uses `.9375rem` with a 1.5 line-height and regular weight; the legend uses weight 700. Body copy, field labels and small hints continue to use existing primitives.

The compact heading treatment fits an operational settings form. Mobile screenshots show meaningful wraps without obscuring the destination names or save action. This record adds no type family or global type scale.

## Layout

The settings section is capped at 760px and its introductory copy at 65ch. It sits inside the existing desktop workspace with dark navigation; mobile inherits the incumbent single-column workspace and horizontally scrollable navigation. The dedicated controls use a vertical sequence rather than adding a competing grid.

Choice rows have an 18px inset, 12px gap and 12px separation. The fieldset removes default chrome and has `min-width:0`; the URL block appears below the choices only while Treatwell is selected. The existing panel padding and field width rules provide the form container. The external-calendar section uses 24px vertical padding and the same copy width cap.

In the mobile bottom capture the long URL is horizontally clipped within the normal single-line input; its visible label and explanatory hint remain present. This is input viewport behavior, not evidence that the stored URL was shortened.

## Elevation & Depth

The new controls rely on borders and a pale selected surface. They introduce no shadow, gradient, blur or motion token. Workspace depth, header treatment and primary-control interaction remain inherited.

## Shapes

Choice rows use the same gently rounded 12px silhouette as existing panels and option choices. The URL field keeps the existing 8px input corners; buttons use the incumbent `--r` radius. Radio and confirmation controls remain native inputs within clickable labels.

## Components

| Scoped class | Role and behavior |
| --- | --- |
| `.booking-channel-settings` | Contains the task heading, explanation, persisted destination status and save form; bounds its reading width. |
| `.booking-channel-status` | Textual active destination with an explanatory second line and neutral separators; `role="status"` is present. It represents saved organization state rather than the unsaved radio choice. |
| `.booking-channel-options` | Native `fieldset` and `legend` grouping the mutually exclusive `bookingProvider` radios. Shared by settings and registration. |
| `.booking-channel-option` | Full clickable label with native radio, destination name and explanation; checked state receives the established violet/pale-violet treatment. |
| `.booking-channel-url` | Existing labeled URL-field primitive plus hint; CSS `:has()` exposes it for the Treatwell choice. The source attaches conditional-required metadata. |
| `.booking-channel-native-confirm` | Existing `.check-label` treatment for confirming schedule readiness when returning to Madbeauty; hidden while the external choice is selected. |
| `.external-calendar` | Explanatory replacement for calendar/schedule in external mode, with the existing accent-button link, history caveat and change-setting link. |

Both radio inputs share one name, and the UI escapes the validated outbound URL. The external CTA uses a new tab with `noopener noreferrer`. The save operation uses the current organization version, refreshes session state and rerenders after success. Keyboard focus is inherited from the existing 3px `--focus` outline, visible in the corrected bottom screenshots.

Owner-only access follows the existing `access` capability: the workspace navigation maps the reservation settings to that capability, only the owner role owns it, and the server requires it for `saveBookingChannel`. Registration creates the organization with owner membership and uses the same destination fields. The model accepts one canonical public HTTPS `treatwell.lt` / `www.treatwell.lt` salon URL without credentials, query or fragment; the page does not request Treatwell login credentials.

Server guards enforce external mode for native booking and scheduling operations. Channel changes also protect future confirmed visits, live holds and active waiting requests; returning to native booking requires schedule confirmation. These contracts explain the settings caveat and external-calendar copy. This documentation review does not replace the root's behavioral/runtime verification.

## Do's and Don'ts

- Do preserve the existing token and primitive sources for future extensions of these controls.
- Do distinguish saved active destination from a pending radio selection.
- Do keep the external-calendar explanation, history caveat and explicit destination CTA together.
- Do treat the Treatwell link as a redirect destination: availability import, synchronization and completed external booking are not established by a link click.
- Don't turn this settings composition or its one-destination contract into a new global visual identity.

## Historic drift and acceptance boundary

The incumbent `DESIGN.md` retains earlier porcelain/coral/sage/serif concepts and historical prototype or platform acceptance statements alongside the later owner-selected black/white/violet guidance. Those historical records are preserved; the new extension follows the later explicit identity. `PRODUCT.md` likewise contains earlier local-only capability/acceptance context and later additions; this task does not refresh those global statements or promote them to current release evidence.

The requested `../.impeccable/design.json` path was checked and is absent in this checkout, including a hidden-file scan of Madbeauty. No sidecar was created, relocated or inferred from another site's tokens. Existing `PRODUCT.md`, `DESIGN.md`, JSON files, roadmaps and runtime source were not edited by this documentation pass. The only document written is this scoped check.

The reviewer disposition supplied after the corrected local review is **ship**, with no material visual blocker in this extension's examined desktop/mobile viewport evidence. It is not a claim of full-page coverage, every registration/error/return state, every viewport, independent whole-platform accessibility acceptance, measured contrast or Lighthouse, live deployment, salon ownership verification, external URL reachability, imported appointments or production reservation delivery. Deployment remains pending and requires separate release evidence.
