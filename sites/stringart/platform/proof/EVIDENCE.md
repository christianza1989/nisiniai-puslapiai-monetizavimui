# Source and proof binding

14 October 2026. Implemented source commit: bdd1c96216446a81e35c433e66edfc8a82491651. Dependency PR126: 5aa9eab3e355292f2f0ee725e74e9029520e1467. Fetched main: 7af6b9641012a30c5f95eac38a66daeff8f8cb39. Scoped review: PR129; merge and other-PC adoption are separate.

Current application source includes the narrowly scoped overview-copy follow-up `c4fd8f4a4f0f3293a0a41ca3144e7516be6784b4`, building on `5f2fc47c55e4749d10fbee9493a399c871388342`, described below. The original implementation/proof fingerprints remain preserved.

Hashes below are SHA-256 of the exact executed local working-file bytes; Git/checkout line-ending normalization can change physical bytes on another PC. Use the source commit plus semantic tests for adoption.

| Source | SHA-256 |
| --- | --- |
| app.mjs | 8714bc2b4583303a6b849bc1f4965a82729b45115ea6292b9f83c6eb81b809a0 |
| index.html | e60f9ed77ee086a61b9e9446f45c6441de37e445f3d599e536b7ff8af84b7742 |
| style.css | 8374f88c95f9a5b04a48579d3dcb67b1ee8f9f7232b147c841dbf9f34f25c2de |
| store.mjs | e8ccffce2e1cd12a221caaf76c2dc7821e7a3adf7cf4670acdb76fb1cc01c6d5 |
| seed.mjs | 3b3393a210747d4232136b1b6ada1e3e45d0443dd421ba9179be66ec685cdf10 |
| server.mjs | 3e220f952241cd10e5a7af6ec183546d223f82c8346d510fd36dc71ea6b309f8 |
| reset.mjs | 47f3e18c8d2b0ba652c413482c212ca9a2ca776950536085710eaf4f6eb46206 |
| tests/operations.test.mjs | e02d85c05a7e2ea0f9a0b034801cbe7033a81d5621183730c249f2eec2cd88bd |
| tests/http.test.mjs | 95be71bf0040929f94504c7889a71425e75aa3a9924d8db1ada04c6412b30cc4 |
| verify-browser.mjs | a08600920d900d187e0bd635dbf45fbcfcd3036617ec0de726a9d9e7a1c3d085 |

Unchanged dependency: mobile/model.mjs local SHA-256 39ec404cd8f9f3a2d0eb59a0296dbd80a519a01d6edfdb94570e1511c644f8e7. The complete mobile diff against the exact dependency commit is empty. Original mobile font/SVG/sample assets are served directly, not copied or edited.

Local raw proof reports (ignored, present on this PC):

| Report | Scope | SHA-256 |
| --- | --- | --- |
| proof/accepted-browser.json | Complete 51-capture role/flow suite | 2a19e96d8018b28b04fa29c2183e33cc59e52095cf8ebfce8223f58f5c62d5c9 |
| proof/final-states-browser.json | 9 focused supplier/service/adverse-state captures | d207216aa8952368b5ad96936eafbab5750e1847e2e03ae7339ff32f479a73b0 |
| proof/final-source-layout-browser.json | Exact browser JSON download and final 7-capture normal/text/spacing suite | 409eb476514ec996730ddcf0a26d75d0d3e95307c5f02aef5b944b8aa5333ff0 |

Backend/HTTP final result: 17 tests, 17 pass, 0 fail/skip. Actual process restart and two-process last-unit contention passed. The source-bound acceptance matrix, preserved first failures and runbook are committed; raw PNG/JSON/DB are local and are not promised by a fresh clone. No paid execution, external messages, real transactions or public deployment occurred.

## Purchase-count copy follow-up

14 October 2026. Source `5f2fc47c55e4749d10fbee9493a399c871388342` repairs only the overview's purchase/purchases agreement. app.mjs SHA-256 at that follow-up: `99a0d7afedc5e61f74f7827aa144dfba6d3c505208653a79b3f17db1301cc874`. All other functional source hashes above remain unchanged.

The actual pristine operator overview at `http://127.0.0.1:8946`, measured 1440×1000, displays “1 supplier purchase open” and was visually inspected once. Browser-only copy fixtures confirm “0 supplier purchases open” and “2 supplier purchases open”; they do not modify persistent server state. Backend suites and unrelated screens were not rerun for this one-label correction.

- Local receipt: `proof/purchase-copy.json`, SHA-256 `f19b0af9c99bd966c097d4ea6388fdec4319a3f2edb104dafc3bdce0fb69b3c8`.
- Local actual-state screenshot: `proof/captures/purchase-copy-pristine-1.png`, SHA-256 `7a153ba192dd8f467c9482c48cd22cc74a9b6d05f65c14a1e00fbc50a103d9f7`.

These raw files remain local/ignored. The original incorrect copy and scoped correction are recorded in FIRST-FAILURES.md.

## Adjacent overview counters — current copy source

Source `c4fd8f4a4f0f3293a0a41ca3144e7516be6784b4` adds correct singular order and stock-line agreement to the same overview repair. Current app.mjs SHA-256: `9553f7081104db2489a4f7be6a53c3496653cf182e19592915c0dab1ce1137a2`.

The focused rendered count matrix confirms all three labels at zero/one/two, including “1 order in progress”, “1 stock line below its reorder point” and “1 supplier purchase open”. The actual pristine operator overview was inspected at 1440×1000; zero/one/two variations use explicit browser-only fixtures and do not alter the persistent DB.

- Local matrix receipt: `proof/overview-copy.json`, SHA-256 `8bb0e7228a7a39b528a34f37c737f972b6829b1a7436a722831b1ccecd2b434a`.
- Local actual-state screenshot: `proof/captures/overview-copy-pristine.png`, SHA-256 `7a153ba192dd8f467c9482c48cd22cc74a9b6d05f65c14a1e00fbc50a103d9f7`.

The collaborating chat reported its independent 17/17 backend/HTTP rerun against handoff head `14c033b204cb09b2f22c804a1e3f86a65ac8cff2`. Backend source is unchanged by these copy-only commits. No independent complete UI acceptance is inferred from that backend report.
