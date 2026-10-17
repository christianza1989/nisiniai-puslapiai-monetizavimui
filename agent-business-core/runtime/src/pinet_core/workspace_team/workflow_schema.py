"""Exact additive 0044 provenance patch and owner-scoped workflow outbox."""
from .direct_preview_schema import AUTHOR_CHECK
from .episode_schema import NATIVE_BRANCH, normalized_check
from .workflow_models import TABLE

PROOF = "workspace_agent_workflow_origin"
AUTHOR = f"""(native_workflow_intent_id IS NULL AND ({AUTHOR_CHECK})) OR
 (native_workflow_intent_id IS NOT NULL AND native_episode_task_id IS NULL AND author_type='coordinator'
 AND kind='assignment' AND author_user_id IS NULL AND participant_id IS NOT NULL AND attempt_id IS NULL)"""
BRANCH = f"""IF NEW.native_workflow_intent_id IS NOT NULL THEN
          IF NOT public.{PROOF}(NEW.native_workflow_intent_id,NEW.id,NEW.task_id,NEW.source_revision,FALSE)
            THEN RAISE EXCEPTION 'exact explicit workflow origin required' USING ERRCODE='23514';END IF;
        ELSE
        {NATIVE_BRANCH}
        END IF;"""


def patch_fence(value, *, downgrade=False):
    value = value.replace("\r\n", "\n")
    before, after = (BRANCH, NATIVE_BRANCH) if downgrade else (NATIVE_BRANCH, BRANCH)
    if ("FUNCTION public.control_workspace_team_fence()" not in value or value.count(before) != 1
            or not downgrade and "NEW.native_workflow_intent_id" in value
            or "workspace_direct_team_check" not in value or "saved_agent" not in value):
        raise RuntimeError("Unknown or ambiguous 0044 workflow predecessor")
    return value.replace(before, after, 1)


def author_sql(rows, *, downgrade=False):
    before, after = (AUTHOR, AUTHOR_CHECK) if downgrade else (AUTHOR_CHECK, AUTHOR)
    expected = normalized_check(before)
    matches = [row for row in rows if normalized_check(row["expression"]) == expected]
    if expected is None or len(matches) != 1:
        raise RuntimeError("Unknown or ambiguous 0044 workflow author check")
    name = '"' + matches[0]["name"].replace('"', '""') + '"'
    return [f"ALTER TABLE control_workspace_team_events DROP CONSTRAINT {name}",
        f"ALTER TABLE control_workspace_team_events ADD CONSTRAINT {name} CHECK({after})"]


