"""Real canonical Python graph over fake SQL/native data; no DB/process/provider."""
import asyncio
import copy
from collections import Counter
from contextlib import asynccontextmanager
from contextvars import copy_context
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace as Row
from uuid import uuid4

import pytest
from sqlalchemy.sql import visitors
from sqlalchemy.sql.elements import BinaryExpression, BindParameter
from test_customer_creations import draft

from pinet_core.business_discovery import service as discovery
from pinet_core.business_discovery import source_context
from pinet_core.business_discovery.models import (
    BuildApproval,
    CreationArchive,
    Discovery,
    DiscoveryJob,
    Report,
)
from pinet_core.config import settings
from pinet_core.content_work.models import GuideJob
from pinet_core.control.models import Membership, Portfolio, Session, User
from pinet_core.control.routes import ControlError
from pinet_core.creation import accepted_material, private_preview, studio
from pinet_core.creation import private_native_continuity as continuity
from pinet_core.creation.models import (
    Attempt,
    Creation,
    Job,
    PrivateIntakeReceipt,
    PrivateIntakeRequest,
    Revision,
    TeamEvent,
)
from pinet_core.creation.service import digest
from pinet_core.creation_registration.models import Registration
from pinet_core.customer.models import Account
from pinet_core.models import utcnow
from pinet_core.site_build import continuation, foundation, live_preview
from pinet_core.site_build.authority_observation import Observation, active
from pinet_core.site_build.continuation_models import BuildContinuation
from pinet_core.site_build.continuation_wire import Resume
from pinet_core.site_build.foundation_wire import Sources


