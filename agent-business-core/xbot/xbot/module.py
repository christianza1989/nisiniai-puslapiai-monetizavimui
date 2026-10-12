"""Pure server-side module contract. The caller authenticates through maintained core.

No HTTP customer endpoint accepts these authorities. Resolver must reobserve the
current grant/registration/profile/knowledge under core's lock order on each call.
"""

import inspect
import time
from dataclasses import dataclass
from typing import Literal

from pydantic import Field, model_serializer

from .contracts import Strict
from .source_facts import manifest_hash, validate_manifest
from .store import Conflict, fingerprint


class KnowledgeRef(Strict):
    schema_version: Literal[2] = 2
    knowledge_revision: int = Field(ge=1, strict=True)
    knowledge_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    deployment_id: str = Field(min_length=1, max_length=100)


class Binding(Strict):
    organization_id: str = Field(min_length=1, max_length=100)
    business_id: str = Field(min_length=1, max_length=100)
    environment_id: str = Field(min_length=1, max_length=100)
    site_id: str = Field(pattern=r"^[a-z][a-z0-9-]{1,63}$")
    registration_id: str = Field(min_length=1, max_length=100)
    admission_id: str = Field(min_length=1, max_length=100)
    accepted_revision: int = Field(ge=1, strict=True)
    candidate_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    accepted_source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    execution_source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    instruction_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    knowledge_ref: KnowledgeRef
    index_receipt_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    facts_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    source_fact_manifest_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    expires_at: float = Field(gt=0)
    profile_current: bool = Field(strict=True)
    module_admitted: bool = Field(strict=True)

    @model_serializer(mode="wrap")
    def preserve_legacy_shape(self, handler):
        result = handler(self)
        if self.source_fact_manifest_sha256 is None:
            result.pop("source_fact_manifest_sha256", None)
        return result


@dataclass(frozen=True)
class Authority:
    """Constructed by authenticated backend, never parsed from customer JSON."""

    organization_id: str
    business_id: str
    environment_id: str
    site_id: str
    capabilities: frozenset[str]


class Command(Strict):
    schema_version: Literal["xbot.v1"] = "xbot.v1"
    request_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{16,100}$")
    expected_revision: int = Field(ge=1, strict=True)
    action: Literal["enable", "pause"]


class Manifest(Strict):
    schema_version: Literal["xbot.v1"] = "xbot.v1"
    module_id: Literal["xbot"] = "xbot"
    version: Literal["0.2.0"] = "0.2.0"
    panels: list[str] = ["overview", "queue", "research", "budget", "evidence"]
    local_capabilities: list[str] = ["plan", "draft", "review", "schedule", "qualify", "summary", "media-import"]
    channel_capabilities: list[str] = ["research", "mentions", "metrics", "post", "thread", "media", "reply", "dm"]
    default_enabled: Literal[False] = False
    grants_live_authority: Literal[False] = False
    auth_owner: Literal["pinet-core"] = "pinet-core"
    crm_owner: Literal["pinet-core"] = "pinet-core"


class Usage(Strict):
    currency: Literal["USD"] = "USD"
    actual_micro: int = Field(ge=0)
    held_micro: int = Field(ge=0)
    unknown_receipts: int = Field(ge=0)
    provider_attempts: int = Field(ge=0)
    model_attempts_reserved: int = Field(ge=0)
    period: Literal["store_lifetime"] = "store_lifetime"
    model_known_usage_receipts: int = Field(ge=0)
    model_unknown_usage_receipts: int = Field(ge=0)
    model_reserved_calls_without_known_usage: int = Field(ge=0)
    model_token_usage: dict[str, int]
    model_cost_verified: Literal[False] = False
    daily_cap_micro: int = Field(ge=0)
    monthly_cap_micro: int = Field(ge=0)


class Snapshot(Strict):
    schema_version: Literal["xbot.v1"] = "xbot.v1"
    module_id: Literal["xbot"] = "xbot"
    business_id: str
    environment_id: str
    site_id: str
    revision: int
    observed_at: float
    state: Literal["disabled", "paused", "ready", "running", "blocked"]
    blockers: list[str]
    queue_counts: dict[str, int]
    current_operation: str | None
    research_count: int
    research_latest_at: float | None
    research_sources: list[str]
    usage: Usage
    evidence: Binding | None
    credential_ref: str
    channel_activation: Literal["not_performed_by_module_command"] = "not_performed_by_module_command"


