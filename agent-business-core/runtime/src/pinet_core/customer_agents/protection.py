"""Private frozen-case provenance; existing Quality and learning gates remain separate.

No corpus, evaluator, labels or private script are supplied to a model. This
adapter commits an operator's existing manifest before the first paid turn.
"""
import hashlib
import json
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid5

from pydantic import Field
from sqlalchemy import or_, select

from .. import evaluation_contract
from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_text import adapter
from ..customer_text.wire import Turn
from ..models import Conversation, Event
from .wire import Digest, Source, Strict

VERSION = "customer-protected-case.v1"
EVENT_KEY = "customer-protected-case"
ROOT = Path(__file__).resolve().parents[3] / "artifacts"


class Reference(Strict):
    manifest_path: str = Field(min_length=1, max_length=1024)
    manifest_sha256: Digest
    case_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,100}$")


class Proof(Strict):
    version: Literal[VERSION]
    manifest_sha256: Digest
    corpus_sha256: Digest
    case_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,100}$")
    split: Literal["train", "holdout"]
    script_sha256: Digest
    message_sha256: list[Digest] = Field(min_length=1, max_length=8)
    snapshot_sha256: Digest
    parent_hash: Digest
    evaluator_sha256: Digest
    execution_source_revision: Source


def freeze(reference, snapshot, messages):
    """Read exact private bytes once, before start; do not rewrite/relabel a case."""
    from . import evaluator
    from .lab import Snapshot

    ref = Reference.model_validate(reference)
    path = Path(ref.manifest_path)
    resolved = path.resolve()
    if (path.is_symlink() or not resolved.is_relative_to(ROOT.resolve())
            or any(p.is_symlink() for p in path.parents) or not path.is_file()
            or path.stat().st_size > 1048576):
        raise ControlError(400, "private_protected_manifest_required")
    raw = path.read_bytes()
    if len(raw) > 1048576 or hashlib.sha256(raw).hexdigest() != ref.manifest_sha256:
        raise ControlError(409, "protected_manifest_conflict")
    manifest = json.loads(raw.decode("utf-8"))
    frozen = Snapshot.model_validate(snapshot).model_dump(mode="json")
    cases = manifest.get("cases")
    if (manifest.get("contract") != "private_customer_archetype_baseline.v1"
            or manifest.get("snapshot") != frozen or manifest.get("snapshot_sha256") != digest(frozen)
            or manifest.get("source_revision") != frozen["execution_source_revision"]
            or manifest.get("evaluator_sha256") != evaluation_contract.fingerprint()
            or manifest.get("model_profile") != evaluator.profile()
            or manifest.get("customer_model") != adapter.MODEL
            or not isinstance(cases, list) or not 6 <= len(cases) <= 100
            or manifest.get("corpus_sha256") != digest(cases)):
        raise ControlError(409, "protected_manifest_conflict")
    selected, ids, scripts, counts = None, set(), {}, {"train": 0, "holdout": 0}
    for case in cases:
        if (not isinstance(case, dict) or set(case) != {"case_id", "split", "archetype", "messages"}
                or not isinstance(case["case_id"], str) or case["case_id"] in ids
                or case["split"] not in counts or not isinstance(case["messages"], list)
                or not 1 <= len(case["messages"]) <= 8):
            raise ControlError(409, "protected_manifest_conflict")
        # Validate every case without changing its bytes or normalization.
        typed = [Turn(request_id=UUID(int=1), base_need_revision=0, message=m).message for m in case["messages"]]
        if typed != case["messages"]:
            raise ControlError(409, "protected_manifest_conflict")
        script = digest(typed)
        if script in scripts and scripts[script] != case["split"]:
            raise ControlError(409, "protected_manifest_conflict")
        scripts[script] = case["split"]
        Reference(manifest_path=ref.manifest_path, manifest_sha256=ref.manifest_sha256, case_id=case["case_id"])
        ids.add(case["case_id"])
        counts[case["split"]] += 1
        if case["case_id"] == ref.case_id:
            selected = case
    if (counts["train"] < 1 or counts["holdout"] < 3 or manifest.get("split") != counts
            or selected is None or selected["messages"] != messages):
        raise ControlError(409, "protected_case_conflict")
    return {"version": VERSION, "manifest_sha256": ref.manifest_sha256,
        "corpus_sha256": manifest["corpus_sha256"], "case_id": ref.case_id, "split": selected["split"],
        "script_sha256": digest(messages), "message_sha256": [digest(m) for m in messages],
        "snapshot_sha256": digest(frozen), "evaluator_sha256": manifest["evaluator_sha256"],
        "execution_source_revision": frozen["execution_source_revision"]}


def with_parent(material, binding):
    from .quality import parent_binding

    proof = Proof.model_validate({**material, "parent_hash": parent_binding(binding)})
    check_binding(proof, binding)
    if proof.evaluator_sha256 != evaluation_contract.fingerprint():
        raise ControlError(409, "protected_manifest_conflict")
    return proof.model_dump(mode="json")


def check_binding(proof, binding):
    from .lab import Episode
    from .quality import parent_binding

    task = Episode.model_validate(binding.get("task_calibration")).model_dump(mode="json")
    snapshot = {k: v for k, v in task.items() if k not in {"episode_id", "script_sha256"}}
    if (proof.script_sha256 != task["script_sha256"] or proof.snapshot_sha256 != digest(snapshot)
            or proof.execution_source_revision != task["execution_source_revision"]
            or proof.parent_hash != parent_binding(binding)):
        raise ValueError("customer_protected_binding_conflict")


