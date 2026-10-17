"""Two fresh, sequential dependency graphs belonging to one Authority invocation.

The context variable carries only a private invocation pointer. Named readers call
the canonical validators; no SQL, authorization or validation is reimplemented.
Native transport authorization deliberately never consults this module.
"""
import asyncio
import copy
from contextlib import contextmanager
from contextvars import ContextVar
from types import SimpleNamespace

from ..control.routes import ControlError

_current = ContextVar("authority_observation_phase", default=None)


def owner_task():
    try:
        task = asyncio.current_task()
    except RuntimeError:
        task = None
    if task is None:
        raise ControlError(503, "source_unavailable")
    return task


def session_binding(session):
    return str(session.id), str(session.user_id), str(session.environment_id)


def active(tx, creation=None):
    phase = _current.get()
    if phase is None:
        return None
    phase.check(tx, creation)
    return phase


def snapshot(row):
    # Never retain an ORM identity-map value as accepted immutable evidence.
    return SimpleNamespace(**copy.deepcopy({k: v for k, v in vars(row).items() if not k.startswith("_")}))


async def native_guard(tx, session, identity, proof):
    """One maintained native/Guide/S6 guard, also used before reading native bytes."""
    from ..creation import media
    request = SimpleNamespace(**{key: proof[key] for key in ("accepted_revision", "candidate_sha256", "canonical_host")})
    await media.native_mutation_guard(tx, session, identity, request,
        unavailable_code="live_preview_revision_unavailable", stale_code="live_preview_context_stale")()
    phase = active(tx)
    if phase:
        phase.native_checked = True


class Observation:
    def __init__(self, tx, session, identity):
        self.tx, self.session, self.identity = tx, session_binding(session), str(identity)
        self.task, self.closed, self.number = owner_task(), False, 0
        self.entered, self.phase_active = False, None
        self.entry_pins, self.node = None, None

    def __enter__(self):
        if self.closed or self.entered or _current.get() is not None or owner_task() is not self.task:
            raise ControlError(503, "source_unavailable")
        self.entered = True
        return self

    def __exit__(self, *args):
        self.closed, self.entry_pins, self.node = True, None, None
        if self.phase_active is not None:
            self.phase_active.close()

    @contextmanager
    def phase(self):
        if (self.closed or not self.entered or self.number >= 2 or self.phase_active is not None
                or _current.get() is not None or owner_task() is not self.task):
            raise ControlError(503, "source_unavailable")
        self.number += 1
        phase = Phase(self)
        self.phase_active = phase
        token = _current.set(phase)
        try:
            yield phase
            phase.check(self.tx)
            if self.number == 1:
                self.entry_pins = copy.deepcopy(phase.pins)
            elif phase.pins != self.entry_pins:
                raise ControlError(409, "live_preview_context_stale")
        finally:
            phase.close()
            self.phase_active = None
            _current.reset(token)


