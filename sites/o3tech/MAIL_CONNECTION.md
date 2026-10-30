# o3tech contact notification · 2026-10-30

Owner explicitly authorized connecting the supplied Hostinger mailbox, selected sales@o3tech.lt as the permanent form recipient and supplied its password in a private local file. After initially declining a delivery test, the owner explicitly requested sending one; the latest explicit destination was sales@o3tech.lt. Exactly one marked test was accepted by SMTP. No message was sent to any alternative address.

The retained loopback preview now starts with the explicit O3TECH_MAIL_CONFIG path to private/mail-kontaktuforma/connection.json. Its site-local Node adapter uses the common companion smtp-protocol.mjs, smtp.hostinger.com:465 with certificate verification, authenticated From kontaktuforma@kontaktuforma.lt and sender name UAB A-Z Prekyba. The native route's validated client Reply-To survives. Recipient is restricted to sales@o3tech.lt; neither form input nor credentials can select another provider or recipient. No public site words/contact details changed.

The normal preview remains mail-disabled without that explicit config path. The password lives outside both Git checkouts in private/mail-kontaktuforma/slaptazodis.txt; directory ACL grants only the current Windows user and SYSTEM. It is read into a server-side closure, never emitted to HTML, logs, source or Git. There is no password copy in an env file.

Validation: actual Node TLS authentication succeeded at2026-10-30T15:11:35Z without sending a message (private auth-receipt.json). All5targeted checks pass: opt-in/default-disabled, MIME authenticated sender/Reply-To, recipient/header injection rejection, unsafe provider/path/sender config rejection, and the actual native POST with isolated disk SQLite plus injected transport. The last check proves storage before notification, notified on acceptance, persisted new after failure, and no automatic retry. These tests send no real email. All23live local draft routes retain exact words/link targets/noindex/oneH1.

The single owner-authorized real adapter test to sales@o3tech.lt was accepted at2026-10-30T15:17:01Z with subject [o3tech.lt] Kontaktų formos TESTAS. It is not a customer lead. The private delivery-test.json receipt claims before transport, records the synthetic Message-ID and SMTP acceptance, and refuses a second invocation. This was a direct real-adapter delivery check, separate from the native POST/storage test with injected transport. Exact INBOX/spam placement remains UNVERIFIED.

Preview restarted as the verified owner process on127.0.0.1:4783, with startup confirming mail enabled to sales@o3tech.lt. The first restart was refused by an over-specific process-path guard; a dependent launch then failed EADDRINUSE. The actual command identity and port owner were inspected before stopping that same owned process and starting the final enabled instance. No foreign process was stopped.

Acceptance boundaries: SMTP authentication and DATA acceptance do not prove INBOX delivery or spam-folder placement. This is the actual local Node draft server, not a deployment or production Cloudflare Worker qualification. MAIL_CORE documents the observed Hostinger/edge TCP incompatibility; never infer that a Node result qualifies the eventual hosted runtime. Production must qualify its selected transport, secrets/bindings, durable storage, anti-abuse and exact recipient delivery before launch. No automatic SMTP/API fallback or automatic retry after unknown acceptance.

Restart from the paired migration root (the value is a path, not a password):

    $env:O3TECH_MAIL_CONFIG='D:\Core\o3tech-migration-20261029\private\mail-kontaktuforma\connection.json'
    node core/sites/o3tech/migration/preview.mjs

Omit O3TECH_MAIL_CONFIG for mail-disabled review. After a password change restart this owned process so it reads the new file; do not copy any private file into content packages or production source. Actual live activation remains a separate deployment operation.

## Actual form acceptance continuation

The owner subsequently confirmed receipt of the first direct-adapter test and pasted its matching ID1a6a5675-b947-40f5-bb0d-8ba557978e03. Owner-reported receipt is now confirmed for that specific test; folder and authentication headers were not independently inspected. Its original receipt is preserved; a new private owner-confirmed-direct-test.json records the confirmation.

The owner then explicitly requested a second test through the actual contact form, with the client Gmail address clarified by the owner. In the existing IAB tab5, selected El. paštu, filled name Kontaktų formos TESTAS, the owner's confirmed client address and the synthetic message marker O3-FORMA-20261030-B1, checked scoped processing consent and clicked SIŲSTI ŽINUTĘ exactly once. No direct API POST or direct-adapter send substituted for this browser test.

The browser navigated to /uzklausa and displayed Užklausa gauta with the saved/transferred-to-mail-server message. Read-only disk SQLite inspection found exactly1matching record, ID98380279-e353-4df9-a4b6-6d0e877d4487, status notified, source path /, matching client email and consent timestamp. The running preview logged niche_lead_notified for that same ID with smtp transport. The actual shared route passes that client email as Reply-To through the already-tested common MIME protocol; received-message headers and a real Reply click are not independently inspected.

The second email goes to sales@o3tech.lt with subject [o3tech.lt] Poreikio užklausa98380279. The native subject contains a space before98380279; it was not changed to the earlier direct-test subject. This actual form test is SMTP-accepted; recipient receipt for this second specific message remains pending. Total authorized real sends:2, one direct adapter and one actual browser form submission. No alternative recipient was used. Both are clearly synthetic; the local lead DB must never be imported as real demand.

Private proof: form-test-ledger.json (intent recorded before click), form-before-submit.png, form-success.png and exact stored ID/server event. The user-owned result tab remains available. A stale browser wrapper first failed before any input; resetting the automation session restored the same browser/tab. The first label selector found no control and made no changes; observed DOM roles were used successfully. No repeat submit or extra email followed either tooling issue. No source/runtime changes were needed for this acceptance step.
