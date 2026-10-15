"""Bounded owner-RLS scans and additive exact-parent candidate lookups."""
from sqlalchemy import select, text

from ..business_discovery.models import BuildApproval, Discovery
from ..creation.models import Creation
from ..tasks.codex_transport import RunnerError
from . import approval_selectors

PAGE_SIZE = 8
KINDS = {"discovery": ("control_discovery_candidates", "control_business_discovery_jobs", "discovery_id"),
    "creation": ("control_creation_candidates", "control_creation_jobs", "creation_id"),
    "guide": ("control_content_work_candidates", "control_content_work_jobs", "creation_id")}


def statements():
    # Preserve the one-argument registry and its existing eligibility, including
    # running leases belonging to just-revoked actors. Filter before the limit.
    for function, table, parent in KINDS.values():
        yield f"""CREATE FUNCTION {function}(e VARCHAR,target VARCHAR)
          RETURNS TABLE(id VARCHAR,user_id VARCHAR,status VARCHAR,lease_until TIMESTAMPTZ)
          LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
          SELECT j.id,j.user_id,j.status,j.lease_until FROM public.{table} j
          WHERE j.environment_id=e AND (e='local' OR e LIKE 'test-%')
          AND j.{parent}=target AND j.status IN('queued','running')
          AND ((j.status='running' AND j.lease_until>now()) OR EXISTS(
            SELECT 1 FROM public.control_users u JOIN public.control_customer_accounts a
              ON a.user_id=u.id AND a.environment_id=u.environment_id
            JOIN public.control_memberships m ON m.user_id=u.id AND m.environment_id=u.environment_id
            JOIN public.control_portfolios p ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
            JOIN public.control_sessions s ON s.user_id=u.id AND s.environment_id=u.environment_id
            WHERE u.id=j.user_id AND u.environment_id=j.environment_id AND u.enabled AND a.verified_at IS NOT NULL
            AND m.enabled AND m.role='owner' AND m.organization_id=j.organization_id AND p.id=j.portfolio_id
            AND s.id=j.session_id AND s.revoked_at IS NULL AND s.expires_at>now()))
          ORDER BY CASE WHEN j.status='running' THEN 0 ELSE 1 END,j.created_at,j.id LIMIT 20 $$"""
        yield f"REVOKE ALL ON FUNCTION {function}(VARCHAR,VARCHAR) FROM PUBLIC"
        yield f"GRANT EXECUTE ON FUNCTION {function}(VARCHAR,VARCHAR) TO pinet_runtime"


async def ready(tx):
    if not await approval_selectors.ready(tx):
        return False
    return all([await tx.scalar(text("SELECT to_regprocedure(:signature) IS NOT NULL"),
        {"signature": function+"(varchar,varchar)"}) for function, _, _ in KINDS.values()])


async def selected(tx, kind, environment, target):
    function = KINDS[kind][0]
    if not await tx.scalar(text("SELECT to_regprocedure(:signature) IS NOT NULL"),
        {"signature": function+"(varchar,varchar)"}):
        raise RunnerError("runner_unavailable")
    return (await tx.execute(text(f"SELECT * FROM {function}(:e,:target)"),
        {"e": environment, "target": target})).mappings().all()


async def page(tx, kind, actor, environment, after):
    if kind == "discovery":
        identity = Discovery.id
        query = select(identity).where(Discovery.user_id == actor, Discovery.environment_id == environment,
            Discovery.status.in_(("queued", "running")), Discovery.active_job_id.is_not(None))
    else:
        identity = Creation.id
        query = select(identity).join(BuildApproval, BuildApproval.creation_id == Creation.id).where(
            Creation.user_id == actor, Creation.environment_id == environment,
            Creation.status.in_(("queued", "running", "draft_ready")))
    if after is not None:
        query = query.where(identity > after)
    return list(await tx.scalars(query.order_by(identity).limit(PAGE_SIZE)))
