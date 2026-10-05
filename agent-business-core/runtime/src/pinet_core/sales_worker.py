"""Bounded owner mailbox worker; no global Gmail access or arbitrary customer sends."""
import argparse
import asyncio
import logging
import time

from sqlalchemy import select

from . import mail_reader, mailbox, sales, service
from .codex_lab import CodexLab
from .config import settings
from .db import db
from .models import Business, Case, MailMessage

log = logging.getLogger('pinet.sales')


async def tick(lab, sync=True):
    cfg = settings()
    if cfg.environment != 'local' or not cfg.lab_mail_enabled or cfg.smtp_enabled:
        raise RuntimeError('local_owner_sales_worker_only')
    if sync:
        await mail_reader.sync_replies()
    async with db.registry() as tx:
        sites = list(await tx.scalars(select(Business.site_id)))
    for site in sites:
        item = await service.business(site)
        if lab.calls <= lab.max_calls - 5:
            await sales.run_reply(item, lab)
        await sales.remind_one(item)
        async with db.transaction(item.id, cfg.environment) as tx:
            ids = list(await tx.scalars(select(MailMessage.id).join(Case, MailMessage.case_id == Case.id).where(
                Case.payload['test'].as_boolean().is_(True), Case.payload['sales'].is_not(None),
                MailMessage.direction == 'outbound', MailMessage.state == 'draft').limit(10)))
        for mid in ids:
            result = await mailbox.send_test(item.id, mid)
            log.info('sales_delivery state=%s', result['state'])


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--duration-seconds', type=int, default=1800)
    parser.add_argument('--max-cli-calls', type=int, default=30)
    args = parser.parse_args()
    if not 30 <= args.duration_seconds <= 3600 or not 5 <= args.max_cli_calls <= 90:
        raise ValueError('bounded_worker_budget_required')
    lab = CodexLab(max_calls=args.max_cli_calls)
    lab.free_language = True
    until, next_sync = time.monotonic() + args.duration_seconds, 0
    while time.monotonic() < until and lab.calls <= lab.max_calls - 5:
        try:
            sync = time.monotonic() >= next_sync
            await tick(lab, sync=sync)
            if sync:
                next_sync = time.monotonic() + 30
        except Exception as error:
            log.warning('sales_worker_problem class=%s', type(error).__name__)
        await asyncio.sleep(3)
    log.info('bounded_sales_worker_finished cli_calls=%s', lab.calls)
    await db.engine.dispose()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