class Phase:
    def __init__(self, operation):
        self.operation, self.closed = operation, False
        self.values, self.pins = {}, {}
        self.owned_creation = None
        self.native_checked = False

    def check(self, tx, creation=None):
        op = self.operation
        identity = str(creation.id) if creation is not None else op.identity
        if (self.closed or op.closed or op.phase_active is not self or tx is not op.tx
                or owner_task() is not op.task or identity != op.identity):
            raise ControlError(503, "source_unavailable")

    def close(self):
        self.closed = True
        self.values.clear()
        self.pins.clear()
        self.owned_creation = None
        self.native_checked = False

    def copied(self, value, creation=None):
        value = copy.deepcopy(value)
        self.check(self.operation.tx, creation)
        return value

    def pin(self, key, value):
        self.check(self.operation.tx)
        copied = copy.deepcopy(value)
        self.check(self.operation.tx)
        if key in self.pins and self.pins[key] != copied:
            raise ControlError(409, "live_preview_context_stale")
        self.pins[key] = copied

    async def material(self, creation):
        self.check(self.operation.tx, creation)
        if "material" not in self.values:
            from ..creation.accepted_material import accepted_material
            revision, job, proof = await accepted_material(self.operation.tx, creation)
            self.check(self.operation.tx, creation)
            from .foundation import guard
            await guard()
            self.check(self.operation.tx, creation)
            value = snapshot(revision), snapshot(job), copy.deepcopy(proof)
            self.pin("material", {"proof": proof, "payload": revision.payload, "usage": job.usage})
            self.check(self.operation.tx, creation)
            self.values["material"] = value
        return self.copied(self.values["material"], creation)

    async def approved(self, creation):
        self.check(self.operation.tx, creation)
        if "approved" not in self.values:
            from ..business_discovery.service import approved_build_context
            value = await approved_build_context(self.operation.tx, creation)
            self.check(self.operation.tx, creation)
            value = self.copied(value, creation)
            self.pin("approved", value)
            self.check(self.operation.tx, creation)
            self.values["approved"] = value
        return self.copied(self.values["approved"], creation)

    async def proof(self, creation, reader):
        self.check(self.operation.tx, creation)
        if "proof" not in self.values:
            value = await reader(self.operation.tx, creation)
            self.check(self.operation.tx, creation)
            value = self.copied(value, creation)
            self.pin("proof", value)
            self.check(self.operation.tx, creation)
            self.values["proof"] = value
        return self.copied(self.values["proof"], creation)

    async def intake(self, creation, revision, job, reader):
        self.check(self.operation.tx, creation)
        from ..creation.service import binding
        key = (revision.id if revision else None, job.id if job else None,
            creation.current_revision, tuple(binding(creation).items()))
        self.check(self.operation.tx, creation)
        if "intake" not in self.values:
            value = await reader(self.operation.tx, creation, revision, job)
            self.check(self.operation.tx, creation)
            value = self.copied(value, creation)
            self.values["intake"] = key, value
        if key != self.values["intake"][0]:
            raise ControlError(503, "invalid_registration_source")
        return self.copied(self.values["intake"][1], creation)

    async def actor(self, session, creation):
        self.check(self.operation.tx, creation)
        key = (*session_binding(session), str(creation.portfolio_id))
        self.check(self.operation.tx, creation)
        from ..creation.service import current_actor
        await current_actor(self.operation.tx, session, creation.portfolio_id)
        self.check(self.operation.tx, creation)
        if key != (*session_binding(session), str(creation.portfolio_id)):
            raise ControlError(503, "source_unavailable")
        self.check(self.operation.tx, creation)

    async def owned(self, session, identity):
        self.check(self.operation.tx)
        if str(identity) != self.operation.identity or session_binding(session) != self.operation.session:
            raise ControlError(503, "source_unavailable")
        self.check(self.operation.tx)
        if self.owned_creation is None:
            from ..creation.routes import owned
            creation = await owned(self.operation.tx, session, identity)
            self.check(self.operation.tx, creation)
            if session_binding(session) != self.operation.session:
                raise ControlError(503, "source_unavailable")
            self.check(self.operation.tx, creation)
            self.owned_creation = creation
        # Every consumer retains its existing immediate tx.refresh(creation).
        # Only this mutable parent remains transaction-local; never accepted data.
        self.check(self.operation.tx, self.owned_creation)
        return self.owned_creation

    async def continuation(self, creation, reader):
        self.check(self.operation.tx, creation)
        if "continuation" not in self.values:
            row = await reader(self.operation.tx, creation)
            self.check(self.operation.tx, creation)
            value = snapshot(row) if row else None
            self.pin("continuation", None if row is None else [row.id, row.context_sha256, row.session_id])
            self.check(self.operation.tx, creation)
            self.values["continuation"] = value
        return self.copied(self.values["continuation"], creation)

    def node_result(self, session, creation, proof):
        self.check(self.operation.tx, creation)
        if self.operation.number == 1:
            self.check(self.operation.tx, creation)
            return None
        signature, value = self.operation.node or (None, None)
        if signature != (session_binding(session), str(creation.id), proof):
            raise ControlError(409, "live_preview_context_stale")
        return self.copied(value, creation)

    async def before_node(self, session, creation, proof):
        self.check(self.operation.tx, creation)
        if not self.native_checked:
            await native_guard(self.operation.tx, session, creation.id, proof)
            self.check(self.operation.tx, creation)
        self.check(self.operation.tx, creation)

    def record_node(self, session, creation, proof, value):
        self.check(self.operation.tx, creation)
        if self.operation.number != 1 or self.operation.node is not None:
            raise ControlError(503, "source_unavailable")
        value = self.copied(((session_binding(session), str(creation.id), proof), value), creation)
        self.operation.node = value