@pytest.fixture
async def graph(monkeypatch):
    cfg = settings()
    for key, value in dict(environment="test-authority-observation", control_mode="local", customer_enabled=True,
            creation_enabled=True, site_build_enabled=True, business_discovery_enabled=True,
            control_source_revision="b"*40, creation_language_review_enabled=True).items():
        monkeypatch.setattr(cfg, key, value)
    owner = {key: str(uuid4()) for key in ("user_id", "organization_id", "portfolio_id")}
    owner["environment_id"] = cfg.environment
    f = Row(counts=Counter(), sql=Counter(), sessions={}, mutation=None, busy=False, archived=False,
        verified=True, member=True, enabled=True, schema=True, source=True, rows={}, schema_flags={},
        post_mutation=None, final_mutation=None, material_mutation_at=None, material_mutation=None,
        callback_reads=[], identity_cache={}, emulate_identitymap=False)
    def session():
        row = Row(id=str(uuid4()), user_id=owner["user_id"], environment_id=cfg.environment,
            expires_at=utcnow()+timedelta(hours=1), revoked_at=None)
        f.sessions[row.id] = row
        return row
    f.u, f.p, f.s = session(), session(), session()
    f.creation = Row(id=str(uuid4()), current_revision=1, canonical_host=None, status="draft_ready",
        active_job_id=None, source_revision="a"*40, updated_at=utcnow(), failure_code=None, **owner)
    payload = draft()
    payload["content_plan"] = []
    f.job = Row(id=str(uuid4()), session_id=f.u.id, creation_id=f.creation.id, status="succeeded", sequence=1,
        source_revision="a"*40, usage={"content_intake": {"state": "failed", "code": "studio_domain_required"},
            "source_context_sha256": "c"*64}, **owner)
    f.revision = Row(id=str(uuid4()), sequence=1, creation_id=f.creation.id, job_id=f.job.id,
        source_revision=f.job.source_revision, payload=payload, material_hash=digest(payload), **owner)
    f.attempt = Row(id=str(uuid4()), job_id=f.job.id, creation_id=f.creation.id, sequence=1,
        role="coordinator", round_number=1, stage="private_draft", source_revision="a"*40,
        instruction_hash="d"*64, model="gpt-6.1-sol", created_at=utcnow(), **owner)
    f.event = Row(id=str(uuid4()), job_id=f.job.id, attempt_id=f.attempt.id, sequence=1, state="succeeded",
        summary="Exact synthetic coordinator acceptance", created_at=utcnow(), payload={
            "decision": "accept_draft", "candidate_sha256": f.revision.material_hash, "checks": [{
                "id": "r_language", "kind": "language_quality", "draft_sha256": f.revision.material_hash,
                "status": "PASS", "observed": True, "summary": "Synthetic observed language review receipt"}]}, **owner)
    reply = {"state": "plan_ready", "plan": {"synthetic": "approved plan"}}
    reviewed = {"reply": reply, "reviews": [{"approved": True, "candidate_sha256": digest(reply)}]*2}
    f.report = Row(id=str(uuid4()), discovery_id=str(uuid4()), revision=1, payload=reviewed,
        material_hash=digest(reviewed), source_revision="a"*40, job_id=str(uuid4()), **owner)
    f.discovery = Row(id=f.report.discovery_id, status="build_started", linked_creation_id=f.creation.id, **owner)
    f.approval = Row(id=str(uuid4()), creation_id=f.creation.id, discovery_id=f.discovery.id,
        report_id=f.report.id, report_revision=1, report_sha256=f.report.material_hash,
        session_id=f.u.id, idempotency_key=str(uuid4()), **owner)
    f.approval.fingerprint = digest({"discovery_id": f.discovery.id, "report_revision": 1,
        "report_sha256": f.report.material_hash, "idempotency_key": f.approval.idempotency_key})
    f.sources = Sources(execution_source_revision="b"*40, public_source_revision="e"*40,
        bridge_sha256="1"*64, verifier_sha256="2"*64, parser_sha256="3"*64)
    page_ids = ["page-"+str(i)*24 for i in (1, 2, 3)]
    f.intake = {"version": "customer-content-intake.v1", "state": "private-draft-imported",
        "creationId": f.creation.id, "acceptedRevision": 1, "sourceHash": f.revision.material_hash,
        "siteId": "creation-"+f.creation.id.replace("-", ""), "canonicalHost": private_preview.private_host(f.creation.id),
        "fullF1": "UNVERIFIED", "launch": "UNVERIFIED", "deployment": "not-performed",
        "requestHash": "4"*64, "importerHash": "5"*64, "siteFileHash": "6"*64,
        "pageMappings": [{"pageId": pid, "path": page["path"]} for pid, page in zip(page_ids, payload["pages"])],
        "workflow": {"pages": [{"pageId": pid, "title": page["title"], "revisionHash": "7"*64,
            "state": "blocked", "hasApprovedRevision": False, "reviewCurrent": False, "blockers": []}
            for pid, page in zip(page_ids, payload["pages"])]}, "importedAt": utcnow().isoformat(),
        "contentPlanState": "not-provided", "planIssues": []}
    f.native = {"expectedSiteHash": "8"*64, "pages": [{"pageId": pid, "path": page["path"], "type": "page"}
        for pid, page in zip(page_ids, payload["pages"])]}
    class Tx:
        async def scalar(self, statement, params=None):
            sql = str(statement)
            if not hasattr(statement, "column_descriptions"):
                f.sql["catalog"] += 1
                if params and params.get("table"):
                    f.sql["profile_catalog"] += 1
                for fragment, ready in f.schema_flags.items():
                    if fragment in sql:
                        return ready
                return f.schema
            descriptions = statement.column_descriptions
            model, name = descriptions[0]["entity"], descriptions[0]["name"]
            query = statement.compile().params
            f.sql[model.__name__] += 1
            if model is Session:
                row = f.sessions.get(query.get("id_1")) if "id_1" in query else f.u
                if row and (query.get("user_id_1", row.user_id) != row.user_id
                        or query.get("environment_id_1", row.environment_id) != row.environment_id):
                    return None
                return row
            if model is User:
                return (f.u.user_id if name == "id" else Row(id=f.u.user_id, enabled=True)) if f.enabled else None
            if model is Account:
                return Row(id="synthetic-account") if f.verified else None
            if model is Membership:
                return "synthetic-member" if f.member else None
            if model is Creation:
                return f.creation.current_revision if name == "current_revision" else f.creation
            if model is Revision:
                return f.revision if query.get("sequence_1") == f.creation.current_revision else None
            if model is BuildApproval:
                return f.approval
            if model is CreationArchive:
                return "synthetic-archive" if f.archived else None
            if model is GuideJob:
                return "synthetic-busy" if f.busy else None
            if model is PrivateIntakeRequest:
                f.counts["private_latest"] += 1
                return f.rows.get("private")
            if model is PrivateIntakeReceipt:
                row = f.rows.get("anchor_receipt")
                return row if row and query.get("recovery_id_1") == row.recovery_id else f.rows.get("receipt")
            if model is BuildContinuation:
                return f.rows.get("continuation")
            if model is Registration:
                # This authority graph has no registered Business yet. Model
                # the new exact-revision lookup, not a stub of its validator.
                assert query == {"creation_id_1": f.creation.id, "environment_id_1": cfg.environment,
                    "accepted_revision_1": f.creation.current_revision}
                assert statement.get_execution_options()["populate_existing"] is True
                return f.rows.get("registration")
            raise AssertionError((model, sql))
        async def scalars(self, statement):
            model = statement.column_descriptions[0]["entity"]
            f.sql[model.__name__] += 1
            return {Job: [f.job], Attempt: [f.attempt], TeamEvent: [f.event]}.get(model, [])
        async def get(self, model, identity, **kwargs):
            f.sql[model.__name__] += 1
            if model is PrivateIntakeRequest:
                row = f.rows.get("private")
                if row and row.id == identity:
                    return row
                row = f.rows.get("anchor")
                return row if row and row.id == identity else None
            value = {Job: f.job, Revision: f.revision, TeamEvent: f.event,
                Portfolio: Row(id=f.creation.portfolio_id, organization_id=f.creation.organization_id),
                Report: f.report, Discovery: f.discovery, DiscoveryJob: Row(id=f.report.job_id)}.get(model)
            if f.emulate_identitymap and model in {Report, Discovery, DiscoveryJob}:
                key = model, identity
                if key not in f.identity_cache or kwargs.get("populate_existing"):
                    f.identity_cache[key] = copy.deepcopy(value)
                return f.identity_cache[key]
            return value
        async def refresh(self, row):
            f.sql["refresh"] += 1
        async def execute(self, statement, *args, **kwargs):
            f.sql["execute"] += 1
            columns = getattr(statement, "column_descriptions", ())
            if columns and [column["entity"] for column in columns] == [BuildApproval, Report, Discovery, DiscoveryJob]:
                # One new SQL leaf; retain all real plan/source validators and
                # the fixture's populated-identity-map mutation semantics.
                query = statement.compile().params
                populate = statement.get_execution_options().get("populate_existing", False)
                f.sql["approval_join"] += 1
                result = None
                proof = f.approval
                if proof is not None and query.get("creation_id_1") == f.creation.id:
                    report = f.report if f.report and f.report.id == proof.report_id else None
                    parent = f.discovery if f.discovery and f.discovery.id == proof.discovery_id else None
                    job = Row(id=report.job_id) if report else None
                    result = [proof, report, parent, job]
                    for index, model in enumerate((BuildApproval, Report, Discovery, DiscoveryJob)):
                        f.sql[model.__name__] += 1  # Entity observations within the single join.
                        value = result[index]
                        if f.emulate_identitymap and value is not None and model in {Report, Discovery, DiscoveryJob}:
                            key = model, value.id
                            if key not in f.identity_cache or populate:
                                f.identity_cache[key] = copy.deepcopy(value)
                            result[index] = f.identity_cache[key]
                return Row(one_or_none=lambda: tuple(result) if result is not None else None)
            if columns and columns[0]["entity"] is User:
                # Execute the joined SQL leaf, not a stub of current_actor. Read
                # literal IDs/env from its actual predicates and model fresh RLS.
                bound = {(part.left.table.name, part.left.name): part.right.value
                    for part in visitors.iterate(statement) if isinstance(part, BinaryExpression)
                    and isinstance(part.right, BindParameter) and getattr(part.left, "table", None) is not None}
                f.sql["actor_join"] += 1
                f.sql["Session"] += 1  # Fresh Session columns observed in this one SQL statement.
                user = Row(id=f.u.user_id, environment_id=cfg.environment, enabled=f.enabled)
                result = None
                if bound.get((User.__tablename__, "id")) == user.id:
                    current = f.sessions.get(bound.get((Session.__tablename__, "id")))
                    if current and (current.user_id != user.id or current.environment_id != bound.get(
                            (Session.__tablename__, "environment_id"))):
                        current = None
                    account = Row(id="synthetic-account", user_id=user.id,
                        environment_id=cfg.environment, verified_at=utcnow()) if f.verified else None
                    result = [user, current, account]
                    if any(column["entity"] is Portfolio for column in columns):
                        portfolio = Row(id=f.creation.portfolio_id, organization_id=f.creation.organization_id,
                            environment_id=cfg.environment) if f.member and bound.get(
                                (Portfolio.__tablename__, "id")) == f.creation.portfolio_id else None
                        result.extend([portfolio, "synthetic-member" if portfolio and f.member else None])
                    if any(column["name"] == "private_parent" for column in columns):
                        parent = f.creation if (bound.get((Creation.__tablename__, "id")) == f.creation.id
                            and f.creation.environment_id == cfg.environment) else None
                        ready = f.schema
                        for fragment, allowed in f.schema_flags.items():
                            if fragment in str(statement):
                                ready = allowed
                        values = tuple(getattr(parent, c.key, None) if parent else None for c in Creation.__table__.c)
                        result.extend([values, ready])
                    if any(column["name"] == "current_revision" and column["entity"] is Creation for column in columns):
                        parent = f.creation if (bound.get((Creation.__tablename__, "id")) == f.creation.id
                            and f.creation.environment_id == cfg.environment) else None
                        result.append(parent.current_revision if parent else None)
                assert statement.get_execution_options()["populate_existing"] is True
                return Row(one_or_none=lambda: tuple(result) if result is not None else None)
            if columns and [column["entity"] for column in columns] == [PrivateIntakeRequest, PrivateIntakeReceipt]:
                # New atomic SQL leaf only; all canonical P/S/anchor validators
                # and the graph's original mutation/assertion gates stay real.
                bound = {(part.left.table.name, part.left.name): part.right.value
                    for part in visitors.iterate(statement) if isinstance(part, BinaryExpression)
                    and isinstance(part.right, BindParameter) and getattr(part.left, "table", None) is not None}
                table = PrivateIntakeRequest.__tablename__
                rows = {row.id: row for key in ("private", "anchor") if (row := f.rows.get(key)) is not None}
                receipts = {row.recovery_id: row for key in ("receipt", "anchor_receipt")
                    if (row := f.rows.get(key)) is not None}
                if (table, "id") in bound:
                    row = rows.get(bound[table, "id"])
                else:
                    row = next((row for row in rows.values() if row.creation_id == bound[table, "creation_id"]
                        and row.revision_id == bound[table, "revision_id"] and "continuity" not in row.context
                        and row.id in receipts and receipts[row.id].state == "private_draft_imported"), None)
                f.sql["anchor_join"] += 1
                assert statement.get_execution_options()["populate_existing"] is True
                return Row(one_or_none=lambda: (row, receipts.get(row.id)) if row is not None else None)
            return Row(one=lambda: (f.u.user_id, cfg.environment))
    f.tx = Tx()
    @asynccontextmanager
    async def scope(**kwargs):
        yield f.tx
    # SQL and native/source bytes are leaf fakes. The control/Python validators
    # (actor, owned, team, material, proof, private, S6, Foundation, media) are real.
    monkeypatch.setattr(live_preview, "scope", scope)
    monkeypatch.setattr(discovery, "report_view", lambda row: copy.deepcopy(row.payload))
    monkeypatch.setattr(source_context, "build", lambda *args: {"contextSha256": "c"*64})
    from pinet_core.creation import media
    monkeypatch.setattr(media, "source_current", lambda: f.source)
    monkeypatch.setattr(private_preview, "source_current", lambda: f.source)
    monkeypatch.setattr(foundation, "source_current", lambda: f.source)
    monkeypatch.setattr(foundation, "source_pins", lambda: f.sources)
    monkeypatch.setattr(private_preview, "native_sources", lambda: {
        "public_source_revision": "e"*40, "importer_sha256": "5"*64, "network_sha256": "9"*64})
    monkeypatch.setattr(studio, "configuration", lambda: (Path("node"), None, Path("/synthetic-artifacts"), {}))
    # Avoid the Git raw operation fence only in this fake graph. The dedicated
    # source-observation tests exercise it independently; never use physical Git.
    @asynccontextmanager
    async def git_operation():
        yield
    monkeypatch.setattr(live_preview, "git_source_operation", git_operation)
    async def execute(args, payload, env, authorized, seconds, **kwargs):
        f.counts["node"] += 1
        assert seconds == 20 and payload["command"] == "status"
        before = f.sql["Session"]
        assert await authorized()
        f.callback_reads.append(f.sql["Session"]-before)
        if f.mutation:
            f.mutation()
        before = f.sql["Session"]
        assert await authorized()
        f.callback_reads.append(f.sql["Session"]-before)
        if f.post_mutation:
            f.post_mutation()
        return copy.deepcopy(f.native)
    monkeypatch.setattr(studio, "_execute", execute)
    # Model SQLAlchemy's committed scalar refresh for the fixture's simple rows.
    monkeypatch.setattr(private_preview, "set_committed_value", setattr)
    _, context = await private_preview.capture(f.tx, f.p, f.creation)
    key = str(uuid4())
    request = Row(id=str(uuid4()), revision_id=f.revision.id, accepted_revision=1, session_id=f.p.id,
        creation_id=f.creation.id, context=context, context_sha256=digest(context), idempotency_key=key,
        run_id=str(uuid4()), **owner)
    request.request_fingerprint = digest({"creation_id": f.creation.id, "accepted_revision": 1,
        "candidate_sha256": f.revision.material_hash, "idempotency_key": key})
    receipt = Row(id=str(uuid4()), recovery_id=request.id, run_id=request.run_id,
        state="private_draft_imported", failure_code=None, intake=copy.deepcopy(f.intake),
        intake_sha256=digest(f.intake), **owner)
    f.rows.update(private=request, receipt=receipt)
    captured = await continuation.capture(f.tx, f.s, f.creation)
    resume = Resume(accepted_revision=1, idempotency_key=str(uuid4()))
    f.rows["continuation"] = Row(id=str(uuid4()), creation_id=f.creation.id, session_id=f.s.id,
        approval_id=f.approval.id, revision_id=f.revision.id, accepted_revision=1, context=captured,
        context_sha256=digest(captured), idempotency_key=str(resume.idempotency_key),
        request_fingerprint=continuation.fingerprint(f.creation.id, resume), **owner)
    original = accepted_material.accepted_material
    async def measured(tx, creation):
        f.counts["material"] += 1
        if f.counts["material"] == f.material_mutation_at:
            f.material_mutation()
        phase = active(tx, creation)
        if phase and phase.operation.number == 2 and f.final_mutation:
            mutate, f.final_mutation = f.final_mutation, None
            mutate()
        return await original(tx, creation)
    monkeypatch.setattr(accepted_material, "accepted_material", measured)
    monkeypatch.setattr(private_preview, "accepted_material", measured)
    f.counts.clear()
    f.sql.clear()
    f.authority = live_preview.Authority("x"*64, f.creation.id)
    return f