class ModuleAdapter:
    """Synchronous standalone adapter; maintained async core uses AsyncModuleAdapter."""

    def __init__(self, service, resolver):
        self.service, self.store, self.resolver = service, service.store, resolver
        self.service.context_validator = self.check_profile
        self.service.async_context_validator = None

    def bind(self, authority, public_profile, expected_revision):
        """Backend supplies a current approved public projection, never customer intake."""
        if "xbot.configure" not in authority.capabilities:
            raise Conflict("module_scope_forbidden")
        fresh = Binding.model_validate(self.resolver(authority))
        return self._bind(authority, public_profile, expected_revision, fresh)

    def _bind(self, authority, public_profile, expected_revision, fresh):
        if (fresh.organization_id, fresh.business_id, fresh.environment_id, fresh.site_id) != (
            authority.organization_id,
            authority.business_id,
            authority.environment_id,
            authority.site_id,
        ):
            raise Conflict("module_scope_forbidden")
        from .contracts import Profile

        profile = Profile.model_validate(public_profile)
        if (
            profile.site_id != authority.site_id
            or fingerprint(profile.facts) != fresh.facts_sha256
            or manifest_hash(profile.source_fact_manifest) != fresh.source_fact_manifest_sha256
            or not fresh.profile_current
            or fresh.expires_at <= time.time()
        ):
            raise Conflict("core_facts_or_scope_changed")
        payload = {
            **profile.model_dump(),
            "business_id": fresh.business_id,
            "environment_id": fresh.environment_id,
            "source_binding": fresh.model_dump(),
            "enabled": False,
            "paused": True,
            "live_read": False,
            "live_write": False,
            "auto_publish": False,
            "reply_enabled": False,
            "dm_enabled": False,
            "media_enabled": False,
        }
        return self.store.update_profile(
            payload, expected_revision, "Authenticated core current public projection", module_bind=True
        )

    def check_profile(self, profile):
        stored = Binding.model_validate(profile["source_binding"])
        authority = Authority(
            stored.organization_id, stored.business_id, stored.environment_id, stored.site_id, frozenset()
        )
        fresh = Binding.model_validate(self.resolver(authority))
        self.validate_profile(profile, fresh)

    @staticmethod
    def validate_profile(profile, fresh):
        stored = Binding.model_validate(profile["source_binding"])
        if fresh != stored or not fresh.profile_current or not fresh.module_admitted or fresh.expires_at <= time.time():
            raise Conflict("core_source_or_admission_changed")
        if (profile["business_id"], profile["environment_id"], profile["site_id"]) != (
            fresh.business_id,
            fresh.environment_id,
            fresh.site_id,
        ) or fingerprint(profile["facts"]) != fresh.facts_sha256:
            raise Conflict("core_facts_or_scope_changed")
        manifest = profile.get("source_fact_manifest")
        if manifest_hash(manifest) != fresh.source_fact_manifest_sha256:
            raise Conflict("core_source_fact_manifest_changed")
        if manifest is not None:
            validate_manifest(profile["facts"], manifest)

    def scoped(self, authority, permission="xbot.read"):
        if permission not in authority.capabilities:
            raise Conflict("module_scope_forbidden")
        current = self.store.profile(authority.site_id)
        p = current["profile"]
        binding = Binding.model_validate(p["source_binding"]) if p["source_binding"] else None
        if not binding or (binding.organization_id, p["business_id"], p["environment_id"], p["site_id"]) != (
            authority.organization_id,
            authority.business_id,
            authority.environment_id,
            authority.site_id,
        ):
            raise Conflict("module_scope_forbidden")
        return current

    def snapshot(self, authority):
        current = self.scoped(authority)
        p = current["profile"]
        blockers = []
        try:
            self.check_profile(p)
        except (ValueError, KeyError):
            blockers.append("core_source_or_admission_changed")
        return self._snapshot(authority, current, blockers)

    def _snapshot(self, authority, current, blockers):
        p = current["profile"]
        if not self.service.config.codex_enabled:
            blockers.append("codex_generation_disabled")
        jobs = self.store.jobs(authority.site_id)
        records = self.store.records(authority.site_id, limit=1000)
        counts = {}
        with self.store.tx() as tx:
            counts = dict(
                tx.execute("SELECT state,COUNT(*) FROM jobs WHERE site=? GROUP BY state", (authority.site_id,))
            )
            reserved = tx.execute(
                "SELECT COALESCE(SUM(calls),0) FROM model_reservations WHERE site=?", (authority.site_id,)
            ).fetchone()[0]
            research_count = tx.execute(
                "SELECT COUNT(*) FROM records WHERE site=? AND kind='signal'", (authority.site_id,)
            ).fetchone()[0]
            attempts = tx.execute(
                "SELECT COUNT(*) FROM records WHERE site=? AND kind='dispatch'", (authority.site_id,)
            ).fetchone()[0]
            spent = tx.execute(
                "SELECT COALESCE(SUM(actual),0),COALESCE(SUM(CASE WHEN state IN ('reserved','unknown') THEN reserved ELSE 0 END),0),SUM(CASE WHEN state IN ('reserved','unknown') THEN 1 ELSE 0 END) FROM spend WHERE site=?",
                (authority.site_id,),
            ).fetchone()
        model_usage = self.store.model_usage_totals(authority.site_id)
        research = [r for r in records if r["kind"] == "signal"]
        running = next((j for j in jobs if j["state"] == "running"), None)
        if counts.get("uncertain", 0):
            blockers.append("unresolved_provider_outcome")
        state = (
            "disabled"
            if not p["enabled"]
            else "paused"
            if p["paused"]
            else "blocked"
            if blockers
            else "running"
            if running
            else "ready"
        )
        return Snapshot(
            business_id=p["business_id"],
            environment_id=p["environment_id"],
            site_id=p["site_id"],
            revision=current["revision"],
            observed_at=time.time(),
            state=state,
            blockers=blockers,
            queue_counts=counts,
            current_operation=running["kind"] if running else None,
            research_count=research_count,
            research_latest_at=max((r["created"] for r in research), default=None),
            research_sources=sorted({r["payload"].get("source", "unverified") for r in research}),
            usage=Usage(
                actual_micro=spent[0],
                held_micro=spent[1],
                unknown_receipts=spent[2] or 0,
                provider_attempts=attempts,
                model_attempts_reserved=reserved,
                model_known_usage_receipts=model_usage["known_receipts"],
                model_unknown_usage_receipts=model_usage["unknown_receipts"],
                model_reserved_calls_without_known_usage=max(0, reserved - model_usage["known_receipts"]),
                model_token_usage=model_usage["usage"],
                daily_cap_micro=p["daily_cap_micro"],
                monthly_cap_micro=p["monthly_cap_micro"],
            ),
            evidence=Binding.model_validate(p["source_binding"]),
            credential_ref=p["credential_ref"],
        )

    def command(self, authority, command):
        command = Command.model_validate(command)
        self.scoped(authority, "xbot.control")
        return self._command(authority, command, self.check_profile)

    def _command(self, authority, command, validate_profile):
        key = command.request_id
        request_hash = fingerprint(
            {
                "authority": [
                    authority.organization_id,
                    authority.business_id,
                    authority.environment_id,
                    authority.site_id,
                ],
                "command": command.model_dump(),
            }
        )
        with self.store.tx() as tx:
            old = tx.execute(
                "SELECT payload FROM records WHERE site=? AND kind='module_command' AND key=?", (authority.site_id, key)
            ).fetchone()
            if old:
                import json

                value = json.loads(old[0])
                if value["request_hash"] != request_hash:
                    raise Conflict("module_request_id_conflict")
                return value["result"]
            # Recheck inside the module transaction; core holds its authority locks outside it.
            current = self.store.profile(authority.site_id, tx)
            if current["revision"] != command.expected_revision:
                raise Conflict("policy_revision_conflict")
            if command.action == "enable":
                validate_profile(current["profile"])
                if not self.service.config.codex_enabled:
                    raise Conflict("codex_generation_disabled")
                if any(
                    current["profile"][k]
                    for k in ("live_read", "live_write", "auto_publish", "reply_enabled", "dm_enabled", "media_enabled")
                ):
                    raise Conflict("module_enable_is_local_only")
                if tx.execute(
                    "SELECT COUNT(*) FROM jobs WHERE site=? AND state='uncertain'", (authority.site_id,)
                ).fetchone()[0]:
                    raise Conflict("unresolved_provider_outcome")
            # Atomic command receipt + revision. No duplicate command can advance twice.
            p = {
                **current["profile"],
                "enabled": True if command.action == "enable" else current["profile"]["enabled"],
                "paused": command.action == "pause",
            }
            import json

            revision = current["revision"] + 1
            tx.execute(
                "UPDATE profiles SET payload=?,revision=? WHERE site=?", (json.dumps(p), revision, authority.site_id)
            )
            tx.execute("UPDATE jobs SET review_hash=NULL WHERE site=? AND state='queued'", (authority.site_id,))
            result = {
                "schema_version": "xbot.v1",
                "request_id": key,
                "revision": revision,
                "state": "paused" if p["paused"] else "ready",
                "live_activation": False,
            }
            self.store.record(
                authority.site_id, "module_command", key, {"request_hash": request_hash, "result": result}, tx
            )
            return result


