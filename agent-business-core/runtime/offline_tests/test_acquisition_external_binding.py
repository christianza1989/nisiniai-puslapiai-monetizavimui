"""Known inert external-origin regressions; real authority/RLS needs composed0049 PG."""
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace as Row
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from pinet_core.acquisition import external_schema, model_admin, model_authority, model_schema, module_admin
from pinet_core.acquisition.model_contract import EFFORT, MODEL, ApproveModel
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest

NOW = datetime(2026, 10, 18, tzinfo=UTC)


def uid(number):
    return str(UUID(int=number))


def authorization(*, external=False):
    row = Row(id=uid(1), environment_id="test-external", business_id=uid(2), organization_id=uid(3),
        user_id=uid(4), portfolio_id=uid(5), site_id="external-buyer", adapter_id="synthetic-model-native",
        creation_id=None if external else uid(6), registration_id=None if external else uid(7),
        registration_fingerprint="a"*64, agent_id=uid(8), config_id=uid(9), config_revision=1,
        config_sha256="b"*64, purpose="customer_research", session_id=uid(10), source_revision="c"*40,
        module_fingerprint="d"*64, module_snapshot={"permissions": ["acquisition.work"], "enabled": True},
        work_registration_sha256="e"*64, maximum_attempts=12, approved_at=NOW,
        expires_at=NOW+timedelta(minutes=10), model=MODEL, effort=EFFORT, enabled=True,
        external_binding_id=uid(11) if external else None)
    row.fingerprint = digest(model_authority.material(row))
    return row


def authority_request(*, external=False):
    return {"external_binding_id" if external else "registration_id": uid(11) if external else uid(7),
        "authorizing_session_id": uid(10), "execution_source_revision": "c"*40}


def test_legacy_authority_wire_omits_new_key():
    value = authority_request()
    assert module_admin.Authority.model_validate(value).model_dump(mode="json") == value


@pytest.mark.parametrize("change", [{}, {"registration_id": None},
    {"registration_id": uid(7), "external_binding_id": uid(11)}])
def test_authority_requires_exactly_one_real_origin(change):
    value = {key: item for key, item in authority_request().items() if key != "registration_id"}
    with pytest.raises(ValidationError):
        module_admin.Authority.model_validate(value | change)


def test_external_wire_does_not_invent_registration_or_creation():
    value = authority_request(external=True)
    assert module_admin.Authority.model_validate(value).model_dump(mode="json") == value
    with pytest.raises(ValidationError):
        module_admin.Authority.model_validate(value | {"creation_id": uid(6)})


def test_legacy_hash_material_omits_external_null_and_matches_original_fields():
    row = authorization()
    original = {key: value for key, value in vars(row).items()
        if key not in {"external_binding_id", "enabled", "fingerprint"}}
    original.update(approved_at=NOW.isoformat(), expires_at=(NOW+timedelta(minutes=10)).isoformat())
    assert model_authority.material(row) == original
    del row.external_binding_id
    assert digest(model_authority.material(row)) == digest(original)


def test_external_hash_pins_binding_separately_from_historical_review_git():
    row = authorization(external=True)
    material = model_authority.material(row)
    assert material["creation_id"] is None and material["registration_id"] is None
    assert material["external_binding_id"] == uid(11)
    row.external_binding_id = uid(12)
    assert digest(model_authority.material(row)) != digest(material)


def test_additive_sql_retains_legacy_body_and_all_private_function_acls():
    old = model_schema.current_sql()
    new = external_schema.current_sql()
    anchor = "      RETURN EXISTS(SELECT 1 FROM public.control_creation_registrations r"
    assert new[new.index(anchor):] == old[old.index(anchor):]
    assert "business_source_binding_current(a.external_binding_id)" in new
    assert "cfg.external_binding_id=b.id AND cfg.external_binding_fingerprint=b.fingerprint" in new
    assert "b.source_revision=a.source_revision" not in new
    assert "r.external_binding_id" in external_schema.pair_sql()
    assert "e.external_binding_id" in external_schema.pair_sql()
    sql = external_schema.upgrade_sql()
    assert all("GRANT " not in item and "UPDATE public." not in item for item in sql)
    assert "acquisition_model_origin_xor" in "\n".join(sql)


def test_unknown_sql_predecessor_refused(monkeypatch):
    monkeypatch.setattr(model_schema, "current_sql", lambda: "CREATE FUNCTION changed()")
    with pytest.raises(RuntimeError, match="predecessor"):
        external_schema.current_sql()