async def test_canonical_historical_private_graph_uses_one_material_and_selector_per_phase(graph):
    f = graph
    result = await f.authority.capture()
    assert result.accepted.accepted_revision == 1
    assert f.counts["material"] == 2, dict(f.counts)
    assert f.counts["private_latest"] == 2, dict(f.counts)
    assert f.counts["node"] == 1
    assert f.sql["PipelineModelProfile"] == 2
    assert f.sql["profile_catalog"] == 4  # Entry/final schema observations in each of the two phases.
    assert f.sql["PipelineModelProfile"]+f.sql["profile_catalog"] == 6
    assert all(reads > 0 for reads in f.callback_reads)


@pytest.mark.parametrize("change,status", [("current_session", 401), ("private_session", 409),
    ("s6_session", 409), ("disabled", 401), ("account", 404), ("member", 404),
    ("archive", 409), ("busy", 409), ("source", 503), ("payload", 503)])
async def test_existing_mutation_refusals_are_preserved(graph, change, status):
    f = graph
    if change.endswith("session"):
        role = {"current_session": f.u, "private_session": f.p, "s6_session": f.s}[change]
        role.revoked_at = utcnow()
    elif change in {"disabled", "account", "member", "source"}:
        setattr(f, {"disabled": "enabled", "account": "verified"}.get(change, change), False)
    elif change in {"archive", "busy"}:
        setattr(f, "archived" if change == "archive" else "busy", True)
    else:
        f.revision.payload["tagline"] = "Changed synthetic accepted material"
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert error.value.status == status, (error.value.status, error.value.code)


