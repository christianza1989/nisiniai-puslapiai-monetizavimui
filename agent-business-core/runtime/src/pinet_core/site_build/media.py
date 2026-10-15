"""Consume one trusted, byte-bound artifact receipt through the maintained importer.

This is an operator inbox, never browser input or a model/provider dispatcher.
An absent inbox keeps the existing content path and quality gates unchanged.
"""
import hashlib
import json
import os
import re
import stat
from uuid import UUID

from ..control.routes import ControlError
from ..creation import studio

LIMIT = 65536


class PendingAttachment(dict):
    """Exact private inbox bytes; attributes cannot be supplied by JSON fields."""

    def __init__(self, value, path, raw):
        super().__init__(value)
        self.path = path
        self.sha256 = hashlib.sha256(raw).hexdigest()


def _object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def read_next(artifacts, creation_id, revision):
    """Fixed physical case path; never create, delete, rebase or consume a file."""
    try:
        identity = str(UUID(creation_id))
        if type(revision) is not int or not 1 <= revision <= 20:
            raise ValueError("invalid revision")
        root = artifacts.absolute()
        if root.resolve(strict=True) != root or not root.is_dir():
            raise ValueError("nonphysical root")
        target = root
        for part in ("customer-content", identity, f"revision-{revision}", "media-inbox", "next.json"):
            target = target / part
            try:
                observed = target.lstat()
            except FileNotFoundError:
                return None
            if stat.S_ISLNK(observed.st_mode) or target.resolve(strict=True) != target:
                raise ValueError("nonphysical inbox")
            if part != "next.json" and not stat.S_ISDIR(observed.st_mode):
                raise ValueError("non-directory parent")
        if not stat.S_ISREG(observed.st_mode) or not 1 <= observed.st_size <= LIMIT:
            raise ValueError("invalid inbox file")
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0)
        with os.fdopen(os.open(target, flags), "rb") as file:
            opened = os.fstat(file.fileno())
            if not stat.S_ISREG(opened.st_mode) or not os.path.samestat(observed, opened):
                raise ValueError("inbox replaced")
            data = file.read(LIMIT + 1)
            after = os.fstat(file.fileno())
        current = target.lstat()
        if (len(data) != opened.st_size or len(data) > LIMIT
                or opened.st_size != after.st_size or opened.st_mtime_ns != after.st_mtime_ns
                or not os.path.samestat(opened, current) or target.resolve(strict=True) != target):
            raise ValueError("inbox changed")
        value = json.loads(data.decode("utf-8"), object_pairs_hook=_object)
        if (not isinstance(value, dict) or set(value) != {"version", "attachment"}
                or value["version"] != "site-build-media.v1" or not isinstance(value["attachment"], dict)):
            raise ValueError("invalid envelope")
        return PendingAttachment(value["attachment"], target, data)
    except (ValueError, TypeError, OSError, RuntimeError, UnicodeError):
        raise ControlError(503, "site_build_media_inbox_invalid") from None


def acknowledgement(pending, creation, proof, request, *, result=None):
    """A completed operation is history, not a new request after a GUIDE write.

    The caller already holds current owner/Creation authority and accepted proof.
    No current page hash is rebased or treated as approved by this acknowledgement.
    """
    expected = {"version": "site-build-media-ack.v1", "creationId": creation.id,
        "acceptedRevision": proof["accepted_revision"], "candidateSha256": proof["candidate_sha256"],
        "canonicalHost": proof["canonical_host"], "pageId": request.page_id, "inboxSha256": pending.sha256}
    directory = pending.path.parent / "completed"
    target = directory / f"{pending.sha256}.json"
    try:
        if pending.path.parent.resolve(strict=True) != pending.path.parent:
            raise ValueError("nonphysical inbox")
        if result is not None:
            directory.mkdir(mode=0o700, exist_ok=True)
        if not directory.exists():
            return False
        if directory.is_symlink() or directory.resolve(strict=True) != directory or not directory.is_dir():
            raise ValueError("nonphysical acknowledgement directory")
        if target.exists() or target.is_symlink():
            observed = target.lstat()
            if (stat.S_ISLNK(observed.st_mode) or not stat.S_ISREG(observed.st_mode)
                    or target.resolve(strict=True) != target or not 1 <= observed.st_size <= 4096):
                raise ValueError("invalid acknowledgement")
            with target.open("rb") as file:
                opened = os.fstat(file.fileno())
                raw = file.read(4097)
                after = os.fstat(file.fileno())
            if (not os.path.samestat(observed, opened) or not os.path.samestat(opened, target.lstat())
                    or opened.st_size != after.st_size or opened.st_mtime_ns != after.st_mtime_ns
                    or len(raw) > 4096 or target.resolve(strict=True) != target):
                raise ValueError("changed acknowledgement file")
            value = json.loads(raw.decode("utf-8"), object_pairs_hook=_object)
            if (len(raw) != observed.st_size or set(value) != {*expected, "requestHash", "receiptSha256"}
                    or any(value.get(key) != item for key, item in expected.items())
                    or any(not isinstance(value.get(key), str) or not re.fullmatch(r"[a-f0-9]{64}", value[key])
                           for key in ("requestHash", "receiptSha256"))):
                raise ValueError("changed acknowledgement")
            return True
        if result is None:
            return False
        value = {**expected, "requestHash": result["requestHash"], "receiptSha256": result["receiptSha256"]}
        # Exclusive immutable write. A partial crash is retained and fails closed;
        # a later acknowledgement never overwrites another receipt or next.json.
        with target.open("xb") as file:
            file.write(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8"))
            file.flush()
            os.fsync(file.fileno())
        return True
    except (ValueError, TypeError, KeyError, OSError, RuntimeError, UnicodeError):
        raise ControlError(503, "site_build_media_ack_invalid") from None


async def advance(tx, session, creation, proof):
    """Caller owns current actor/Creation locks, source and accepted-proof checks."""
    _, _, artifacts, _ = studio.configuration()
    value = read_next(artifacts, creation.id, creation.current_revision)
    if value is None:
        return None
    from pydantic import ValidationError

    from ..creation.media import MediaAttachment, attach
    try:
        request = MediaAttachment.model_validate(value)
    except ValidationError:
        raise ControlError(503, "site_build_media_inbox_invalid") from None
    if (request.accepted_revision != creation.current_revision
            or request.accepted_revision != proof["accepted_revision"]
            or request.candidate_sha256 != proof["candidate_sha256"]
            or request.canonical_host != proof["canonical_host"]):
        raise ControlError(409, "media_context_stale")
    if acknowledgement(value, creation, proof, request):
        return None
    result = await attach(tx, session, creation.id, request)
    attachment = result["attachment"]
    if type(attachment.get("changed")) is not bool:
        raise ControlError(503, "site_build_media_result_invalid")
    acknowledgement(value, creation, proof, request, result=attachment)
    return {"page_id": request.page_id} if attachment["changed"] else None
