"""Safe approved-build identity discovery; no tenant data or provider mutation."""
from alembic import op

revision = "0030_site_build_candidates"
down_revision = "0029_business_discovery"


def upgrade():
    op.execute("""CREATE FUNCTION control_site_build_candidates(e VARCHAR)
      RETURNS TABLE(creation_id VARCHAR,user_id VARCHAR)
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT a.creation_id,a.user_id FROM public.control_business_build_approvals a
      JOIN public.control_business_discoveries d ON d.id=a.discovery_id
        AND d.user_id=a.user_id AND d.organization_id=a.organization_id
        AND d.portfolio_id=a.portfolio_id AND d.environment_id=a.environment_id
      WHERE a.environment_id=e AND (e='local' OR e LIKE 'test-%')
        AND d.status='build_started' AND d.linked_creation_id=a.creation_id
        AND NOT EXISTS(SELECT 1 FROM public.control_creation_archives x
                       WHERE x.creation_id=a.creation_id AND x.environment_id=e)
      ORDER BY a.created_at,a.id LIMIT 100 $$""")
    op.execute("REVOKE ALL ON FUNCTION control_site_build_candidates(VARCHAR) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION control_site_build_candidates(VARCHAR) TO pinet_runtime")


def downgrade():
    op.execute("DROP FUNCTION control_site_build_candidates(VARCHAR)")
