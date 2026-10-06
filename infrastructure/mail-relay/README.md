# Transactional SMTP relay

Live endpoint: https://midnightblue-bear-439840.hostingersite.com/relay.php on existing own Hostinger Premium hosting. Cloudflare Workers use HTTPS HMAC; only protected PHP holds the info@pinet.lt SMTP password. Direct Worker SMTP failed on this provider's Cloudflare-address server; this optional transport is scoped to these sites.

Run node infrastructure/mail-relay/prepare.mjs. Credential-free source and PHPMailer v7.1.1 are verified against DEPENDENCY.json into ignored output/. Dependency mismatch stops preparation. Private output/_private/config.php returns an array containing user/password and keys.madbeauty/keys.dovanos123. Use separate high-entropy keys of at least48 characters, supplied through private files/channels; never source, console output, archives or Git.

Upload credential-free output to this own site's public_html through official Hostinger upload tools. BEFORE private config upload, verify _private/protection-probe.txt and dependency/config paths return403; keep _private/.htaccess (Require all denied). Then upload config privately. Future source updates preserve private config and receipts.json; back them up privately. Root intentionally404, GET relay exposes readiness only.

Worker secrets MAIL_RELAY_URL/SITE/KEY use provider private secret storage. POST signs timestamp + newline + rawBody (HMAC-SHA256); X-Release-Site, X-Release-Time (Unix milliseconds), X-Release-Signature (hex). Five-minute time window,24KiB body, recipient/purpose guards and TLS peer/hostname verification retained. Gift sends only to own configured mailbox; Madbeauty subjects only login/booking updates. SMTP smtp.hostinger.com:465 through pinned PHPMailer.

Stable Message-ID plus private bounded30-day hash receipts avoid routine duplicate retries; crash between SMTP acceptance and durable receipt remains at-least-once. Preserve receipts.json (2MiB/10000 records); nonblocking exclusive lock serializes sending. Safe status errors omit credentials/recipients/body. Redundant self Reply-To omitted, real external client's Reply-To retained.

Actual acceptance: private403, unsigned/stale/purpose rejection, valid send, repeated ID, conflicting payload, exact own primaryINBOX message. Both canonical flows passed. Queues/operator status plus Cloudflare logs support monitoring; no external uptime service configured. See site OPERATIONS and RELEASE records; never publish OTPs, mail bodies, private test IDs or signed upload URLs.
