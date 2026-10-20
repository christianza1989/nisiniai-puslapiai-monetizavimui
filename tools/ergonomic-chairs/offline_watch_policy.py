"""Scheduling only. Metadata wakes the unchanged full-SHA finite verifier.

Metadata is never evidence of a PASS. A periodic full audit also catches byte
changes that leave metadata unchanged. No verified rows or artifacts are cached
or rewritten here.
"""
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path


def file_stamp(path):
    try:
        s=Path(path).stat()
        return [s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns]
    except FileNotFoundError:
        return None


def input_snapshot(root,prepared,inventory,session):
    queue=json.loads((root/'SOURCE-QUEUE.json').read_bytes())
    completed=queue['completedSource']
    statusfile=prepared/'OFFLINE-STATUS.json'
    status=json.loads(statusfile.read_bytes()) if statusfile.exists() else {}
    rows={row['job']:row for row in status.get('rows',[])}
    entries=[['inventory',file_stamp(inventory)],['session',file_stamp(session)],
             ['status',file_stamp(statusfile)],['completed',completed]]
    retry=False
    for key in completed:
        if Path(key).name!=key or key in {'.','..'}:
            raise ValueError('UNSAFE_JOB_PATH')
        entries.append([key,'checkpoint',file_stamp(root/'source'/key/'CHECKPOINT.json')])
        row=rows.get(key,{})
        retry|=row.get('result')!='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY' or not row.get('artifacts')
        for name in sorted(row.get('artifacts',{})):
            rel=Path(name)
            if rel.is_absolute() or '..' in rel.parts:
                raise ValueError('UNSAFE_ARTIFACT_PATH')
            stamp=file_stamp(prepared/key/rel)
            retry|=stamp is None
            entries.append([key,name,stamp])
    raw=json.dumps(entries,ensure_ascii=False,separators=(',',':')).encode()
    return hashlib.sha256(raw).hexdigest(),bool(retry),len(entries)


@dataclass
class AuditSchedule:
    audit_seconds:float=900
    verified_snapshot:str|None=None
    finished_at:float|None=None

    def reason(self,snapshot,needs_retry,at):
        if self.finished_at is None:return 'INITIAL_FULL_AUDIT'
        if needs_retry:return 'UNVERIFIED_OR_REVIEW_PENDING'
        if snapshot!=self.verified_snapshot:return 'INPUT_METADATA_CHANGED'
        if at-self.finished_at>=self.audit_seconds:return 'PERIODIC_FULL_SHA_AUDIT'
        return None

    def completed(self,before_snapshot,at):
        # Keep the pre-run snapshot. A mutation during the child, including a
        # new status written by that child, forces a confirming full invocation.
        self.verified_snapshot=before_snapshot
        self.finished_at=at
