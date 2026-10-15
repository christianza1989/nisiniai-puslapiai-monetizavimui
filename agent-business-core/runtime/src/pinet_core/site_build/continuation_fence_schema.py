"""Additional deferred actor fence; historical continuation rows/schema stay intact."""
from .continuation_schema import TABLE


def statements():
    return ["""CREATE FUNCTION control_build_continuation_actor_fence() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$BEGIN
      IF NOT EXISTS(SELECT 1 FROM public.control_sessions s JOIN public.control_users u
          ON u.id=s.user_id AND u.environment_id=s.environment_id
          JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id
          WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id AND s.environment_id=NEW.environment_id
          AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND u.enabled AND a.verified_at IS NOT NULL)
        OR NOT EXISTS(SELECT 1 FROM public.control_memberships m JOIN public.control_portfolios p
          ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
          WHERE m.user_id=NEW.user_id AND m.organization_id=NEW.organization_id
          AND m.environment_id=NEW.environment_id AND m.enabled AND m.role='owner' AND p.id=NEW.portfolio_id)
        THEN RAISE EXCEPTION 'current continuation actor required' USING ERRCODE='23514';END IF;
      RETURN NEW;END$$""",
      "REVOKE ALL ON FUNCTION control_build_continuation_actor_fence() FROM PUBLIC",
      f"CREATE CONSTRAINT TRIGGER build_continuation_actor_fence AFTER INSERT ON {TABLE} "
      "DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_build_continuation_actor_fence()"]
