"""Explicit isolated PG acceptance; no SMTP/IMAP/provider or operating case writes."""
from copy import deepcopy
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_control_portfolio import login, pilot  # noqa: F401 - maintained real owner fixture

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.db import db
from pinet_core.mail_view.translations import POLICY_SHA, Record, TranslatedText, retain, source_digest
from pinet_core.models import Case, MailMessage, utcnow


@pytest.fixture
async def mail_pilot(pilot, monkeypatch, tmp_path):  # noqa: F811 - imported pytest fixture
    business_id = pilot["receipts"][0]["business_ids"][0]
    env, case_id = settings().environment, str(uuid4())
    monkeypatch.setattr(settings(), "mail_display_directory", str(tmp_path))
    async with db.transaction(business_id, env) as tx:
        tx.add(Case(id=case_id, business_id=business_id, environment_id=env, payload={"test": True}))
        await tx.flush()
        rows = []
        for index in range(27):
            row = MailMessage(id=str(uuid4()), business_id=business_id, environment_id=env,
                case_id=case_id, message_id=f"<{uuid4()}@example.test>", direction="inbound" if index % 2 else "outbound",
                state="received" if index % 2 else "accepted_by_smtp", created_at=utcnow()+timedelta(seconds=index),
                payload={"sender": "buyer@example.test", "recipient": "info@pinet.lt",
                         "subject": "2 tubs", "body": "Not confirmed: 2 tubs.", "synthetic": True})
            tx.add(row)
            rows.append(row)
    try:
        yield {**pilot, "business_id": business_id, "case_id": case_id, "rows": rows, "root": tmp_path}
    finally:
        async with AsyncSession(pilot["admin"]) as tx, tx.begin():
            await tx.execute(delete(Case).where(Case.id == case_id, Case.business_id == business_id, Case.environment_id == env))


async def test_owner_mail_paging_thread_and_translation_preserve_original(mail_pilot):
    p = mail_pilot
    client, headers = p["client"], await login(p)
    base = f"/operator/v2/businesses/{p['business_id']}/mail"
    assert (await client.get(base)).status_code == 401
    first = await client.get(base, headers=headers)
    assert first.status_code == 200, first.text
    assert first.headers["cache-control"] == "private, no-store"
    data = first.json()["data"]
    assert len(data["items"]) == 25 and data["next_before"] == data["items"][-1]["mail_id"]
    assert "body" not in data["items"][0]
    second = (await client.get(base+"?before="+data["next_before"], headers=headers)).json()["data"]
    assert len(second["items"]) == 2 and second["next_before"] is None
    assert not {v["mail_id"] for v in data["items"]} & {v["mail_id"] for v in second["items"]}
    row = p["rows"][-1]
    original_payload = deepcopy(row.payload)
    detail_path = base+"/"+row.id
    original = (await client.get(detail_path, headers=headers)).json()["data"]
    assert original["translation"]["status"] == "missing"
    record = Record(version="mail-display-translation.v1", business_id=p["business_id"], environment=settings().environment,
        mail_id=row.id, source_sha256=source_digest(p["business_id"], settings().environment, original),
        target_language="lt", translated_at=utcnow(), model="gpt-6.1-sol", reasoning_effort="high",
        instruction_sha256=POLICY_SHA, text=TranslatedText(subject="2 kubilai", body="Nepatvirtinta: 2 kubilai."),
        usage={"input_tokens": 1, "output_tokens": 2})
    retain(p["root"], record, original)
    translated = await client.get(detail_path, headers=headers)
    assert translated.status_code == 200, translated.text
    assert translated.json()["data"]["translation"]["body"] == "Nepatvirtinta: 2 kubilai."
    assert translated.json()["data"]["body"] == original["body"]
    thread = (await client.get(base+"?case_id="+p["case_id"], headers=headers)).json()["data"]
    assert all(v["case_id"] == p["case_id"] for v in thread["items"])
    async with db.transaction(p["business_id"], settings().environment) as tx:
        actual = await tx.scalar(select(MailMessage).where(MailMessage.id == row.id))
        assert actual.payload == original_payload and actual.state == row.state