def proof_sql():
    return f"""CREATE FUNCTION {PROOF}(wid VARCHAR,eid VARCHAR,tid VARCHAR,src VARCHAR,admitting BOOLEAN) RETURNS BOOLEAN
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      SELECT EXISTS(SELECT 1 FROM public.{TABLE} w
      JOIN public.control_tasks p ON p.id=w.parent_task_id AND p.kind='workspace.team_turn' AND p.status='succeeded'
        AND p.session_id=w.session_id AND p.source_revision=w.source_revision
      JOIN public.control_tasks t ON t.id=w.planned_child_task_id
        AND t.kind='workspace.team_turn' AND t.thread_id=p.thread_id AND t.session_id=w.session_id
        AND t.source_revision=w.source_revision AND t.user_id=w.user_id AND t.organization_id=w.organization_id
        AND t.business_id=w.business_id AND t.environment_id=w.environment_id AND t.sequence>p.sequence
      JOIN public.control_workspace_team_turns tr ON tr.id=t.id AND tr.owner_event_id=w.origin_event_id
        AND tr.team_thread_id=w.team_thread_id AND tr.topic_id=w.topic_id AND tr.deadline<=w.deadline
        AND tr.agent_creation_id IS NULL AND tr.agent_purpose IS NULL
      JOIN public.control_workspace_team_events ev ON ev.id=eid AND ev.id=tr.owner_event_id AND ev.task_id=t.id
        AND ev.native_workflow_intent_id=w.id AND ev.reply_to_event_id=w.saved_event_id
        AND ev.author_type='coordinator' AND ev.kind='assignment' AND ev.content=t.message
        AND ev.source_revision=w.source_revision AND ev.attempt_id IS NULL AND ev.native_episode_task_id IS NULL
      JOIN public.control_workspace_calibration_allocations a ON a.task_id=t.id
        AND a.session_id=w.session_id AND a.source_revision=w.source_revision AND a.expires_at<=w.deadline
        AND a.plan->'snapshot'->>'agent_id'=w.agent_id AND a.plan->'snapshot'->>'config_revision_id'=w.config_revision_id
        AND a.plan->'snapshot'->>'config_sha256'=w.config_sha256
        AND a.plan->'snapshot'->>'config_revision'=w.config_revision::TEXT
        AND a.plan->'snapshot'->>'creation_id'=w.creation_id AND a.plan->>'scenario'='saved_example'
        AND jsonb_array_length(a.plan->'messages')=1
        AND a.plan->'protected_case_sha256'='null'::jsonb
      JOIN public.control_customer_agent_modules ag ON ag.id=w.agent_id AND ag.current_revision=w.config_revision
        AND ag.creation_id=w.creation_id AND ag.purpose=w.purpose AND ag.business_id=w.business_id AND ag.grant_id=w.grant_id
        AND ag.user_id=w.user_id AND ag.organization_id=w.organization_id
        AND ag.portfolio_id=w.portfolio_id AND ag.environment_id=w.environment_id
      JOIN public.control_sessions s ON s.id=w.session_id AND s.user_id=w.user_id
        AND s.environment_id=w.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
      WHERE w.id=wid AND t.id=tid AND w.origin_event_id=eid AND w.source_revision=src
        AND((w.state='dispatched' AND w.child_task_id=t.id)
          OR(admitting AND w.state='prepared' AND w.child_task_id IS NULL))
        AND w.cancelled_at IS NULL AND w.failure_code IS NULL
        AND w.deadline>clock_timestamp() AND t.status='queued' AND t.run_id IS NULL
        AND w.user_id=current_setting('pinet.control_user',true)
        AND w.environment_id=current_setting('pinet.environment',true)
        AND p.result->'agent_preparation'->>'agent_id'=w.agent_id
        AND p.result->'agent_preparation'->>'revision_id'=w.config_revision_id
        AND p.result->'agent_preparation'->>'sha256'=w.config_sha256
        AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['user_id','organization_id','portfolio_id','environment_id',
          'session_id','source_revision','creation_id','business_id','grant_id']) k
          WHERE a.plan->'scope'->>k IS DISTINCT FROM to_jsonb(w)->>k)
        AND NOT EXISTS(SELECT 1 FROM public.control_workspace_direct_chats d WHERE d.team_thread_id=w.team_thread_id))
      $$"""


