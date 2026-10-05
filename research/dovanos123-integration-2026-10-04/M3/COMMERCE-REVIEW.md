# Informacinės komercinės nuorodos priėmimas

2026-10-05 Europe/Vilnius, actual patikros momentas 2026-10-04T21:06:31.000Z.

Atvertas https://memorycasting.lt/ puslapis. Jis rodo rankų liejimo rinkinių informaciją; pirkimo mygtukai veda į kitą domeną memocasting.lt. Tai ne patikrintas checkout. Kainų, atsiliepimų, pirkėjų skaičiaus, saugumo ar pristatymo pažadų patikra šiuo įrašu nesuteikiama; į naują portalą jie nekopijuojami.

`config/commerce-targets.json` turi tik `memorycasting-information`: purpose information, canonical https://memorycasting.lt/, label „Apie rinkinį“, verifiedAt aukščiau, expiresAt 2026-10-11T21:06:31.000Z. Leidžiami tik utm_source/utm_medium/utm_campaign/utm_content raktai. Redirect/checkout parametrai, pasikartojantys raktai, fragmentai, kredencialai, kitas path/origin ir pasibaigęs readiness atmetami. Tai nėra automatinis patikros atnaujinimo runner: pasibaigus terminui nuorodos išnyksta, kol operatoriaus/agentų atlikta nauja faktinė patikra atnaujina registrą.

Vieša nuoroda papildomai reikalauja konkretaus puslapio patvirtinto commerce snapshot: matching target ID, verified=true, tikra checkedAt ir tas pats canonical destination. Vien registre esantis target nepakeičia originalių private juodraščių ar jų approval. Originalus legacy import ID/verifiedfalse nekeičiamas atgaline data.

Owned SourceV2 citacija leidžiama tik su šiame pačiame puslapyje patvirtintu informacijai skirtu commerce snapshot ir dabartiniu registry readiness. Generic external owned URL ir autoriaus sameAs neapeina bendro network publication/deployment filtro. NetworkLiveDomains išlieka tuščias; nuosavi legacy/www adresai registruoti kaip owned, ne kaip deployed.

Actual regression: public `tests/content-projection-v2.test.mjs` ir `tests/content-v2-admission.test.mjs`; visi namespace/expiry/no-snapshot/canonical/parametrų atvejai PASS. Actual gift turinio rekomendacijos dar laukia naujos patikrintos versijos. Jokių pirkimų, nukreipimo proxy, mokėjimų ar kainų scraping runtime neįjungta.
