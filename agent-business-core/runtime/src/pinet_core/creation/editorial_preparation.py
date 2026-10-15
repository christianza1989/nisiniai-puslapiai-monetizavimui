"""Server-owned metadata/link preparation, never an approval or model tool.

Call only with an authenticated current Session in the caller's restricted SQL
transaction. The existing native mutation guard owns source/S6/owner/GUIDE fences.
Fixed native receipts survive uncertain subprocess completion and SQL rollback.
"""
import json
import re
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, JsonValue, ValidationError, model_validator

from ..content_completion.service import parse_node
from ..control.routes import ControlError
from ..tasks.codex_transport import RunnerError
from . import studio
from .media import Hash, native_mutation_guard
from .service import digest

COMMAND = "prepare-editorial"
VERSION = "native-editorial-preparation.v1"
AUTHORITY = ("generation", "sourceVerification", "mediaVerification", "editorialReview", "approval",
             "release", "deployment", "channelActivation", "moduleAdmission")
PageId = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{1,79}$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True, revalidate_instances="always")


class Context(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Hash
    canonical_host: str = Field(min_length=1, max_length=253)


class Status(Context):
    page_id: PageId | None = None


class Contact(Strict):
    email: str = Field(max_length=250)
    phone: str = Field(max_length=80)


class Brand(Strict):
    accent: str = Field(pattern=r"^#[a-fA-F0-9]{6}$")


class SitePatch(Strict):
    name: str | None = Field(default=None, max_length=1000)
    offer: str | None = Field(default=None, max_length=1000)
    audience: str | None = Field(default=None, max_length=1000)
    facts: str | None = Field(default=None, max_length=12000)
    contact: Contact | None = None
    operatorName: str | None = Field(default=None, max_length=300)
    brand: Brand | None = None


class LinkSuggestion(Strict):
    targetPageId: PageId
    label: str = Field(min_length=1, max_length=160)
    reason: str = Field(min_length=1, max_length=500)


class MetadataPatch(Strict):
    type: Literal["home", "service", "product", "guide", "faq", "location", "article", "index",
                  "author", "policy", "about", "contact"] | None = None
    publishAt: str | None = Field(default=None, min_length=1, max_length=40)
    # The existing native V2 schema owns editorial structure/scope validation.
    editorial: dict[str, JsonValue] | None = None
    linkSuggestions: list[LinkSuggestion] | None = Field(default=None, max_length=30)


def exact_json(value):
    """Preserve Python/Node canonical request hashes before any filesystem write."""
    if isinstance(value, float) or type(value) is int and abs(value) > 9007199254740991:
        raise ValueError("exact native JSON numbers required")
    if isinstance(value, dict):
        for key, item in value.items():
            if not key.isascii():
                raise ValueError("ASCII structural keys required")
            exact_json(item)
    elif isinstance(value, list):
        for item in value:
            exact_json(item)


class Preparation(Context):
    action: Literal["amend-site", "amend-page", "resolve-internal-links", "finalize-links"]
    operation_id: str = Field(pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$")
    expected_site_sha256: Hash
    page_id: PageId | None = None
    expected_revision_sha256: Hash | None = None
    expected_planning_sha256: Hash | None = None
    page_ids: list[PageId] | None = Field(default=None, min_length=1, max_length=200)
    patch: dict[str, JsonValue] | None = None

    @model_validator(mode="after")
    def action_scope(self):
        common = {"accepted_revision", "candidate_sha256", "canonical_host", "action", "operation_id",
                  "expected_site_sha256"}
        extra = ({"patch"} if self.action == "amend-site" else {"page_ids"} if self.action == "finalize-links"
                 else {"page_id", "expected_revision_sha256", "expected_planning_sha256"}
                 | ({"patch"} if self.action == "amend-page" else set()))
        if self.model_fields_set != common | extra or any(getattr(self, k) is None for k in extra):
            raise ValueError("exact action fields required")
        if self.page_ids is not None and len(set(self.page_ids)) != len(self.page_ids):
            raise ValueError("unique page IDs required")
        if self.patch is not None:
            (SitePatch if self.action == "amend-site" else MetadataPatch).model_validate(self.patch)
            if not self.patch or any(v is None for v in self.patch.values()):
                raise ValueError("nonempty explicit patch required")
            exact_json(self.patch)
            if len(json.dumps(self.patch, ensure_ascii=False, allow_nan=False).encode()) > 200000:
                raise ValueError("bounded metadata required")
        return self


def checked(identity, request, schema, seconds):
    try:
        if not isinstance(identity, str):
            raise ValueError("creation ID required")
        identity = str(UUID(identity))
        request = schema.model_validate(request)
        if isinstance(seconds, bool) or not isinstance(seconds, (int, float)) or not 0 < seconds <= 20:
            raise ValueError("bounded execution required")
        return identity, request
    except (ValueError, TypeError, ValidationError):
        raise ControlError(400, "invalid_editorial_preparation") from None


async def invoke(tx, session, identity, request, command, extra, seconds, still_authorized):
    guard = native_mutation_guard(tx, session, identity, request, still_authorized=still_authorized,
        unavailable_code="editorial_revision_unavailable", stale_code="editorial_context_stale")
    creation, proof = await guard(lock=True)
    try:
        node, _, artifacts, environment = studio.configuration()
    except RunnerError as error:
        raise ControlError(503, error.code) from None
    script = studio.ROOT / "content-studio/scripts/customer-content-workflow.mjs"
    if not script.is_file():
        raise ControlError(503, "content_completion_unavailable")
    directory = artifacts / "customer-content" / identity / f"revision-{request.accepted_revision}"
    payload = {"command": command, "creationId": identity, "acceptedRevision": request.accepted_revision,
        "sourceHash": request.candidate_sha256, "canonicalHost": request.canonical_host,
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output"),
        **extra}

    async def authorized():
        await guard()
        return True

    try:
        value = await studio._execute([node, script], payload, environment, authorized, seconds)
    except RunnerError as error:
        conflict = {"writer_context_stale", "workflow_context_stale", "workflow_preparation_busy",
                    "workflow_preparation_receipt_conflict", "workflow_preparation_uncertain"}
        raise ControlError(401 if error.code == "authorization_revoked" else
            409 if error.code in conflict else 503, error.code) from None
    creation, proof = await guard()
    return value, parse_node(value, creation, proof), payload, proof


async def status(tx, session, creation_id, request, *, seconds=20, still_authorized=None):
    """Read fixed-case status and optional existing page metadata under the same fence."""
    identity, request = checked(creation_id, request, Status, seconds)
    extra = {"pageId": request.page_id} if request.page_id is not None else {}
    value, completion, _, proof = await invoke(tx, session, identity, request,
        "prepare" if extra else "status", extra, seconds, still_authorized)
    metadata = None
    if extra:
        try:
            page = value["pageData"]
            current = next(p for p in completion["pages"] if p["page_id"] == request.page_id)
            if page["id"] != request.page_id or page["siteId"] != proof["site_id"] or page["type"] != current["type"]:
                raise ValueError("exact page required")
            metadata = {k: page[k] for k in ("type", "publishAt", "editorial", "linkSuggestions")}
            MetadataPatch.model_validate(metadata)
            exact_json(metadata)
            if len(json.dumps(metadata, ensure_ascii=False, allow_nan=False).encode()) > 200000:
                raise ValueError("bounded metadata required")
        except (ValueError, TypeError, KeyError, StopIteration, ValidationError):
            raise ControlError(503, "invalid_editorial_preparation_source") from None
    return {"completion": completion, "page_metadata": metadata}


async def prepare(tx, session, creation_id, request, *, seconds=20, still_authorized=None):
    """Apply/reconcile one immutable operation; never retry or rebase automatically.

    If authorization or transport is lost after a native write, do not report
    success. Reconcile the SAME operation ID and exact request under fresh
    authority; never substitute current hashes or overwrite the first receipt.
    """
    identity, request = checked(creation_id, request, Preparation, seconds)
    extra = {"operationId": request.operation_id, "action": request.action,
             "expectedSiteHash": request.expected_site_sha256}
    for key, native in (("page_id", "pageId"), ("expected_revision_sha256", "expectedRevisionHash"),
                        ("expected_planning_sha256", "expectedPlanningHash"), ("page_ids", "pageIds"), ("patch", "patch")):
        if getattr(request, key) is not None:
            extra[native] = getattr(request, key)
    value, completion, payload, proof = await invoke(tx, session, identity, request, COMMAND, extra,
                                                    seconds, still_authorized)
    binding = {k: v for k, v in payload.items() if k not in {"command", "artifactsRoot", "dataDir", "outputDir"}}
    try:
        operation, result = value["operation"], value["operation"]["result"]
        ids = request.page_ids if request.action == "finalize-links" else [request.page_id] if request.page_id else []
        pages = {p["page_id"]: p for p in completion["pages"]}
        expected = {"version": VERSION, "state": "applied", "operationId": request.operation_id, "creationId": identity,
            "acceptedRevision": request.accepted_revision, "sourceHash": request.candidate_sha256,
            "canonicalHost": request.canonical_host, "siteId": proof["site_id"], "action": request.action,
            "requestHash": digest(binding), "beforeSiteHash": request.expected_site_sha256,
            "appliedSiteHash": completion["site_context_sha256"],
            "pageRevisions": [{"pageId": p, "revisionHash": pages[p]["revision_sha256"],
                               "planningHash": pages[p]["planning_sha256"]} for p in ids],
            **dict.fromkeys(AUTHORITY, "not-performed")}
        hashes = {"beforeEvidenceSha256", "receiptSha256", "plannedSiteSha256"}
        flags = {"changeRequired", "changed", "replayed", "reconciled"}
        if (operation["command"] != COMMAND or operation["deployment"] != "not-performed"
                or not isinstance(result, dict) or set(result) != set(expected) | hashes | flags
                or any(result[k] != v for k, v in expected.items())
                or any(type(result[k]) is not bool for k in flags)
                or any(not isinstance(result[k], str) or not re.fullmatch(r"[a-f0-9]{64}", result[k]) for k in hashes)
                or result["changed"] and not result["changeRequired"]
                or result["reconciled"] and (not result["replayed"] or result["changed"] or not result["changeRequired"])):
            raise ValueError("exact preparation receipt required")
    except (ValueError, TypeError, KeyError, StopIteration):
        raise ControlError(503, "invalid_editorial_preparation_source") from None
    return {"completion": completion, "preparation": result}