@pytest.mark.parametrize("reader", ["actor", "owned", "intake", "material", "proof", "approved", "continuation"])
async def test_close_during_canonical_leaf_await_cannot_publish_or_return(graph, monkeypatch, reader):
    from pinet_core.creation import routes, service
    f = graph
    returned = []
    with Observation(f.tx, f.u, f.creation.id) as operation:
        async def gate(canonical, *args):
            value = await canonical(*args)
            pending = asyncio.get_running_loop().create_future()
            def close():
                operation.__exit__(None, None, None)
                pending.set_result(value)
            asyncio.get_running_loop().call_soon(close)
            return await pending
        actor, owned = service.current_actor, routes.owned
        async def gated_actor(*args):
            return await gate(actor, *args)
        async def gated_owned(*args):
            return await gate(owned, *args)
        async def gated_intake(*args):
            return await gate(private_preview._selected_intake, *args)
        async def gated_proof(*args):
            from pinet_core.creation_registration.service import _accepted_proof
            return await gate(_accepted_proof, *args)
        async def gated_continuation(*args):
            return await gate(continuation._latest, *args)
        with pytest.raises(ControlError) as error:
            with operation.phase() as phase:
                try:
                    if reader == "actor":
                        monkeypatch.setattr(service, "current_actor", gated_actor)
                        returned.append(await phase.actor(f.p, f.creation))
                    elif reader == "owned":
                        monkeypatch.setattr(routes, "owned", gated_owned)
                        returned.append(await phase.owned(f.u, f.creation.id))
                    elif reader == "intake":
                        returned.append(await phase.intake(f.creation, f.revision, f.job, gated_intake))
                    elif reader == "proof":
                        returned.append(await phase.proof(f.creation, gated_proof))
                    elif reader == "continuation":
                        returned.append(await phase.continuation(f.creation, gated_continuation))
                    elif reader == "material":
                        material = accepted_material.accepted_material
                        async def gated_material(*args):
                            return await gate(material, *args)
                        monkeypatch.setattr(accepted_material, "accepted_material", gated_material)
                        returned.append(await phase.material(f.creation))
                    else:
                        approved = discovery.approved_build_context
                        async def gated_approved(*args):
                            return await gate(approved, *args)
                        monkeypatch.setattr(discovery, "approved_build_context", gated_approved)
                        returned.append(await phase.approved(f.creation))
                except ControlError:
                    assert not hasattr(phase, "actors") and not phase.values and phase.owned_creation is None
                    raise
        assert (error.value.status, error.value.code) == (503, "source_unavailable")
    assert returned == []


