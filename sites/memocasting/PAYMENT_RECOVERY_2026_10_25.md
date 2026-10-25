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

## Accepted activation superseding the initial checklist

2026-10-25T19:03:26.417Z: the production store policy was activated with24-hour reservation and one reminder after12hours for future informed orders only. No old customer was enrolled or emailed retrospectively. The signed recovery secret is a private provider binding. Public storefront-context and cart confirm LIVE payment connectivity and the24/12 notice; invalid recovery capability is rejected403.

The approved replacement Hostinger key was privately installed for authenticated info@memorycasting.lt, displayname Memory Casting. One clearly labeled owner self-test was accepted by the private mail Worker and independently found in the exact owner INBOX. This proves transport/inbox receipt, not a real customer's12-hour reminder. Old accepted/unknown notification records were preserved; an unknown outcome is not resent. The unused first key remains as explicitly requested.

Frontend accepted version155bfebf-2641-479a-a658-3623eacc016e, source PUBLICdb13446f0696f1049b82e0863b39e6ff4fd68403, native release5be826b7-33ee-40c6-8f05-f7ed24b48f8c, package SHA256b02879f7df3fdc9207248e3f45775a0f3e3f90ce88f1f525ae4c10e94c89a4dc. The separate mail Worker accepted version4b165ec7-466e-4b29-8c0b-29bfaecf32e7. Backend UI publication is recorded separately in ADMIN_DASHBOARD_2026_10_25.md.

The restart checkpoint at18:34Z is historical and must not be used as the current disabled-policy configuration. No real purchase, refund, shipment or customer reminder was generated for acceptance. A future eligible order and elapsed12hours are still required to observe a real customer reminder.
