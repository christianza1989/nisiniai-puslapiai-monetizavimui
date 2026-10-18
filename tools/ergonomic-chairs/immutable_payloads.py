"""Byte-exact, write-once payloads shared by ordinary hardlinked source paths.

The object store and source paths must be on the same volume. JSON checkpoints
and receipts stay independent mutable files. Existing objects are fully hashed
before reuse; a damaged object is rejected rather than overwritten.
"""
import hashlib
import os
import uuid
from pathlib import Path


def file_sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def identity(path):
    value = Path(path).stat()
    return value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns


class ImmutablePayloadStore:
    def __init__(self, root, *, link_limit=900, min_shared_bytes=65536):
        self.root = Path(root)
        self.link_limit = link_limit
        self.min_shared_bytes = min_shared_bytes
        self.active_part = {}
        if not 2 <= link_limit <= 900:
            raise ValueError('INVALID_PAYLOAD_LINK_LIMIT')
        self.root.mkdir(parents=True, exist_ok=True)
        if self.root.resolve() != self.root.absolute():
            raise ValueError('PAYLOAD_STORE_MUST_BE_REAL_DIRECTORY')

    def _verify(self, blob, digest, length):
        if blob.is_symlink() or blob.stat().st_size != length or file_sha(blob) != digest:
            raise ValueError('IMMUTABLE_PAYLOAD_OBJECT_CHANGED')

    def _object(self, raw):
        digest = hashlib.sha256(raw).hexdigest()
        part = self.active_part.get(digest, 0)
        while True:
            stem = digest if part == 0 else digest + '.part-' + str(part)
            blob = self.root / digest[:2] / stem
            if not blob.exists() or blob.stat().st_nlink < self.link_limit:
                break
            part += 1
        self.active_part[digest] = part
        blob.parent.mkdir(parents=True, exist_ok=True)
        if not blob.exists():
            temp = blob.with_name(digest + '.tmp-' + uuid.uuid4().hex)
            try:
                with temp.open('xb') as stream:
                    stream.write(raw)
                    stream.flush()
                    os.fsync(stream.fileno())
                self._verify(temp, digest, len(raw))
                try:
                    os.link(temp, blob)
                except FileExistsError:
                    pass  # Another writer must have produced the same bytes.
            finally:
                temp.unlink(missing_ok=True)
        self._verify(blob, digest, len(raw))
        return blob

    def write(self, path, raw):
        """Create a new immutable source path; never truncate an existing alias."""
        path = Path(path)
        if path.exists():
            raise ValueError('IMMUTABLE_PAYLOAD_PATH_ALREADY_EXISTS')
        path.parent.mkdir(parents=True, exist_ok=True)
        if len(raw) < self.min_shared_bytes:
            with path.open('xb') as stream:
                stream.write(raw)
            return
        blob = self._object(raw)
        os.link(blob, path)
        if identity(path) != identity(blob):
            raise ValueError('IMMUTABLE_PAYLOAD_LINK_MISMATCH')

    def adopt_existing(self, path, expected_sha):
        """Replace only a completed, verified download with its identical alias."""
        path = Path(path)
        before = identity(path)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected_sha or identity(path) != before:
            raise ValueError('COMPLETED_DOWNLOAD_CHANGED')
        if len(raw) < self.min_shared_bytes:
            return
        blob = self._object(raw)
        if identity(path) == identity(blob):
            return
        temp = path.with_name(path.name + '.link-' + uuid.uuid4().hex)
        try:
            os.link(blob, temp)
            if identity(path) != before:
                raise ValueError('COMPLETED_DOWNLOAD_CHANGED_BEFORE_LINK')
            os.replace(temp, path)
        finally:
            temp.unlink(missing_ok=True)
        if identity(path) != identity(blob):
            raise ValueError('COMPLETED_DOWNLOAD_LINK_MISMATCH')
