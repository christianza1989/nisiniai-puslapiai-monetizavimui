"""One isolated SQLite proposal per durable PG ticket. No provider/connector transport."""

from pathlib import Path
from uuid import UUID

from ..creation.service import digest
from . import service
from .library import load


async def run_local(token, ticket_id, directory, *, agent_factory, before_accept=None):
    """Private server-injected test adapter, not a browser-defined model/tool call.

    No default runner is supplied. Canonical calibrated/model execution is still
    an explicit separate acceptance. Caller owns a private coordinator directory.
    """
    lib = load()
    ticket, reserved = await service.claim(token, str(UUID(ticket_id)))
    if not reserved:
        return service.safe_receipt(ticket)
    async with service.worker_scope(token) as (tx, worker, admission):
        binding = await service.current(tx, admission, worker=worker)
        public = admission["material"]["public_profile"]
    from xbot.agent import Agent
    from xbot.codex import CodexRunner
    from xbot.config import Config
    from xbot.contracts import validate_text
    from xbot.service import Service
    from xbot.store import Conflict, Store

    path = Path(directory).resolve()
    path.mkdir(parents=True, exist_ok=True)
    store = Store(path / (ticket_id + ".sqlite"))

    class TrackedRunner:
        def __init__(self, runner):
            self.runner, self.calls = runner, 0

        @property
        def usage(self):
            return self.runner.usage

        @property
        def receipt_sink(self):
            return self.runner.receipt_sink

        @receipt_sink.setter
        def receipt_sink(self, value):
            self.runner.receipt_sink = value

        async def ask(self, *args):
            await service.begin_call(token, ticket)
            self.calls += 1
            try:
                return await self.runner.ask(*args)
            finally:
                records = store.records(binding.site_id, "model_usage")
                if not any(r["payload"]["attempt"] == self.calls for r in records):
                    known = self.usage[self.calls - 1] if len(self.usage) >= self.calls else {}
                    store.record_model_usage(
                        binding.site_id,
                        job["id"],
                        {"attempt": self.calls, "usage": known, "outcome": "observed"},
                    )
                totals = store.model_usage_totals(binding.site_id)
                status = (
                    "known"
                    if totals["known_receipts"] == self.calls
                    else "partial"
                    if totals["known_receipts"]
                    else "unknown"
                )
                await service.finish_call(token, ticket, totals["usage"], status)

    def tracked_agent():
        agent = agent_factory()
        if not isinstance(agent, Agent):
            raise Conflict("maintained_xbot_agent_required")
        if isinstance(agent.runner, CodexRunner):
            raise Conflict("synthetic_runner_required")
        agent.runner = TrackedRunner(agent.runner)
        return agent

    coordinator = Service(store, Config(data=path, codex_enabled=True), agent_factory=tracked_agent)

    async def resolver(authority, permission):
        return await service.resolve(token, authority, permission)

    adapter = lib.AsyncModuleAdapter(coordinator, resolver)
    authority = lib.Authority(
        binding.organization_id,
        binding.business_id,
        binding.environment_id,
        binding.site_id,
        frozenset({"xbot.configure", "xbot.read", "xbot.control"}),
    )
    await adapter.bind(authority, public, 0)
    await adapter.command(authority, {"request_id": ticket_id, "expected_revision": 1, "action": "enable"})
    job = store.enqueue(
        binding.site_id,
        "draft",
        ticket_id,
        {"title": "Local reviewed draft", "angle": "Use only current approved public facts"},
        0,
    )
    await service.bind_job(token, ticket, job["id"])
    result = await coordinator.run_once(binding.site_id)
    proposals = store.records(binding.site_id, "draft")
    totals = store.model_usage_totals(binding.site_id)
    usage = totals["usage"]
    status = (
        "known"
        if totals["known_receipts"] and not totals["unknown_receipts"]
        else "partial"
        if totals["known_receipts"]
        else "unknown"
    )
    proposal = proposals[0]["payload"] if proposals else {"state": result["state"]}
    # A retained draft record can precede the library's output validation or
    # survive a blocked job. Independent model approval is not acceptance.
    acceptable = bool(
        result["state"] == "completed"
        and proposals
        and proposal["review"]["approved"]
        and not proposal["review"]["unsupported_claims"]
        and all(type(i) is int and 0 <= i < len(public["facts"]) for i in proposal["draft"]["fact_indices"])
    )
    if acceptable:
        try:
            validate_text(proposal["draft"]["text"], public["allowed_urls"])
        except ValueError:
            acceptable = False
    if before_accept:
        await before_accept()
    return await service.complete(
        token,
        ticket,
        job_id=job["id"],
        proposal_sha256=digest(proposal),
        usage=usage,
        accepted=acceptable,
        usage_status=status,
    )
