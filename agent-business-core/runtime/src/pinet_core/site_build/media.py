"""Consume one trusted, byte-bound artifact receipt through the maintained importer.

This is an operator inbox, never browser input or a model/provider dispatcher.
An absent inbox keeps the existing content path and quality gates unchanged.
"""
import json
import os
import stat
from uuid import UUID

from ..control.routes import ControlError
from ..creation import studio

LIMIT = 65536


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
        return value["attachment"]
    except (ValueError, TypeError, OSError, RuntimeError, UnicodeError):
        raise ControlError(503, "site_build_media_inbox_invalid") from None


async def advance(tx, session, creation):
    """At most one real attachment; replay delegates to its retained native receipt."""
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
    result = await attach(tx, session, creation.id, request)
    attachment = result["attachment"]
    if type(attachment.get("changed")) is not bool:
        raise ControlError(503, "site_build_media_result_invalid")
    return {"page_id": request.page_id} if attachment["changed"] else None
