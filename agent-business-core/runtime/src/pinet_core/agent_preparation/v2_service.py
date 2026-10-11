"""Current exact registered business observations; never activate or infer host ownership."""
from datetime import timedelta
from types import SimpleNamespace

from sqlalchemy import select, text

from .. import knowledge, onboarding, policy
from ..config import settings
from ..control.routes import ControlError
from ..creation_registration import service as registrations
from ..creation_registration.wire import RegistrationView
from ..customer_profile import service as profiles
from ..customer_profile.wire import ProfileView
from ..models import Business, utcnow
from .service import checks_for, inspect_knowledge, revision_observations
from .v2_wire import AgentPreparationViewV2, RuntimeObservationV2
from .wire import Check


def empty_runtime():
    cfg = settings()
    return RuntimeObservationV2(scope="unmapped", profile_registered=False, role_instruction_hashes={},
        knowledge_state="not_observed", knowledge_revision=None, knowledge_sha256=None, knowledge_refreshed_at=None,
        knowledge_active_page_count=0, source_admitted=None, learning_admitted=None, policy_enabled=None,
        policy_paused=None, followup_enabled=None, smtp_enabled=bool(cfg.smtp_enabled), voice_configured=bool(cfg.voice_ready))


def inspect_registered_knowledge(state, business, now):
    value = inspect_knowledge(state, business, now)
    # V1 reports every historical revocation conservatively. The exact admitted
    # V2 reference can still serve its remaining active pages, as reference_v2 does.
    if value["knowledge_state"] == "v2_revoked" and value["knowledge_active_page_count"]:
        value["knowledge_state"] = ("v2_expired"
            if state.refreshed_at + timedelta(seconds=settings().knowledge_ttl_seconds) < now else "v2_current")
    return value


def registration_checks(*, creation, revision, team_review, intake, registration, runtime, now, profile=None):
    # The maintained 14 gates keep their conservative source/config/channel semantics.
    # This bridge is only for their presentation; canonical Registration grants the scope.
    registered = registration.registration if registration.binding_current else None
    checks = checks_for(creation=creation, revision=revision, team_review=team_review, intake=intake,
        mapping=SimpleNamespace(candidate=registered), runtime=runtime, now=now)
    bound = registration.binding_current
    replacement = {}
    for key in ("business_registration", "creation_business_binding"):
        replacement[key] = Check(key=key, status="PASS" if bound else "FAIL", scope="current_database",
            code="creation_registration_current" if bound else "creation_registration_pending"
            if registration.revision_pending and registration.state == "current" else "creation_registration_" + registration.state,
            summary="Patikrintas tikslus šios priimtos versijos susiejimas su kliento verslo įrašu." if bound else
            "Ši versija dar neturi galiojančio patvaraus susiejimo; verslo agentas neįjungtas.", observed_at=now)
    if bound and runtime.knowledge_state == "v2_current":
        replacement["v2_knowledge"] = Check(key="v2_knowledge", status="UNVERIFIED", scope="current_database",
            code="knowledge_revision_binding_unverified",
            summary="Verslo žinių šaltinis matomas; jo ryšys su šio juodraščio patvirtintu viešu leidimu dar nepatikrintas.",
            observed_at=now)
    if bound:
        current = bool(profile and profile.profile_current and runtime.knowledge_state == "v2_current")
        for key in ("business_profile", "role_instructions"):
            replacement[key] = Check(key=key, status="PASS" if current else "FAIL", scope="current_database",
                code="customer_profile_current" if current else "customer_profile_" + (profile.state if profile else "missing"),
                summary="Patikrintas šios versijos profilis ir jo pokalbio bei kokybės instrukcijų versijos; vykdymas dar neįjungtas."
                if current else "Šios versijos profilis dar nepriimtas arba jo duomenų šaltinis nebegalioja.", observed_at=now)
        if current:
            replacement["source_pin"] = Check(key="source_pin", status="PASS", scope="current_database",
                code="execution_profile_current",
                summary="Profilis susietas su dabartine core versija; priimto juodraščio istorinė versija išsaugota.", observed_at=now)
            replacement["v2_knowledge"] = Check(key="v2_knowledge", status="PASS", scope="current_database",
                code="admitted_profile_knowledge_current",
                summary="Profilis susietas su tiksliai priimtu aktualiu V2 žinių indeksu; tai nėra viešo paleidimo įrodymas.", observed_at=now)
    return [replacement.get(c.key, c) for c in checks]


