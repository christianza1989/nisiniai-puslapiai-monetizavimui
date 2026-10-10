"""An explicit public allowlist and revision/proof validation; never serialize ORM rows."""
import hashlib
import json
from datetime import UTC, datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..customer.service import host
from ..models import utcnow


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


def aware(value):
    if value is not None and value.tzinfo is None:
        raise ValueError("Timezone required")
    return value


def public_url(value):
    url = urlsplit(value)
    if url.scheme != "https" or url.username or url.password or url.port not in {None, 443} or url.query or url.fragment:
        raise ValueError("Reviewed public HTTPS URL without parameters required")
    host(url.hostname or "")
    if any(ord(c) < 33 for c in value) or "\\" in value:
        raise ValueError("Invalid URL")
    return value


class Automation(Strict):
    name: str = Field(min_length=1, max_length=160)
    status: Literal["planned", "testing", "verified", "paused", "unknown", "stale"]
    checked_at: datetime | None
    expires_at: datetime | None
    _aware = field_validator("checked_at", "expires_at")(aware)


class Image(Strict):
    src: str = Field(max_length=1024)
    alt: str = Field(min_length=1, max_length=240)
    width: int = Field(ge=1, le=10000)
    height: int = Field(ge=1, le=10000)
    credit: str | None = Field(max_length=500)
    checked_at: datetime
    _aware = field_validator("checked_at")(aware)

    @field_validator("src")
    @classmethod
    def safe_src(cls, value):
        if value.startswith(("/images/", "/assets/")):
            if ".." in value or "\\" in value or "?" in value or "#" in value or "%" in value or any(ord(c) < 33 for c in value):
                raise ValueError("Unsafe asset path")
            return value
        return public_url(value)


class Draft(Strict):
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{0,79}$")
    display_name: str = Field(min_length=1, max_length=160)
    canonical_host: str = Field(max_length=253)
    sector: str | None = Field(max_length=160)
    relationship: Literal["own_project", "permitted_client_case"]
    website_stage: Literal["registered", "published", "unavailable", "unverified"]
    automation_stage: Literal["planned", "testing", "installed", "verified", "paused", "unknown", "stale"]
    public_summary: str = Field(min_length=1, max_length=1000)
    public_automations: list[Automation] = Field(max_length=8)
    evidence_urls: list[str] = Field(max_length=8)
    checked_at: datetime | None
    image: Image | None
    _aware = field_validator("checked_at")(aware)
    _host = field_validator("canonical_host")(host)

    @field_validator("evidence_urls")
    @classmethod
    def urls(cls, value):
        return [public_url(v) for v in value]

    @model_validator(mode="after")
    def review_assets(self):
        if self.image and self.image.src.startswith("https://") and urlsplit(self.image.src).hostname != self.canonical_host:
            raise ValueError("Remote image must belong to the reviewed project host")
        if len({a.name for a in self.public_automations}) != len(self.public_automations):
            raise ValueError("Scenario names must be unique")
        return self


class Permission(Strict):
    relationship: Literal["own_project", "permitted_client_case"]
    reference: str = Field(min_length=10, max_length=2000)


class Proof(Strict):
    name: str = Field(min_length=1, max_length=160)
    status: Literal["published", "unavailable", "installed", "verified", "testing", "paused"]
    environment: Literal["local", "test", "production"]
    checked_at: datetime
    expires_at: datetime
    reference: str = Field(min_length=10, max_length=2000)
    public_url: str | None
    _aware = field_validator("checked_at", "expires_at")(aware)

    @field_validator("public_url")
    @classmethod
    def url(cls, value):
        return public_url(value) if value else None

    @model_validator(mode="after")
    def dates(self):
        if self.expires_at <= self.checked_at or self.checked_at > utcnow():
            raise ValueError("Invalid proof date")
        return self


class Evidence(Strict):
    publication: Permission
    website: Proof | None
    automations: list[Proof] = Field(max_length=8)


def revision(payload, evidence, publish_at):
    material = {"project": Draft.model_validate(payload).model_dump(mode="json"),
                "evidence": Evidence.model_validate(evidence).model_dump(mode="json"),
                "publish_at": publish_at.astimezone(UTC).isoformat()}
    return hashlib.sha256(json.dumps(material, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def validate_approval(payload, private):
    project, evidence, now = Draft.model_validate(payload), Evidence.model_validate(private), utcnow()
    if project.relationship != evidence.publication.relationship:
        raise ValueError("Publication relationship mismatch")
    if project.checked_at and project.checked_at > now:
        raise ValueError("Future project check")
    if project.image and project.image.checked_at > now:
        raise ValueError("Future image check")
    if project.website_stage in {"published", "unavailable"}:
        proof = evidence.website
        if (not proof or proof.environment != "production" or proof.status != project.website_stage
                or not proof.public_url or urlsplit(proof.public_url).hostname != project.canonical_host
                or proof.expires_at <= now):
            raise ValueError("Current production website proof required")
    proofs = {p.name: p for p in evidence.automations}
    for item in project.public_automations:
        if item.status == "verified":
            proof = proofs.get(item.name)
            if (not proof or proof.environment != "production" or proof.status != "verified"
                    or proof.checked_at != item.checked_at or proof.expires_at != item.expires_at
                    or proof.expires_at <= now):
                raise ValueError("Current scenario-specific production proof required")
    if project.automation_stage == "verified" and not any(a.status == "verified" for a in project.public_automations):
        raise ValueError("Verified aggregate needs a verified scenario")
    if project.automation_stage == "installed" and not any(p.status == "installed" and p.environment == "production"
                                                         and p.expires_at > now for p in evidence.automations):
        raise ValueError("Installed aggregate needs current production installation proof")
    return project, evidence


def project_view(row):
    if row.revision_hash != revision(row.public_payload, row.private_evidence, row.publish_at):
        raise ValueError("Material revision mismatch")
    # Revalidate the shape on every read; expired proof is downgraded rather than re-approved.
    project, evidence, now = Draft.model_validate(row.public_payload), Evidence.model_validate(row.private_evidence), utcnow()
    result = project.model_dump(mode="json")
    for scenario, item in zip(project.public_automations, result["public_automations"], strict=True):
        if item["status"] == "verified":
            proof = next((p for p in evidence.automations if p.name == item["name"]), None)
            if (not proof or proof.environment != "production" or proof.status != "verified"
                    or proof.checked_at != scenario.checked_at or proof.expires_at != scenario.expires_at
                    or proof.expires_at <= now):
                item["status"] = "stale"
    if result["automation_stage"] == "verified" and not any(i["status"] == "verified" for i in result["public_automations"]):
        result["automation_stage"] = "stale"
    if result["automation_stage"] == "installed" and not any(p.status == "installed" and p.environment == "production"
                                                            and p.expires_at > now for p in evidence.automations):
        result["automation_stage"] = "stale"
    if result["website_stage"] in {"published", "unavailable"} and (not evidence.website or evidence.website.expires_at <= now):
        result["website_stage"] = "unverified"
    result.update(published_at=row.publish_at.isoformat(), updated_at=row.updated_at.isoformat(),
                  publication_approved=True, approved_revision=row.approved_hash)
    return result
