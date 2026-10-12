# Exact staged rename safety — 2026-10-12

Status: **SOURCE_QA_PASS; NEW_SOURCE_KIT_PENDING**.

During the owner-authorized other-PC source-only kit refresh, an isolated alternate Git index contained3851 archive files under review prefixes. Git identified them as renames of current source. The canonical scanner used `--diff-filter=ACM`, so it reported PASS with zero files. The mandatory archive-file-count equality guard rejected the release; no package was certified by that empty result. Original failed kit, empty report and private failure `b48d5dcf3a1bce917e8cc1c22a0bfd8b56ec58d6091cee34b74a932d7c903e02` remain preserved.

The same gap was reproduced with both unchanged and modified renamed files containing synthetic key patterns: original six tests had4PASS/2FAIL, log `8b8817969e035a0147e0325ebd8c33d5f9f9f0967310302cc23fdbaf2751071d`. No real credential was used or printed. The scanner now includes R in its existing exact-index blob read; candidate scanning, token patterns, local-secret matches, size rules and safe reporting remain unchanged. No parallel scanner was added.

Final seven Node tests passed in11.79s, log `3d8db13004fe82b8eea843dc249647f3f9263a3db2c9ba6978648cefd5f13d58`: original four checks plus unchanged/modified secret-pattern rename rejection and clean rename nonempty PASS. Fixtures stay under the owned ignored runtime/artifacts directory and are retained. Rechecking the original actual source archive/index scanned all3851 files successfully, report `4936e455831d595977bd799ecb0681d87bf16e4fc2b04996128d53161f53fa56`; the default staged source stayed unchanged. Scoped Git whitespace checks passed.

The earlier strict package Git-blob equality guard also rejected11 valid CRLF exports declared by pinned `.gitattributes`. That failed archive remains preserved. Packaging accepts only a selected-commit blob or its Git-declared `eol=crlf` export with unchanged logical bytes, then scans the actual archive bytes and checks all paths/counts/CRC/SHA256. It does not silently normalize source or bypass safety.

Before tracked writes, the exact owned supervisor30708 tree was stopped, preserving22 committed source proofs (`83f10156eaac03f4d999128556d15740ba03958a5ee78c218aea14372d65a2e0`), and owned API47048 was stopped with PID/creation-time/command/cwd guards. No foreign checkout, source, process or operational data was changed. Source-only archives never include runtime databases, sessions, credentials, private conversations/model outputs or learned releases. Pattern checks are not universal PII detection.

This is source safety; actual new kit, target-PC clone/install/startup, ordinary dashboard UI, calibrated agent and public release remain separate acceptance. Providers/channels0. Madbeauty correspondence stays owner-deferred. Canonical rule: docs/GITHUB.md; issue66 scope6128554182/6128590969; upgrade703b1915.
