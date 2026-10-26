# Ergonomic adapter feedback

## 2026-10-26 · explicit hybrid desk defaults

Issue281; upgrade-bf678e43-97dd-4aeb-afef-3f4808afe0d0. Supplied desk contexts can carry a non-first `default3DValues` choice or one intact hybrid scene without interchangeable groups. The adapter now validates those values, preserves the source default, and marks text-only controls with an explanation that the original 3D remains visible. Null is permitted only for an empty domain; invalid defaults are rejected. Legacy packages retain the first-choice fallback.

Actual local checks: 19 focused component/color/sharing regressions passed; TypeScript exit0; current product loader proof covers 13 contexts, 103 source component tuples, 50 text values and full SHA of all69 original geometry files. Browser/public preview checks remain pending. Original geometry/material/world matrices and captured tuple legality are unchanged. Scope and acceptance plan: research/owner078-first5/REVIEW.md. No other model format adoption or Launch claim.


## Owner078 batch02: captured dimension field names

Upgrade `upgrade-8c744e7b-a96a-413f-921f-d0dafb47bcd3`, issue281: the supplied Aero runtime uses DTOPDEPTH/DTOPWIDTH, not a new dimension Cartesian product. The narrow adapter allowlist/labels and captured-pair/token/geometry regression preserve its exact fields. The later source-only BSpace height label fix preserves all engine states and tokens. See `research/owner078-batch02/REVIEW.md` for actual evidence and pending browser/public scope.
