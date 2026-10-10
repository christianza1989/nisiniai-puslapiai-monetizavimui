"""Read real shared registries; a host match is never a creation/revision binding."""
import re
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select, text

from .. import agent_instructions, knowledge, knowledge_index, onboarding, policy, profiles
from ..config import settings
from ..control.models import BusinessGrant, Membership
from ..control.routes import ControlError
from ..creation import team
from ..creation.models import Job, Revision
from ..creation.service import ACTIVE, current_actor, digest
from ..creation.studio import projection as intake_projection
from ..models import Business, utcnow
from .wire import (
    AgentPreparationView,
    Check,
    IntakeObservation,
    Mapping,
    RegistrationCandidate,
    RuntimeObservation,
    TeamReviewObservation,
)

HEX = re.compile(r"^[a-f0-9]{64}$")
SOURCE = re.compile(r"^[a-f0-9]{40}$")


def inspect_knowledge(state, business, now):
    """Only candidate-owned accepted native metadata/counts; never expose contacts or prose."""
    result = {"knowledge_state": "missing", "knowledge_revision": None, "knowledge_sha256": None,
        "knowledge_refreshed_at": None, "knowledge_active_page_count": 0}
    if not state or not state.payload.get("knowledge"):
        return result
    result.update(knowledge_revision=state.revision, knowledge_refreshed_at=state.refreshed_at)
    try:
        value, payload = state.payload["knowledge"], state.payload
        if value.get("schema_version") != 2:
            result["knowledge_state"] = "v1"
            return result
        metadata = knowledge_index.Metadata.model_validate({k: v for k, v in value.items()
            if k not in {"schema_version", "pages"}}).model_dump(mode="json")
        pages, revoked, receipt = value["pages"], payload.get("revoked", []), payload["index_receipt"]
        if (metadata["site_id"] != business.site_id or metadata["canonical_host"] != business.canonical_host
                or not isinstance(pages, list) or not 1 <= len(pages) <= 1000
                or not isinstance(revoked, list) or len(revoked) > 1000
                or any(not isinstance(h, str) or not HEX.fullmatch(h) for h in revoked)
                or receipt.get("status") != "complete" or receipt.get("schema_version") != 2
                or receipt.get("page_count") != len(pages) or not isinstance(state.revision, int)
                or not isinstance(receipt.get("revision"), int) or not 1 <= receipt["revision"] <= state.revision):
            raise ValueError("Invalid native source identity")
        for page in pages:
            if (set(page) != {"id", "title", "url", "revision_hash", "projection_hash", "text"}
                    or not all(isinstance(page[k], str) for k in page)
                    or not page["id"] or len(page["id"]) > 100 or len(page["title"]) > 300
                    or not page["url"].startswith(f"https://{business.canonical_host}/")
                    or not HEX.fullmatch(page["revision_hash"]) or not HEX.fullmatch(page["projection_hash"])):
                raise ValueError("Invalid native page")
        if (len({p["id"] for p in pages}) != len(pages)
                or knowledge_index.content_hash(metadata, pages) != receipt["content_hash"]
                or knowledge_index.content_hash({k: v for k, v in metadata.items() if k != "generated_at"}, pages)
                   != payload["hash"]):
            raise ValueError("Changed native source bytes")
        result.update(knowledge_sha256=payload["hash"],
            knowledge_active_page_count=sum(p["revision_hash"] not in revoked for p in pages))
        result["knowledge_state"] = ("v2_revoked" if revoked else "v2_expired"
            if state.refreshed_at + timedelta(seconds=settings().knowledge_ttl_seconds) < now else "v2_current")
    except (ValueError, TypeError, KeyError, AttributeError):
        result.update(knowledge_state="invalid", knowledge_sha256=None, knowledge_active_page_count=0)
    return result


def profile_observation(business):
    if not business:
        return False, {}
    try:
        profiles.get(business.site_id, business.canonical_host)
    except HTTPException:
        return False, {}
    hashes = {}
    for role in ("conversation", "sales", "supplier", "quality"):
        try:
            hashes[role] = agent_instructions.compose(business.site_id, role).hash
        except (ValueError, OSError):
            pass
    return True, hashes


