"""Registration lifetime barrier shared by independent admission consumers."""
from uuid import UUID

from sqlalchemy import text


async def lifetime(tx, environment, registration_id, *, exclusive=False):
    identity = str(UUID(registration_id))
    function = "pg_advisory_xact_lock" if exclusive else "pg_advisory_xact_lock_shared"
    await tx.execute(text(f"SELECT {function}(hashtextextended(:key,0))"),
        {"key": f"creation-registration:{environment}:{identity}"})
