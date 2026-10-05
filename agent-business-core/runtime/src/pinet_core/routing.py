"""Bounded background Jev hints. Core authority remains independent of routing."""
import asyncio

import httpx
from sqlalchemy import select

from . import policy
from .db import db
from .jev_router import JevShadow, Snapshot
from .models import Artifact, Conversation, Event, new_id

active = None


class Coordinator:
    def __init__(self, cfg):
        self.client = httpx.AsyncClient(timeout=cfg.jev_timeout_seconds, follow_redirects=False)
        self.router = JevShadow(api_key=cfg.jev_api_key.get_secret_value(), enabled=True,
            max_calls=cfg.jev_max_calls, budget_microusd=cfg.jev_budget_microusd,
            timeout_seconds=cfg.jev_timeout_seconds, client=self.client)
        self.tasks, self.seen = set(), set()

    def launch(self, business_id, environment, cid, event_id):
        identity = (environment, cid, event_id)
        if identity in self.seen or len(self.tasks) >= 8:
            return
        if len(self.seen) >= 512:
            self.seen.pop()
        self.seen.add(identity)
        task = asyncio.create_task(self.observe(business_id, environment, cid, event_id))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def observe(self, business_id, environment, cid, event_id):
        try:
            async with db.transaction(business_id, environment) as tx:
                authority, revision = await policy.read(tx)
                convo = await tx.get(Conversation, cid)
                source = await tx.get(Event, event_id)
                if (not authority.jev_enabled or authority.paused or not convo or not source or
                        convo.state == 'finalized' or source.kind != 'client_transcript'):
                    return
                if convo.payload.get('latest_client_event_id') != event_id:
                    return
                existing = await tx.scalar(select(Artifact.id).where(Artifact.conversation_id == cid,
                    Artifact.kind == 'routing_decision:' + event_id))
                if existing:
                    return
                previous = list(await tx.scalars(select(Event).where(Event.conversation_id == cid,
                    Event.kind == 'client_transcript', Event.sequence < source.sequence)
                    .order_by(Event.sequence.desc()).limit(2)))
                state = Snapshot(convo.payload['knowledge']['site_id'], convo.epoch, convo.need_revision,
                    source.payload['text'], '\n'.join(e.payload['text'] for e in reversed(previous)),
                    tuple(authority.allowed_tools), convo.payload['test'])
            result = await self.router.observe(state, lambda: (state.epoch, state.need_revision))
            async with db.transaction(business_id, environment) as tx:
                authority, current_revision = await policy.read(tx)
                convo = await tx.get(Conversation, cid, with_for_update=True)
                if not convo:
                    return
                if (not authority.jev_enabled or authority.paused or current_revision != revision or
                        convo.state == 'finalized' or convo.epoch != state.epoch or
                        convo.need_revision != state.need_revision or
                        convo.payload.get('latest_client_event_id') != event_id):
                    result = {**result, 'status': 'dropped_stale_snapshot', 'apply': False}
                receipt = {**result, 'client_event_id': event_id, 'epoch': state.epoch,
                    'need_revision': state.need_revision, 'policy_revision': revision,
                    'mode': 'on', 'hint_used': False}
                tx.add(Artifact(id=new_id(), business_id=business_id, environment_id=environment,
                    conversation_id=cid, kind='routing_decision:' + event_id, payload=receipt))
                if result.get('status') == 'observed':
                    convo.payload = {**convo.payload, 'routing_hint': receipt}
        except Exception:
            # Advisory failure never interrupts customer input or exposes credentials/provider logs.
            return

    async def close(self):
        for task in list(self.tasks):
            task.cancel()
        await asyncio.gather(*list(self.tasks), return_exceptions=True)
        await self.client.aclose()


def view(convo, authority, revision):
    hint = convo.payload.get('routing_hint')
    if not authority.jev_enabled or authority.paused:
        return {'mode': 'off', 'hint': None}
    if hint and (hint['epoch'] != convo.epoch or hint['need_revision'] != convo.need_revision or
            hint['policy_revision'] != revision or hint['client_event_id'] != convo.payload.get('latest_client_event_id')):
        hint = None
    return {'mode': 'on', 'hint': hint}
