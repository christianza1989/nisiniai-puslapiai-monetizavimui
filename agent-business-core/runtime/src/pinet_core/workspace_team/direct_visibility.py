"""Keep mapped DM children out of ordinary topic/group surfaces, even when disabled."""
from sqlalchemy import select, text

from ..control.routes import ControlError
from ..workspace_topics.models import Topic
from .models import DirectChat


async def installed(tx):
    cache = getattr(tx, "info", {})
    if "direct_visibility_installed" not in cache:
        value = await tx.scalar(text("""SELECT CASE WHEN to_regclass('public.control_workspace_direct_chats') IS NULL THEN NULL
          ELSE EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.control_workspace_direct_chats') AND relrowsecurity AND relforcerowsecurity) END"""))
        if value is False:
            raise ControlError(503, "direct_schema_unavailable")
        cache["direct_visibility_installed"] = value is True
    return cache["direct_visibility_installed"]


async def exclusion(tx):
    if not await installed(tx):
        return None
    return ~select(DirectChat.id).where(DirectChat.child_topic_id == Topic.id).exists()


async def reject_child(tx, identity):
    if await installed(tx) and await tx.scalar(select(DirectChat.id).where(DirectChat.child_topic_id == identity)):
        raise ControlError(404, "not_found")
