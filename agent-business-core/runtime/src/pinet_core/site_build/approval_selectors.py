"""Exact approved-build identity lookup, retaining the historical bounded registry."""
from sqlalchemy import text

SIGNATURE = "control_site_build_candidates(varchar,varchar)"


def statements():
    yield """CREATE FUNCTION control_site_build_candidates(e VARCHAR,target VARCHAR)
      RETURNS TABLE(creation_id VARCHAR,user_id VARCHAR)
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT a.creation_id,a.user_id FROM public.control_business_build_approvals a
      JOIN public.control_business_discoveries d ON d.id=a.discovery_id
        AND d.user_id=a.user_id AND d.organization_id=a.organization_id
        AND d.portfolio_id=a.portfolio_id AND d.environment_id=a.environment_id
      WHERE a.environment_id=e AND (e='local' OR e LIKE 'test-%') AND a.creation_id=target
        AND d.status='build_started' AND d.linked_creation_id=a.creation_id
        AND NOT EXISTS(SELECT 1 FROM public.control_creation_archives x
                       WHERE x.creation_id=a.creation_id AND x.environment_id=e)
      ORDER BY a.created_at,a.id LIMIT 1 $$"""
    yield "REVOKE ALL ON FUNCTION control_site_build_candidates(VARCHAR,VARCHAR) FROM PUBLIC"
    yield "GRANT EXECUTE ON FUNCTION control_site_build_candidates(VARCHAR,VARCHAR) TO pinet_runtime"


async def ready(tx):
    return bool(await tx.scalar(text("SELECT to_regprocedure(:signature) IS NOT NULL"), {"signature": SIGNATURE}))


async def selected(tx, environment, target):
    return (await tx.execute(text("SELECT * FROM control_site_build_candidates(:e,:target)"),
        {"e": environment, "target": target})).mappings().first()
