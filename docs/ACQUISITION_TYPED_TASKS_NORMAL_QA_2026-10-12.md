# Typed acquisition capture and normal portal lifecycle — 2026-10-12

This is a bounded local acceptance record for the owner's Madbeauty→core→Verslomatika integration. The whole local platform remains **OPEN**. Source, real model execution, ordinary browser interaction, target-PC operation and public release have separate acceptance gates.

## Exact sources and runtime

- Core functional source: `166fdde682bb6c54fa5b523bd0df5d35f61f9f67`; delivered clean metadata/source HEAD `253590f9f5f482c69e0d6c0b5dddf8f4535ea20b`, stacked [PR104](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/104) on [PR103](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/pull/103). Neither PR is main adoption.
- Companion `5924a2eb858cf45e736bc5e79a2f07cfbbc39af2` unchanged. Paired fetch verified core main `7af6b9641012a30c5f95eac38a66daeff8f8cb39` and public main `ec8a9c032fe926d1d9722802d8eb26fa8bd02937` in the branch bases.
- Portal functional `ce3db02566849493e38c40d87ddc9b24ccece33f`; its owner records metadata HEAD `ecd48ac5947aa833a232afd7b27f79c619e93f68` in [issue66](https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui/issues/66#issuecomment-6116518608). Served build `dhbgO2TH2o_0_28cw1UJy`, SHA `689c8c8e64cb612504b0fb35a7db0ba72b1e95b29c82d0bbd134bfe5524b784e`, dedicated loopback frontend3021/API18868.
- Dedicated new full0027 PostgreSQL QA database, synthetic `example.test` recipients, canonical owner/foreign credentials created through `scripts/control_bootstrap.py`. Normal password login creates an opaque Session. Credentials/config/raw fixtures/cookies/SQL remain ignored and private. No Session injection or credential replacement.
- Operational0023 data/source pin `25d1376e5d1c3989c9aafe3cc3d54bdff4195413`, API8860/studio18861 and old portal3019/helper61055 remain held and unchanged. This QA DB is a distinct lane.

## Source and process acceptance

The same generic Task/Run/Event worker dispatches `acquisition.reviewed_capture`; immutable full-scope binding0027 contains an internally supplied reviewed capture input. There is no fabricated Conversation or browser Session for a scheduled module task. Current owner/grant/module work purpose/source/original expiry and recipient hold/stop are checked before effects and final commit. Case/MailMessage/capture receipt and terminal Task/Run/Event commit atomically. Optional daily ceiling0 means unlimited; this stage does not install a periodic scheduler or authenticated research/model producer.

The separate [acquisition-tasks.v1 wire](../agent-business-core/contracts/acquisition-tasks-v1/README.md) exposes owner history/detail/report/events/cancel over those same rows. Its22829-byte SHA is `8eb38dc3f9bb17c6753d13ba2dfc4c02ead5337c9edf1076af9ea35f5f39788f`. Original chat/operations/capture schemas remain byte-identical. Typed tasks cannot leak into their chat-only DTOs; hidden foreign UUID conflicts return409; report attribution matches both Run ID and Task ID.

| Acceptance | Status and evidence |
| --- | --- |
| Frozen functional source regression | PASS:28 typed/26 correspondence/27 legacy chat+operations/22 foundation/97 offline with67 subtests; four unchanged capture schemas and new typed wire. Receipt `417940c0082a435884d8e1d4be631f25c93735e6cba20d8fd17215ce9e2925c1`. |
| Normal TCP API, separate common-worker process and actual PostgreSQL restart/replay | PASS in its earlier distinct normal lane: same Task/Run/history, one capture, no automatic retry; pending combined stop+expiry denies before Run. Receipt `1efb5905e2c985312eb6d1455511c12b03567e2a0e29fecc7ed5d7f2df8b5c6d`. |
| Actual full0001→0027/bootstrap/repeated grant repair/empty rollback/populated refusal/partial refusal/pg_dump restore | PASS; operational0023 rows unchanged. Receipt `6466d01ddf2ebf5ea603be0d79c045ba86a11f363a7cb9f746d3a2e9f51437ed`. |
| Joint normal portal BFF/SSR lifecycle | PASS for HTTP/CookieJar only; receipts below. Distinct from88 portal source fixtures. |
| Ordinary browser form login, authenticated interaction and desktop/mobile composition | UNVERIFIED. Concrete3021 login is open for normal owner entry; the documented CUA interface has no private filesystem credential-fill bridge. No alternative controller or auth/storage injection used. |
| Director chat consuming canonical acquisition data | OPEN. Existing consultation context only has registration metadata/history/question; reader seams alone are not a mounted tool. |
| Periodic discovery→qualification→draft→exact model review→capture with authenticated provenance/accounting | OPEN. Current inputs are supplied synthetic QA copy, not actual model research/review. |
| One normal native site→core→portal/director/worker vertical including signup attribution | OPEN. Earlier native and capture source/normal receipts keep their bounded scope. |
| Diverse full client business creation/calibration/content/media/editorial/SEO-GEO, target-PC/public launch | OPEN, separate from this increment. |

## Joint portal and stop/restart receipts

The portal owner ran normal password login→standard HttpOnly CookieJar and real BFF/SSR calls. These are its independently attributed HTTP receipts, not root browser or SQL assertions:

| Probe | Exact receipt SHA256 |
| --- | --- |
| Initial21 responses: business/report SSR, history20+4/all24, successful report/events, anonymous401, foreign404/no data, CSRF cancel403 and one dedicated POST→GET cancellation | `4efc742c705f13b304e25c119cd37a559d277841a93ce9ab3dab15aef0a7c7f8` |
| After stop12 responses with the same cookie | `ce9963d473431cf53f16514911a5d346b0000a63bfbbbb5723f936a6242dc30b` |
| After owned API restart12 responses with the same cookie and no relogin | `af8a2590055c59bc0ce6b4ed1ab23397ba98d3843033ee4961a3c7aa0c4a0b51` |
| One after frozen-origin switch12 responses with the same cookie and no relogin | `ad063ef3d79658cbbd7ad20c3689d2027f254e0cc047bf93b478a86b119d85f9` |

Total57 actual normal HTTP responses. Initial24 owner tasks were2 successful captures+22 queued; the portal committed exactly one dedicated cancellation. After an explicit probe pause, root changed only this QA Module's `enabled=false`, preserving original `approved_at` and `expires_at`. The canonical common worker rejected the other21 before any Run/effect. Final status counts are2 succeeded/1 cancelled/21 failed; only2 Runs and2 captured outbound mails. Root stop receipt `cfbb8af9afc60c91f369555508ba8d1719a0343a2672ccac68e02b963459b1dc`.

Across cancellation/stop/restart/frozen switch, the portal retains24 exact task IDs and reports/events. The work projection remains2 outbound captures/3 inbound captures/1 held recipient/1 stopped recipient/1 committed operator privacy Case, configuration `stopped`, watermark7 / `d536c253c8a798393b4a9eb70078276f9ccc405a56f9a29f318b90eb46988ae1`. The old capture projection correctly returns403; preserved correspondence/task reads remain authorized by their separate read purposes. Successful internal executions show known model calls0 and unknown costnull; tasks rejected before a Run show executionnull. No send, inbox-provider or model claim follows from these counts.

Root restarted only its verified API parent+socket-owning child at18868. Existing Sessions and canonical rows stayed exact. Root witness `32f49ed6c4a7f9df9f0ce24775d95a1ae89fbe281cf8c6cbb86ada80bdaaee44` is an API process restart, **not** a PostgreSQL restart in this joint probe; the earlier PostgreSQL receipt remains separately attributed above.

## Immutable served source while source work continues

To keep the pending normal browser entry possible without silently changing the API's source, root then switched only owned18868 to an ignored immutable runtime copied from exact committed253 source. Its237 source files have manifest SHA `e079f6fba21a7beb1a3ff395ae0031eca2324bf42c1bb9f15f7095299e7971b1`. A separate child proved all148 loaded canonical `pinet_core` modules and canonical ROOT originate from frozen-src before the switch. Runtime parent10420 is bound to that frozen source, not a later editable checkout HEAD.

Root freeze witness `1bc0ec998138f0991b1f8b41349f59a762fd725cce0217a85143e07c30cabe89` proves63 canonical public tables and existing Sessions exact; only the new normal readiness login/bucket are excluded from the all-table comparison, with every pre-existing Session compared individually. Same QA DB/Module/original approval-expiry/key bytes/read permissions; no renewal. The original private registration files are unchanged. Their identical bytes exist only in this ignored private runtime. **This runtime is not a source-only transfer package and must never be exported to Git or the target-PC source kit.** The portal's final same-cookie smoke is independently attributed in the table above.

## Original failures and remaining boundary

Original source FAILs are retained: strict old wire/hidden UUID `3c2a76b8`, tuple serializer `5659843e`, mismatched Run attribution `6d76a7fd`; independent source review confirmed the final exact Run+Task repair and ran no QA. Prior private restart inspection-pool failure remains in its original lane; test-only disposal fixed inspection, canonical `pool_pre_ping` unchanged.

Private joint-harness failures are also retained: initial missing FK metadata import `c6b46a3b`, incorrect expected logout200 instead of actual204 `eb863857`, snapshot Git pathspec from wrong cwd `68d1806d`, Windows archive long path `0d8ee182`. Only the test helpers were corrected; the latter two failed before changing the old API or DB. No history or original fingerprint was rewritten.

All current test inputs are synthetic. `external_sent=false`; actual model/provider/channel calls0. SMTP/voice/social/email/live deployment/domain purchases remain OFF; Supabase and language-only correction paused, language UNVERIFIED, Gemini deferred. The normal source/BFF proofs do not finish the platform, authenticate the preparation producer, activate a client agent or prove another PC/public operation.
