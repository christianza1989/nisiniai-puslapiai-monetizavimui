"""Session-bound bounded callback leases; canonical Foundation owns the producer."""
import asyncio
import copy
import json
import re
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

from ..config import settings
from ..control.routes import ControlError, scope, token_hash
from ..creation import media, studio
from ..creation.routes import owned
from ..creation.service import digest
from ..customer_text.service import customer_session
from ..tasks.codex_transport import RunnerError
from . import foundation
from .live_preview_store import LIMIT, Store
from .live_preview_wire import ACTIVE_STATES, Availability, LeaseView, Start

SCRIPT = studio.ROOT / "content-studio/scripts/customer-live-preview.mjs"


def now():
    return datetime.now(UTC)


def parsed(model, data):
    return model.model_validate_json(json.dumps(data)).model_dump(mode="json")


class Authority:
    def __init__(self, token, identity):
        self.token, self.identity = token, str(UUID(identity))  # private memory only; never persisted
        self.owner = None

    async def authenticate(self):
        async with scope(token=token_hash(self.token)) as tx:
            session = await customer_session(tx, self.token)
            await owned(tx, session, self.identity)
            self.owner = {"user_id": session.user_id, "session_id": session.id,
                "environment": settings().environment, "creation_id": self.identity}
        return self.owner

    async def capture(self):
        async with scope(token=token_hash(self.token)) as tx:
            session = await customer_session(tx, self.token)
            creation = await owned(tx, session, self.identity)
            expected = await foundation.capture(tx, session, self.identity)
            await self.native(tx, session, expected)
            self.owner = {"user_id": session.user_id, "session_id": session.id,
                "environment": creation.environment_id, "creation_id": self.identity}
        return expected

    async def native(self, tx, session, expected):
        pin = expected.accepted
        request = SimpleNamespace(accepted_revision=pin.accepted_revision,
            candidate_sha256=pin.candidate_sha256, canonical_host=pin.canonical_host)
        await media.native_mutation_guard(tx, session, self.identity, request,
            unavailable_code="live_preview_revision_unavailable", stale_code="live_preview_context_stale")()

    async def verify(self, expected):
        async with scope(token=token_hash(self.token)) as tx:
            session = await customer_session(tx, self.token)
            if str(session.id) != str(expected.session_id) or str(session.user_id) != str(expected.user_id):
                raise ControlError(401, "unauthenticated")
            await self.native(tx, session, expected)
            await foundation.verify(tx, expected)


@dataclass
class Lease:
    record: dict
    authority: Authority
    scope: object
    view: dict = field(default_factory=dict)
    task: object = None
    stop_reason: str | None = None
    failure: str | None = None
    proof: object = None
    entered: bool = False
    auth_task: object = None


