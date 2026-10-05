"""Static candidate admission only. Semantic evaluation and promotion remain gated.

This contract corpus belongs to code, not model-editable tenant data. A static
PASS means structurally admissible, never 'better for clients' or activated.
"""
import json
import re

from fastapi import HTTPException
from sqlalchemy import select

from .models import Artifact, Conversation, new_id
from .security import digest

CONTRACT = {
    "version": "static-admission-v1",
    "scopes": ["clarification", "turn_taking", "contact_invitation"],
    "invariants": ["ai_disclosure", "current_approved_sources", "tenant_isolation", "consent_and_ui_ack",
                   "no_commerce_grants", "no_contact_in_model", "no_automatic_promotion", "no_filesystem_writer"],
}
CONTRACT_HASH = digest(json.dumps(CONTRACT, sort_keys=True))
FORBIDDEN = re.compile(
    r"ignore (all|previous|system)|ignoruok.*(instrukc|taisykl)|"
    r"(išjunk|isjunk|apeik|disable|bypass).*(consent|sutikim|auth|rls|policy|politik|saug)|"
    r"(rašyk|rasyk|write|modify).*(skill|\.env|prompt\.md)|"
    r"(siųsk|siusk|send).*(visus kontakt|all contact|without consent)|"
    r"(kaina yra|price is|in stock|garantuotas likutis)", re.IGNORECASE)


async def static_check(tx, candidate_id):
    candidate = await tx.scalar(select(Artifact).where(Artifact.id == candidate_id,
        Artifact.kind.like("candidate:%")).with_for_update())
    if not candidate:
        raise HTTPException(404, "candidate_unavailable")
    convo = await tx.get(Conversation, candidate.conversation_id)
    value, issues = candidate.payload, []
    quality_id = value.get("issue_artifact_id")
    if value.get("issue_ref"):
        issue = await tx.get(Artifact, value["issue_ref"])
        if issue and issue.conversation_id == convo.id and issue.kind.startswith("calibration_issue:"):
            quality_id = issue.payload.get("quality_ref")
    quality = await tx.get(Artifact, quality_id) if quality_id else None
    if (not quality or quality.conversation_id != convo.id or quality.kind != "quality"
            or quality.payload.get("root_cause") != "communication"):
        issues.append("communication_quality_provenance_required")
    if value.get("parent_hash") != convo.payload["release_hash"]:
        issues.append("parent_release_conflict")
    instruction = value.get("instruction", "")
    if not isinstance(instruction, str) or not 10 <= len(instruction) <= 1000:
        issues.append("instruction_bounds")
        instruction = ""
    if value.get("hash") != digest(instruction):
        issues.append("candidate_hash_conflict")
    if value.get("scope") not in CONTRACT["scopes"]:
        issues.append("unsupported_scope")
    if FORBIDDEN.search(instruction) or "```" in instruction or "\x00" in instruction:
        issues.append("restricted_instruction")
    if value.get("activated") or value.get("state") not in {"proposed", "awaiting_semantic_evaluation", "static_rejected"}:
        issues.append("invalid_candidate_state")
    result = {"candidate_id": candidate.id, "candidate_hash": value.get("hash"), "parent_hash": value.get("parent_hash"),
              "contract_hash": CONTRACT_HASH, "checks": "static", "issues": issues,
              "status": "FAIL" if issues else "PASS", "semantic_evaluation": "UNVERIFIED",
              "audio_evaluation": "UNVERIFIED", "activated": False, "promotion_eligible": False}
    existing = await tx.scalar(select(Artifact).where(Artifact.conversation_id == convo.id,
        Artifact.kind == f"static_eval:{candidate.id}"))
    if existing:
        if existing.payload != result:
            raise HTTPException(409, "static_evaluation_changed_requires_new_candidate")
        return result
    tx.add(Artifact(id=new_id(), business_id=candidate.business_id, environment_id=candidate.environment_id,
        conversation_id=convo.id, kind=f"static_eval:{candidate.id}", payload=result))
    candidate.payload = {**value, "state": "static_rejected" if issues else "awaiting_semantic_evaluation",
                         "static_contract_hash": CONTRACT_HASH, "activated": False}
    return result
