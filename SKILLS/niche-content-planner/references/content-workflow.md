# Bendras workflow visoms nišoms

Read the project's `CONTENT_CORE.md` when orchestrating generation, review, approval or delivery. Do not create per-domain planners, media optimizers, schedulers or exporters.

Before the first package set private `contentPolicy`: months, articlesPerMonth, localTime, timezone. Cadence choices are delegated to the agent. Prioritize useful distinct questions over quota; record unmet targets rather than filler. V1 generation adopts workflow v1; v2 text generation remains disabled to preserve rich content. Both versions' reviewed drafts use the common release path.

After drafts, generate/inspect actual media and verify claim sources, then call `finalizeInternalLinks` for the selected same-site graph. This attaches valid draft dependencies without approval or changing published snapshots. Unknown/revoked targets require an editorial decision. Don't attach every page or invent service/filter URLs.

Review the final exact revision and get its hash from workflow status. Record a real `recordEditorialReview` with reviewer ID and evidence for usefulness, facts, sources, media, links, presentation. Explain the original contribution, verified/removed claims, source context or justified absence of citations, inspected files/crops, target IDs and rendered desktop/mobile checks. Reference maintained evidence files/URLs. A valid string is not evidence; never invent reading sources or seeing pixels. Resolve factChecks honestly first. Later content/media/link/fact/contact changes require another review.

Use `approveReviewedBatch` for mutually linked pages: all snapshots or none. Then `releaseContent` exports an immutable per-site release with private evidence and exact-byte hashes. No raw JSON hash editing or legacy approval/export bypass. The agent handles routine review, not the owner; consequential business facts stay unknown until established.

`exported-not-deployed` is literal. Import/validate in the common engine and test the real rendered route and dependencies. Do not expose the private review manifest. V2 retains its admission receipt. Deployed approved future content and prepared links become public when the shared clock permits; local drafts and linkSuggestions do not.

Old websites require actual new reviews, not retroactive PASS or rewritten historical fingerprints. Website-specific service/catalog adapters resolve registered real targets with public eligibility; plans are not runtime. Keep launch/contact delivery/demand checks separate.
