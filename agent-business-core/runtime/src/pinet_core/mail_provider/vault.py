"""Encrypted operator-local credentials, separate from Git, DB and model input."""
import json
import os
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID, uuid4

from cryptography.fernet import Fernet, InvalidToken

from .gmail import GmailError


class Vault:
    def __init__(self, root, master_key):
        self.root = Path(root)
        if not self.root.is_absolute() or any(p.is_symlink() for p in (self.root, *self.root.parents)):
            raise GmailError("gmail_private_vault_required")
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        self._locks = set()
        try:
            self._cipher = Fernet(master_key)
        except (ValueError, TypeError):
            raise GmailError("gmail_vault_key_invalid") from None

    def path(self, connection_id):
        try:
            if str(UUID(connection_id)) != connection_id:
                raise ValueError("noncanonical_id")
        except (ValueError, TypeError, AttributeError):
            raise GmailError("gmail_connection_identity_invalid") from None
        path = self.root / (connection_id + ".sealed")
        if path.is_symlink():
            raise GmailError("gmail_private_vault_required")
        return path

    @contextmanager
    def locked(self, connection_id):
        marker = self.path(connection_id).with_suffix(".lock")
        try:
            fd = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            raise GmailError("gmail_connection_busy") from None
        try:
            os.close(fd)
            self._locks.add(connection_id)
            yield
        finally:
            self._locks.discard(connection_id)
            marker.unlink()  # Only the lock created by this invocation; never stale takeover.

    def read(self, connection_id, binding):
        try:
            data = self.path(connection_id).read_bytes()
            if len(data) > 131072:
                raise ValueError("bounded_secret_required")
            value = json.loads(self._cipher.decrypt(data))
            if (not isinstance(value, dict) or value.get("connection_id") != connection_id
                    or value.get("binding") != binding):
                raise ValueError("connection_binding_changed")
            return value
        except (OSError, InvalidToken, KeyError, ValueError, TypeError):
            raise GmailError("gmail_connection_unavailable") from None

    def write(self, connection_id, binding, value, *, create=False):
        target = self.path(connection_id)
        if connection_id not in self._locks:
            raise GmailError("gmail_owned_vault_lock_required")
        if not create:
            self.read(connection_id, binding)  # Never replace a foreign binding or unreadable original.
        value = {**value, "connection_id": connection_id, "binding": binding}
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
        if len(raw) > 65536:
            raise GmailError("gmail_connection_too_large")
        encoded = self._cipher.encrypt(raw)
        if create:
            with target.open("xb") as output:
                os.chmod(target, 0o600)
                output.write(encoded)
                output.flush()
                os.fsync(output.fileno())
        else:
            temporary = self.root / (str(uuid4()) + ".pending")
            try:
                with temporary.open("xb") as output:
                    os.chmod(temporary, 0o600)
                    output.write(encoded)
                    output.flush()
                    os.fsync(output.fileno())
                os.replace(temporary, target)
            finally:
                if temporary.exists():
                    temporary.unlink()