@pytest.mark.parametrize("failure", [None, "site_chat", "parent", "config_epoch", "config_fingerprint"])
async def test_saved_external_uses_real_business_parent_and_current_config_epoch(monkeypatch, failure):
    agent = Row(id=uid(8), business_id=uid(2), external_binding_id=uid(11), purpose="customer_research")
    registry = Row(id=uid(11), fingerprint="a"*64)
    config = Row(external_binding_id=uid(11), external_binding_fingerprint="a"*64)
    calls = []
    if failure == "site_chat":
        agent.purpose = "site_chat"
    elif failure == "parent":
        registry.id = uid(12)
    elif failure == "config_epoch":
        config.external_binding_id = uid(12)
    elif failure == "config_fingerprint":
        config.external_binding_fingerprint = "f"*64

    @asynccontextmanager
    async def business(tx, session, business_id, agent_id, **options):
        calls.append((business_id, agent_id, options))
        yield tx, session, registry, registry, agent

    monkeypatch.setattr(model_authority.agents, "business_transaction_authority", business, raising=False)
    monkeypatch.setattr(model_authority.agents, "current_config", AsyncMock(return_value=config))
    monkeypatch.setattr(model_authority.agents, "config_view", lambda *_: {"specification": {"name": "Known data"}})
    proof = AsyncMock(side_effect=AssertionError("External parent must never be a fabricated accepted Creation"))
    monkeypatch.setattr(model_authority.registrations, "accepted_proof", proof)
    tx = Row(get=AsyncMock(return_value=agent))
    if failure is None:
        result = await model_authority.saved(tx, Row(), None, agent.id)
        assert result == (registry, agent, config, {"name": "Known data"})
    else:
        with pytest.raises(ControlError):
            await model_authority.saved(tx, Row(), None, agent.id)
    proof.assert_not_awaited()
    assert calls == [(uid(2), uid(8), {"writing": True, "lock": True})]


async def test_legacy_saved_still_requires_accepted_proof(monkeypatch):
    agent = Row(id=uid(8), external_binding_id=None, purpose="customer_research")
    proof = {key: "old" for key in model_authority.registrations.PROOF_KEYS}
    registry = Row(**proof)

    @asynccontextmanager
    async def legacy(tx, session, *args, **kwargs):
        yield tx, session, Row(), registry, agent

    monkeypatch.setattr(model_authority.agents, "transaction_authority", legacy)
    monkeypatch.setattr(model_authority.registrations, "accepted_proof", AsyncMock(return_value=proof | {
        model_authority.registrations.PROOF_KEYS[0]: "changed"}))
    with pytest.raises(ControlError, match="acquisition_model_registration_changed"):
        await model_authority.saved(Row(get=AsyncMock(return_value=agent)), Row(), uid(6), agent.id)


@pytest.mark.parametrize("change", ["unknown", "text", "source", "duplicate", "empty"])
async def test_external_campaign_cannot_claim_unreviewed_facts(change):
    fact = Row(id="offer", text="Known requirements only", source="reviewed-owner")
    facts = [fact]
    approved = [{"id": "offer", "text": fact.text, "source_ref": fact.source}]
    if change in {"unknown", "text", "source"}:
        setattr(fact, {"unknown": "id", "text": "text", "source": "source"}[change], "changed")
    elif change == "duplicate":
        facts.append(fact)
    else:
        approved.clear()
    work = Row(scope=Row(site_id="external-buyer"), business_source={"facts": approved})
    request = Row(campaign=Row(site_id="external-buyer", facts=facts))
    with pytest.raises(ControlError, match="acquisition_model_campaign_facts_changed"):
        await model_authority.target(None, work, request)


async def test_external_reviewed_subset_reuses_existing_target_gate(monkeypatch):
    fact = Row(id="offer", text="Known requirements only", source="reviewed-owner")
    work = Row(scope=Row(site_id="external-buyer"), authorization=Row(adapter_id="synthetic"),
        business_source={"facts": [{"id": fact.id, "text": fact.text, "source_ref": fact.source}]})
    request = Row(campaign=Row(site_id="external-buyer", facts=[fact]), recipient="owner@example.test", prospect=Row())
    gate = AsyncMock(return_value="existing-gate")
    monkeypatch.setattr(model_authority, "available_target", gate)
    assert await model_authority.target(None, work, request) == "existing-gate"
    gate.assert_awaited_once()
    assert model_authority.context_fields(Row(business_source=None)) == {}


