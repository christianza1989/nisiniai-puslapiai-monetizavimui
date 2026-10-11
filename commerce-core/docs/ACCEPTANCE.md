# Priėmimo matrica
Pradinė būsena 2026-10-11: NOT RUN. Pavedimas nėra priimtas iš plano.

| ID | Bandymas | Laukiamas rezultatas |
|---|---|---|
| C01 | unknown store ir environment | fail closed |
| C02 | serverinė kaina / pakeista client suma | suma nevaldoma klientu |
| C03 | viena stokojanti eilutė kelių SKU krepšelyje | visas užsakymas rollback |
| C04 | du lygiagretūs paskutinio vieneto pirkimai | vienas rezervuoja |
| C05 | request idempotency ir kitoks payload | replay arba konfliktas |
| C06 | restart ir antra DB connection | patvarus tas pats ID |
| C07 | Stripe signature / body / replay | nepasirašyta atmesta, paid once |
| C08 | async payment, account/currency/amount/session mismatch | neįvykdomas neteisingas mokėjimas |
| C09 | expiry ir vėluojantis paid | atkurta stock arba patvari išimtis |
| C10 | siuntos kūrimo timeout ir recovery | nėra antros siuntos |
| C11 | packing prieš paid, cross-store order | atmesta |
| C12 | withdrawal/refund / over-refund | patvaru, tiksli suma, neviršija paid |
| C13 | journal balance/source retry | unbalanced fail, duplicate neįrašomas |
| C14 | outbox lease/retry | atkuriamas apdorojimas |
| C15 | tikras local Workers/D1 | atskiras runtime įrodymas |
| C16 | SDK build ir iki API aktyvavimo | testų įrodymai, live neįjungta |
| C17 | production admission/backup/mail/bank/carrier | UNVERIFIED iki realių prieigų |
| C18 | UI desktop/mobile/keyboard/200% | vėlesnio M5 ir S1 priėmimas |

