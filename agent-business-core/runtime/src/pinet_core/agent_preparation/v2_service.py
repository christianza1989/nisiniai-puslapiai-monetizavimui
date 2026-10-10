"""Current exact registered business observations; never activate or infer host ownership."""
from types import SimpleNamespace

from sqlalchemy import select, text

from .. import knowledge, onboarding, policy
from ..config import settings
from ..control.routes import ControlError
from ..creation_registration import service as registrations
from ..creation_registration.wire import RegistrationView
from ..models import Business, utcnow
from .service import checks_for, inspect_knowledge, profile_observation, revision_observations
from .v2_wire import AgentPreparationViewV2, RuntimeObservationV2
from .wire import Check


def empty_runtime():
    cfg = settings()
    return RuntimeObservationV2(scope="unmapped", profile_registered=False, role_instruction_hashes={},
        knowledge_state="not_observed", knowledge_revision=None, knowledge_sha256=None, knowledge_refreshed_at=None,
        knowledge_active_page_count=0, source_admitted=None, learning_admitted=None, policy_enabled=None,
        policy_paused=None, followup_enabled=None, smtp_enabled=bool(cfg.smtp_enabled), voice_configured=bool(cfg.voice_ready))


def registration_checks(*, creation, revision, team_review, intake, registration, runtime, now):
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
    return [replacement.get(c.key, c) for c in checks]


async def projection(tx, session, creation, requested_revision=None):
    initial = RegistrationView.model_validate(await registrations.projection(tx, session, creation, requested_revision))
    revision, review, intake = await revision_observations(tx, creation)
    runtime = empty_runtime()
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
            registered, hashes = profile_observation(business)
            value.update(scope="current_registered_business", profile_registered=registered, role_instruction_hashes=hashes)
            value.update(inspect_knowledge(await knowledge.current(tx), business, utcnow()))
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
    if not final.binding_current:
        runtime = empty_runtime()
    elif (not initial.binding_current or initial.registration != final.registration):
        raise ControlError(409, "registration_changed")
    now = utcnow()
    checks = registration_checks(creation=creation, revision=revision, team_review=review, intake=intake,
        registration=final, runtime=runtime, now=now)
    try:
        return AgentPreparationViewV2(creation_id=creation.id, accepted_revision=creation.current_revision or None,
            candidate_sha256=revision.material_hash if revision else None,
            accepted_source_revision=revision.source_revision if revision else None, canonical_host=creation.canonical_host,
            observed_at=now, team_review=review, registration=final, intake=intake, runtime=runtime, checks=checks,
            blocker_keys=[c.key for c in checks if c.status != "PASS"]).model_dump(mode="json")
    except ValueError:
        raise ControlError(503, "invalid_agent_source") from None