@pytest.mark.parametrize("field", ["user_id", "environment_id"])
@pytest.mark.parametrize("consumer", ["owned", "node"])
async def test_current_session_id_does_not_substitute_owner_environment(graph, field, consumer):
    f = graph
    foreign = copy.deepcopy(f.u)
    setattr(foreign, field, str(uuid4()) if field == "user_id" else "test-foreign-environment")
    with Observation(f.tx, f.u, f.creation.id) as operation:
        with operation.phase() as phase:
            if consumer == "owned":
                await phase.owned(f.u, f.creation.id)
                with pytest.raises(ControlError) as error:
                    await phase.owned(foreign, f.creation.id)
                assert error.value.code == "source_unavailable"
            else:
                phase.record_node(f.u, f.creation, {"synthetic": "proof"}, {"synthetic": "output"})
        if consumer == "node":
            with operation.phase() as phase:
                with pytest.raises(ControlError) as error:
                    phase.node_result(foreign, f.creation, {"synthetic": "proof"})
                assert error.value.code == "live_preview_context_stale"


async def test_nested_phase_and_reopened_operation_are_refused(graph):
    f = graph
    operation = Observation(f.tx, f.u, f.creation.id)
    with operation:
        with operation.phase():
            with pytest.raises(ControlError) as error:
                with operation.phase():
                    pytest.fail("An active phase cannot be nested")
            assert error.value.code == "source_unavailable"
        with pytest.raises(ControlError) as error:
            operation.__enter__()
        assert error.value.code == "source_unavailable"
    with pytest.raises(ControlError):
        operation.__enter__()


async def test_live_phase_check_without_loop_is_controlled_refusal(graph):
    f = graph
    with Observation(f.tx, f.u, f.creation.id) as operation, operation.phase() as phase:
        with pytest.raises(ControlError) as error:
            await asyncio.to_thread(phase.check, f.tx, f.creation)
        assert (error.value.status, error.value.code) == (503, "source_unavailable")