async def projection(tx, session, creation, requested_revision=None, *, registration_identity):
    initial = RegistrationView.model_validate(await registrations.projection(tx, session, creation, requested_revision))
    profile = ProfileView.model_validate(await profiles.projection(tx, session, creation, requested_revision,
        registration_identity=registration_identity))
    revision, review, intake = await revision_observations(tx, creation)
    runtime = empty_runtime()
    business, knowledge_state = None, None
    if initial.binding_current:
        current = initial.registration
        business = await tx.scalar(select(Business).where(Business.id == str(current.business_id),
            Business.site_id == current.site_id, Business.canonical_host == current.canonical_host)
            .execution_options(populate_existing=True))
        if not business:
            raise ControlError(503, "invalid_registration_source")
        # Only the actual current Registration establishes this legacy business scope.
        await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": business.id})
        await policy.lock(tx, business.id, settings().environment)
        try:
            value = runtime.model_dump()
            registered = profile.profile_current
            hashes = ({"conversation": profile.admission.conversation_sha256, "quality": profile.admission.quality_sha256}
                if registered else {})
            value.update(scope="current_registered_business", profile_registered=registered, role_instruction_hashes=hashes)
            knowledge_state = await knowledge.current(tx)
            value.update(inspect_registered_knowledge(knowledge_state, business, utcnow()))
            readiness = await onboarding.status(tx, business.site_id)
            authority, _ = await policy.read(tx)
            value.update(source_admitted=bool(readiness.get("source_ready")),
                learning_admitted=bool(readiness.get("learning_admitted")), policy_enabled=authority.enabled,
                policy_paused=authority.paused, followup_enabled=authority.followup_enabled)
            runtime = RuntimeObservationV2.model_validate(value)
        except (ValueError, TypeError, KeyError, AttributeError):
            raise ControlError(503, "invalid_agent_source") from None
    # Refresh exact private payload/Job snapshots before canonical final authority.
    # A concurrent terminal registration/grant revoke discards prior runtime observations.
    revision, review, intake = await revision_observations(tx, creation)
    final = RegistrationView.model_validate(await registrations.projection(tx, session, creation, requested_revision))
    profile = ProfileView.model_validate(await profiles.projection(tx, session, creation, requested_revision,
        registration_identity=registration_identity))
    # No authority/source await follows this observation. TTL keeps advancing even
    # while the exact source rows are locked, so recheck those held bytes now.
    now = utcnow()
    if not final.binding_current:
        runtime = empty_runtime()
    elif (not initial.binding_current or initial.registration != final.registration):
        raise ControlError(409, "registration_changed")
    else:
        value = runtime.model_dump()
        value.update(inspect_registered_knowledge(knowledge_state, business, now))
        registered = profile.profile_current and value["knowledge_state"] == "v2_current"
        value.update(profile_registered=registered, role_instruction_hashes={
            "conversation": profile.admission.conversation_sha256, "quality": profile.admission.quality_sha256
        } if registered else {})
        runtime = RuntimeObservationV2.model_validate(value)
    checks = registration_checks(creation=creation, revision=revision, team_review=review, intake=intake,
        registration=final, runtime=runtime, profile=profile, now=now)
    try:
        return AgentPreparationViewV2(creation_id=creation.id, accepted_revision=creation.current_revision or None,
            candidate_sha256=revision.material_hash if revision else None,
            accepted_source_revision=revision.source_revision if revision else None, canonical_host=creation.canonical_host,
            observed_at=now, team_review=review, registration=final, intake=intake, runtime=runtime, checks=checks,
            blocker_keys=[c.key for c in checks if c.status != "PASS"]).model_dump(mode="json")
    except ValueError:
        raise ControlError(503, "invalid_agent_source") from None
