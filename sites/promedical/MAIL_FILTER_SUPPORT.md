# Techninė užklausa Hostinger pagalbai

Būsena: savininko patvirtinta ir išsiųsta prisijungusioje Hostinger pagalbos pokalbio sąsajoje. Gavėjas: Hostinger pagalba. Nėra slaptažodžių, prisijungimo raktų, klientų duomenų ar ne mūsų laiškų turinio.

## Siunčiamas tekstas

Hello, please investigate an incoming-message filter on Hostinger Mail for info@promedical.lt.

The active filter “Promedical svetainės užklausos” has Match all rules:

1. From is equal to uzklausos@promedical.lt.
2. Subject contains [promedical.lt] Poreikio užklausa.
3. Custom header Authentication-Results contains dkim=pass header.d=promedical.lt.

Action: Move message to Inbox. The filter is enabled. We saved it and reopened its settings to confirm all three conditions and the action.

Two new, explicitly marked self-test messages sent through our website after enabling this filter were received in INBOX.Junk, not INBOX:

- Message-ID <qcoqvnq3Xo05SkHnBX47BAvfAmAeqqugCxwj@promedical.lt>, sent on 2026-10-10 around 08:10 UTC.
- Message-ID <l11nrsl1VfFoJO3xxXraeRroNp0IWZeA9kjK@promedical.lt>, sent on 2026-10-10 around 08:14 UTC.

Both recipient-side messages have SPF=pass, DKIM=pass and DMARC=pass. The exact DKIM fragment in condition3 is present in their received Authentication-Results headers. Read-only IMAP checks using only the exact own self-test markers found one matching message in Junk and none in Inbox. Neither message was moved manually.

Please check filter execution, whether receiver Authentication-Results is available when this filter runs, and the precedence of spam classification versus folder actions. What supported configuration moves only these matching authenticated website notifications to Inbox while retaining general spam protection and accepting other normal inbound mail?

The website uses Cloudflare Email Sending; inbound mail remains at Hostinger. We have not disabled spam filtering, added an incoming-only allow list, changed inbound MX or expanded this rule. Please do not apply broader account changes without asking us.

## Faktinis rezultatas — 2026-10-10T08:26:40.000Z

Hostinger support confirms spam/Junk outcomes at both test times but cannot establish filter match or execution precedence from its available diagnostics. The visible human-review action accepted the technical case; Ian is reviewing it. No formal ticket ID or resolution is shown yet.

Human ticket: {"confirmedTicketId":null,"reviewAccepted":true,"reviewer":"Ian","status":"HUMAN_REVIEW_IN_PROGRESS","technicalNoteSubmitted":true,"visibleSignal":"Ian peržiūri tavo užklausą / Tavo užklausa peržiūrima"}. Await the human review in the preserved signed-in support tab. Apply only a concretely supported change within the authorized scope; broader security changes need a specific approval. Retest a new own marked form only after a relevant change or new diagnostic reason.

Sanitized receipt: [verification-20261010/production-hostinger-filter-support-v1.json](verification-20261010/production-hostinger-filter-support-v1.json). The exact sent message above is retained; no credentials or unrelated inbox content included.
