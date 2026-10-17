# Workspace error-envelope correction

Root confirmed portal3a4ff35's strict two-key workflow parser rejected the real
SafeRoute body `{code,message:code,request_id}`, turning409/429/access failures
into503. The historical0b182dc protocol is preserved. This separate follow-up
starts at19de88e80fb1350ba7bfac29e3cdff2386284f4d and changes only shared
`workspace_team.wire.Error` and its five generated workspace projections.
Workflow/runtime/SQL and SafeRoute behavior remain byte-for-byte unchanged.

The optional bounded `message` field represents the same public code. When
present, the Pydantic validator requires exact equality with `code`; explicit
null, other prose, objects and extra fields are refused. An absent message keeps
legacy two-key serialization identical. Generated JSON Schema carries the
optional field/80-character bound and semantic description; consumers must also
enforce equality, as Root's transport does.

Evidence: seven actual in-process ASGI SafeRoute refusals cover400/401/403/404/
409/429/503 with the unmodified CreationRoute handler. No sockets, database,
identity dependencies, model or operating service ran. Original baseline:
7 FAIL/8 PASS2.22s, SHA256
`57bf2336cb5b7f79177e42826a050cac0273ef43d9356565b498b953d55d744f`.
Final related regression:310 PASS3.22s, SHA256
`135e941e77b202ae7f04288d0fbbdbf8522f3ec5987fe85d9bcda176c0a4753d`.
The15 new cases include legacy serialization and malformed-message refusals.

An AST/JSON boundary check confirms only the Error declaration/schema changed.
All success DTOs, paths, request schemas and native/workflow runtime files match
19de. Report SHA256
`d09bf72909e92cb84d83208154bd13381afadaa2b1edaf49ff83db89b56b906f`.
The first checker assumed a top-level maxLength; the generated optional union
correctly nests it in the string anyOf branch. That checker was corrected; no
production constraint changed.

Generated Git-byte SHA256 pins, under `docs/contracts/`:

| Projection | SHA256 |
| --- | --- |
| verslomatika-workspace-team.openapi.json | a6a704b7d5ae34f21e946a8dbaa625b331a37a2a22167ba7e46c0ba0464f16d8 |
| verslomatika-workspace-directory.openapi.json | ba73b70fcab63d10353a120b17bcfb35a57ec85013e9cb9e8a8e97370f47a64c |
| verslomatika-workspace-agent-preparation.openapi.json | 782d4e25b86709dfaf47178ed79b0f8bf835d2bfd8807a845a555df03617341d |
| verslomatika-workspace-agent-episode.openapi.json | 06c1817a1653b3fb9f274fc751e9425f204a60ede6df7be72fea25bb65513d7a |
| verslomatika-workspace-agent-workflow.openapi.json | 4f26fd812c639d3bbcc7cf2735bd6bcd494e3183dc400586f29d4903764274bb |

Upgrade-fd5b06ae-3ad7-459a-8ee4-79b3dae7c7d1 owns this correction. Root owns
portal parser/regression, contract synchronization, builds and actual adoption.
The separately requested running-workflow cancellation PG case follows in its
own source/test commit; it is not an observed result of this packet.
