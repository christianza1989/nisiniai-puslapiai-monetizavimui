# Exact approval lookup handoff

Scope and design: [decision](../decisions/VERSLOMATIKA_EXACT_APPROVAL_LOOKUP_2026_10_14.md). Independent actual baseline is pending in the owned continuation QA0037. Original0032 counts/role, ordinarybbb0036 and provider/channel holds remain unchanged. Source/migration implementation awaits released peer0038; this reservation is not a local verification, delivery or adoption claim.

Actual baseline reproduced1FAIL19.92s: the target has a real canonical approved draft/import and one queued GUIDE, but105 older approval-only fixtures push it outside the old selector. Maintained worker.tick returns approval/blocked/build_approval_unavailable and never executes its GUIDE. Sanitized private receipt `agent-business-core/runtime/artifacts/workspace-ui/build-continuation-approval-lookup-first.log` retains the assertion and original outcome. No provider call or other fixture execution occurred. A separate source fix/regression remains pending.
