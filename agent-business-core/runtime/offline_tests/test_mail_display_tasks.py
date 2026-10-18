"""Display accounting/projection boundaries; inert providers only."""
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from pinet_core.mail_view import runner, translations
from pinet_core.tasks.codex_transport import RunnerError


def original():
    return {"mail_id": str(uuid4()), "case_id": str(uuid4()), "message_id": "<synthetic@example.test>",
        "direction": "inbound", "sender": "buyer@example.test", "recipient": "info@pinet.lt",
        "subject": "2 tubs", "body": "Not confirmed: 2 tubs. Please reply to buyer@example.test."}


@pytest.mark.parametrize("failure", ["authority", "authority-error", "protected", "shape"])
async def test_post_execute_failure_keeps_known_usage_and_discards_output(monkeypatch, tmp_path, failure):
    value, business = original(), str(uuid4())
    binary = tmp_path/"inert-not-executed"
    binary.write_bytes(b"inert")
    monkeypatch.setattr(runner, "sha256_file", lambda _: "a"*64)
    admitted = True
    async def current():
        if failure == "authority-error" and not admitted:
            raise RuntimeError("PRIVATE-OUTPUT-MUST-NOT-ESCAPE")
        return admitted
    async def execute(*args, **kwargs):
        nonlocal admitted
        if failure in {"authority", "authority-error"}:
            admitted = False
        result = {"subject": "2 kubilai", "body": "Nepatvirtinta: 2 kubilai. Atsakykite buyer@example.test."}
        if failure == "protected":
            result["body"] = "Nepatvirtinta: 3 kubilai. Atsakykite buyer@example.test."
        if failure == "shape":
            result["private_unexpected"] = "PRIVATE-OUTPUT-MUST-NOT-ESCAPE"
        return result, {"input_tokens": 11, "output_tokens": 5}
    monkeypatch.setattr(runner, "execute", execute)
    with pytest.raises(Exception) as raised:
        await runner.translate_once(value, business_id=business, environment="test", binary=binary,
            binary_sha256="a"*64, private_directory=tmp_path, still_authorized=current)
    assert getattr(raised.value, "receipt", None) == {"input_tokens": 11, "output_tokens": 5}
    assert isinstance(raised.value, RunnerError)
    assert "PRIVATE-OUTPUT-MUST-NOT-ESCAPE" not in str(raised.value)


async def test_success_with_unknown_usage_does_not_fabricate_zero(monkeypatch, tmp_path):
    value, business = original(), str(uuid4())
    binary = tmp_path/"inert-not-executed"
    binary.write_bytes(b"inert")
    monkeypatch.setattr(runner, "sha256_file", lambda _: "a"*64)
    async def current(): return True
    async def execute(*args, **kwargs):
        return {"subject": "2 kubilai", "body": "Nepatvirtinta: 2 kubilai. Atsakykite buyer@example.test."}, None
    monkeypatch.setattr(runner, "execute", execute)
    result = await runner.translate_once(value, business_id=business, environment="test", binary=binary,
        binary_sha256="a"*64, private_directory=tmp_path, still_authorized=current)
    assert result.usage is None and result.translated_at <= datetime.now(UTC)
    assert translations.source_digest(business, "test", value) == result.source_sha256
