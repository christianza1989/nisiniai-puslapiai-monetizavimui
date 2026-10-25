# Šaltinių perdavimo ribos

Aktualus 0.12.1: PUBLIC `a82c6da55ff53df895a5c6600adba421b51fbe37` trijų staged blob saugos patikra PASS, 0 radinių; prieš tai `311768b` penkių caller / regresijos failų patikra PASS, 0 radinių. Canonical `be32c223b2e45168b52a5eeec2d111006fe98214` perimtas normaliu merge, tikslūs SDK failai eksportuoti iš Git. Native testinės partijos ir order įrodymai lieka own ignored QA / DB; realių klientų duomenys, prieigos žetonai ir private runtime neeksportuoti. Galutinis susietas kodo kvitas [SHOP_ACCEPTANCE.md](SHOP_ACCEPTANCE.md), Git archive kvitas [SDK_DISTRIBUTION.md](SDK_DISTRIBUTION.md). Dokumentų / žurnalo saugos patikra atliekama atskirai prieš commit.

Shopo tęsinys: PUBLIC `9649445fa3c6ebac60fd09d5e4bee4e72bbba99a` 8 pakeistų source failų exact-stage patikra PASS, 0 radinių. Anksčiau pradėtas šrifto pakeitimas išsaugotas atskiru `220233ea5f45c23109758c977c2dd7e69b183876` commit: 4 failų patikra PASS, 0 radinių. Našumo darbo tęsinys neatliktas. Pirkėjo kvituose nėra prieigos žetonų ar tikrų klientų duomenų; `qa` ir runtime DB lieka privatūs. Canonical 0.11 perimtas ordinary merge; browser SDK kilmė tiksliai `703d9dcd19083cfe6cb73e4f2add935f09986f21`. Tai source saugos patikra, ne visos parduotuvės priėmimas.

2026-10-12. Tikslūs staged blob saugos skenavimai abiejuose worktree praėjo be radinių. Final scan kartojamas po naujų dokumentų ir žurnalo įvykių. Raw kvitai lieka ignored qa/output; skeneris tikrina pattern ir vietinių žinomų paslapčių atitiktis, neįrodo bet kokių klientų duomenų nebuvimo.

Git check-ignore faktiškai patvirtino, kad privatūs editorial review, REVIEW-TEXTS, Studio state, owned SQLite, originalūs vaizdai ir QA screenshot/receipt failai neįtraukiami. Staged diff yra tik own Memo/adapters/approved media ir bounded common inspector, jokio parent commerce source keitimo. Canonical0.10.3 priimtas ordinary merge, tikri SDK baitai eksportuoti iš Git.

Draft PR101 ir31 nėra main merge, deployment ar kitų PC adoption. Porinio fetch/main-base ir švaraus Git archive/SDK build patikra išlaiko atskiras ribas.
