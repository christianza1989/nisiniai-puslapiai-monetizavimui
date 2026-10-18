"""Small bounded private lease ledger; no PID adoption or automatic lock recovery."""
import json
import os
import stat
from pathlib import Path
from uuid import UUID, uuid4

from ..control.routes import ControlError
from ..creation.service import digest
from .live_preview_wire import LeaseView, Start

LIMIT = 64


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


class Store:
    def __init__(self, artifacts):
        self.root = Path(artifacts)
        self.directory = self.root / "customer-live-previews"

    def directory_safe(self, *, create=False):
        if self.root.resolve() != self.root.absolute() or self.root.is_symlink() or not self.root.is_dir():
            raise ControlError(503, "live_preview_store_unavailable")
        try:
            self.directory.lstat()
        except FileNotFoundError:
            if not create:
                return False
            try:
                self.directory.mkdir(mode=0o700)
            except FileExistsError:
                pass
        mode = self.directory.lstat().st_mode
        if not stat.S_ISDIR(mode) or stat.S_ISLNK(mode):
            raise ControlError(503, "live_preview_store_unavailable")
        return True

    def file(self, identity, suffix):
        if str(UUID(identity)) != identity or suffix not in {"request", "ready", "terminal", "heartbeat"}:
            raise ControlError(503, "live_preview_evidence_invalid")
        return self.directory / (identity + "." + suffix + ".json")

    def read(self, file):
        if not self.directory_safe():
            return None
        try:
            info = file.lstat()
        except FileNotFoundError:
            return None
        if file.parent != self.directory or not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_size > 16384:
            raise ControlError(503, "live_preview_evidence_invalid")
        try:
            value = json.loads(file.read_bytes())
            if not isinstance(value, dict):
                raise ValueError("object evidence required")
            return value
        except (ValueError, OSError):
            raise ControlError(503, "live_preview_evidence_invalid") from None

    def exclusive(self, file, value):
        self.directory_safe(create=True)
        raw = canonical(value)
        if len(raw) > 16384 or file.parent != self.directory:
            raise ControlError(503, "live_preview_evidence_invalid")
        descriptor = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())

    def records(self):
        if not self.directory_safe():
            return []
        files = list(self.directory.glob("*.request.json"))
        if len(files) > LIMIT:
            raise ControlError(503, "live_preview_capacity")
        rows = []
        for file in files:
            value = self.read(file)
            try:
                if set(value) != {"version", "instance_id", "nonce", "owner", "request", "view"} or value["version"] != "customer-live-preview-request.v1":
                    raise ValueError("exact ledger required")
                UUID(value["instance_id"])
                for key in ("user_id", "session_id", "creation_id"):
                    if str(UUID(value["owner"][key])) != value["owner"][key]:
                        raise ValueError("canonical identity required")
                if not isinstance(value["owner"]["environment"], str) or not 1 <= len(value["owner"]["environment"]) <= 100:
                    raise ValueError("bounded environment required")
                if len(value["nonce"]) != 64 or any(c not in "0123456789abcdef" for c in value["nonce"]):
                    raise ValueError("private nonce required")
                request = Start.model_validate_json(json.dumps(value["request"]))
                view = LeaseView.model_validate_json(json.dumps(value["view"]))
                if (set(value["owner"]) != {"user_id", "session_id", "environment", "creation_id"}
                        or str(view.creation_id) != value["owner"]["creation_id"]
                        or view.idempotency_key != request.idempotency_key or view.accepted_revision != request.accepted_revision
                        or view.site_context_sha256 != request.site_context_sha256 or view.state != "preparing"
                        or file != self.file(str(view.lease_id), "request")):
                    raise ValueError("bound original request required")
                rows.append(value)
            except (ValueError, TypeError, KeyError, AttributeError):
                raise ControlError(503, "live_preview_evidence_invalid") from None
        return rows

    def busy(self):
        return self.read(self.directory / "active.json") is not None

    def claim(self, record):
        if len(self.records()) >= LIMIT:
            raise ControlError(409, "live_preview_capacity")
        claim = {"lease_id": record["view"]["lease_id"], "instance_id": record["instance_id"],
            "nonce": record["nonce"], "request_sha256": digest(record)}
        try:
            self.exclusive(self.directory / "active.json", claim)
        except FileExistsError:
            raise ControlError(409, "live_preview_busy") from None
        try:
            self.exclusive(self.file(claim["lease_id"], "request"), record)
        except BaseException:
            self.release(record)
            raise

    def release(self, record):
        file = self.directory / "active.json"
        expected = {"lease_id": record["view"]["lease_id"], "instance_id": record["instance_id"],
            "nonce": record["nonce"], "request_sha256": digest(record)}
        if self.read(file) != expected:
            raise ControlError(503, "live_preview_claim_changed")
        file.unlink()

    def owns(self, record):
        expected = {"lease_id": record["view"]["lease_id"], "instance_id": record["instance_id"],
            "nonce": record["nonce"], "request_sha256": digest(record)}
        return self.read(self.directory / "active.json") == expected

    def heartbeat(self, record, *, expires_ms):
        if not self.owns(record):
            raise ControlError(503, "live_preview_claim_changed")
        value = {"version": "customer-live-preview-heartbeat.v1", "lease_id": record["view"]["lease_id"],
            "nonce": record["nonce"], "scope_sha256": record["view"]["scope_sha256"], "expires_ms": expires_ms}
        target = self.file(value["lease_id"], "heartbeat")
        temporary = self.directory / (str(uuid4()) + ".tmp")
        self.exclusive(temporary, value)
        try:
            previous = self.read(target)
            if previous is not None and any(previous.get(key) != value[key] for key in ("version", "lease_id", "nonce", "scope_sha256")):
                raise ControlError(503, "live_preview_claim_changed")
            temporary.replace(target)
        finally:
            if temporary.exists():
                temporary.unlink()

    def terminal(self, record, view):
        file = self.file(record["view"]["lease_id"], "terminal")
        value = {"version": "customer-live-preview-terminal.v1", "request_sha256": digest(record), "view": view}
        previous = self.read(file)
        if previous is None:
            self.exclusive(file, value)
        elif previous != value:
            raise ControlError(503, "live_preview_evidence_invalid")

    def historical(self, record):
        value = self.read(self.file(record["view"]["lease_id"], "terminal"))
        view = dict(record["view"], state="failed", failure_code="live_preview_service_restarted", preview_url=None)
        if value is not None:
            if (set(value) != {"version", "request_sha256", "view"}
                    or value["version"] != "customer-live-preview-terminal.v1" or value["request_sha256"] != digest(record)):
                raise ControlError(503, "live_preview_evidence_invalid")
            parsed = LeaseView.model_validate_json(json.dumps(value["view"]))
            if parsed.state not in {"closed", "expired", "revoked", "failed"} or parsed.preview_url is not None:
                raise ControlError(503, "live_preview_evidence_invalid")
            view = parsed.model_dump(mode="json")
            for key, expected in record["view"].items():
                if key not in {"state", "failure_code", "expires_at"} and view[key] != expected:
                    raise ControlError(503, "live_preview_evidence_invalid")
        return view
