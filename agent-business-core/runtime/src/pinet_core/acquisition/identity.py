"""Run the actual registered JS canonicalizer, with bounded private stdin."""
import asyncio
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

from .recipient_binding import ADDRESS_RULE

ROOT = Path(__file__).resolve().parents[3]
CODEC = ROOT.parent / 'contracts' / 'recipient-binding-v1' / 'recipient-binding.mjs'
HELPER = ROOT / 'scripts' / 'acquisition_canonical_recipient.mjs'


@dataclass(frozen=True)
class CanonicalRecipient:
    value: str = field(repr=False)
    address_rule: str
    codec_sha256: str


async def canonical_recipient(email: str, *, node: str, expected_codec_sha256: str):
    if not isinstance(email, str) or len(email.encode('utf-8')) > 2048:
        raise ValueError('invalid_canonical_recipient')
    if hashlib.sha256(CODEC.read_bytes()).hexdigest() != expected_codec_sha256:
        raise ValueError('canonicalizer_source_mismatch')
    process = None
    try:
        async with asyncio.timeout(5):
            process = await asyncio.create_subprocess_exec(
                node, str(HELPER), stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            out, _ = await process.communicate(json.dumps({'email': email}, ensure_ascii=False).encode())
        if process.returncode or len(out) > 4096:
            raise ValueError('canonicalizer_failed')
        value = json.loads(out)
        if value['address_rule'] != ADDRESS_RULE:
            raise ValueError('canonicalizer_rule_mismatch')
        return CanonicalRecipient(value['canonical_recipient'], ADDRESS_RULE, expected_codec_sha256)
    finally:
        if process and process.returncode is None:
            process.kill()
            await process.wait()