async def test_mail_owner_revocation_cross_tenant_and_scope_cursors(mail_pilot):
    p = mail_pilot
    client, headers = p["client"], await login(p)
    base = f"/operator/v2/businesses/{p['business_id']}/mail"
    foreign = await login(p, 1)
    assert (await client.get(base, headers=foreign)).status_code == 404
    assert (await client.get(base+"/"+p["rows"][0].id, headers=foreign)).status_code == 404
    assert (await client.get(base+"?before="+str(uuid4()), headers=headers)).status_code == 404
    assert (await client.get(base+"?case_id="+str(uuid4()), headers=headers)).status_code == 404
    assert (await client.get(base+"?before=bad", headers=headers)).status_code == 400
    other_business = p["receipts"][0]["business_ids"][1]
    assert (await client.get(f"/operator/v2/businesses/{other_business}/mail?before="+p["rows"][0].id, headers=headers)).status_code == 404
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["business_id"],
            BusinessGrant.environment_id == settings().environment).values(enabled=False))
    assert (await client.get(base, headers=headers)).status_code == 404
    assert (await client.get(base+"/"+p["rows"][0].id, headers=headers)).status_code == 404


async def test_operator_batch_roundtrip_binds_full_test_environment(mail_pilot, monkeypatch, tmp_path):
    import importlib.util
    import json
    from pathlib import Path
    from types import SimpleNamespace

    import httpx

    from pinet_core.file_hash import sha256_file

    p = mail_pilot
    headers = await login(p)
    path = Path(__file__).resolve().parents[1] / "scripts/mail_display_translate.py"
    spec = importlib.util.spec_from_file_location("mail_display_batch_pg", path)
    batch = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(batch)
    client_type = httpx.AsyncClient
    async def request_to_api(request):
        return await p["client"].get(request.url.path, headers=dict(request.headers))
    monkeypatch.setattr(batch.httpx, "AsyncClient", lambda **kwargs: client_type(
        **kwargs, transport=httpx.MockTransport(request_to_api)))
    monkeypatch.setattr(batch, "git_source_observation", lambda root: SimpleNamespace(porcelain="", head="a" * 40))
    calls = []
    async def translate(original, **kwargs):
        calls.append(kwargs["environment"])
        assert kwargs["environment"] == settings().environment
        assert await kwargs["still_authorized"]()
        return Record(version="mail-display-translation.v1", business_id=p["business_id"],
            environment=settings().environment, mail_id=original["mail_id"],
            source_sha256=source_digest(p["business_id"], settings().environment, original),
            target_language="lt", translated_at=utcnow(), model="gpt-6.1-sol", reasoning_effort="high",
            instruction_sha256=POLICY_SHA, text=TranslatedText(subject="2 kubilai", body="Nepatvirtinta: 2 kubilai."),
            usage={"input_tokens": 1, "output_tokens": 2})
    monkeypatch.setattr(batch, "translate_once", translate)
    binary, session = tmp_path / "fake-cli", tmp_path / "session.json"
    binary.write_bytes(b"synthetic-never-executed")
    session.write_text(json.dumps({"access_token": headers["Authorization"][7:]}))
    row = p["rows"][-1]
    before = deepcopy(row.payload)
    args = SimpleNamespace(api_base="http://127.0.0.1", business_id=p["business_id"], mail_id=row.id,
        environment_id=settings().environment, executable=str(binary), executable_sha256=sha256_file(binary),
        session_file=str(session), output_root=str(p["root"]))
    await batch.run(args)
    response = await p["client"].get(f"/operator/v2/businesses/{p['business_id']}/mail/{row.id}", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["environment"] == "test"
    assert response.json()["data"]["translation"]["status"] == "ready"
    assert response.json()["data"]["translation"]["body"] == "Nepatvirtinta: 2 kubilai."
    assert response.json()["data"]["body"] == before["body"]
    assert calls == [settings().environment]
    async with db.transaction(p["business_id"], settings().environment) as tx:
        assert (await tx.get(MailMessage, row.id)).payload == before
