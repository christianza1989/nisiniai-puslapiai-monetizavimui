import pytest
from sqlalchemy import select
from test_delivery import prepared

from pinet_core import inquiry_replies, jobs, mailbox
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.followup_projection import bind
from pinet_core.models import Case, Conversation, Job, MailMessage, Outbox


async def delivered(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    monkeypatch.setattr(settings(), 'imap_enabled', True)
    monkeypatch.setattr(settings(), 'imap_sites', ['traktoriupadangos'])
    monkeypatch.setattr(jobs, 'smtp_send', lambda *args: None)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.scalar(select(Conversation))
        convo.payload = {**convo.payload, 'test': False}
    assert await jobs.deliver_one(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.scalar(select(MailMessage))
        assert original.state == 'accepted_by_smtp' and original.case_id == convo.case_id
        assert original.message_id == (await tx.scalar(select(Outbox))).payload['message_id']
    return item, original.id


async def reply(item, original_id, mid, body):
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, original_id)
        value = await mailbox.receive_reply(tx, original, mid, 'delivery-fixture@example.org', 'Re: poreikis', body)
        return value.id


async def approved(kind, data, action_key=None):
    body = 'Sveiki,\n\nPatikslinimą gavome. Kokio dydžio ekranas jums reikalingas?\n\nMB Pinet'
    return {'validated_followup': bind(data, 'Re: Jūsų poreikis', body,
        {'approved': True, 'unsupported_claims': []}, 'gemini-3.8-flash')}


async def test_known_reply_dedup_and_reviewed_same_case_chain(client, monkeypatch):
    item, original_id = await delivered(client, monkeypatch)
    rid = await reply(item, original_id, '<reply@fixture.example>', 'Patikslinu: reikia dviejų įrenginių.')
    assert await reply(item, original_id, '<reply@fixture.example>', 'Patikslinu: reikia dviejų įrenginių.') == rid
    monkeypatch.setattr(jobs, 'evaluate', approved)
    assert await jobs.run_one(item.id, 'fixture', kind='inquiry_reply:' + rid)
    sends = []
    monkeypatch.setattr(jobs, 'smtp_send', lambda recipient, content, mid: sends.append((content, mid)))
    assert await jobs.deliver_one(item.id)
    assert not await jobs.deliver_one(item.id)
    assert len(sends) == 1 and sends[0][0]['in_reply_to'] == '<reply@fixture.example>'
    async with db.transaction(item.id, settings().environment) as tx:
        messages = list(await tx.scalars(select(MailMessage)))
        assert len(messages) == 3 and len({m.case_id for m in messages}) == 1
        assert len(list(await tx.scalars(select(Job).where(Job.kind.startswith('inquiry_reply:'))))) == 1


async def test_newer_reply_during_review_supersedes_older_draft(client, monkeypatch):
    item, original_id = await delivered(client, monkeypatch)
    rid = await reply(item, original_id, '<older@fixture.example>', 'Reikia dviejų.')
    async def raced(kind, data, action_key=None):
        await reply(item, original_id, '<newer@fixture.example>', 'Patikslinu: reikia trijų.')
        return await approved(kind, data, action_key)
    monkeypatch.setattr(jobs, 'evaluate', raced)
    assert await jobs.run_one(item.id, 'fixture', kind='inquiry_reply:' + rid)
    async with db.transaction(item.id, settings().environment) as tx:
        assert not list(await tx.scalars(select(Outbox).where(Outbox.state == 'prepared')))


async def test_stop_blocks_already_reviewed_reply_before_smtp(client, monkeypatch):
    item, original_id = await delivered(client, monkeypatch)
    rid = await reply(item, original_id, '<first@fixture.example>', 'Reikia dviejų.')
    monkeypatch.setattr(jobs, 'evaluate', approved)
    await jobs.run_one(item.id, 'fixture', kind='inquiry_reply:' + rid)
    await reply(item, original_id, '<stop@fixture.example>', 'Nesiųskite daugiau laiškų.')
    sends = []
    monkeypatch.setattr(jobs, 'smtp_send', lambda *args: sends.append(args))
    assert await jobs.deliver_one(item.id) and sends == []
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Outbox).where(Outbox.payload['reply_id'].astext == rid))).state == 'superseded'
        assert (await tx.scalar(select(Case))).payload['inquiry']['opted_out'] is True


async def test_unreviewed_reply_never_enters_outbox(client, monkeypatch):
    item, original_id = await delivered(client, monkeypatch)
    rid = await reply(item, original_id, '<unreviewed@fixture.example>', 'Ką rekomenduojate?')
    async def unavailable(*args, **kwargs):
        return {'draft_only': True, 'semantic_evaluation': 'unavailable'}
    monkeypatch.setattr(jobs, 'evaluate', unavailable)
    await jobs.run_one(item.id, 'fixture', kind='inquiry_reply:' + rid)
    async with db.transaction(item.id, settings().environment) as tx:
        assert not list(await tx.scalars(select(Outbox).where(Outbox.state == 'prepared')))


async def test_recipient_allowlist_does_not_dispatch_foreign_mail(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    monkeypatch.setattr(settings(), 'smtp_recipient_allowlist', ['owner@example.org'])
    sends = []
    monkeypatch.setattr(jobs, 'smtp_send', lambda *args: sends.append(args))
    assert not await jobs.deliver_one(item.id) and sends == []
    async with db.transaction(item.id, settings().environment) as tx:
        assert not list(await tx.scalars(select(MailMessage)))


@pytest.mark.parametrize('body', ['Nerašykite daugiau.', 'Stop emailing me.', 'Reikia dviejų.\n> Nesiųskite daugiau.'])
def test_stop_uses_new_message_without_quoted_history(body):
    assert inquiry_replies.requests_stop(body) == ('Reikia' not in body)