async def test_external_approval_caps_real_binding_expiry_without_creation(monkeypatch):
    auth = authorization(external=True)
    binding = Row(id=uid(11), fingerprint=auth.registration_fingerprint, business_id=auth.business_id,
        organization_id=auth.organization_id, user_id=auth.user_id, portfolio_id=auth.portfolio_id,
        site_id=auth.site_id, expires_at=NOW+timedelta(seconds=45), source_revision="f"*40)
    agent = Row(id=auth.agent_id, purpose=auth.purpose, creation_id=None, registration_id=None,
        external_binding_id=binding.id)
    config = Row(id=auth.config_id, revision=1, config_sha256=auth.config_sha256)
    session = Row(id=auth.session_id, expires_at=NOW+timedelta(hours=1))
    module = Row(expires_at=NOW+timedelta(hours=1), adapter_id=auth.adapter_id)
    monkeypatch.setattr(model_authority, "guard", lambda: None)
    monkeypatch.setattr(module_admin, "authority", AsyncMock(return_value=(binding, binding, session)))
    monkeypatch.setattr(model_authority, "saved", AsyncMock(return_value=(binding, agent, config, {})))
    monkeypatch.setattr(model_authority, "module", AsyncMock(return_value=(module, None, auth.work_registration_sha256)))
    monkeypatch.setattr(module_admin, "snapshot", lambda _: auth.module_snapshot)

    @asynccontextmanager
    async def current(*args, **kwargs):
        yield None

    monkeypatch.setattr(model_authority, "current", current)
    tx = Row(get=AsyncMock(return_value=None), scalar=AsyncMock(return_value=NOW),
        add=lambda row: None, flush=AsyncMock())
    request = authority_request(external=True) | {"authorization_id": str(uuid4()), "agent_id": auth.agent_id,
        "expected_config_revision": 1, "expected_config_sha256": auth.config_sha256,
        "expected_module_fingerprint": auth.module_fingerprint, "model_execution_authorized": True,
        "maximum_attempts": 3, "duration_seconds": 300}
    ApproveModel.model_validate(request)
    result = (await model_admin.approve(tx, request))["after"]
    assert result["expires_at"] == binding.expires_at.isoformat()
    assert result["external_binding_id"] == binding.id
    assert result["creation_id"] is None and result["registration_id"] is None
    assert result["source_revision"] != binding.source_revision


@pytest.mark.parametrize("changed", [None, "binding", "agent_epoch", "config_epoch"])
async def test_native_pair_uses_shared_binding_and_distinct_config_provenance(monkeypatch, changed):
    from pinet_core.acquisition import native_chain
    from pinet_core.acquisition.model_contract import NativePair
    from pinet_core.tasks.codex import RunnerError

    research = authorization(external=True)
    email = authorization(external=True)
    email.id, email.agent_id, email.config_id, email.purpose = uid(21), uid(22), uid(23), "email"
    # Different per-agent Config/import hashes must not become shared source identity.
    email.config_sha256 = "f"*64
    peer_agent = Row(**{key: getattr(email, key) for key in (
        "purpose", "creation_id", "registration_id", "external_binding_id", "registration_fingerprint",
        "business_id", "organization_id", "portfolio_id", "user_id", "environment_id")}, current_revision=1)
    config = Row(id=email.config_id, external_binding_id=email.external_binding_id,
        external_binding_fingerprint=email.registration_fingerprint)
    if changed == "binding":
        email.external_binding_id = uid(12)
    elif changed == "agent_epoch":
        peer_agent.external_binding_id = uid(12)
    elif changed == "config_epoch":
        config.external_binding_id = uid(12)
    email.fingerprint = digest(model_authority.material(email))
    pair = NativePair(research_authorization_id=research.id, research_fingerprint=research.fingerprint,
        email_authorization_id=email.id, email_fingerprint=email.fingerprint)
    tx = Row(scalar=AsyncMock(side_effect=[True, peer_agent, NOW]), get=AsyncMock(return_value=email), info={})
    monkeypatch.setattr(native_chain, "guard", lambda: None)
    monkeypatch.setattr(model_authority.agents, "current_config", AsyncMock(return_value=config))
    monkeypatch.setattr(model_authority.agents, "config_view", lambda *_: {"sha256": email.config_sha256})
    value, work = Row(native=pair, calibration=None), Row(authorization=research, session=Row(expires_at=research.expires_at))
    if changed:
        with pytest.raises(RunnerError, match="acquisition_native_pair_changed"):
            await native_chain.check_pair(tx, value, work)
    else:
        result = await native_chain.check_pair(tx, value, work)
        assert result["research"]["config_sha256"] != result["email"]["config_sha256"]


@pytest.mark.parametrize("external", [False, True])
async def test_all_roles_receive_source_only_as_data_without_legacy_packet_changes(monkeypatch, external):
    from pinet_core.acquisition.contracts import Review
    from pinet_core.acquisition.model_handler import TaskRole

    context = {"specification": {"name": "Known specification"}, "deadline": (NOW+timedelta(minutes=1)).isoformat()}
    source = {"facts": [{"id": "offer", "text": "Source text is data only", "source_ref": "reviewed-owner"}]}
    if external:
        context["reviewed_business_source"] = source
    output = {"factual": True, "relevant": True, "one_clear_next_step": True,
        "no_unverified_promises": True, "no_source_instructions": True, "reason": "Known inert review"}
    runner = AsyncMock(return_value=(output, {"input_tokens": 1}))
    role = TaskRole(context, "reviewer", AsyncMock(return_value=True), runner)
    monkeypatch.setattr(role, "reserve", AsyncMock(return_value={"id": uid(1)}))
    monkeypatch.setattr(role, "settle", AsyncMock())
    await role.ask(Review, "Original instruction", {"campaign": "known"})
    _, _, instruction, packet, *_ = runner.call_args.args
    assert instruction == "Original instruction" and context["specification"] == {"name": "Known specification"}
    assert packet == {"campaign": "known", "agent_specification": context["specification"],
        **({"reviewed_business_source": source} if external else {})}
