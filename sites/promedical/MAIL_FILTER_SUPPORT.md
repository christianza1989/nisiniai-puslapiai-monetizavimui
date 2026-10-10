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

## Peržiūrėtas atsakymas ir patikslinimas — 2026-10-10T08:37:07.126Z

Ian-reviewed Hostinger reply recommends Not spam and the exact-sender incoming allow list, without a filter-execution finding or confirmed fix. Actual mailbox UI says the allow list accepts only listed senders. No entry added. Public technical clarification sent in the existing owner-authorized case; Airida is reviewing it. Automatic Inbox remains unproved.

Hostinger UI warning: “Only accept incoming email from these addresses or domains. Leave empty to accept mail from anyone.” Full original headers requested by the vendor were not sent. Current receipt: [verification-20261010/production-hostinger-filter-support-v2.json](verification-20261010/production-hostinger-filter-support-v2.json). Prior pending-Ian entry is historical.

## Pilnos bandomojo laiško antraštės — 2026-10-10T08:48:47.476Z

The complete original headers of one own marked test were sent to Hostinger with specific owner approval. Hostinger Agent confirms all three filter values and SPF/DKIM/DMARC pass in the delivered copy, alongside X-Spam: Yes and Junk receipt, but cannot establish rule matching, evaluation order or root cause. Further technical review accepted; Airida is reviewing the existing case. No setting change or confirmed fix; automatic Inbox remains unproved.

Explicit owner consent received for the complete 4,950-byte original headers of the qcoq self-test. Submitted in the same Hostinger conversation at 11:46 Vilnius; UI converted the text into an attachment, and the response confirms it read the supplied headers. Body, credentials, unrelated mail and customer data were excluded. Raw headers/screenshots remain private; no mailbox/filter/allow-list/DNS settings changed. Current receipt: [verification-20261010/production-hostinger-filter-support-v3.json](verification-20261010/production-hostinger-filter-support-v3.json). Earlier not-sent and pending-review notes are historical.

## Specialist continuation and delayed-learning test — 2026-10-10

Fausta reports correct authentication/configuration and attributes spam to sender reputation, without identifying a domain-versus-shared-IP signal or resolving filter precedence and Incoming Allow list semantics. A fifth independent native website form, almost two hours after the first own Not spam action, was saved/notified but again reached Junk with SPF/DKIM/DMARC pass and the exact approved DKIM fragment. The new message was not moved. Hostinger requested a bidirectional test; an official vendor test address and marked send confirmation have been requested. No confirmed fix or automatic Inbox pass.

Fifth own test: PROMEDICAL-QA-20261010-SUPPORT-FIX-1, lead c3bcd836-ed29-43d5-bdb4-b31f3519cf1a, Message-ID <nQVw5qwAaZz1S4L7u9JnQkW1iGacrXZWDGOe@promedical.lt>. Inbox0/Junk1, X-Spam Yes, not moved. The domain and mailbox began project use recently; exact mailbox creation date has not been verified. Incoming Allow list remains empty because its actual UI exclusivity warning and authentication scope still require clarification. No new full headers, credentials or customer data sent. Current historical snapshot: [verification-20261010/production-hostinger-filter-support-v5.json](verification-20261010/production-hostinger-filter-support-v5.json). Bidirectional marker PROMEDICAL-HOSTINGER-20261010-BIDIR-1; no send or receive result yet.

## Natural reply and controlled warm-up — 2026-10-10

Hostinger's ordinary diagnostic email reached receiving Inbox. One natural Reply from info@promedical.lt to the supplied official diagnostic address is verified in Sent; vendor receipt/folder remains pending. Only the exact fifth own website test was subsequently marked Not spam, with Message moved to Inbox confirmation. A sixth NEW native website form after this training still reached Junk with SPF/DKIM/DMARC pass and the exact DKIM fragment; it remains unmoved. General Cloudflare/Google/Hostinger guidance supports gradual real sending and distinguishes domain and sending-IP reputation, but no case-specific cause or automatic website Inbox fix is proved. A separate single Cloudflare REST diagnostic attempt was rejected by API authentication; it is not counted as sent, and no credentials/access/bindings were changed.

The vendor message subject was Email from Hostinger, not the requested BIDIR-1 marker; its first exact-marker zero-match receipt is retained without calling it a failed delivery. Sixth native Message-ID <0z8WMnuGTlrpCs0jbmo8wFg15WCBfN25CRHF@promedical.lt>, Inbox0/Junk1, not moved. Current snapshot: [verification-20261010/production-hostinger-warmup-support-v6.json](verification-20261010/production-hostinger-warmup-support-v6.json). General guidelines do not prove a private Hostinger classification score. Existing complete own headers remain available to the vendor; no new complete headers or customer data sent.

## Bidirectional result and prepared alias — 2026-10-10

Fausta confirmed at12:45 Vilnius that the ordinary Hostinger diagnostic message and our natural Reply both reached Inbox. The new receiving mailbox therefore handles ordinary bidirectional mail. All six native website inquiries initially reached Junk despite authentication pass; test5 was later manually Not spam, and independent test6 remains Junk. Hostinger cannot manually override classification and recommends sender/format review and continued legitimate training. The absence of a Hostinger mailbox for uzklausos@ is not a proved cause. An alias uzklausos@promedical.lt to the existing info@promedical.lt mailbox is fully prepared but NOT created, pending the plugin-required specific owner confirmation. Filter timing and Incoming Allow list exclusivity are still being clarified; no verified automatic website Inbox fix or formal case ID.

Specific owner confirmation requested for the prepared alias because the Hostinger router instruction says “One confirmation before any write.” The form is open, destination info@ disabled/read back and local part uzklausos entered, Create enabled; no final submit, new credentials, purchase, filter loosening or allow-list entry. Current receipt: [verification-20261010/production-hostinger-bidir-alias-prepared-v7.json](verification-20261010/production-hostinger-bidir-alias-prepared-v7.json). At12:52 requested two precise function answers and technical case reference.

## Exclusive allow list and independent Gmail test — 2026-10-10T10:30:08.999Z

At13:00 Vilnius Fausta confirmed that Incoming Allow accepts only listed senders, so the list remains empty to preserve customer mail. She cannot confirm filter timing or a case-specific reputation cause. One owner-authorized ordinary message from info@promedical.lt to the owner-provided Gmail address was sent at13:27 and verified in Sent; Gmail arrival/folder and genuine reply are still pending. All six native Cloudflare website messages initially reached Junk; the latest remains unmoved. The prepared uzklausos@ alias to the existing Hostinger info@promedical.lt mailbox is still not created or approved. The owner clarified that info@azprekyba.lt mail is hosted by Google Workspace; it was mentioned only as the hPanel login identity and is not the alias target. No automatic website Inbox fix or formal technical case ID is proved.

The specific Gmail test purpose and private recipient were supplied by the owner. One plain message requesting a genuine reply is verified in Sent; no second message or unapproved recipient used. Exact Promedical-only alias confirmation was clarified after the owner corrected the hPanel login address's mail provider; no alias submitted. At13:27 asked for a supported technical-team escalation procedure. Receipt: [verification-20261010/production-hostinger-gmail-test-v8.json](verification-20261010/production-hostinger-gmail-test-v8.json). Personal contact and screenshots are private.
