"""Read an anchored private native case; never reimport, write or admit work.

The private-preview owner/source state machine supplies the trusted historical
anchor and current authority callback. Historical receipts are evidence only.
Public initial intake/replay and explicit current-source S6 stay unchanged.
"""
import hashlib
import re
from datetime import UTC, datetime
from uuid import UUID

from ..control.routes import ControlError
from ..tasks.codex_transport import RunnerError
from . import studio
from .service import digest

VERSION = "private-native-continuity.v1"
MARKER_VERSION = "private-native-anchor.v1"
TRANSPORT = {"manifestPath", "dataDir", "outputDir", "replayed", "workflow"}
MARKER_KEYS = {"version", "recovery_id", "receipt_id", "context_sha256", "intake_sha256", "manifest_sha256", "observer_sha256"}
AUTHORITY = {"import", "generation", "sourceVerification", "mediaVerification", "editorialReview", "approval",
             "release", "deployment", "channelActivation"}


def observer_sha256():
    script = studio.ROOT / "content-studio/scripts/customer-private-native-continuity.mjs"
    if not script.is_file() or script.is_symlink():
        raise ControlError(503, "private_continuity_unavailable")
    return hashlib.sha256(script.read_bytes()).hexdigest()


def manifest_hash(intake):
    if not isinstance(intake, dict) or "nativeContinuity" in intake:
        raise ControlError(503, "invalid_private_intake_source")
    return digest({k: v for k, v in intake.items() if k not in TRANSPORT})


def checked_marker(value):
    try:
        if not isinstance(value, dict) or set(value) != MARKER_KEYS or value["version"] != MARKER_VERSION:
            raise ValueError("exact anchor marker required")
        for key in ("recovery_id", "receipt_id"):
            if str(UUID(value[key])) != value[key]:
                raise ValueError("canonical UUID required")
        for key in MARKER_KEYS - {"version", "recovery_id", "receipt_id"}:
            if not isinstance(value[key], str) or not re.fullmatch(r"[a-f0-9]{64}", value[key]):
                raise ValueError("anchor digest required")
        return value
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_private_intake_source") from None


def check_recorded(value, marker, context):
    """Strict additive receipt marker; does not grant authority from history."""
    checked_marker(marker)
    try:
        note = value["nativeContinuity"]
        fields = {"version", "anchor", "observed_at", "source_draft_sha256", "intake_context_sha256",
                  "manifest_sha256", "site_sha256", "assets_sha256", "native_state"} | AUTHORITY
        observed_at = datetime.fromisoformat(note["observed_at"])
        if (not isinstance(note, dict) or set(note) != fields or note["version"] != VERSION
                or note["anchor"] != marker or note["native_state"] != "private-v2"
                or note["source_draft_sha256"] != context["accepted"]["candidate_sha256"]
                or note["intake_context_sha256"] != value["requestHash"]
                or note["manifest_sha256"] != marker["manifest_sha256"]
                or value["importerHash"] != context["native_sources"]["importer_sha256"]
                or value["replayed"] is not True or any(note[k] != "not-performed" for k in AUTHORITY)
                or observed_at.tzinfo is None or observed_at.utcoffset() != UTC.utcoffset(observed_at)
                or observed_at > datetime.now(UTC)
                or not isinstance(note["site_sha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", note["site_sha256"])
                or not isinstance(note["assets_sha256"], dict) or len(note["assets_sha256"]) > 2000):
            raise ValueError("exact readonly native observation required")
        site_id = "creation-" + context["creation_id"].replace("-", "")
        for path, sha in note["assets_sha256"].items():
            if (not isinstance(path, str) or not re.fullmatch(r"/content-assets/" + re.escape(site_id) + r"/[a-zA-Z0-9._-]+\.(webp|avif)", path)
                    or not isinstance(sha, str) or not re.fullmatch(r"[a-f0-9]{64}", sha)):
                raise ValueError("exact case media digest required")
        return note
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_private_intake_source") from None


async def observe(*, context, anchor_intake, still_authorized, seconds=20):
    """One fixed read-only Node invocation, outside SQL; no importer fallback."""
    marker = checked_marker(context["continuity"])
    if (digest(anchor_intake) != marker["intake_sha256"] or manifest_hash(anchor_intake) != marker["manifest_sha256"]
            or observer_sha256() != marker["observer_sha256"]):
        raise RunnerError("private_continuity_anchor_changed")
    node, _, artifacts, environment = studio.configuration()
    script = studio.ROOT / "content-studio/scripts/customer-private-native-continuity.mjs"
    identity, accepted = context["creation_id"], context["accepted"]
    directory = artifacts / "customer-content" / identity / f"revision-{accepted['accepted_revision']}"
    payload = {"version": "private-native-continuity-request.v1", "creationId": identity,
        "acceptedRevision": accepted["accepted_revision"], "sourceHash": accepted["candidate_sha256"],
        "canonicalHost": context["native_host"], "artifactsRoot": str(artifacts),
        "dataDir": str(directory / "data"), "outputDir": str(directory / "output"),
        "anchorIntake": anchor_intake, "anchor": marker}
    value = await studio._execute([node, script], payload, environment, still_authorized, min(20, seconds))
    try:
        if not isinstance(value, dict) or {k: v for k, v in value.items() if k not in {"workflow", "replayed", "nativeContinuity"}} != {
                k: v for k, v in anchor_intake.items() if k not in {"workflow", "replayed"}}:
            raise ValueError("original intake fields must be unchanged")
        workflow = value["workflow"]
        if (workflow["siteId"] != anchor_intake["siteId"] or workflow["canonicalHost"] != context["native_host"]
                or workflow["workflowVersion"] != 1 or workflow["deployment"] != "not-verified-by-studio"
                or observer_sha256() != marker["observer_sha256"]):
            raise ValueError("exact current private workflow required")
        check_recorded(value, marker, context)
    except (ValueError, TypeError, KeyError, ControlError):
        raise RunnerError("private_continuity_invalid") from None
    return value
