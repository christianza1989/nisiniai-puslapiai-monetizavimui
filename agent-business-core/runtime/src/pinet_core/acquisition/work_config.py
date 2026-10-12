"""Purpose-specific, private local work registration; never reuse native capture keys."""

import hashlib
import hmac
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, ValidationError, field_validator, model_validator
from sqlalchemy import text

from ..config import settings
from ..control.routes import ControlError
from . import normal_config
from .correspondence import Correspondence
from .interfaces import NoExternalSend, OpaqueId, Scope, Wire
from .work_schema import TABLES

MAX_BODY_BYTES = 65536


class Entry(Wire):
    scope: Scope
    adapter_id: OpaqueId
    inbound_key_id: OpaqueId
    inbound_secret: SecretStr
    permissions: tuple[Literal["inbound-capture"], ...]

    @field_validator("inbound_secret")
    @classmethod
    def secret(cls, value):
        if (
            not re.fullmatch(r"[a-f0-9]{64,2048}", value.get_secret_value())
            or len(value.get_secret_value()) % 2
        ):
            raise ValueError("inbound_key_invalid")
        return value

    @model_validator(mode="after")
    def local_only(self):
        if self.scope.environment_class != "test" or self.permissions != ("inbound-capture",):
            raise ValueError("inbound_test_permission_required")
        return self


class Registration(NoExternalSend):
    work_version: Literal["acquisition-work.v1"] = "acquisition-work.v1"
    entries: tuple[Entry, ...] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def unique(self):
        ids = [entry.inbound_key_id for entry in self.entries]
        scopes = [(entry.scope, entry.adapter_id) for entry in self.entries]
        secrets = [entry.inbound_secret.get_secret_value() for entry in self.entries]
        if len(set(ids)) != len(ids) or len(set(scopes)) != len(scopes) or len(set(secrets)) != len(secrets):
            raise ValueError("duplicate_work_registration")
        return self


def read_registration(cfg):
    if not cfg.acquisition_work_enabled:
        raise ValueError("acquisition_work_disabled")
    capture, capture_hash = normal_config.read_registration(cfg)
    path = Path(cfg.acquisition_work_config)
    if (
        not path.is_absolute()
        or not path.resolve().is_relative_to(normal_config.ROOT / "artifacts")
        or path.is_symlink()
        or any(parent.is_symlink() for parent in path.parents)
        or not path.is_file()
        or path.stat().st_size > 1048576
    ):
        raise ValueError("private_work_registration_required")
    raw = path.read_bytes()
    try:
        registration = Registration.model_validate_json(raw)
        native = {(entry.scope, entry.adapter_id) for entry in capture.entries}
        ids = {key for entry in capture.entries for key in (entry.transport_key_id, entry.recipient_key_id)}
        keys = {
            key.get_secret_value()
            for entry in capture.entries
            for key in (entry.transport_secret, entry.recipient_secret)
        }
        if any(
            (entry.scope, entry.adapter_id) not in native
            or entry.inbound_key_id in ids
            or entry.inbound_secret.get_secret_value() in keys
            for entry in registration.entries
        ):
            raise ValueError()
    except (ValidationError, ValueError):
        raise ValueError("invalid_work_registration") from None
    return registration, hashlib.sha256(raw + capture_hash.encode("ascii")).hexdigest()


def signing_input(path, raw, timestamp, key_id):
    if (
        not re.fullmatch(r"/[A-Za-z0-9_/-]+", path)
        or not re.fullmatch(r"[0-9]{1,12}", timestamp)
        or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", key_id)
        or len(raw) > MAX_BODY_BYTES
    ):
        raise ValueError("inbound_signed_target_invalid")
    return (
        f"acquisition-work.v1\nPOST\n{path}\n{timestamp}\n{key_id}\n{hashlib.sha256(raw).hexdigest()}".encode(
            "ascii"
        )
    )


def sign_request(entry, path, raw, timestamp):
    value = signing_input(path, raw, str(timestamp), entry.inbound_key_id)
    signature = hmac.new(
        bytes.fromhex(entry.inbound_secret.get_secret_value()), value, hashlib.sha256
    ).hexdigest()
    return {
        "X-Acq-Work-Key-Id": entry.inbound_key_id,
        "X-Acq-Work-Timestamp": str(timestamp),
        "X-Acq-Work-Signature": "v1=" + signature,
        "Content-Type": "application/json",
    }


def verify_request(registration, headers, path, raw, now, value):
    lower = {key.lower(): item for key, item in headers.items()}
    key_id, stamp, signature = (
        lower.get(key, "") for key in ("x-acq-work-key-id", "x-acq-work-timestamp", "x-acq-work-signature")
    )
    material = signing_input(path, raw, stamp, key_id)
    entry = next((entry for entry in registration.entries if entry.inbound_key_id == key_id), None)
    if (
        not entry
        or entry.scope != value.scope
        or entry.adapter_id != value.adapter_id
        or abs(now - int(stamp)) > 300
        or not re.fullmatch(r"v1=[a-f0-9]{64}", signature)
    ):
        raise ValueError("inbound_auth_denied")
    expected = hmac.new(
        bytes.fromhex(entry.inbound_secret.get_secret_value()), material, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature[3:]):
        raise ValueError("inbound_auth_denied")


async def start(app, database):
    app.state.acquisition_correspondence = None
    cfg = settings()
    if not cfg.acquisition_work_enabled:
        return
    registration, digest = read_registration(cfg)
    async with database.registry() as tx:
        rows = (
            await tx.execute(
                text("""SELECT relname,relrowsecurity,relforcerowsecurity,
          has_table_privilege(current_user,oid,'SELECT'),has_table_privilege(current_user,oid,'INSERT'),
          has_table_privilege(current_user,oid,'UPDATE'),has_table_privilege(current_user,oid,'DELETE')
          FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(:tables)"""),
                {"tables": list(TABLES)},
            )
        ).all()
        if len(rows) != len(TABLES) or any(
            tuple(row[1:]) != (True, True, True, True, row[0] in TABLES[:2], False) for row in rows
        ):
            raise RuntimeError("correspondence_requires_complete_restricted_rls_storage")
    app.state.acquisition_work_sha256 = digest
    app.state.acquisition_work_registration = registration
    app.state.acquisition_correspondence = Correspondence(database)


def ready(app):
    try:
        registration, digest = read_registration(settings())
        if digest != app.state.acquisition_work_sha256 or app.state.acquisition_correspondence is None:
            raise ValueError()
        return registration
    except (ValueError, OSError, AttributeError):
        raise ControlError(503, "acquisition_work_unavailable") from None


def clock_seconds():
    return int(datetime.now(UTC).timestamp())
