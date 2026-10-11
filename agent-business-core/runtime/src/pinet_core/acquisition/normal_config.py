"""Server-owned local capture registration. No browser scope or ambient key fallback."""

import hashlib
import ipaddress
import re
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from sqlalchemy.engine import make_url

from .interfaces import NoExternalSend, OpaqueId, Scope, Wire
from .ledger import AcquisitionLedger
from .recipient_binding import RecipientKeyGrant
from .routes import CaptureRuntime
from .transport_auth import WEBHOOK_PERMISSIONS, WebhookGrant

ROOT = Path(__file__).resolve().parents[3]


class Entry(Wire):
    scope: Scope
    adapter_id: OpaqueId
    transport_key_id: OpaqueId
    transport_secret: SecretStr
    recipient_key_id: OpaqueId
    recipient_secret: SecretStr
    permissions: tuple[
        Literal[
            "resolve", "events", "capture", "recipient-challenge", "verify-recipient", "retire-recipient"
        ],
        ...,
    ]

    @field_validator("transport_secret", "recipient_secret")
    @classmethod
    def key_bytes(cls, value):
        if (
            not re.fullmatch(r"[a-f0-9]{64,2048}", value.get_secret_value())
            or len(value.get_secret_value()) % 2
        ):
            raise ValueError("capture_key_invalid")
        return value

    @model_validator(mode="after")
    def capture_only(self):
        if self.scope.environment_class != "test" or self.transport_secret == self.recipient_secret:
            raise ValueError("separate_capture_keys_required")
        if not self.permissions or len(set(self.permissions)) != len(self.permissions):
            raise ValueError("capture_permissions_invalid")
        return self


class Registration(NoExternalSend):
    normal_capture_version: Literal["acquisition-normal-capture.v1"] = "acquisition-normal-capture.v1"
    entries: tuple[Entry, ...] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def unique_keys(self):
        ids = [e.transport_key_id for e in self.entries]
        bindings = [(e.scope.business_id, e.scope.environment_id) for e in self.entries]
        if len(set(ids)) != len(ids) or len(set(bindings)) != len(bindings):
            raise ValueError("duplicate_capture_registration")
        return self


def read_registration(cfg):
    if (
        not cfg.acquisition_capture_enabled
        or cfg.control_mode != "local"
        or cfg.smtp_enabled
        or cfg.voice_enabled
    ):
        raise ValueError("normal_capture_unavailable")
    url = make_url(cfg.database_url)
    if (
        url.drivername != "postgresql+asyncpg"
        or not url.host
        or not ipaddress.ip_address(url.host).is_loopback
    ):
        raise ValueError("local_capture_database_required")
    if cfg.environment != "local" and not cfg.environment.startswith("test-"):
        raise ValueError("local_capture_environment_required")
    path = Path(cfg.acquisition_capture_config)
    if not path.is_absolute() or not path.resolve().is_relative_to(ROOT / "artifacts"):
        raise ValueError("private_capture_registration_required")
    if (
        path.is_symlink()
        or any(p.is_symlink() for p in path.parents)
        or not path.is_file()
        or path.stat().st_size > 1048576
    ):
        raise ValueError("private_capture_registration_required")
    raw = path.read_bytes()
    registration = Registration.model_validate_json(raw)
    if any(e.scope.environment_id != cfg.environment for e in registration.entries):
        raise ValueError("capture_environment_mismatch")
    return registration, hashlib.sha256(raw).hexdigest()


def runtime_for(database, registration):
    grants, recipients = {}, {}
    for e in registration.entries:
        grant = WebhookGrant(
            e.transport_key_id,
            bytes.fromhex(e.transport_secret.get_secret_value()),
            e.adapter_id,
            e.scope,
            frozenset(e.permissions),
        )
        assert grant.permissions.issubset(WEBHOOK_PERMISSIONS)
        key = RecipientKeyGrant(
            e.recipient_key_id, bytes.fromhex(e.recipient_secret.get_secret_value()), e.scope, e.adapter_id
        )
        grants[grant.key_id] = grant
        recipients[(e.scope, e.adapter_id, key.key_id)] = key
    return CaptureRuntime(AcquisitionLedger(database, recipients), grants)