def retained(row, events):
    """Validate marker against immutable pre-turn event; missing/tampered fails closed."""
    marker = row.payload.get("protected_case")
    originals = [e for e in events if e.kind == VERSION or e.event_key == EVENT_KEY]
    if marker is None and not originals:
        return None  # Historical/unprotected behavior is not relabeled as protected.
    proof = Proof.model_validate(marker)
    check_binding(proof, row.payload["customer_text_binding"])
    value = proof.model_dump(mode="json")
    if (len(originals) != 1 or originals[0].kind != VERSION or originals[0].event_key != EVENT_KEY
            or originals[0].payload != {"proof": value, "sha256": digest(value)}
            or any(e.sequence <= originals[0].sequence for e in events
                if e.kind in {"client_transcript", "provider_attempt", "quality_request"})):
        raise ValueError("customer_protected_case_conflict")
    clients = sorted((e for e in events if e.kind == "client_transcript"), key=lambda e: e.sequence)
    task = row.payload["customer_text_binding"]["task_calibration"]
    if len(clients) > len(proof.message_sha256):
        raise ValueError("customer_protected_script_conflict")
    for number, event in enumerate(clients):
        key = str(uuid5(UUID(task["episode_id"]), "step:" + str(number)))
        if event.event_key != "client:" + key or digest(event.payload.get("text")) != proof.message_sha256[number]:
            raise ValueError("customer_protected_script_conflict")
    return value


async def observe(tx, row):
    events = list(await tx.scalars(select(Event).where(Event.conversation_id == row.id,
        Event.business_id == row.business_id, Event.environment_id == row.environment_id).order_by(Event.sequence)))
    return retained(row, events)


async def prior_cases(tx, business_id, environment_id, proof):
    """Existing retained conversations pin splits across new episode UUIDs too."""
    rows = list(await tx.scalars(commitments(business_id, environment_id, proof["parent_hash"],
        proof["script_sha256"]).limit(1001)))
    if len(rows) > 1000:
        raise ControlError(409, "protected_case_history_unavailable")
    for row in rows:
        prior = await observe(tx, row)
        if (prior is None or (prior["parent_hash"] == proof["parent_hash"]
                and prior["corpus_sha256"] != proof["corpus_sha256"])
                or (prior["script_sha256"] == proof["script_sha256"] and prior["split"] != proof["split"])):
            raise ControlError(409, "protected_case_reclassification_conflict")


def commitments(business_id, environment_id, parent_hash, script_sha256):
    # Discovery must survive removal/change of the mutable marker. The original
    # event supplies identity; retained() still validates both copies and order.
    return select(Conversation).join(Event, (Event.conversation_id == Conversation.id)
        & (Event.business_id == Conversation.business_id) & (Event.environment_id == Conversation.environment_id)).where(
        Conversation.business_id == business_id, Conversation.environment_id == environment_id,
        or_(Event.event_key == EVENT_KEY, Event.kind == VERSION), or_(
            Event.payload["proof"]["parent_hash"].astext == parent_hash,
            Event.payload["proof"]["script_sha256"].astext == script_sha256))


async def unbound_allowed(tx, business_id, environment_id, binding):
    from .quality import parent_binding

    task = binding.get("task_calibration")
    if not task:
        return True  # Ordinary customer channel is not a protected lab episode.
    prior = await tx.scalar(commitments(business_id, environment_id, parent_binding(binding), task["script_sha256"]).limit(1))
    if prior is None:
        return True
    try:
        await observe(tx, prior)
    except ValueError:
        return False
    return False


async def turn(tx, row, value):
    proof = await observe(tx, row)
    if proof is None:
        return
    task = row.payload["customer_text_binding"]["task_calibration"]
    steps = [str(uuid5(UUID(task["episode_id"]), "step:" + str(n))) for n in range(len(proof["message_sha256"]))]
    key = str(value.request_id)
    clients = list(await tx.scalars(select(Event).where(Event.conversation_id == row.id,
        Event.business_id == row.business_id, Event.environment_id == row.environment_id,
        Event.kind == "client_transcript").order_by(Event.sequence)))
    seen = [e.event_key.removeprefix("client:") for e in clients]
    if (key not in steps or digest(value.message) != proof["message_sha256"][steps.index(key)]
            or (key not in seen and (len(seen) >= len(steps) or key != steps[len(seen)]))
            or proof["evaluator_sha256"] != evaluation_contract.fingerprint()):
        raise ControlError(409, "protected_case_conflict")


async def review_proof(tx, row):
    proof = await observe(tx, row)
    if proof is not None:
        clients = list(await tx.scalars(select(Event.id).where(Event.conversation_id == row.id,
            Event.business_id == row.business_id, Event.environment_id == row.environment_id,
            Event.kind == "client_transcript")))
        if (len(clients) != len(proof["message_sha256"])
                or proof["evaluator_sha256"] != evaluation_contract.fingerprint()):
            raise ControlError(409, "protected_quality_incomplete_or_changed")
    return digest(proof) if proof is not None else None


async def tuning_allowed(tx, row):
    proof = await observe(tx, row)
    if proof is not None:
        return proof["split"] == "train"
    return await unbound_allowed(tx, row.business_id, row.environment_id, row.payload["customer_text_binding"])
