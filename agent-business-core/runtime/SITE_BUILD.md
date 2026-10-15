# Trusted media receipt in an approved local site build

The existing site-build supervisor still uses the maintained Creation and GUIDE workers. It may attach **an existing, operator-supplied image** before the next GUIDE admission; this does not generate an image, start a new provider or approve a website.

The fixed optional file is `customer-content/<creation UUID>/revision-N/media-inbox/next.json` under the configured stable runtime artifacts root. It is private runtime data, never Git content or a browser-selected path. The operator writes a complete file atomically and retains it for replay. There is no public mutation endpoint and no new queue or optimizer.

The strict envelope has exactly `version: "site-build-media.v1"` and `attachment`, whose fields follow the maintained `creation.media.MediaAttachment` model. The attachment binds the actual accepted revision/candidate/host/page, original site/page/planning hashes, source filename and SHA-256, MIME, alt text, rights, optional credit and prompt. The actual source file must already exist in that exact case's `media-inputs` directory. No credentials, arbitrary source paths or provider configuration belongs in the file.

The supervisor checks for active GUIDE work first. It processes at most one supplied attachment per step through `creation.media.attach` and the existing shared `saveResponsiveAsset` / page amendment workflow. It preserves all prior media/editorial fields, original intake and published history. Attached replay is read-only; the retained native receipt prevents re-importing an already imported family after an amendment failure. An ambiguous import/write or changed original context requires explicit reconciliation; never refresh stale hashes automatically to force a replay.

To supply the next image, the trusted operator captures its current exact context after the prior operation and atomically replaces `next.json`. This is not a request for another model run. Without an inbox the existing content path continues and missing media/editorial/render evidence remains pending. A malformed, oversized, aliased, replaced or stale inbox fails closed; it is not silently discarded or treated as success.

Actual current page/media reads and browser review remain separate from attachment. Source facts, image rights, editorial review, local render/release/Foundation, production deployment and channel activation retain their existing gates. The initial source regression uses inert synthetic files only; adoption into a serving worktree and a real accepted case must be recorded separately.
