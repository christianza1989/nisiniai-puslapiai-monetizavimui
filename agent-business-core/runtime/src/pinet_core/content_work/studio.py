"""Exact server-owned prepare/validate/apply adapter over the maintained Node writer."""
from uuid import UUID

from ..creation import studio as intake
from ..creation.adapter import ROOT
from ..creation.review import canonical_sha256
from ..tasks.codex_transport import RunnerError

BINDING_KEYS = ("expectedRevisionHash", "expectedPlanningHash", "expectedContextHash",
                "instructionHash", "researchSnapshotHash")


async def invoke(job, command, authorized, *, seconds, prepared=None, output=None):
    node, _, artifacts, environment = intake.configuration()
    script = ROOT / "content-studio/scripts/customer-content-write.mjs"
    if not script.is_file():
        raise RunnerError("writer_unavailable")
    identity = str(UUID(job.creation_id))
    directory = artifacts / "customer-content" / identity / f"revision-{job.accepted_revision}"
    payload = {"command": command, "creationId": identity, "acceptedRevision": job.accepted_revision,
        "sourceHash": job.source_hash, "pageId": job.page_id, "canonicalHost": job.canonical_host,
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
    if prepared:
        payload.update({key: prepared[key] for key in BINDING_KEYS[:3]})
    if output is not None:
        payload["output"] = output
    value = await intake._execute([node, script], payload, environment, authorized, min(20, seconds))
    if not isinstance(value, dict):
        raise RunnerError("writer_binding_invalid")
    expected_state = {"prepare": "prepared", "validate": "validated", "apply": "private-draft-written"}[command]
    if (value.get("version") != "customer-content-write.v1" or value.get("state") != expected_state
            or value.get("creationId") != identity or value.get("acceptedRevision") != job.accepted_revision
            or value.get("sourceHash") != job.source_hash or value.get("pageId") != job.page_id
            or value.get("canonicalHost") != job.canonical_host or value.get("fullF1") != "UNVERIFIED"
            or value.get("launch") != "UNVERIFIED" or value.get("deployment") != "not-performed"):
        raise RunnerError("writer_binding_invalid")
    if prepared and any(value.get(key) != prepared[key] for key in BINDING_KEYS):
        raise RunnerError("writer_binding_invalid")
    if command == "validate" and canonical_sha256(value.get("output")) != value.get("outputHash"):
        raise RunnerError("writer_binding_invalid")
    if command == "apply" and (canonical_sha256(output) != value.get("outputHash")
            or any(value.get(key) != "not-performed" for key in ("approval", "sourceVerification", "mediaVerification"))):
        raise RunnerError("writer_binding_invalid")
    return value
