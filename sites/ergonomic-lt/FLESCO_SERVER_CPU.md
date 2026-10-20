# Flesco preview Flight stream correction — 2026-10-20

The KFLS001WW002 page exceeded the preview Worker's CPU limit. The current
54916857 deployment and the prior 43edbc47 version both reproduced the resource
error; this is not evidence of an armrest-label regression or geometry failure.

A finite profile of the actual current build in local workerd returned HTTP200
after54.076s. Of54.521s sampled time,47.168s was self time in vinext1.1.0's
`indexOfByte` inside `normalizeReactFlightPreloadHints`. Each incoming chunk
rescanned and copied an unfinished multi-megabyte JSON row. Separate parsing,
engine, SSR and direct React Flight serialization did not reproduce this cost.
Evidence: `D:/Core/output/ergonomic-chairs-structure-20261017/flesco-cpu-20261020T1108/`.

The Vite alias selects one reviewed application adapter in
`web/src/cloudflare/rsc-stream-hints.ts`. Installed dependencies and original
capture/compiler files remain immutable. The adapter scans each incoming body
chunk once, streams non-hint rows, keeps length-prefixed binary bodies opaque,
and buffers only headers and actual HL hint rows. The upstream byte-length
preserving stylesheet-to-style rewrite is retained. Unsupported row tags keep
the original pass-through behavior. State is per stream/request.

Checks include every byte split of mixed hint/Unicode/binary rows, partial and
invalid headers, progress before a large JSON row finishes, renderer/prerenderer
wrappers, actual full Flesco/Tigu Flight byte parity, existing candidate/quote/
semantic/workflow regressions, both TypeScript checks and an actual built-worker
profile/readback before preview publication. Public HTTP, browser geometry and
CPU-log verification are separate from source checks; never claim them from unit
tests. Preserve the online183 list and prior183 ledger during the corrective
deployment. No new model, runtime/geometry cap, Native, scheduler or editorial
acceptance is introduced.

When upgrading vinext, rerun the exact stream/parity regression before removing
the adapter. Do not edit node_modules or raise CPU limits to hide this defect.