async def test_two_distinct_verify_callbacks_each_read_two_new_graphs(graph):
    f = graph
    expected = await f.authority.capture()
    f.counts.clear()
    await f.authority.verify(expected)
    await f.authority.verify(expected)
    assert dict(f.counts) == {"material": 4, "private_latest": 4, "node": 2}
    assert all(reads > 0 for reads in f.callback_reads)


@pytest.mark.parametrize("reader,material,selected,node", [("proof", 4, 2, 0), ("studio", 2, 2, 0),
    ("private", 2, 2, 0), ("s6", 6, 4, 0), ("foundation", 6, 4, 2), ("completion", 4, 2, 2)])
async def test_standalone_canonical_readers_never_share_completed_results(graph, reader, material, selected, node):
    from pinet_core.content_completion import service as completion
    from pinet_core.creation_registration import service as registration
    f = graph
    for _ in range(2):
        if reader == "proof":
            await registration.accepted_proof(f.tx, f.creation)
        elif reader == "studio":
            await studio.projection(f.tx, f.creation)
        elif reader == "private":
            await private_preview.selected_intake(f.tx, f.creation, f.revision, f.job)
        elif reader == "s6":
            assert await continuation.current(f.tx, f.creation, f.rows["continuation"])
        elif reader == "foundation":
            await foundation.capture(f.tx, f.u, f.creation.id)
        else:
            await completion.read_current_node(f.tx, f.u, f.creation)
    assert f.counts["material"] == material and f.counts["private_latest"] == selected
    assert f.counts["node"] == node


def mutate(f, change):
    if change.startswith(("u_", "p_", "s_")):
        role, action = change.split("_")
        row = getattr(f, role)
        if action == "revoke":
            row.revoked_at = utcnow()
        else:
            row.expires_at = utcnow()-timedelta(seconds=1)
    elif change == "selector":
        row = copy.deepcopy(f.rows["private"])
        row.id = str(uuid4())
        f.rows["private"] = row
        f.rows["receipt"] = copy.deepcopy(f.rows["receipt"])
        f.rows["receipt"].recovery_id = row.id
    elif change == "receipt":
        f.rows["receipt"] = copy.deepcopy(f.rows["receipt"])
        f.rows["receipt"].id = str(uuid4())
    elif change == "s6_selector":
        f.rows["continuation"] = copy.deepcopy(f.rows["continuation"])
        f.rows["continuation"].id = str(uuid4())
    elif change == "s6_session":
        f.rows["continuation"] = copy.deepcopy(f.rows["continuation"])
        row = f.rows["continuation"]
        row.session_id = f.u.id
        row.context["session_id"] = f.u.id
        row.context_sha256 = digest(row.context)
    elif change.startswith("schema_"):
        fragment = {"schema_profiles": "pg_class WHERE oid=to_regclass(:table)",
            "schema_private": "count(*)=2 AND bool_and", "schema_s6": "fk_build_continuation_session"}[change]
        f.schema_flags[fragment] = False
    elif change == "approval":
        f.approval.fingerprint = "0"*64
    elif change == "source":
        f.source = False
    elif change == "language":
        settings().creation_language_review_enabled = False
    elif change == "anchor":
        f.rows["anchor_receipt"].id = str(uuid4())
    else:
        raise AssertionError(change)


@pytest.mark.parametrize("change,status", [("u_revoke", 401), ("u_expiry", 401),
    ("p_revoke", 503), ("p_expiry", 503), ("s_revoke", 409), ("s_expiry", 409),
    ("selector", 409), ("receipt", 409), ("s6_selector", 409), ("s6_session", 409),
    ("schema_profiles", 503), ("schema_private", 409), ("schema_s6", 409),
    ("approval", 503), ("source", 503), ("language", 409)])
async def test_native_mutation_is_fenced(graph, change, status):
    f = graph
    f.mutation = lambda: mutate(f, change)
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert error.value.status == status, (change, error.value.status, error.value.code)


@pytest.mark.parametrize("change,status", [("u_revoke", 401), ("p_expiry", 409), ("s_expiry", 409),
    ("selector", 409), ("receipt", 409), ("s6_selector", 409), ("s6_session", 409),
    ("schema_profiles", 503), ("schema_private", 409), ("schema_s6", 409),
    ("approval", 503), ("source", 503), ("language", 409)])
async def test_fresh_final_material_graph_mutations_are_fenced(graph, change, status):
    f = graph
    f.final_mutation = lambda: mutate(f, change)
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert error.value.status == status, (change, error.value.status, error.value.code)


async def test_explicit_post_output_authorization_is_fresh(graph):
    f = graph
    f.post_mutation = lambda: mutate(f, "u_revoke")
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert (error.value.status, error.value.code) == (401, "unauthenticated")


async def test_wrong_tx_creation_child_and_completed_callback_refuse(graph):
    f = graph
    with Observation(f.tx, f.u, f.creation.id) as operation:
        with operation.phase() as phase:
            captured = copy_context()
            for tx, creation in [(object(), f.creation), (f.tx, Row(id=str(uuid4())))]:
                with pytest.raises(ControlError) as error:
                    active(tx, creation)
                assert error.value.code == "source_unavailable"
            async def inherited():
                active(f.tx, f.creation)
            with pytest.raises(ControlError) as error:
                await asyncio.create_task(inherited())
            assert error.value.code == "source_unavailable"
        with pytest.raises(ControlError) as error:
            captured.run(active, f.tx, f.creation)
        assert error.value.code == "source_unavailable"
        assert phase.closed and not phase.values and not hasattr(phase, "actors")


