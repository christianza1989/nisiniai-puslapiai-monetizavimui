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