def checks_for(*, creation, revision, team_review, intake, mapping, runtime, now):
    """Code support, config, DB and intake are observations, never channel/calibration proof."""
    checks = []
    def add(key, status, scope, code, summary, stamp=now):
        checks.append(Check(key=key, status=status, scope=scope, code=code, summary=summary,
            observed_at=None if scope == "not_observed" else stamp))
    exists = bool(revision)
    accepted = team_review.state == "accepted"
    busy = creation.status in ACTIVE or creation.active_job_id is not None
    add("accepted_revision", "PASS" if accepted and not busy else "FAIL", "current_database",
        "accepted_revision_current" if accepted and not busy else "creation_revision_pending" if busy
        else "private_revision_unreviewed" if exists else "accepted_revision_missing",
        "AI komanda priėmė tikslų dabartinį privatų juodraštį su faktine kalbos patikra."
        if accepted and not busy else "Dabartinis privatus juodraštis dar neturi užbaigto tikslaus AI komandos priėmimo.")
    if exists:
        same = revision.source_revision == settings().control_source_revision
        add("source_pin", "PASS" if same else "FAIL", "current_database",
            "accepted_source_current" if same else "accepted_source_outdated",
            "Juodraščio kodo versija sutampa su dabartine platformos versija." if same else
            "Juodraščio ir dabartinės platformos kodo versijos nesutampa; reikia naujos patikros.")
    else:
        add("source_pin", "UNVERIFIED", "not_observed", "accepted_source_missing",
            "Kodo ir rezultato susiejimą bus galima vertinti priėmus versiją.")
    imported = intake.state == "private_draft_imported"
    add("private_intake", "PASS" if imported else "FAIL", "intake_snapshot" if intake.observed_at
        else "current_database", "private_intake_observed" if imported else "private_intake_failed"
        if intake.state == "intake_failed" else "private_intake_missing",
        "Matomas istorinis privataus turinio importas; jis nepatvirtina dabartinio publikavimo." if imported else
        "Privataus juodraščio importas nepavyko; išsaugota konkreti klaida." if intake.state == "intake_failed" else
        "Šio verslo juodraštis dar neimportuotas į turinio studiją.",
        intake.observed_at or now)
    candidate = mapping.candidate is not None
    add("business_registration", "PASS" if candidate else "FAIL", "current_database",
        "owned_registration_candidate" if candidate else "owned_registration_missing",
        "Patikrintas to paties domeno įrašas šiame portfelyje; jis yra tik registracijos kandidatas."
        if candidate else "Šiame portfelyje nėra galiojančio to paties domeno verslo įrašo.")
    add("creation_business_binding", "FAIL", "source_code", "creation_business_binding_missing",
        "Trūksta patvaraus šios sukūrimo versijos susiejimo su konkrečiu verslo įrašu.")
    if candidate:
        add("business_profile", "PASS" if runtime.profile_registered else "FAIL", "source_code",
            "candidate_profile_registered" if runtime.profile_registered else "candidate_profile_missing",
            "Tikrinamas kandidato profilis pagal tikslų svetainės ID ir domeną.")
        roles = len(runtime.role_instruction_hashes) == 4
        add("role_instructions", "PASS" if roles else "FAIL", "source_code",
            "candidate_role_instructions_present" if roles else "candidate_role_instructions_missing",
            "Tikrinamos esamos kandidato pokalbio, pardavimų, tiekėjo ir kokybės instrukcijos.")
        state = runtime.knowledge_state
        add("v2_knowledge", "UNVERIFIED" if state == "v2_current" else "FAIL", "current_database",
            "knowledge_creation_binding_missing" if state == "v2_current" else "candidate_knowledge_" + state,
            "Kandidato žinių registras nėra įrodytai susietas su šia priimta versija.")
    else:
        for key, code in (("business_profile", "profile_mapping_missing"),
                          ("role_instructions", "instruction_mapping_missing"),
                          ("v2_knowledge", "knowledge_mapping_missing")):
            add(key, "UNVERIFIED", "not_observed", code,
                "Šį vartą bus galima vertinti pagal konkretų autorizuotą verslo įrašą.")
    add("v2_session", "FAIL", "source_code", "v2_session_admission_missing",
        "Šio verslo juodraštis dar neprijungtas prie kliento aptarnavimo agento.")
    voice_site = bool(candidate and mapping.candidate.site_id == "traktoriupadangos")
    add("site_voice", "FAIL" if not voice_site or not runtime.voice_configured else "UNVERIFIED",
        "source_code" if not voice_site else "runtime_configuration",
        "site_voice_not_admitted" if not voice_site else "voice_configuration_disabled"
        if not runtime.voice_configured else "voice_channel_unverified",
        "Tikras svetainės balso skambutis ir kontaktų eiga šiai versijai dar nepatikrinti.")
    add("acquisition", "UNVERIFIED", "not_observed", "acquisition_mandate_unverified",
        "Šiai versijai dar nėra patikrinto klientų paieškos mandato ir kanalo įrodymų.")
    followup = runtime.followup_enabled
    add("email_followup", "FAIL" if followup is False or not runtime.smtp_enabled else "UNVERIFIED",
        "current_database" if followup is False else "runtime_configuration" if not runtime.smtp_enabled
        else "not_observed", "followup_policy_disabled" if followup is False else "smtp_disabled"
        if not runtime.smtp_enabled else "email_delivery_unverified",
        "Laiško leidimas ir tikras gavimas vertinami atskirai; paskyros adresas nėra verslo kontaktas.")
    add("email_reply", "UNVERIFIED", "not_observed", "email_reply_channel_unverified",
        "Kliento atsakymo gavimas ir to paties pokalbio tęsinys dar nepatikrinti.")
    add("calibration", "UNVERIFIED", "not_observed", "agent_calibration_unverified",
        "Šiam verslo juodraščiui nėra scenarijų, tikrų kanalų ir kalibravimo priėmimo įrodymų.")
    return checks


