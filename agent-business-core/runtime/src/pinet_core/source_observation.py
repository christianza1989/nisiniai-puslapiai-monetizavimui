"""One operation's raw Git observations, fenced freshly before successful return.

This is not an authority, file-hash, native-state or proof cache. No state is
persisted and an explicit operation always starts empty, including nested ones.
"""
import asyncio
import os
import re
import subprocess
import threading
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from pathlib import Path

MAX_REPOSITORIES = 2  # maintained execution core and companion


class SourceObservationError(Exception):
    code = "source_unavailable"

    def __init__(self):
        super().__init__(self.code)


@dataclass(frozen=True)
class GitObservation:
    head: str
    porcelain: str


@dataclass(frozen=True)
class _Repository:
    path: Path
    real: Path
    device: int
    inode: int


def _repository(root):
    try:
        path = Path(root)
        if not path.is_absolute():
            raise ValueError
        path = Path(os.path.abspath(path))
        real = path.resolve(strict=True)
        if not real.is_dir():
            raise ValueError
        info = real.stat()
        return _Repository(path, real, info.st_dev, info.st_ino)
    except (OSError, ValueError, TypeError, RuntimeError):
        raise SourceObservationError() from None


def _fresh(repo):
    try:
        if _repository(repo.path) != repo:
            raise SourceObservationError()
        # Porcelain v2 provides the checked HEAD and dirty inventory in one
        # native frame. NUL records prevent path newlines from masquerading as
        # branch metadata. Each operation still reads fresh entry AND exit.
        raw = subprocess.check_output(["git", "-c", "status.showStash=false", "status",
            "--porcelain=v2", "--branch", "-z", "--untracked-files=normal"], cwd=repo.path,
            stderr=subprocess.DEVNULL, text=True, timeout=10)
        records = raw.split("\0")
        if not records or records.pop() != "":
            raise SourceObservationError()
        heads, branches = [], []
        for record in records:
            if re.fullmatch(r"# branch.oid [a-f0-9]{40}", record):
                heads.append(record.removeprefix("# branch.oid "))
            elif re.fullmatch(r"# branch.head [^\r\n\0]+", record):
                branches.append(record)
            elif not (re.fullmatch(r"# branch.upstream [^\r\n\0]+", record)
                    or re.fullmatch(r"# branch.ab \+[0-9]+ -[0-9]+", record)):
                # Every tracked/untracked/rename/conflict/submodule record,
                # unknown metadata and unborn/malformed HEAD fails closed.
                raise SourceObservationError()
        if len(heads) != 1 or len(branches) != 1 or _repository(repo.path) != repo:
            raise SourceObservationError()
        return GitObservation(heads[0], "")
    except (OSError, subprocess.SubprocessError, ValueError, TypeError):
        raise SourceObservationError() from None


@dataclass
class _Operation:
    phase: str = "open"
    invalid: bool = False
    entries: dict = field(default_factory=dict)
    lock: object = field(default_factory=threading.RLock)

    def observe(self, root):
        # All callers inside async authority paths offload this synchronous
        # primitive. The lock also coalesces simultaneous inherited thread reads.
        if self.phase != "open" or self.invalid:
            # A cancelled operation's Git thread may still hold the lock. A
            # retained CLOSED context must fail immediately rather than wait.
            self.invalid = True
            raise SourceObservationError()
        with self.lock:
            try:
                if self.phase != "open" or self.invalid:
                    raise SourceObservationError()
                repo = _repository(root)
                key = os.path.normcase(str(repo.path))
                previous = self.entries.get(key)
                if previous is not None:
                    if previous[0] != repo or self.phase != "open" or self.invalid:
                        raise SourceObservationError()
                    return previous[1]
                if len(self.entries) >= MAX_REPOSITORIES:
                    raise SourceObservationError()
                value = _fresh(repo)
                # Cancellation cannot stop a to_thread reader. Its inherited
                # state may have closed while Git was executing: never publish.
                if self.phase != "open":
                    raise SourceObservationError()
                self.entries[key] = (repo, value)
                return value
            except SourceObservationError:
                self.invalid = True  # no failed result/exception is memoized
                raise

    def finish(self):
        with self.lock:
            try:
                if self.phase != "closing" or self.invalid:
                    raise SourceObservationError()
                for repo, expected in tuple(self.entries.values()):
                    if _fresh(repo) != expected or self.phase != "closing":
                        raise SourceObservationError()
            except SourceObservationError:
                self.invalid = True
                raise

    def close(self):
        # No blocking lock acquisition during cancellation: any inherited worker
        # must inspect this shared phase again before returning/publishing data.
        self.phase = "closed"
        self.entries = {}


_active: ContextVar[_Operation | None] = ContextVar("pinet_git_source_operation", default=None)


def git_source_observation(root):
    """Fixed HEAD/status observation; unscoped calls are always fresh.

    A retained CLOSED context fails rather than starting a new implicit scope.
    Every existing caller still compares its current expected source revision.
    """
    operation = _active.get()
    return operation.observe(root) if operation is not None else _fresh(_repository(root))


@asynccontextmanager
async def git_source_operation():
    """Always-fresh operation; only nested helper reads reuse its observations.

    Use around one complete capture/verify, never an HTTP request, lease,
    producer lifetime or heartbeat. A successful result cannot escape before
    fresh all-repository revalidation. Failure/cancellation preserves its error.
    """
    operation = _Operation()
    token = _active.set(operation)
    try:
        yield
        operation.phase = "closing"
        await asyncio.to_thread(operation.finish)
    finally:
        operation.close()
        _active.reset(token)