class AsyncModuleAdapter(ModuleAdapter):
    """Awaited server resolver(authority, permission) -> fresh Binding.

    The resolver owns current session/worker grants, Registration/Profile/V2 and
    module admission. It must finish/release core transactions before returning;
    no authority or ProfileView is cached here between operations.
    """

    def __init__(self, service, resolver):
        self.service, self.store, self.resolver = service, service.store, resolver
        self.service.context_validator = None
        self.service.async_context_validator = self.check_profile

    async def resolve(self, authority, permission):
        try:
            result = self.resolver(authority, permission)
            if not inspect.isawaitable(result):
                raise Conflict("async_core_resolver_required")
            fresh = Binding.model_validate(await result)
        except Exception:
            # Backend errors must not reveal raw PG/session/provider data.
            raise Conflict("core_authority_or_source_unavailable") from None
        if (fresh.organization_id, fresh.business_id, fresh.environment_id, fresh.site_id) != (
            authority.organization_id,
            authority.business_id,
            authority.environment_id,
            authority.site_id,
        ):
            raise Conflict("module_scope_forbidden")
        return fresh

    async def bind(self, authority, public_profile, expected_revision):
        if "xbot.configure" not in authority.capabilities:
            raise Conflict("module_scope_forbidden")
        fresh = await self.resolve(authority, "xbot.configure")
        return self._bind(authority, public_profile, expected_revision, fresh)

    async def check_profile(self, profile):
        stored = Binding.model_validate(profile["source_binding"])
        authority = Authority(
            stored.organization_id, stored.business_id, stored.environment_id, stored.site_id, frozenset()
        )
        fresh = await self.resolve(authority, "xbot.execute")
        self.validate_profile(profile, fresh)

    async def snapshot(self, authority):
        current = self.scoped(authority)
        fresh = await self.resolve(authority, "xbot.read")
        if self.scoped(authority) != current:
            raise Conflict("context_changed_during_resolution")
        blockers = []
        try:
            self.validate_profile(current["profile"], fresh)
        except Conflict:
            # Authority was freshly accepted; changed source is visible as blocked.
            blockers.append("core_source_or_admission_changed")
        return self._snapshot(authority, current, blockers)

    async def command(self, authority, command):
        command = Command.model_validate(command)
        current = self.scoped(authority, "xbot.control")
        fresh = await self.resolve(authority, "xbot.control")
        if command.action == "enable":
            self.validate_profile(current["profile"], fresh)
        # No awaits/PG callbacks inside the atomic local command transaction.
        return self._command(authority, command, lambda profile: self.validate_profile(profile, fresh))


def export_schemas(directory):
    import json
    from pathlib import Path

    root = Path(directory)
    root.mkdir(parents=True, exist_ok=True)
    for name, model in {"manifest": Manifest, "snapshot": Snapshot, "command": Command, "binding": Binding}.items():
        (root / f"{name}.schema.json").write_text(
            json.dumps(model.model_json_schema(), indent=2) + "\n", encoding="utf-8"
        )