async def revision_observations(tx, creation):
    """Shared exact private revision/team/intake observations; no registry authority."""
    revision = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id,
        Revision.sequence == creation.current_revision).execution_options(populate_existing=True)) if creation.current_revision else None
    job = await tx.get(Job, revision.job_id, populate_existing=True) if revision else None
    if creation.current_revision and (not revision or not job or job.creation_id != creation.id
            or job.status != "succeeded" or revision.source_revision != job.source_revision
            or not SOURCE.fullmatch(revision.source_revision) or digest(revision.payload) != revision.material_hash):
        raise ControlError(503, "invalid_agent_source")
    try:
        # Reuse the canonical sidecar's coordinator accept_draft + observed
        # exact-hash language PASS predicate. A legacy one-creator Revision
        # remains visible, but cannot acquire three-role acceptance here.
        reviewed = await team.projection(tx, creation)
        accepted_hash = reviewed["accepted_candidate_sha256"]
        if accepted_hash is not None and (not revision or accepted_hash != revision.material_hash):
            raise ValueError("Changed team acceptance identity")
        team_review = TeamReviewObservation(state="no_revision" if not revision else "accepted"
            if accepted_hash else "unreviewed", accepted_candidate_sha256=accepted_hash)
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_agent_source") from None
    content = await intake_projection(tx, creation)
    intake = IntakeObservation(state=content["state"], import_job_id=content["import_job_id"],
        observed_at=content["observed_at"], page_count=len(content["pages"]),
        approved_page_count=sum(p["has_approved_revision"] for p in content["pages"]),
        failure_code=content["failure_code"])
    return revision, team_review, intake


