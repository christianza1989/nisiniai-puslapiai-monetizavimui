---
name: website-reference-analysis
description: Analyze a reference website, its frontend scripts or captured screens with the core REA adapter before reproducing useful layout, interaction or implementation ideas. Use for website reverse engineering and evidence comparisons; ordinary copy edits do not need it.
---

# Website reference analysis

Use the maintained [REA core adapter](../../REA_CORE.md), not a second website builder. Resolve the checkout containing this skill and use its `integrations/rea/` commands; do not assume the terminal starts at the repository root. Prefer the `pinet_rea` MCP tools when available. Otherwise `node integrations/rea/cli.mjs schemas` and `call TOOL arguments.json` use the same engine and scope.

Identify the reference and the owner's intended result. Inspect desktop/mobile composition, navigation and the relevant state changes through the authorized browser tools. REA adds passive page/script evidence, static frontend analysis and capture/pixel comparison. It cannot retrieve a private backend or infer that an unseen feature works. Keep observed facts, derived findings and proposed implementation decisions distinct.

Run `doctor` first when readiness is unknown. For browser evidence the adapter needs a dedicated loopback CDP browser and an explicit origin in its private policy; it never attaches to arbitrary account tabs or launches a browser itself. Configure only the reference currently authorized by the task. Follow the current environment's browser-use instructions. A browser controlled exclusively by a private pipe cannot be attached by pretending it has a CDP HTTP endpoint. For that environment use its browser inspection/screenshots and REA's offline comparison/static-analysis path instead.

Use `rea_list_browser_targets`, then the returned target ID for `rea_inspect_web_page`, `rea_analyze_web_bundle` or `rea_capture_web_screenshot`. Pick only the evidence needed for the feature. `rea_observe_web_session` observes external actions; it does not click. Do not enable storage/console contents or source-map fetching by bypassing the adapter. Use `rea_analyze_javascript_application` only for supplied/exported frontend files under the configured artifact root; it parses them without executing the target. Do not place credentials or unrelated customer material in that root.

Compare aligned states and viewport sizes with `rea_compare_web_captures` or `rea_compare_web_screenshots`. A zero pixel difference is not a functionality, design-quality or accessibility verdict. Preserve incomplete coverage, errors and upstream limitations. Receipts stay private under `integrations/rea/.local/evidence/`; report their IDs and the specific finding, not a fabricated PASS.

Return useful decisions: what to adopt, what to adapt to this business and what to leave out, linked to the captured evidence. Build through the existing renderer, media, review and publication contracts. Produce original copy and assets or use material the owner is entitled to reuse; a reference analysis is not a claim to its brand or complete source. This skill grants no publication, paid model call, external submission or runtime agent admission.
