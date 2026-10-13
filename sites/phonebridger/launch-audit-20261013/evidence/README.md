# Evidence boundaries

`final-home-390`, `final-privacy-390`, `final-editorial-390` and `final-referral-preferences-390` are actual canonical-domain captures after the final published release. `guide-final-*` are the visually inspected local candidate guide captures with an explicit fixture banner; the final canonical browser matrix independently checks those four guide URLs after deployment.

`browser.json` records 32 real canonical route/viewport combinations (1440, 768, 390 and 320px), keyboard menu/Escape/focus, skip-link main focus and native referral decline. It does not certify the entire simulator, all interactive errors, physical phones or actual browser zoom. `live-verification.json` records canonical HTTP/namespace/auth/download checks with a disposable test account deleted by the test. No password, customer row or secret is included.

`performance.json` contains exact Lighthouse 13.5.0 default mobile summaries before and after the release: performance 52 → 69; accessibility 96 → 100; SEO 100 → 100; LCP 8.5 → 5.7s; TBT 430 → 220ms; total transfer 5143 → 1566 KiB. Target 90 remains failed. Raw Lighthouse and baseline viewport/fragment evidence stay in the local ignored core `output/launch-audit/` directory; raw private provider and owner probes are not published.

`core-tests.txt` is the 130-test public core run from the fresh-main integration. Current shared build, all nine niche SEO smoke, Studio identity/locale, original prototype simulator 60-test run, missing-checker Git regression and actual committed path coverage were checked separately. No tests claim bank arrival, seller KYC, human creator terms acceptance, native commercial activation, production Windows signing, backup restoration or qualified demand.
