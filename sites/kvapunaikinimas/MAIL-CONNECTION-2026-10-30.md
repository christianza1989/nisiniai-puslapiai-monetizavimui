# Contact form mailbox connection — 2026-10-30

The owner requested the existing Hostinger mailbox, explicitly confirmed it as sender with the original sales recipient, supplied its private credential folder and authorized one marked native-form test. The owner then confirmed receipt of the test identified by subject suffix20da0c18.

| Item | Result |
|---|---|
| Authenticated sender | kontaktuforma@kontaktuforma.lt |
| Recipient / visible site contact | sales@kvapunaikinimas.lt |
| Sender display name | Kvapunaikinimas.lt |
| Transport | Existing shared SMTP; smtp.hostinger.com:465, TLS |
| Runtime | Isolated local Worker at127.0.0.1:8918, native .example fixture |
| Initial attempt | Stored, SMTP authentication rejected before DATA |
| Root cause | JSON dotenv serialization did not survive the installed loader literally |
| Corrected qualification | Actual Wrangler4.92.0 loader matches owner file; actual workerd auth succeeds |
| Authorized successful test | Exactly one native lead, D1 notified and SMTP accepted |
| Exact Message-ID | 20da0c18-2eee-4abf-b86c-833a6fe05b7e@kontaktuforma.lt |
| Inbox receipt | Owner confirmed the specifically identified test in this chat |
| Regression | Public307/307, scoped ESLint PASS; no application bundle change |

The setup writer now uses companion scripts/hostinger-mail-env.mjs. Literal delimiters and escaped interpolation preserve normal special characters; unrepresentable values fail closed before file replacement. Both historical verifier readers retain compatibility. Tests reproduce the old actual-loader error and compare7 synthetic password cases with real Wrangler bindings. No new dependency or parallel transport was introduced.

The first failed fixture and the corrected accepted fixture are retained in the local evidence ledger and cleaned only by exact site/id/name after acceptance. No uncertain send was retried; the first password had demonstrably been changed by the loader and the actual runtime rejected authentication before message submission. The recipient stayed the original sales address. Full private evidence: D:/Core/output/kvapunaikinimas-mail-20261030/ (connection, before/after loader and auth checks, test ledger and screenshots). Credentials and credential fingerprints are excluded from this report and Git.

The preview is intentionally mail-enabled now. sites/kvapunaikinimas/verify-local.mjs refuses before requests unless KVAPU_QA_MAIL_DISABLED=1 is explicitly supplied after restarting with SMTP0 and no native email binding. This is an operator checkpoint; it does not inspect the server's hidden environment. Do not reuse the old multi-submission command against the enabled preview.

Actual .lt content remains an unapproved Studio draft and the original WordPress site has not been replaced. A future deployment must install private secrets in the chosen environment, bind the correct DB and qualify that actual runtime before its own allowed delivery test. Local socket success does not establish deployed socket reachability; [Cloudflare documents destination restrictions](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/#considerations). Main merge and other-PC adoption remain separate from these draft changes.
