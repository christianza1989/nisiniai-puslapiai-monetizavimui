"""Transactional D1 record ingestion only. No notification, identity merge or voice.

The source reader must use (created_at,id) ordering and persist the receipt cursor
only after this commit. Form consent does not imply consent to device memory.
"""
import json
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from pydantic import EmailStr, Field, field_validator
from sqlalchemy import select, text

from .config import settings
from .contracts import Strict
from .models import Case, CaseSource, SourceCheckpoint, new_id
from .security import digest


class Cursor(Strict):
    created_at: int = Field(ge=0, strict=True)
    id: str = Field(default="", max_length=100)

    def ordering(self):
        return self.created_at, self.id


class Lead(Strict):
    id: UUID
    site_id: str = Field(max_length=100)
    created_at: int = Field(ge=1, strict=True)
    source_path: str = Field(pattern=r"^/([^/].*)?$", max_length=300)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    message: str = Field(min_length=20, max_length=3000)
    consent_at: int = Field(ge=1, strict=True)
    status: str = Field(pattern=r"^(new|notified)$")

    @field_validator("name", "source_path", "message")
    @classmethod
    def no_unsafe_controls(cls, value):
        if any(ord(char) < 32 and char not in "\n\r\t" for char in value):
            raise ValueError("invalid source field")
        return value

    def cursor(self):
        return Cursor(created_at=self.created_at, id=str(self.id))


class Batch(Strict):
    source_system: str = Field(pattern=r"^website_d1$")
    base_cursor: Cursor
    records: list[Lead] = Field(min_length=1, max_length=30)


async def ingest(tx, item, data: Batch):
    cfg = settings()
    rows = data.records
    keys = [r.cursor().ordering() for r in rows]
    if any(r.site_id != item.site_id for r in rows):
        raise HTTPException(409, "source_site_conflict")
    if keys != sorted(set(keys)) or any(key <= data.base_cursor.ordering() for key in keys):
        raise HTTPException(409, "source_order_conflict")
    if any(r.consent_at != r.created_at or r.created_at > int(datetime.now(UTC).timestamp() * 1000) + 45000 for r in rows):
        raise HTTPException(409, "source_timestamp_conflict")
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
                     {"key": f"import:{item.id}:{cfg.environment}:{data.source_system}"})
    state = await tx.scalar(select(SourceCheckpoint).where(SourceCheckpoint.source_system == data.source_system))
    batch_hash = digest(json.dumps(data.model_dump(mode="json"), sort_keys=True))
    if state and state.payload.get("last_batch_hash") == batch_hash:
        return {**state.payload["receipt"], "replayed": True}
    current = Cursor.model_validate(state.payload["cursor"]) if state else Cursor(created_at=0)
    if current != data.base_cursor:
        raise HTTPException(409, "source_cursor_conflict")
    imported = 0
    for row in rows:
        source = await tx.scalar(select(CaseSource).where(CaseSource.source_system == data.source_system,
            CaseSource.site_id == item.site_id, CaseSource.source_record_id == str(row.id)))
        content = row.model_dump(mode="json")
        fingerprint = digest(json.dumps({k: v for k, v in content.items() if k != "status"}, sort_keys=True))
        if source:
            if source.payload["source_hash"] != fingerprint:
                raise HTTPException(409, "source_record_changed")
            source.payload = {**source.payload, "source_status": row.status}
            continue
        case_id = new_id()
        scope = {"business_id": item.id, "environment_id": cfg.environment}
        tx.add(Case(id=case_id, **scope, created_at=datetime.fromtimestamp(row.created_at / 1000, UTC),
            payload={"origin": "website_d1", "lead": content,
                                               "identity_verified": False, "notification_owner": "source-d1"}))
        await tx.flush()
        tx.add(CaseSource(**scope, source_system=data.source_system, site_id=item.site_id,
                          source_record_id=str(row.id), case_id=case_id,
                          payload={"source_hash": fingerprint, "source_status": row.status}))
        imported += 1
    receipt = {"cursor": rows[-1].cursor().model_dump(), "records": len(rows), "imported": imported,
               "notifications_sent": 0, "voice_sessions_created": 0, "replayed": False}
    if not state:
        state = SourceCheckpoint(business_id=item.id, environment_id=cfg.environment, source_system=data.source_system)
        tx.add(state)
    state.payload = {"cursor": receipt["cursor"], "last_batch_hash": batch_hash, "receipt": receipt}
    return receipt


async def checkpoint(tx):
    state = await tx.scalar(select(SourceCheckpoint).where(SourceCheckpoint.source_system == "website_d1"))
    return {"source_system": "website_d1", "cursor": state.payload["cursor"] if state else Cursor(created_at=0).model_dump()}
