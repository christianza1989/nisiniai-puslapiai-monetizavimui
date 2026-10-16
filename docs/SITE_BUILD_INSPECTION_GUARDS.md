# Site inspection while generation workers are held

Paid worker switches control generation admission, not the existence of a normal
owner's inspection and explicit continuation paths. Holding those switches does
not authorize any operation by itself. Every route retains its existing feature,
environment, authenticated Session, owner, source, accepted material and native
context checks.

| Guard | Callers and requirements |
| --- | --- |
| service.enabled | Existing Site Build router, Foundation guard and receipt checks. Requires site_build_enabled, business_discovery_enabled, customer_enabled, creation_enabled, local control mode and local/test environment. |
| service.generation_enabled | All feature requirements plus creation_runner_enabled; advance calls this before source/SQL or worker admission. |
| lifecycle.actors | Generation guard plus existing control_enabled, site_build_api_runner_enabled, business_discovery_runner_enabled and bounded valid owner allowlist. |
| lifecycle.source_guard | Existing actor requirements plus current source; no lifecycle start or provider permission follows from inspection. |

This allows the maintained S6 GET/POST, Foundation read/check and deterministic
preview preparation while paid runners remain disabled. The Site Build router,
Foundation and receipt implementations are unchanged; only the two generation
callers explicitly select the stricter guard. Existing worker claim/provider gates
also remain unchanged. Default runner flags stay false.

S6 still requires an explicit request UUID, current verified owner/Session, genuine
approved Discovery/BuildApproval, exact accepted revision, fresh private intake and
current source. Historical approvals and intake hashes remain immutable. A source
upgrade still needs its normal current-source private intake renewal before S6;
the feature guard does not renew either one automatically.

Deterministic review/approval still uses its existing separate native guard and
canonical model writers. Six actual review notes and exact current site/page/
revision/planning pins are required. Fact, source, media, link and atomic batch
gates remain authoritative. This repair does not create a review, approval,
release, public deployment or PASS from a flag change.

Foundation source/Session/scope verification remains in force before and after
preparation. Unreviewed or unapproved pages still produce the canonical preview
content refusal; a prepared preview still keeps full-site/launch UNVERIFIED and
does not start a server. Generation advancement and lifecycle startup remain
refused with creation_runner_enabled false even if inspection is enabled.

Offline checks cover actual router dependency behavior, all feature/worker gates,
source loss, fixed preview dispatch and refusal before SQL/provider access. Native
PostgreSQL cases use existing isolated synthetic fixtures: current-owner S6 with
workers held, foreign-owner/source refusals, actual blocked Node preview without
GUIDE admission, and canonical private review/atomic approval with workers held.
The helper collects native cases only; Root owns actual restricted SQL/native
execution and operational adoption. No operational data or runner flags are
changed by the source packet.
