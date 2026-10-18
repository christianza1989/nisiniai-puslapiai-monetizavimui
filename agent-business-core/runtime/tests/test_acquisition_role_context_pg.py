"""Real scoped lineage/current inbound; inert models, retained isolated PG."""
from copy import deepcopy

import pytest
from test_acquisition_agent_roles_pg import Roles, execute, initial, six  # noqa: F401
from test_acquisition_external_binding_pg import external_native  # noqa: F401
from test_acquisition_native_chain_pg import incoming
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.acquisition.ledger import LedgerError


async def test_final_coordinator_receives_verified_current_reply_transcript(six):  # noqa: F811
    p, fake, packets = six, Roles(), []
    async def observed(role, schema, instruction, data, heartbeat, deadline):
        packets.append((role, deepcopy(data)))
        return await fake(role, schema, instruction, data, heartbeat, deadline)
    quality = await initial(p, observed)
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    corrected = "Please replace the original two tubs with one tub for four people."
    inbound = await incoming(p, standin, body=corrected)
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}
    reply, _ = await execute(p, observed, "reply", quality.result, mail)
    reviewed, _ = await execute(p, observed, "quality", reply.result)
    final, _ = await execute(p, observed, "coordinator", reviewed.result)
    assert final.status == "succeeded"
    assert "transcript" not in packets[0][1]
    current = packets[-1][1]
    assert packets[-1][0] == "coordinator"
    assert [row["body"] for row in current["transcript"] if row["role"] == "recipient"] == [corrected]
    assert len(current["transcript"]) == 3


async def test_newer_inbound_refuses_stale_coordinator_before_provider(six):  # noqa: F811
    p, fake = six, Roles()
    quality = await initial(p, fake)
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    inbound = await incoming(p, standin, body="One tub instead of two.")
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}
    reply, _ = await execute(p, fake, "reply", quality.result, mail)
    reviewed, _ = await execute(p, fake, "quality", reply.result)
    await incoming(p, standin, body="Newer correction: do not use the previous specification.")
    before = list(fake.calls)
    with pytest.raises(LedgerError, match="correspondence_decision_stale"):
        await execute(p, fake, "coordinator", reviewed.result)
    assert fake.calls == before


async def test_rejected_reply_review_still_delivers_current_refusal_to_coordinator(six):  # noqa: F811
    p, fake, packets = six, Roles(), []
    async def refusing(role, schema, instruction, data, heartbeat, deadline):
        packets.append((role, deepcopy(data)))
        output, usage = await fake(role, schema, instruction, data, heartbeat, deadline)
        if role == "reply":
            output = schema.model_validate({"classification": "refusal", "action": "stop", "subject": "", "body": "",
                "offer_fact_ids": [], "evidence_ids": [], "reason": "Respect the customer's refusal."})
        return output, usage
    quality = await initial(p, refusing)
    standin = type("InitialMail", (), {"id": quality.id, "result": quality.result["correspondence"]})()
    refusal = "Do not send me any more offers."
    inbound = await incoming(p, standin, body=refusal)
    mail = {key: inbound[key] for key in ("thread_id", "inbound_id", "revision", "input_sha256")}
    reply, _ = await execute(p, refusing, "reply", quality.result, mail)
    fake.accepted = False
    reviewed, _ = await execute(p, refusing, "quality", reply.result)
    final, _ = await execute(p, refusing, "coordinator", reviewed.result)
    assert final.result["output"]["action"] == "stop"
    assert packets[-1][1]["suppressed"] is True
    assert any(row["role"] == "recipient" and row["body"] == refusal for row in packets[-1][1]["transcript"])
    assert reviewed.result["correspondence"]["outbound_mail_id"] is None
