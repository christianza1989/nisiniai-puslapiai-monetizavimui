# Future app payment flow — researched, not implemented

The owner's question describes Tap to Pay: the professional enters an amount in a compatible native phone app, and the customer presents a contactless card or a supported mobile wallet (Apple Pay / Google Pay). The professional's phone acts as the reader. Merely touching two arbitrary phones or using browser Web NFC does not establish a card payment.

Official Stripe documentation retrieved 2026-10-11:

- [Lithuania regional considerations](https://docs.stripe.com/terminal/payments/regional?integration-country=LT): Terminal in Lithuania is **Private preview**, EUR only, and either the platform or connected account must be in Lithuania. Confirm actual account access, supported phone OS/model and local Tap to Pay reader availability before choosing an implementation or promising launch.
- [Tap to Pay reader connection](https://docs.stripe.com/terminal/payments/connect-reader?terminal-sdk-platform=react-native&reader-type=tap-to-pay): native SDK integration supports eligible contactless cards and mobile wallets. An app must implement the provider's payment and reader flow; NFC alone is insufficient.
- [Payouts to connected accounts](https://docs.stripe.com/connect/payouts-connected-accounts): connected-account charges can accumulate in the provider's balance and pay out to its external account according to the applicable schedule/configuration. Stripe Connect can associate each professional with their own connected account and a platform fee where configured. No dashboard, liability, charging or commission model has been chosen here.

Illustrative sequence: professional enters €35 → customer taps wallet/card → processor confirms payment → professional's payment balance → bank payout. Confirmation and bank settlement are distinct events.

If local Tap to Pay access is unavailable, a QR/payment-link or online checkout flow can be evaluated separately. No financial account, payment collection, paid subscription or payment configuration was created by this website task.
