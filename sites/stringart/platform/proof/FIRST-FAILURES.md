# Preserved failures

14 October 2026. These are original local implementation failures, not shared-core defects or accepted production results.

- Git plan commit initially failed because this session had no configured author. The established handoff author `Codex <codex@local.invalid>` was read from Git and supplied per command; no shared/global configuration changed. First PR creation had no plan commit; after the corrected commit/push, scoped draft PR129 opened successfully.
- After receipt lookup was changed to principal/role/tenant scope, its insert still used the old actor-only scope. Regression `idempotency replays exactly once` failed with SQLite UNIQUE constraint on the second action. Both read and write now use the same authenticated principal scope. The failed command rolled back its state changes.
- The earlier supplier-receipt negative test matched the word “operator” in the message. Earlier authorization now rejected it with “This purchase action is unavailable to this workspace.” The check was changed to verify the exact `forbidden` code and HTTP 403 instead of incidental prose; the rejection requirement is preserved.

Retest evidence is recorded in ACCEPTANCE.md when the complete backend/browser suite runs.

- Cached supplier-result equality exposed an undefined optional `tracking` property on the initial in-process response that disappears in JSON serialization. Responses are now normalized to their actual JSON representation before both return and receipt storage, so an exact replay has the same data shape. Supplier private-field and authorization checks remain intact.

- The HTTP hostile-Host test received 200 because Node fetch did not transmit the requested Host override. It now uses native `node:http` with the actual Host header. This was a transport-test defect; the server's Host gate remains unchanged. The original 200/403 mismatch is retained here.

- Browser QA's default Playwright Chromium was not installed. The test uses the already installed Microsoft Edge channel; no new browser download or service was required.

- The first full browser journey completed portrait delivery, kit return/refund and inventory actions, then its generic Acknowledge locator matched both proposed purchase rows. The recorded screenshot shows both valid choices. The scenario now selects the first matching row (the seeded PO-1001). This was a test locator ambiguity; no supplier-state rule changed.

- Collaborating chat's isolated reproduction (Store SHA-256 `ee2c222719f78423cf339052f4b7dfdd272bf05709958f5738d39485756fb39c`) found rework could overwrite the order's machine ID without releasing its previous station. Both stations then referenced one order, and cancellation left the first station occupied. Rework now releases only the same order's prior assignments atomically after new-machine/material validation. Regressions cover foreign-machine rejection/rollback, successful cross-machine rework, completion, cancellation and preservation of an unrelated job. The external private reproducer did not touch this runtime DB.

- The first complete responsive batch found three form labels overflowing 162px fields by 3–13px under simultaneous measured 200% text resizing and text-spacing overrides. Grid columns now use intrinsic rem-based minimums and collapse as text grows; text wraps naturally. The same batch also exposed excessive narrow-table compression, a dark primary-action icon, small metadata and long-lived success notifications over table content. The repair batch gives operational tables deliberate horizontal scrolling/minimum widths, uses white primary icons and 14px metadata, and reduces/replaces transient notification timers. Original captures are retained under proof/captures/review-* locally.

- The confirmation completed all role/viewport and enlarged-text checks, then its delayed-request harness removed a route before the outstanding handler continued it (`Route is already handled`). The harness now waits for the response/render before removing interception. Only the still-pending loading/network-error/keyboard group requires targeted completion; this is not a reason for another visual-polish loop.

- Visual inspection of the accepted enlarged-text capture found the fixed-pixel desktop sidebar cutting its brand/navigation text, despite main-container checks passing. Sidebar widths now use rems and brand text can wrap. The targeted final check includes sidebar brand/navigation elements at 200% text and spacing, at desktop/intermediate/phone widths. This concrete defect requires a further scoped check; the earlier main-only overflow result is not claimed as full typography acceptance.

- Extending that targeted typography check to 768px found the enlarged sidebar left the main column too narrow (document 1,102px in a 768px viewport). At tablet widths the navigation now uses the existing horizontal layout; headings, timelines and status labels wrap rather than forcing their minimum word width. The previous failed capture/measurements remain in sidebar-final-*; the next retest uses a distinct prefix.

- The combined 200% plus spacing test then passed at 1280/768px but exposed a further 19px document overflow at 320px. The export button's minimum content width and a long refund-help word forced their parent widths. Buttons now respect the available width and wrap their contents; paragraph text uses natural wrapping with a last-resort break for oversized words. Editable input text and deliberately scrollable tables/navigation retain their native scrolling behavior.

- The collaborating chat's final pristine overview review found “1 supplier purchases open”. The queue now uses singular “purchase” for one and plural “purchases” for zero/multiple. The actual pristine operator overview was rendered and inspected once; explicit browser-only count fixtures also confirmed zero/two without changing the server database. No broader layout/backend change or retest was needed.