@pytest.mark.parametrize("reader", ["actor", "owned", "intake"])
async def test_caller_cancellation_propagates_without_publishing(graph, monkeypatch, reader):
    from pinet_core.creation import routes, service
    f = graph
    task = asyncio.current_task()
    actor, owned = service.current_actor, routes.owned
    async def cancelled(canonical, *args):
        value = await canonical(*args)
        pending = asyncio.get_running_loop().create_future()
        asyncio.get_running_loop().call_soon(task.cancel)
        await pending
        return value
    async def gated_actor(*args):
        return await cancelled(actor, *args)
    async def gated_owned(*args):
        return await cancelled(owned, *args)
    async def gated_intake(*args):
        return await cancelled(private_preview._selected_intake, *args)
    with pytest.raises(asyncio.CancelledError):
        with Observation(f.tx, f.u, f.creation.id) as operation, operation.phase() as phase:
            if reader == "actor":
                monkeypatch.setattr(service, "current_actor", gated_actor)
                await phase.actor(f.p, f.creation)
            elif reader == "owned":
                monkeypatch.setattr(routes, "owned", gated_owned)
                await phase.owned(f.u, f.creation.id)
            else:
                await phase.intake(f.creation, f.revision, f.job, gated_intake)
    assert operation.closed and phase.closed and not phase.values and not hasattr(phase, "actors")
    task.uncancel()  # Restore only this test's deliberately cancelled pytest task.


async def anchored(f, monkeypatch):
    """Build the real non-recursive v1 historical anchor and additive receipt."""
    monkeypatch.setattr(continuity, "observer_sha256", lambda: "f"*64)
    origin, receipt = copy.deepcopy(f.rows["private"]), copy.deepcopy(f.rows["receipt"])
    f.rows.update(anchor=origin, anchor_receipt=receipt)
    _, captured = await private_preview.capture(f.tx, f.p, f.creation)
    marker, _ = await private_preview.retained_anchor(f.tx, f.creation, captured)
    row = copy.deepcopy(origin)
    row.id, row.run_id, row.idempotency_key = str(uuid4()), str(uuid4()), str(uuid4())
    row.context = {**captured, "continuity": marker}
    row.context_sha256 = digest(row.context)
    row.request_fingerprint = digest({"creation_id": f.creation.id, "accepted_revision": 1,
        "candidate_sha256": f.revision.material_hash, "idempotency_key": row.idempotency_key})
    renewed = copy.deepcopy(receipt)
    renewed.id, renewed.recovery_id, renewed.run_id = str(uuid4()), row.id, row.run_id
    note = {"version": continuity.VERSION, "anchor": marker, "observed_at": utcnow().isoformat(),
        "source_draft_sha256": f.revision.material_hash, "intake_context_sha256": receipt.intake["requestHash"],
        "manifest_sha256": marker["manifest_sha256"], "site_sha256": "a"*64, "assets_sha256": {},
        "native_state": "private-v2", **dict.fromkeys(continuity.AUTHORITY, "not-performed")}
    renewed.intake = {**copy.deepcopy(receipt.intake), "replayed": True, "nativeContinuity": note}
    renewed.intake_sha256 = digest(renewed.intake)
    f.rows.update(private=row, receipt=renewed)
    context = await continuation.capture(f.tx, f.s, f.creation)
    assert f.sql["Registration"] > 0
    f.rows["continuation"].context = context
    f.rows["continuation"].context_sha256 = digest(context)
    f.counts.clear()


@pytest.mark.parametrize("timing", ["native", "final"])
async def test_retained_anchor_mutation_cannot_renew_historical_authority(graph, monkeypatch, timing):
    f = graph
    await anchored(f, monkeypatch)
    setattr(f, "mutation" if timing == "native" else "final_mutation", lambda: mutate(f, "anchor"))
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    expected = (503, "invalid_foundation_source") if timing == "native" else (409, "private_intake_missing")
    assert (error.value.status, error.value.code) == expected


async def test_current_private_and_s6_roles_may_share_exact_same_session_without_cross_call_cache(graph):
    f = graph
    f.p = f.s = f.u
    row = f.rows["private"]
    row.session_id = f.u.id
    row.context["session_id"] = f.u.id
    row.context_sha256 = digest(row.context)
    row = f.rows["continuation"]
    row.session_id = f.u.id
    row.context["session_id"] = f.u.id
    row.context_sha256 = digest(row.context)
    expected = await f.authority.capture()
    assert f.counts["material"] == f.counts["private_latest"] == 2
    f.u.revoked_at = utcnow()
    with pytest.raises(ControlError) as error:
        await f.authority.verify(expected)
    assert error.value.status == 401


async def test_final_approved_context_cannot_use_cached_mutable_discovery_parent(graph):
    f = graph
    f.emulate_identitymap = True
    def changed_discovery():
        f.discovery = copy.deepcopy(f.discovery)
        f.discovery.status = "cancelled"
    f.mutation = changed_discovery
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert (error.value.status, error.value.code) == (503, "invalid_approved_plan")