def statements():
    owner = "user_id,organization_id,portfolio_id,environment_id"
    return [f"""CREATE TABLE {TABLE}(
      id VARCHAR PRIMARY KEY,{owner.replace(',', ' VARCHAR NOT NULL,')} VARCHAR NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,topic_id VARCHAR NOT NULL,team_thread_id VARCHAR NOT NULL,
      business_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,creation_id VARCHAR NOT NULL,purpose VARCHAR NOT NULL CHECK(purpose='site_chat'),
      session_id VARCHAR NOT NULL,source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
      idempotency_key VARCHAR NOT NULL,request_fingerprint VARCHAR NOT NULL CHECK(request_fingerprint~'^[a-f0-9]{{64}}$'),
      parent_task_id VARCHAR NOT NULL UNIQUE,planned_child_task_id VARCHAR NOT NULL UNIQUE,child_key VARCHAR NOT NULL UNIQUE,
      origin_event_id VARCHAR NOT NULL UNIQUE,provisioning_request_id VARCHAR NOT NULL,deadline TIMESTAMPTZ NOT NULL,
      state VARCHAR NOT NULL CHECK(state IN('pending','prepared','dispatched')),
      agent_id VARCHAR REFERENCES control_customer_agent_modules(id) ON DELETE RESTRICT,
      config_revision_id VARCHAR REFERENCES control_customer_agent_configs(id) ON DELETE RESTRICT,
      config_revision INTEGER,config_sha256 VARCHAR,saved_event_id VARCHAR REFERENCES control_workspace_team_events(id) ON DELETE RESTRICT,
      child_task_id VARCHAR,cancelled_at TIMESTAMPTZ,failure_code VARCHAR CHECK(failure_code~'^[a-z_]{{1,64}}$'),
      CHECK(coalesce(((state='pending' AND agent_id IS NULL AND config_revision_id IS NULL AND config_revision IS NULL
        AND config_sha256 IS NULL AND saved_event_id IS NULL AND child_task_id IS NULL)
        OR(state IN('prepared','dispatched') AND agent_id IS NOT NULL AND config_revision_id IS NOT NULL
          AND config_revision>=1 AND config_sha256~'^[a-f0-9]{{64}}$' AND saved_event_id IS NOT NULL
          AND((state='prepared' AND child_task_id IS NULL) OR(state='dispatched' AND child_task_id=planned_child_task_id)))),FALSE)),
      UNIQUE(id,{owner}),CONSTRAINT uq_workspace_workflow_request UNIQUE(user_id,environment_id,idempotency_key),
      FOREIGN KEY(parent_task_id,{owner}) REFERENCES control_workspace_team_turns(id,{owner}) ON DELETE RESTRICT,
      FOREIGN KEY(child_task_id,{owner}) REFERENCES control_workspace_team_turns(id,{owner}) ON DELETE RESTRICT,
      FOREIGN KEY(team_thread_id,{owner}) REFERENCES control_workspace_team_threads(id,{owner}) ON DELETE RESTRICT,
      FOREIGN KEY(creation_id,{owner}) REFERENCES control_creations(id,{owner}) ON DELETE RESTRICT,
      FOREIGN KEY(session_id,user_id,environment_id) REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)""",
      f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
      f"""CREATE POLICY workspace_workflow_owner ON {TABLE}
        USING(user_id=current_setting('pinet.control_user',true) AND environment_id=current_setting('pinet.environment',true)
          AND EXISTS(SELECT 1 FROM control_workspace_team_turns tr WHERE tr.id={TABLE}.parent_task_id
            AND tr.user_id={TABLE}.user_id AND tr.organization_id={TABLE}.organization_id
            AND tr.portfolio_id={TABLE}.portfolio_id AND tr.environment_id={TABLE}.environment_id))
        WITH CHECK(user_id=current_setting('pinet.control_user',true) AND environment_id=current_setting('pinet.environment',true))""",
      f"REVOKE ALL ON {TABLE} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {TABLE} TO pinet_runtime",
      f"GRANT UPDATE(state,agent_id,config_revision_id,config_revision,config_sha256,saved_event_id,child_task_id,cancelled_at,failure_code) ON {TABLE} TO pinet_runtime",
      proof_sql(), f"REVOKE ALL ON FUNCTION {PROOF}(VARCHAR,VARCHAR,VARCHAR,VARCHAR,BOOLEAN) FROM PUBLIC",
      f"GRANT EXECUTE ON FUNCTION {PROOF}(VARCHAR,VARCHAR,VARCHAR,VARCHAR,BOOLEAN) TO pinet_runtime",
      f"""CREATE FUNCTION workspace_agent_workflow_fence() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER
      SET search_path=pg_catalog,public AS $$DECLARE p public.control_tasks%ROWTYPE;BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'retained workflow is immutable' USING ERRCODE='23514';END IF;
      SELECT * INTO p FROM public.control_tasks WHERE id=NEW.parent_task_id;
      IF NOT FOUND OR p.kind<>'workspace.team_turn' OR p.user_id<>NEW.user_id OR p.organization_id<>NEW.organization_id
        OR p.business_id<>NEW.business_id OR p.environment_id<>NEW.environment_id OR p.session_id<>NEW.session_id
        OR p.source_revision<>NEW.source_revision OR p.idempotency_key<>NEW.idempotency_key
        OR p.fingerprint<>NEW.request_fingerprint
        OR NOT EXISTS(SELECT 1 FROM public.control_workspace_team_turns tr
          JOIN public.control_workspace_team_threads th ON th.id=tr.team_thread_id
          WHERE tr.id=p.id AND tr.team_thread_id=NEW.team_thread_id AND tr.topic_id=NEW.topic_id
            AND tr.portfolio_id=NEW.portfolio_id AND tr.agent_creation_id=NEW.creation_id AND tr.agent_purpose=NEW.purpose
            AND th.business_id=NEW.business_id AND th.grant_id=NEW.grant_id)
        THEN RAISE EXCEPTION 'exact workflow parent scope required' USING ERRCODE='23514';END IF;
      IF TG_OP='INSERT' THEN
        IF NEW.state<>'pending' OR NEW.cancelled_at IS NOT NULL OR NEW.failure_code IS NOT NULL
          OR p.status<>'queued' OR p.run_id IS NOT NULL OR abs(extract(epoch FROM NEW.created_at-clock_timestamp()))>1
          OR NEW.deadline<=clock_timestamp() OR NEW.deadline>NEW.created_at+INTERVAL '24 hours'
          OR NOT EXISTS(SELECT 1 FROM public.control_workspace_team_turns tr WHERE tr.id=p.id
            AND tr.context IS NULL AND tr.deadline>=NEW.deadline)
          OR EXISTS(SELECT 1 FROM public.control_workspace_direct_chats d WHERE d.team_thread_id=NEW.team_thread_id)
          OR NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id
            AND s.environment_id=NEW.environment_id AND s.revoked_at IS NULL AND s.expires_at>=NEW.deadline)
          THEN RAISE EXCEPTION 'new explicit current workflow required' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF(to_jsonb(NEW)-ARRAY['state','agent_id','config_revision_id','config_revision','config_sha256','saved_event_id','child_task_id','cancelled_at','failure_code'])
        IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['state','agent_id','config_revision_id','config_revision','config_sha256','saved_event_id','child_task_id','cancelled_at','failure_code'])
        OR OLD.cancelled_at IS NOT NULL OR OLD.failure_code IS NOT NULL
        OR(NEW.cancelled_at IS NOT NULL AND NEW.cancelled_at>clock_timestamp())
        THEN RAISE EXCEPTION 'immutable workflow intent required' USING ERRCODE='23514';END IF;
      IF NEW.state=OLD.state THEN
        IF(to_jsonb(NEW)-ARRAY['cancelled_at','failure_code']) IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['cancelled_at','failure_code'])
          OR(NEW.cancelled_at IS NULL AND NEW.failure_code IS NULL)
          THEN RAISE EXCEPTION 'only one terminal workflow refusal allowed' USING ERRCODE='23514';END IF;
      ELSIF OLD.state='pending' AND NEW.state='prepared' THEN
        IF NEW.cancelled_at IS NOT NULL OR NEW.failure_code IS NOT NULL OR p.status<>'running' OR p.run_id IS NULL
          OR p.lease_until IS NULL OR p.lease_until<=clock_timestamp() OR NEW.deadline<=clock_timestamp()
          OR NOT EXISTS(SELECT 1 FROM public.control_customer_agent_modules a
            JOIN public.control_customer_agent_configs c ON c.agent_id=a.id AND c.id=NEW.config_revision_id
            JOIN public.control_workspace_team_events ev ON ev.id=NEW.saved_event_id AND ev.task_id=p.id
            JOIN public.control_workspace_team_attempts at ON at.id=ev.attempt_id AND at.task_id=p.id
            WHERE a.id=NEW.agent_id AND a.creation_id=NEW.creation_id AND a.purpose=NEW.purpose
              AND a.user_id=NEW.user_id AND a.organization_id=NEW.organization_id AND a.portfolio_id=NEW.portfolio_id
              AND a.environment_id=NEW.environment_id AND a.business_id=NEW.business_id AND a.grant_id=NEW.grant_id
              AND c.user_id=NEW.user_id AND c.organization_id=NEW.organization_id AND c.portfolio_id=NEW.portfolio_id
              AND c.environment_id=NEW.environment_id AND c.revision=NEW.config_revision AND a.current_revision=c.revision
              AND c.config_sha256=NEW.config_sha256 AND c.saved_source_revision=NEW.source_revision
              AND c.authorizing_session_id=NEW.session_id AND c.idempotency_key=NEW.provisioning_request_id
              AND ev.author_type='coordinator' AND ev.kind='answer' AND ev.source_revision=NEW.source_revision
              AND at.phase='plan' AND at.state='succeeded' AND at.run_id=p.run_id AND at.source_revision=p.source_revision)
          THEN RAISE EXCEPTION 'exact committed draft receipt required' USING ERRCODE='23514';END IF;
      ELSIF OLD.state='prepared' AND NEW.state='dispatched' THEN
        IF(to_jsonb(NEW)-ARRAY['state','child_task_id']) IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['state','child_task_id'])
          OR NEW.child_task_id IS DISTINCT FROM NEW.planned_child_task_id
          OR NOT public.{PROOF}(NEW.id,NEW.origin_event_id,NEW.child_task_id,NEW.source_revision,TRUE)
          THEN RAISE EXCEPTION 'exact one-time native child required' USING ERRCODE='23514';END IF;
      ELSE RAISE EXCEPTION 'invalid workflow transition' USING ERRCODE='23514';END IF;
      RETURN NEW;END$$""",
      "REVOKE ALL ON FUNCTION workspace_agent_workflow_fence() FROM PUBLIC",
      f"CREATE TRIGGER workspace_agent_workflow_fence BEFORE INSERT OR UPDATE OR DELETE ON {TABLE} FOR EACH ROW EXECUTE FUNCTION workspace_agent_workflow_fence()"]