class Service:
    def __init__(self, *, authority=Authority, store=None):
        self.instance_id = str(uuid4())
        self.authority_factory, self.store = authority, store
        self.leases, self.lock, self.closing = {}, asyncio.Lock(), False

    def ledger(self):
        if self.store is None:
            self.store = Store(studio.configuration()[2])
        return self.store

    async def inspect(self, authority, expected):
        node, _, artifacts, environment = studio.configuration()
        problem = None
        async def permitted():
            nonlocal problem
            try:
                await authority.verify(expected)
                return True
            except ControlError as error:
                problem = error
                return False
        try:
            value = await studio._execute([node, SCRIPT], self.payload(expected, artifacts, "inspect"), environment, permitted, 20)
        except RunnerError as error:
            if problem is not None:
                raise problem
            raise ControlError(409 if error.code == "authorization_revoked" else 503, error.code) from None
        await authority.verify(expected)
        if (not isinstance(value, dict)
                or set(value) != {"version", "scope_sha256", "site_context_sha256", "can_start", "blocked_reasons"}
                or value["version"] != "customer-live-preview-inspection.v1" or value["scope_sha256"] != expected.fingerprint()
                or value["site_context_sha256"] != expected.site_context_sha256 or type(value["can_start"]) is not bool
                or not isinstance(value["blocked_reasons"], list) or len(value["blocked_reasons"]) > 1024
                or any(not isinstance(reason, str) or not re.fullmatch(r"[a-z0-9_:-]{1,160}", reason) for reason in value["blocked_reasons"])
                or value["can_start"] != (not value["blocked_reasons"])):
            raise ControlError(503, "live_preview_inspection_invalid")
        return value

    @staticmethod
    def payload(expected, artifacts, action):
        identity = str(expected.creation_id)
        directory = artifacts / "customer-content" / identity / f"revision-{expected.accepted.accepted_revision}"
        return {"action": action, "scope": expected.model_dump(mode="json"), "creationId": identity,
            "acceptedRevision": expected.accepted.accepted_revision, "sourceHash": expected.accepted.candidate_sha256,
            "canonicalHost": expected.accepted.canonical_host, "artifactsRoot": str(artifacts),
            "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}

    def owned_records(self, owner):
        return [r for r in self.ledger().records() if r["owner"] == owner]

    async def availability(self, token, identity):
        authority = self.authority_factory(token, identity)
        owner = await authority.authenticate()
        expected, blockers, revision, site_hash = None, [], None, None
        try:
            expected = await authority.capture()
            revision, site_hash = expected.accepted.accepted_revision, expected.site_context_sha256
            blockers = (await self.inspect(authority, expected))["blocked_reasons"]
        except ControlError as error:
            if error.status != 409:
                raise
            blockers = [error.code]
        latest = max(self.owned_records(owner), key=lambda r: r["view"]["created_at"], default=None)
        view = await self.project(latest, check=True) if latest else None
        if view and view["state"] == "ready" and (view["accepted_revision"] != revision or view["site_context_sha256"] != site_hash):
            # A failed or changed collection observation must not surface an old
            # URL even if a later per-lease read happens to succeed.
            lease = self.leases[view["lease_id"]]
            self.stop(lease, "revoked", "live_preview_context_stale")
            view = parsed(LeaseView, lease.view)
        if self.closing:
            blockers.append("live_preview_service_closing")
        if self.ledger().busy():
            blockers.append("live_preview_busy")
        if len(self.ledger().records()) >= LIMIT:
            blockers.append("live_preview_capacity")
        return parsed(Availability, {"creation_id": identity, "can_start": not blockers,
            "current_revision": revision, "site_context_sha256": site_hash, "blocked_reasons": sorted(set(blockers)),
            "latest_lease": view, "local_preview_only": True, "full_site_status": "UNVERIFIED", "launch_status": "UNVERIFIED"})

    async def start(self, token, identity, request):
        request = Start.model_validate(request)
        authority = self.authority_factory(token, identity)
        owner = await authority.authenticate()
        async with self.lock:
            if self.closing:
                raise ControlError(503, "live_preview_service_closing")
            for row in self.ledger().records():
                if (row["owner"]["user_id"] == owner["user_id"] and row["owner"]["environment"] == owner["environment"]
                        and row["owner"]["creation_id"] == identity and row["request"]["idempotency_key"] == str(request.idempotency_key)):
                    if row["owner"] != owner or row["request"] != request.model_dump(mode="json"):
                        raise ControlError(409, "idempotency_conflict")
                    return await self.project(row, check=True)
            expected = await authority.capture()
            if expected.accepted.accepted_revision != request.accepted_revision or expected.site_context_sha256 != request.site_context_sha256:
                raise ControlError(409, "live_preview_context_stale")
            readiness = await self.inspect(authority, expected)
            if not readiness["can_start"]:
                raise ControlError(409, "foundation_preview_content_blocked")
            created, lease_id = now().isoformat(), str(uuid4())
            view = {"lease_id": lease_id, "creation_id": identity, "idempotency_key": str(request.idempotency_key),
                "state": "preparing", "accepted_revision": request.accepted_revision, "scope_sha256": expected.fingerprint(),
                "execution_source_revision": expected.sources.execution_source_revision,
                "public_source_revision": expected.sources.public_source_revision, "site_context_sha256": expected.site_context_sha256,
                "created_at": created, "expires_at": None, "preview_url": None, "failure_code": None,
                "local_preview_only": True, "full_site_status": "UNVERIFIED", "launch_status": "UNVERIFIED", "deployment": "not_performed"}
            record = {"version": "customer-live-preview-request.v1", "instance_id": self.instance_id, "nonce": secrets.token_hex(32),
                "owner": owner, "request": request.model_dump(mode="json"), "view": parsed(LeaseView, view)}
            self.ledger().claim(record)
            lease = Lease(record, authority, expected, copy.deepcopy(record["view"]))
            self.leases[lease_id] = lease
            lease.task = asyncio.create_task(self.drive(lease), name="owned-customer-preview-" + lease_id)
            await asyncio.sleep(0)  # establish owned cancellation cleanup before acknowledging admission
            return copy.deepcopy(lease.view)

    def stop(self, lease, reason, failure=None, *, cancel=True):
        if lease.stop_reason is None:
            lease.stop_reason, lease.failure = reason, failure
        lease.view.update(state="closing" if lease.stop_reason == "closed" else lease.stop_reason,
            preview_url=None, failure_code=lease.failure)
        if cancel and lease.task is not None and not lease.task.done():
            lease.task.cancel()

    def current(self, lease):
        if lease.stop_reason is not None or self.closing:
            return False
        expiry = lease.view["expires_at"]
        if expiry and datetime.fromisoformat(expiry.replace("Z", "+00:00")) <= now():
            self.stop(lease, "expired", "live_preview_expired", cancel=False)
            return False
        return True

    async def permitted(self, lease):
        if not self.current(lease):
            return False
        # Share only a currently executing observation of this exact immutable
        # lease/scope. A finished result never authorizes another invocation.
        check = lease.auth_task
        if check is None or check.done():
            check = lease.auth_task = asyncio.create_task(lease.authority.verify(lease.scope))
        try:
            await asyncio.shield(check)
        except asyncio.CancelledError:
            if asyncio.current_task().cancelling():
                raise
            self.stop(lease, "revoked", "authorization_revoked", cancel=False)
            return False
        except ControlError as error:
            self.stop(lease, "revoked", error.code, cancel=False)
            return False
        # Close, expiry or shutdown may have happened while authority was being
        # read. They cannot be undone by the late completion of that read.
        if not self.current(lease):
            return False
        self.ledger().heartbeat(lease.record, expires_ms=int((now() + timedelta(seconds=3)).timestamp() * 1000))
        return True

    async def drive(self, lease):
        lease.entered = True
        runner = None
        clean = False
        uncertain = False
        try:
            lease.proof = await foundation.prepare_preview(lease.scope, still_authorized=lambda: self.permitted(lease))
            if not await self.permitted(lease):
                raise RunnerError("authorization_revoked")
            lease.view["state"] = "starting"
            node, _, artifacts, environment = studio.configuration()
            payload = self.payload(lease.scope, artifacts, "serve") | {"prepared": lease.proof.model_dump(mode="json"),
                "lease_id": lease.view["lease_id"], "instance_id": self.instance_id,
                "nonce": lease.record["nonce"], "request_sha256": digest(lease.record)}
            runner = asyncio.create_task(studio._execute([node, SCRIPT], payload, environment, lambda: self.permitted(lease), 149))
            while not runner.done():
                if lease.view["state"] == "starting":
                    await self.ready(lease)
                await asyncio.sleep(0.05)
            await runner
            clean = True
            self.stop(lease, "expired", "live_preview_expired", cancel=False)
        except asyncio.CancelledError:
            if lease.stop_reason is None:
                self.stop(lease, "closed", "live_preview_service_closing", cancel=False)
        except (ControlError, RunnerError) as error:
            if lease.stop_reason is None:
                self.stop(lease, "failed", error.code, cancel=False)
        except Exception:
            uncertain = True
            if lease.stop_reason is None:
                self.stop(lease, "failed", "live_preview_unavailable", cancel=False)
        finally:
            async def joined():
                nonlocal clean
                cleanup_uncertain = False
                if runner is not None:
                    if not runner.done():
                        runner.cancel()
                    result = await asyncio.gather(runner, return_exceptions=True)
                    if any(isinstance(item, (OSError, RuntimeError)) for item in result):
                        cleanup_uncertain = True
                check = lease.auth_task
                if check is not None:
                    if not check.done():
                        check.cancel()
                    checked = await asyncio.gather(check, return_exceptions=True)
                    if any(isinstance(item, (OSError, RuntimeError)) for item in checked):
                        cleanup_uncertain = True
                if cleanup_uncertain:
                    return
                clean = not uncertain  # unknown failures never permit releasing an unproved claim
            cleanup = asyncio.create_task(joined())
            while not cleanup.done():
                try:
                    await asyncio.shield(cleanup)
                except asyncio.CancelledError:
                    continue
            try:
                cleanup.result()
                lease.view.update(state=lease.stop_reason or "failed", preview_url=None, failure_code=lease.failure)
                if not clean:
                    lease.view.update(state="failed", failure_code="live_preview_cleanup_unavailable")
                self.ledger().terminal(lease.record, parsed(LeaseView, lease.view))
                if clean:
                    self.ledger().release(lease.record)
            except Exception:
                lease.view.update(state="failed", preview_url=None, failure_code="live_preview_cleanup_unavailable")
                # Uncertain cleanup/claim is never stolen or silently reopened.
            finally:
                lease.authority.token = None

    async def ready(self, lease):
        value = self.ledger().read(self.ledger().file(lease.view["lease_id"], "ready"))
        if value is None:
            return
        if (set(value) != {"version", "lease_id", "nonce", "scope_sha256", "prepared_sha256", "preview_url", "expires_at"}
                or value["version"] != "customer-live-preview-ready.v1" or value["lease_id"] != lease.view["lease_id"]
                or value["nonce"] != lease.record["nonce"] or value["scope_sha256"] != lease.scope.fingerprint()
                or value["prepared_sha256"] != lease.proof.artifact_sha256):
            raise ControlError(503, "live_preview_evidence_invalid")
        expiry = datetime.fromisoformat(value["expires_at"].replace("Z", "+00:00"))
        if not now() + timedelta(seconds=1) < expiry <= now() + timedelta(seconds=90):
            raise ControlError(409, "live_preview_expired")
        if not await self.permitted(lease):
            raise RunnerError("authorization_revoked")
        lease.view = parsed(LeaseView, lease.view | {"state": "ready", "preview_url": value["preview_url"], "expires_at": value["expires_at"]})

    async def project(self, record, *, check):
        lease = self.leases.get(record["view"]["lease_id"])
        if lease is None:
            return self.ledger().historical(record)
        if (lease.task is None or lease.task.done()) and lease.view["state"] in ACTIVE_STATES:
            self.stop(lease, "failed", "live_preview_process_finished", cancel=False)
        if check and lease.view["state"] in ACTIVE_STATES:
            if not await self.permitted(lease):
                self.stop(lease, lease.stop_reason or "revoked", lease.failure)
            elif lease.view["state"] == "ready":
                try:
                    value = await self.inspect(lease.authority, lease.scope)
                    if not value["can_start"]:
                        self.stop(lease, "revoked", "foundation_preview_content_blocked")
                except ControlError as error:
                    self.stop(lease, "revoked", error.code)
        if lease.view["state"] == "ready" and (lease.task is None or lease.task.done() or datetime.fromisoformat(lease.view["expires_at"].replace("Z", "+00:00")) <= now() + timedelta(seconds=1)):
            self.stop(lease, "expired", "live_preview_expired")
        if lease.view["state"] in ACTIVE_STATES and lease.view["execution_source_revision"] != settings().control_source_revision:
            self.stop(lease, "revoked", "source_unavailable")
            lease.view.update(state="revoked", preview_url=None, failure_code="source_unavailable")
        return parsed(LeaseView, lease.view)

    async def detail(self, token, identity, lease_id, *, close=False):
        authority = self.authority_factory(token, identity)
        owner = await authority.authenticate()
        record = next((r for r in self.owned_records(owner) if r["view"]["lease_id"] == str(UUID(lease_id))), None)
        if record is None:
            raise ControlError(404, "not_found")
        lease = self.leases.get(record["view"]["lease_id"])
        if close and lease is not None:
            self.stop(lease, "closed", "live_preview_closed")
            await asyncio.shield(lease.task)
            self.unstarted(lease)
        return await self.project(record, check=not close)

    async def close(self):
        self.closing = True
        async def joined():
            tasks = []
            # Drain an already admitted POST before taking the owner snapshot.
            # This whole sequence survives repeated lifespan cancellation.
            async with self.lock:
                for lease in self.leases.values():
                    if lease.task is not None and not lease.task.done():
                        self.stop(lease, "closed", "live_preview_service_closing")
                        tasks.append(lease.task)
            await asyncio.gather(*tasks, return_exceptions=True)
            for lease in self.leases.values():
                self.unstarted(lease)
        cleanup = asyncio.create_task(joined())
        cancelled = False
        while not cleanup.done():
            try:
                await asyncio.shield(cleanup)
            except asyncio.CancelledError:
                cancelled = True
        cleanup.result()
        if cancelled:
            raise asyncio.CancelledError

    def unstarted(self, lease):
        if lease.task is not None and lease.task.done() and not lease.entered:
            lease.view.update(state=lease.stop_reason or "closed", preview_url=None, failure_code=lease.failure)
            self.ledger().terminal(lease.record, parsed(LeaseView, lease.view))
            self.ledger().release(lease.record)
            lease.entered = True  # terminal ownership has been reconciled once
            lease.authority.token = None


async def close_service(app):
    service = getattr(app.state, "customer_live_preview_service", None)
    if service is not None:
        await service.close()
