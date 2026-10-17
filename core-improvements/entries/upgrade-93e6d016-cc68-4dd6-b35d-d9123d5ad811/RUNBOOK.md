# Editorial route mounts

Root explicitly authorized only the new router import and include_router hunks
in api.py/control_api.py. Both attach the same two bounded SafeRoute actions;
no other central API behavior changes. Bridge implementation and full regression
evidence are in upgrade2d0b8a5a and docs/EDITORIAL_REVIEW_BRIDGE.md.

Actual isolated HTTP tests check strict bodies, unknown fields and body bounds;
contract parity checks exact request/response schemas. Both central mounts are
asserted. Whole offline1951PASS/8skipped/67subtests and exact Python Ruff PASS.
Native HTTP/RLS6cases are collected only; Root owns DB execution and adoption.

Rollback removes only the four import/mount lines. Preserve durable operation
receipts and all existing review/approval/release history. Source mounting does
not constitute serving adoption, release or launch acceptance.