@pytest.mark.parametrize("change", ["source", "approval"])
async def test_second_material_reader_loss_retains_source_approval_503(graph, change):
    f = graph
    f.material_mutation_at = 2
    f.material_mutation = lambda: mutate(f, change)
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert error.value.status == 503, (change, error.value.status, error.value.code)


@pytest.mark.parametrize("reader", ["material", "approved", "proof", "intake", "continuation"])
async def test_cached_data_cannot_return_when_copy_closes_operation(graph, reader):
    from pinet_core.creation.service import binding
    f = graph
    class ClosingCopy:
        def __deepcopy__(self, memo):
            operation.__exit__(None, None, None)
            return "closed"
    async def forbidden(*args):
        pytest.fail("This test must exercise the populated reader path")
    with Observation(f.tx, f.u, f.creation.id) as operation:
        with pytest.raises(ControlError) as error:
            with operation.phase() as phase:
                value = {"close": ClosingCopy()}
                phase.values[reader] = value
                if reader == "intake":
                    key = (f.revision.id, f.job.id, f.creation.current_revision, tuple(binding(f.creation).items()))
                    phase.values[reader] = key, value
                    await phase.intake(f.creation, f.revision, f.job, forbidden)
                elif reader in {"proof", "continuation"}:
                    await getattr(phase, reader)(f.creation, forbidden)
                else:
                    await getattr(phase, reader)(f.creation)
        assert (error.value.status, error.value.code) == (503, "source_unavailable")
        assert phase.closed and not phase.values and not hasattr(phase, "actors")


def test_observation_creation_without_running_loop_is_controlled():
    session = Row(id=str(uuid4()), user_id=str(uuid4()), environment_id="test-no-loop")
    with pytest.raises(ControlError) as error:
        Observation(object(), session, str(uuid4()))
    assert (error.value.status, error.value.code) == (503, "source_unavailable")


@pytest.mark.parametrize("changed", ["discovery", "report"])
async def test_standalone_approved_reader_refreshes_identity_map(graph, changed):
    f = graph
    f.emulate_identitymap = True
    assert await discovery.approved_build_context(f.tx, f.creation)
    if changed == "discovery":
        f.discovery = copy.deepcopy(f.discovery)
        f.discovery.linked_creation_id = str(uuid4())
    else:
        f.report = copy.deepcopy(f.report)
        f.report.revision = 2
    with pytest.raises(ControlError) as error:
        await discovery.approved_build_context(f.tx, f.creation)
    assert (error.value.status, error.value.code) == (503, "invalid_approved_plan")


@pytest.mark.parametrize("change", ["revoke", "expiry", "clock"])
async def test_newly_selected_s_session_mid_final_phase_is_never_authorized_by_earlier_actor(graph, monkeypatch, change):
    from pinet_core.content_completion import service as completion
    from pinet_core.creation import service as creation_service
    f = graph
    canonical = completion._node_authorized
    f.clock = utcnow()
    mutated = False
    if change == "clock":
        f.s.expires_at = f.clock+timedelta(seconds=1)
        monkeypatch.setattr(creation_service, "utcnow", lambda: f.clock)
    async def gated(*args, **kwargs):
        nonlocal mutated
        result = await canonical(*args, **kwargs)
        # This canonical post-output callback occurs after final's before_node
        # native guard has validated S, before Authority's last native guard.
        if f.counts["material"] == 2 and f.counts["node"] == 1 and not mutated:
            mutated = True
            if change == "clock":
                f.clock += timedelta(seconds=2)
            elif change == "revoke":
                f.s.revoked_at = utcnow()
            else:
                f.s.expires_at = utcnow()-timedelta(seconds=1)
        return result
    monkeypatch.setattr(completion, "_node_authorized", gated)
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert mutated
    assert (error.value.status, error.value.code) == (409, "build_continuation_stale")


@pytest.mark.parametrize("change", ["revoke", "expiry", "clock"])
async def test_late_p_after_final_before_node_cannot_use_cached_intake(graph, monkeypatch, change):
    from pinet_core.content_completion import service as completion
    from pinet_core.creation import service as creation_service
    f = graph
    canonical = completion._node_authorized
    f.clock = utcnow()
    mutated = False
    if change == "clock":
        f.p.expires_at = f.clock+timedelta(seconds=1)
        monkeypatch.setattr(creation_service, "utcnow", lambda: f.clock)
    async def gated(*args, **kwargs):
        nonlocal mutated
        result = await canonical(*args, **kwargs)
        if f.counts["material"] == 2 and f.counts["node"] == 1 and not mutated:
            mutated = True
            if change == "clock":
                f.clock += timedelta(seconds=2)
            elif change == "revoke":
                f.p.revoked_at = utcnow()
            else:
                f.p.expires_at = utcnow()-timedelta(seconds=1)
        return result
    monkeypatch.setattr(completion, "_node_authorized", gated)
    with pytest.raises(ControlError) as error:
        await f.authority.capture()
    assert mutated
    assert (error.value.status, error.value.code) == (503, "invalid_foundation_source")
