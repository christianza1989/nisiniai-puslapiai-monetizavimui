# Payment continuation and primary sender

Owner requests: 24-hour checkout, one neutral reminder after 12 hours, a working payment-continuation button, and info@memorycasting.lt as the authenticated primary sender for customer mail. Original LIVE order 0098CE9D was expired/unpaid with no PaymentIntent; no decline or customer motivation can be inferred. No message to that customer is authorized as a test.

## Implementation and acceptance

- [ ] Preserve existing orders, accepted/unknown mail commands, provider credentials, stock and signed payment truth.
- [ ] Opt-in store policy: 24-hour reservation; original one-hour default for other stores; future informed orders only.
- [ ] Signed purpose-bound recovery link in URL fragment; no PII or credential in query/logs. Existing access token remains valid. Recovery access restricted to order/receipt/payment, never refund or operator actions.
- [ ] At 12 hours, reconcile the exact Stripe Session, suppress paid/withdrawn/expired/replaced carts, claim once with existing durable notification ledger. Unknown sends are never replayed.
- [ ] Expired link restores choices/contact/delivery for fresh quote and customer review; cannot revive expired Session or silently reuse shipping quote/price.
- [ ] One neutral, unpersonalized LT reminder without offers, pressure or further reminders. Visible checkout and privacy notice. Reference: VDAI 2025-11-20 consultation, cart reminder section (one within 24 hours; GDPR information still required).
- [ ] HTML button + text alternative, escaped copy, no remote tracking; actual desktop/mobile preview.
- [ ] Main sender migration: exact Hostinger mailbox validation, private provider bindings, preserve old mail receipts, actual owner inbox receipt. Creating the new mailbox key awaits the separately presented browser action-time approval.
- [ ] Admin distinguishes expired unpaid reservations and shows zero refundable balance before payment.
- [ ] Boundary/concurrency/provider-unknown/security regression, source handoff and exact deployed acceptance. No real purchase, shipment, refund or customer test mail.

Typography retains current checkout/admin tokens. Mail uses readable system fonts, 16px body / 1.6 leading, a bounded 560px reading column, dark text on white and a dark 48px-high action. Verify 320px reflow and long labels. Review complete LT copy after rendering. No newsletter/marketing consent is inferred from purchase terms.

Source reservation: CORE issue261 and PUBLIC issue78, own existing final-fixes branches. Mail and recovery are separate from the already deployed SEO fixes. Paid services, DPD and article dates remain outside this change.