async def projection(tx, session, creation, requested_revision=None):
    now = utcnow()
    if requested_revision is not None and requested_revision != creation.current_revision:
        raise ControlError(409, "stale_revision")
    # Membership/grant tables are SELECT-only. Recheck current authority before
    # returning; do not demand UPDATE privileges merely to observe row locks.
    member = await tx.scalar(select(Membership).where(Membership.user_id == session.user_id,
        Membership.organization_id == creation.organization_id, Membership.environment_id == settings().environment,
        Membership.enabled, Membership.role == "owner"))
    if not member:
        raise ControlError(404, "not_found")
    revision, team_review, intake = await revision_observations(tx, creation)
    row = (await tx.execute(select(BusinessGrant, Business).join(Business, Business.id == BusinessGrant.business_id)
        .where(BusinessGrant.portfolio_id == creation.portfolio_id,
            BusinessGrant.organization_id == creation.organization_id, BusinessGrant.environment_id == settings().environment,
            BusinessGrant.enabled, Business.canonical_host == creation.canonical_host))).first() if creation.canonical_host else None
    candidate = None
    if row:
        grant, business = row
        try:
            candidate = RegistrationCandidate(business_id=business.id, site_id=business.site_id,
                canonical_host=business.canonical_host, registration_source_revision=grant.evidence_revision,
                connection_status=grant.connection_status)
        except ValueError:
            raise ControlError(503, "invalid_agent_source") from None
    else:
        business = None
    mapping = Mapping(state="candidate_unbound" if candidate else "missing", candidate=candidate)
    profile, hashes = profile_observation(business)
    cfg = settings()
    observation = {"scope": "owned_registration_candidate" if business else "unmapped",
        "profile_registered": profile, "role_instruction_hashes": hashes,
        "knowledge_state": "not_observed", "knowledge_revision": None, "knowledge_sha256": None,
        "knowledge_refreshed_at": None, "knowledge_active_page_count": 0,
        "source_admitted": None, "learning_admitted": None, "policy_enabled": None, "policy_paused": None,
        "followup_enabled": None, "smtp_enabled": bool(cfg.smtp_enabled), "voice_configured": bool(cfg.voice_ready)}
    if business:
        # The owned RLS-visible grant is established before entering the legacy business scope.
        # These shared helpers only read; do not refresh/register/update knowledge or onboarding.
        await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": business.id})
        await policy.lock(tx, business.id, cfg.environment)
        try:
            state = await knowledge.current(tx)
            observation.update(inspect_knowledge(state, business, now))
            readiness = await onboarding.status(tx, business.site_id)
            authority, _ = await policy.read(tx)
            observation.update(source_admitted=bool(readiness.get("source_ready")),
                learning_admitted=bool(readiness.get("learning_admitted")), policy_enabled=authority.enabled,
                policy_paused=authority.paused, followup_enabled=authority.followup_enabled)
        except (ValueError, TypeError, KeyError, AttributeError):
            raise ControlError(503, "invalid_agent_source") from None
    try:
        runtime = RuntimeObservation.model_validate(observation)
    except ValueError:
        raise ControlError(503, "invalid_agent_source") from None
    checks = checks_for(creation=creation, revision=revision, team_review=team_review, intake=intake,
        mapping=mapping, runtime=runtime, now=now)
    # Final current authority check; no job expiry cleanup or session mutation.
    await current_actor(tx, session, creation.portfolio_id)
    if business:
        current_row = (await tx.execute(select(BusinessGrant, Business)
            .join(Business, Business.id == BusinessGrant.business_id).where(BusinessGrant.id == grant.id,
            BusinessGrant.enabled, BusinessGrant.portfolio_id == creation.portfolio_id,
            BusinessGrant.organization_id == creation.organization_id,
            BusinessGrant.environment_id == cfg.environment).execution_options(populate_existing=True))).first()
        if not current_row:
            raise ControlError(404, "not_found")
        current, current_business = current_row
        if (current.evidence_revision != candidate.registration_source_revision
                or current.business_id != str(candidate.business_id)
                or current.connection_status != candidate.connection_status
                or current_business.site_id != candidate.site_id
                or current_business.canonical_host != candidate.canonical_host):
            raise ControlError(409, "registration_changed")
    try:
        return AgentPreparationView(creation_id=creation.id, accepted_revision=creation.current_revision or None,
            candidate_sha256=revision.material_hash if revision else None,
            accepted_source_revision=revision.source_revision if revision else None, canonical_host=creation.canonical_host,
            observed_at=now, team_review=team_review, mapping=mapping, intake=intake, runtime=runtime, checks=checks,
            blocker_keys=[c.key for c in checks if c.status != "PASS"]).model_dump(mode="json")
    except ValueError:
        raise ControlError(503, "invalid_agent_source") from None
