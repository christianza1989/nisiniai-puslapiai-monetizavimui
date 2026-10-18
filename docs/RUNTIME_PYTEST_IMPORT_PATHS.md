# Canonical runtime pytest import paths

The runtime pytest configuration resolves `src`, `tests` and `scripts` relative
to its project root. This is test discovery configuration, not a runtime import
policy, dependency change or permission to run live channels.

PR164 CI run39111649254 completed the actual acquisition ledger acceptance but
failed `pytest offline_tests -q -k acquisition` during collection:11 modules
could not import shared helpers such as `test_foundation_bridge` and
`test_customer_creations`. Keyword deselection happens after collection; selecting
only acquisition therefore does not prevent those import errors.

Root reproduced those same11 errors with only its current `src` on PYTHONPATH.
Removing PYTHONPATH entirely also exposed an older editable install in the
preserved shared QA venv:47 errors, including missing modules from the wrong
checkout. Both failures remain in private logs; no foreign venv/install was
rewritten. Explicit project-relative pytest paths make the checkout being tested
authoritative and make offline-only helper resolution independent of shell setup.

The maintained command is unchanged:

```sh
cd agent-business-core/runtime
python -m pytest offline_tests -q -k acquisition
```

Current local regression: collection succeeds after the fix. The preserved
foreign-editable venv then reports222PASS/1FAIL because a direct CLI subprocess
does not inherit pytest's in-process sys.path and still imports its old installed
core. That separate harness failure is retained. Repeating with only the current
`src` on PYTHONPATH (no helper directories) gives223PASS/2850deselected and67
subtests in7.93s, versus the same source-only baseline's11 collection errors.
Canonical pytest configuration supplies the shared helper paths; no foreign
environment was reinstalled or silently changed. A correctly locked current
project installation is still required for direct CLI subprocesses.

Use the project's locked Python/dependencies for a clean environment. Do not
interpret a partial selection, collection-only check or mocked offline test as
actual PostgreSQL, provider, browser or channel acceptance. Earlier live-preview
upgrade statuses and CI provenance gates remain separate and are not bypassed
by this import-path repair.
