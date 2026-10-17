"""Explicit one-mail display translation through the maintained no-tools CLI.

Run through git-freshness -- wrapper. No sending, inbox scanning or native writes.
The API and this operator must share the configured private display directory.
"""
import argparse
import asyncio
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

import httpx

from pinet_core.file_hash import sha256_file
from pinet_core.mail_view.runner import translate_once
from pinet_core.mail_view.translations import record_path, retain, source_digest
from pinet_core.mail_view.wire import DetailEnvelope
from pinet_core.source_observation import git_source_observation

ROOT = Path(__file__).resolve().parents[3]


async def run(value):
    from urllib.parse import urlsplit
    base = urlsplit(value.api_base)
    if (base.scheme != "http" or base.hostname not in {"127.0.0.1", "localhost", "::1"}
            or base.username or base.password or base.query or base.fragment or base.path not in {"", "/"}):
        raise ValueError("loopback_api_required")
    business_id, mail_id = str(UUID(value.business_id)), str(UUID(value.mail_id))
    binary = Path(value.executable)
    if not binary.is_absolute() or sha256_file(binary) != value.executable_sha256:
        raise ValueError("cli_pin_mismatch")
    source = git_source_observation(ROOT)
    if source.porcelain:
        raise ValueError("clean_committed_source_required")
    session = json.loads(Path(value.session_file).read_bytes())
    token = session["access_token"]
    if not isinstance(token, str) or len(token) != 64:
        raise ValueError("invalid_session")
    async with httpx.AsyncClient(base_url=value.api_base, trust_env=False, follow_redirects=False,
                                  timeout=8, headers={"Authorization": "Bearer " + token}) as client:
        path = f"/operator/v2/businesses/{business_id}/mail/{mail_id}"

        async def current():
            response = await client.get(path)
            response.raise_for_status()
            envelope = DetailEnvelope.model_validate(response.json())
            if envelope.source_revision != source.head or envelope.data.mail_id != mail_id:
                raise ValueError("mail_source_changed")
            return envelope

        first = await current()
        original = first.data.model_dump(mode="json")
        digest = source_digest(business_id, first.environment, original)
        final = record_path(value.output_root, business_id, first.environment, mail_id, digest)
        final.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        # One durable source-bound claim. An uncertain/failed call is never retried automatically.
        claim = final.with_suffix(".attempt.json")
        with os.fdopen(os.open(claim, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w", encoding="utf-8") as handle:
            json.dump({"mail_id": mail_id, "source_sha256": digest, "max_calls": 1,
                       "model": "gpt-6.1-sol", "reasoning_effort": "high", "source_revision": source.head,
                       "started_at": datetime.now(UTC).isoformat()}, handle)

        async def authorized():
            try:
                envelope = await current()
                return source_digest(business_id, envelope.environment, envelope.data.model_dump(mode="json")) == digest
            except Exception:
                return False

        record = await translate_once(original, business_id=business_id, environment=first.environment,
            binary=binary, binary_sha256=value.executable_sha256, private_directory=final.parent,
            still_authorized=authorized)
        retain(value.output_root, record, original)
        print(json.dumps({"status": "retained", "mail_id": mail_id, "source_sha256": digest, "calls": 1, "usage": record.usage}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("api-base", "session-file", "business-id", "mail-id", "output-root", "executable", "executable-sha256"):
        parser.add_argument("--" + name, required=True)
    asyncio.run(run(parser.parse_args()))
