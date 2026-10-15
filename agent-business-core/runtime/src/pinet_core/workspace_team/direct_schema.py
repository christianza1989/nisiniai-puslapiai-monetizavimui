"""Additive direct-chat scope and exact known legacy-provenance migration anchors.

No statement is executed on import. The integrating owner runs the migration on
dedicated QA before serving adoption; static tests do not establish PostgreSQL RLS.
"""
from .episode_schema import NATIVE_BRANCH, normalized_check

TABLE = "control_workspace_direct_chats"
KIND = "workspace.direct_turn"
OWNER = "user_id,organization_id,portfolio_id,environment_id"
ENTRY = """BEGIN
      IF TG_TABLE_NAME='control_workspace_team_threads' THEN SELECT * INTO th FROM public.control_workspace_team_threads WHERE id=NEW.id;"""
ROUTE = """BEGIN
      IF TG_TABLE_NAME='control_workspace_team_attempts' AND to_jsonb(NEW)->>'phase'='direct'
        AND NOT EXISTS(SELECT 1 FROM public.control_workspace_direct_chats c WHERE c.team_thread_id=to_jsonb(NEW)->>'team_thread_id') THEN
        RAISE EXCEPTION 'direct phase needs its exact direct chat' USING ERRCODE='23514';
      END IF;
      IF EXISTS(SELECT 1 FROM public.control_workspace_direct_chats c WHERE c.team_thread_id=
        CASE WHEN TG_TABLE_NAME='control_workspace_team_threads' THEN to_jsonb(NEW)->>'id' ELSE to_jsonb(NEW)->>'team_thread_id' END) THEN
        PERFORM public.workspace_direct_team_check(TG_TABLE_NAME,to_jsonb(NEW));
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME='control_workspace_team_threads' THEN SELECT * INTO th FROM public.control_workspace_team_threads WHERE id=NEW.id;"""


def patch_team_fence(definition, *, downgrade=False):
    """One known entry only; all old business/session/native branches survive verbatim."""
    definition = definition.replace("\r\n", "\n")
    before, after = (ROUTE, ENTRY) if downgrade else (ENTRY, ROUTE)
    if ("FUNCTION public.control_workspace_team_fence()" not in definition or definition.count(before) != 1
            or definition.count(NATIVE_BRANCH) != 1
            or not downgrade and "workspace_direct_team_check" in definition):
        raise RuntimeError("Unknown or ambiguous current team fence")
    return definition.replace(before, after, 1)


OLD_PHASE = "(ordinal=1 AND phase='plan') OR (ordinal=2 AND phase='adviser') OR (ordinal=3 AND phase='synthesis')"
NEW_PHASE = "(" + OLD_PHASE + ") OR (ordinal=1 AND phase='direct')"


def phase_check_sql(rows, *, downgrade=False):
    before, after = (NEW_PHASE, OLD_PHASE) if downgrade else (OLD_PHASE, NEW_PHASE)
    matches = [row for row in rows if normalized_check(row["expression"], numeric=True) == normalized_check(before, numeric=True)]
    if len(matches) != 1:
        raise RuntimeError("Unknown or ambiguous current ordinal/phase CHECK")
    name = '"' + matches[0]["name"].replace('"', '""') + '"'
    return [f"ALTER TABLE control_workspace_team_attempts DROP CONSTRAINT {name}",
        f"ALTER TABLE control_workspace_team_attempts ADD CONSTRAINT {name} CHECK({after})"]


def ddl():
    return f"""CREATE TABLE {TABLE}(
      id VARCHAR PRIMARY KEY,{OWNER.replace(',', ' VARCHAR NOT NULL,')} VARCHAR NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,parent_topic_id VARCHAR NOT NULL,child_topic_id VARCHAR NOT NULL UNIQUE,
      team_thread_id VARCHAR NOT NULL UNIQUE,task_thread_id VARCHAR NOT NULL UNIQUE,
      business_id VARCHAR,grant_id VARCHAR,mode VARCHAR NOT NULL CHECK(mode IN('consultant','agent_preview')),
      recipient JSONB NOT NULL CHECK(jsonb_typeof(recipient)='object'),recipient_sha256 VARCHAR NOT NULL CHECK(recipient_sha256~'^[a-f0-9]{{64}}$'),
      execution_scope JSONB NOT NULL CHECK(jsonb_typeof(execution_scope)='object'),execution_sha256 VARCHAR NOT NULL CHECK(execution_sha256~'^[a-f0-9]{{64}}$'),
      session_id VARCHAR NOT NULL,source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
      idempotency_key VARCHAR NOT NULL,request_fingerprint VARCHAR NOT NULL CHECK(request_fingerprint~'^[a-f0-9]{{64}}$'),
      CHECK(parent_topic_id<>child_topic_id),UNIQUE(id,{OWNER}),UNIQUE(user_id,environment_id,idempotency_key),
      FOREIGN KEY(parent_topic_id,{OWNER}) REFERENCES control_workspace_topics(id,{OWNER}) ON DELETE RESTRICT,
      FOREIGN KEY(child_topic_id,{OWNER}) REFERENCES control_workspace_topics(id,{OWNER}) ON DELETE RESTRICT,
      CONSTRAINT fk_direct_team_scope FOREIGN KEY(team_thread_id,{OWNER}) REFERENCES control_workspace_team_threads(id,{OWNER}) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
      CONSTRAINT fk_direct_task_scope FOREIGN KEY(task_thread_id,organization_id,user_id,environment_id)
        REFERENCES control_task_threads(id,organization_id,user_id,environment_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
      FOREIGN KEY(session_id,user_id,environment_id) REFERENCES control_sessions(id,user_id,environment_id),
      CHECK(coalesce((execution_scope->>'portfolio_id'=portfolio_id AND execution_scope->>'parent_topic_id'=parent_topic_id
        AND ((execution_scope->>'kind'='workspace' AND business_id IS NULL AND grant_id IS NULL AND mode='consultant'
          AND execution_scope->'anchor'->>'kind' IN('portfolio','creation','discovery'))
        OR(execution_scope->>'kind'='business' AND business_id IS NOT NULL AND grant_id IS NOT NULL
          AND execution_scope->>'business_id'=business_id AND execution_scope->>'grant_id'=grant_id))),FALSE)),
      CHECK(coalesce((recipient->>'configuration_sha256'~'^[a-f0-9]{{64}}$' AND (
        (mode='consultant' AND recipient->>'kind'='consultant' AND recipient->>'role' IN('coordinator','adviser')
          AND recipient->>'capability_id'=CASE WHEN recipient->>'role'='coordinator' THEN 'workspace.consult_coordinator.v1' ELSE 'workspace.business_adviser.v1' END)
        OR(mode='agent_preview' AND recipient->>'kind'='saved_agent' AND execution_scope->>'kind'='business'))),FALSE))
    )"""


def parent_function():
    # No query of TABLE here: its own RLS may call this function without recursion.
    return """CREATE FUNCTION workspace_direct_parent(j JSONB,active BOOLEAN) RETURNS BOOLEAN
      LANGUAGE SQL STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      SELECT coalesce(EXISTS(
        SELECT 1 FROM public.control_workspace_topics p
        JOIN public.control_portfolios po ON po.id=p.portfolio_id AND po.organization_id=p.organization_id AND po.environment_id=p.environment_id
        JOIN public.control_users u ON u.id=p.user_id AND u.environment_id=p.environment_id AND u.enabled
        JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id AND a.verified_at IS NOT NULL
        JOIN public.control_memberships m ON m.user_id=u.id AND m.organization_id=p.organization_id AND m.environment_id=p.environment_id
          AND m.enabled AND m.role='owner'
        WHERE p.id=j->>'parent_topic_id' AND p.user_id=j->>'user_id' AND p.organization_id=j->>'organization_id'
          AND p.portfolio_id=j->>'portfolio_id' AND p.environment_id=j->>'environment_id'
          AND p.user_id=current_setting('pinet.control_user',true) AND p.environment_id=current_setting('pinet.environment',true)
          AND(NOT active OR p.archived_at IS NULL)
          AND ((j->'execution_scope'->>'kind'='workspace' AND j->>'business_id' IS NULL AND j->>'grant_id' IS NULL
              AND j->>'mode'='consultant' AND j->'recipient'->>'kind'='consultant'
              AND p.anchor_kind=j->'execution_scope'->'anchor'->>'kind'
              AND j->'execution_scope'->'anchor'->>'selection_id'=CASE p.anchor_kind
                WHEN 'portfolio' THEN p.portfolio_id WHEN 'creation' THEN p.creation_id WHEN 'discovery' THEN p.discovery_id END
              AND (p.anchor_kind='portfolio' OR(p.anchor_kind='creation' AND EXISTS(SELECT 1 FROM public.control_creations cr
                WHERE cr.id=p.creation_id AND cr.user_id=p.user_id AND cr.organization_id=p.organization_id
                  AND cr.portfolio_id=p.portfolio_id AND cr.environment_id=p.environment_id))
                OR(p.anchor_kind='discovery' AND EXISTS(SELECT 1 FROM public.control_business_discoveries d
                WHERE d.id=p.discovery_id AND d.user_id=p.user_id AND d.organization_id=p.organization_id
                  AND d.portfolio_id=p.portfolio_id AND d.environment_id=p.environment_id))))
            OR(j->'execution_scope'->>'kind'='business' AND p.anchor_kind='business'
              AND p.business_id=j->>'business_id' AND p.grant_id=j->>'grant_id'
              AND EXISTS(SELECT 1 FROM public.control_business_grants g WHERE g.id=p.grant_id AND g.business_id=p.business_id
                AND g.organization_id=p.organization_id AND g.portfolio_id=p.portfolio_id AND g.environment_id=p.environment_id AND g.enabled)))
      ),FALSE) $$"""


def policies():
    values = [parent_function(),
        "REVOKE ALL ON FUNCTION workspace_direct_parent(JSONB,BOOLEAN) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION workspace_direct_parent(JSONB,BOOLEAN) TO pinet_runtime",
        f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
        f"CREATE POLICY direct_parent_scope ON {TABLE} USING(workspace_direct_parent(to_jsonb({TABLE}),FALSE)) WITH CHECK(workspace_direct_parent(to_jsonb({TABLE}),TRUE))",
        f"REVOKE ALL ON {TABLE} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {TABLE} TO pinet_runtime",
        """CREATE FUNCTION workspace_direct_immutable() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
          BEGIN RAISE EXCEPTION 'immutable direct binding' USING ERRCODE='23514';END$$""",
        "REVOKE ALL ON FUNCTION workspace_direct_immutable() FROM PUBLIC",
        f"CREATE TRIGGER direct_binding_immutable BEFORE UPDATE OR DELETE ON {TABLE} FOR EACH ROW EXECUTE FUNCTION workspace_direct_immutable()"]
    for table in ("control_task_threads", "control_tasks", "control_task_runs", "control_task_events"):
        field = "id" if table == "control_task_threads" else "thread_id" if table == "control_tasks" else None
        match = f"c.task_thread_id={table}.{field}" if field else f"EXISTS(SELECT 1 FROM public.control_tasks t WHERE t.id={table}.task_id AND t.thread_id=c.task_thread_id AND t.kind='{KIND}')"
        condition = f"""{table}.business_id IS NULL AND {table}.user_id=current_setting('pinet.control_user',true)
          AND {table}.environment_id=current_setting('pinet.environment',true)
          AND EXISTS(SELECT 1 FROM public.{TABLE} c WHERE {match} AND c.business_id IS NULL
            AND c.user_id={table}.user_id AND c.organization_id={table}.organization_id AND c.environment_id={table}.environment_id
            AND c.execution_scope->>'kind'='workspace' AND c.mode='consultant')"""
        values.append(f"CREATE POLICY direct_workspace_scope ON {table} USING({condition}) WITH CHECK({condition})")
    for table in ("control_workspace_team_threads", "control_workspace_team_members", "control_workspace_team_turns", "control_workspace_team_attempts", "control_workspace_team_events"):
        match = f"c.team_thread_id={table}." + ("id" if table.endswith("_threads") else "team_thread_id")
        condition = f"""{table}.user_id=current_setting('pinet.control_user',true) AND {table}.environment_id=current_setting('pinet.environment',true)
          AND EXISTS(SELECT 1 FROM public.{TABLE} c WHERE {match} AND c.mode='consultant' AND c.execution_scope->>'kind'='workspace'
            AND c.business_id IS NULL AND c.user_id={table}.user_id AND c.organization_id={table}.organization_id
            AND c.portfolio_id={table}.portfolio_id AND c.environment_id={table}.environment_id)"""
        values.append(f"CREATE POLICY direct_workspace_scope ON {table} USING({condition}) WITH CHECK({condition})")
    return values


def guard_functions():
    task_guard = f"""CREATE FUNCTION workspace_direct_task_fence() RETURNS TRIGGER
      LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      DECLARE c public.{TABLE}%ROWTYPE;t public.control_tasks%ROWTYPE;native public.control_task_threads%ROWTYPE;
        terminal_failure BOOLEAN=FALSE;rid VARCHAR;BEGIN
      IF TG_TABLE_NAME='control_task_threads' THEN
        SELECT * INTO c FROM public.{TABLE} WHERE task_thread_id=NEW.id;
        IF NOT FOUND THEN
          IF NEW.business_id IS NULL THEN RAISE EXCEPTION 'NULL task thread needs exact workspace chat' USING ERRCODE='23514';END IF;
          RETURN NEW;
        END IF;
        IF NEW.business_id IS DISTINCT FROM c.business_id OR NEW.user_id<>c.user_id OR NEW.organization_id<>c.organization_id
          OR NEW.environment_id<>c.environment_id OR NOT public.workspace_direct_parent(to_jsonb(c),TRUE)
          THEN RAISE EXCEPTION 'exact current direct thread required' USING ERRCODE='23514';END IF;
        IF TG_OP='UPDATE' AND ((to_jsonb(NEW)-'last_sequence')<>(to_jsonb(OLD)-'last_sequence')
          OR NEW.last_sequence<>OLD.last_sequence+1) THEN RAISE EXCEPTION 'immutable direct thread scope' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME='control_tasks' THEN t=NEW;
      ELSE SELECT * INTO t FROM public.control_tasks WHERE id=NEW.task_id;END IF;
      IF t.id IS NULL THEN RAISE EXCEPTION 'exact task parent required' USING ERRCODE='23514';END IF;
      SELECT * INTO c FROM public.{TABLE} WHERE task_thread_id=t.thread_id;
      IF NOT FOUND THEN
        IF t.business_id IS NULL OR NEW.business_id IS NULL OR t.kind='{KIND}'
          THEN RAISE EXCEPTION 'workspace execution cannot downgrade a business task' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF t.kind<>'{KIND}' OR t.business_id IS DISTINCT FROM c.business_id OR NEW.business_id IS DISTINCT FROM c.business_id
        OR t.user_id<>c.user_id OR t.organization_id<>c.organization_id OR t.environment_id<>c.environment_id
        OR NEW.user_id<>c.user_id OR NEW.organization_id<>c.organization_id OR NEW.environment_id<>c.environment_id
        OR c.mode<>'consultant' OR c.recipient->>'kind'<>'consultant'
        OR c.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR c.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        THEN RAISE EXCEPTION 'exact direct consultant task scope required' USING ERRCODE='23514';END IF;
      SELECT * INTO native FROM public.control_task_threads WHERE id=c.task_thread_id;
      IF NOT FOUND OR native.business_id IS DISTINCT FROM c.business_id OR native.user_id<>c.user_id
        OR native.organization_id<>c.organization_id OR native.environment_id<>c.environment_id
        THEN RAISE EXCEPTION 'exact NULL-safe task thread parent required' USING ERRCODE='23514';END IF;
      terminal_failure=t.status IN('failed','cancelled') AND t.result IS NULL;
      IF NOT terminal_failure AND(NOT public.workspace_direct_parent(to_jsonb(c),TRUE)
        OR NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=t.session_id AND s.user_id=t.user_id
          AND s.environment_id=t.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()))
        THEN RAISE EXCEPTION 'current direct task authority required' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='control_tasks' AND TG_OP='UPDATE' AND
        (to_jsonb(NEW)-ARRAY['status','result','failure_code','run_id','lease_until','updated_at','event_sequence'])<>
        (to_jsonb(OLD)-ARRAY['status','result','failure_code','run_id','lease_until','updated_at','event_sequence'])
        THEN RAISE EXCEPTION 'immutable direct task request' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='control_task_runs' THEN
        IF NEW.id IS DISTINCT FROM t.run_id OR NEW.model<>'gpt-6.1-sol' OR NEW.effort<>'high'
          OR NEW.adapter_revision<>'codex-workspace-direct.v1'
          THEN RAISE EXCEPTION 'source-fixed direct run required' USING ERRCODE='23514';END IF;
        IF TG_OP='UPDATE' AND(to_jsonb(NEW)-ARRAY['status','finished_at','usage','cost_microusd'])<>
          (to_jsonb(OLD)-ARRAY['status','finished_at','usage','cost_microusd'])
          THEN RAISE EXCEPTION 'immutable direct run binding' USING ERRCODE='23514';END IF;
      END IF;
      IF TG_TABLE_NAME='control_task_events' AND (NEW.status<>t.status OR NEW.sequence>t.event_sequence)
        THEN RAISE EXCEPTION 'exact direct task state event required' USING ERRCODE='23514';END IF;
      RETURN NEW;END$$"""
    team_guard = f"""CREATE FUNCTION workspace_direct_team_check(tbl VARCHAR,j JSONB) RETURNS VOID
      LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      DECLARE c public.{TABLE}%ROWTYPE;th public.control_workspace_team_threads%ROWTYPE;p public.control_workspace_topics%ROWTYPE;
        child public.control_workspace_topics%ROWTYPE;t public.control_tasks%ROWTYPE;tr public.control_workspace_team_turns%ROWTYPE;
        a public.control_workspace_team_attempts%ROWTYPE;mx BIGINT;ct BIGINT;tid VARCHAR;BEGIN
      IF tbl='{TABLE}' THEN SELECT * INTO c FROM public.{TABLE} WHERE id=j->>'id';
      ELSE SELECT * INTO c FROM public.{TABLE} WHERE team_thread_id=
        CASE WHEN tbl='control_workspace_team_threads' THEN j->>'id' ELSE j->>'team_thread_id' END;END IF;
      IF c.id IS NULL OR NOT public.workspace_direct_parent(to_jsonb(c),TRUE)
        THEN RAISE EXCEPTION 'current owned direct chat required' USING ERRCODE='23514';END IF;
      SELECT * INTO th FROM public.control_workspace_team_threads WHERE id=c.team_thread_id;
      SELECT * INTO p FROM public.control_workspace_topics WHERE id=c.parent_topic_id;
      SELECT * INTO child FROM public.control_workspace_topics WHERE id=c.child_topic_id;
      IF EXISTS(SELECT 1 FROM public.{TABLE} other WHERE other.child_topic_id=c.parent_topic_id)
        THEN RAISE EXCEPTION 'direct child cannot become an ordinary parent topic' USING ERRCODE='23514';END IF;
      IF th.id IS NULL OR p.id IS NULL OR child.id IS NULL OR child.id=p.id OR child.archived_at IS NOT NULL
        OR th.topic_id<>child.id OR th.task_thread_id<>c.task_thread_id OR th.business_id IS DISTINCT FROM c.business_id
        OR th.grant_id IS DISTINCT FROM c.grant_id OR th.user_id<>c.user_id OR th.organization_id<>c.organization_id
        OR th.portfolio_id<>c.portfolio_id OR th.environment_id<>c.environment_id
        OR child.user_id<>c.user_id OR child.organization_id<>c.organization_id OR child.portfolio_id<>c.portfolio_id OR child.environment_id<>c.environment_id
        OR(c.execution_scope->>'kind'='workspace' AND(child.anchor_kind<>p.anchor_kind
          OR child.creation_id IS DISTINCT FROM p.creation_id OR child.discovery_id IS DISTINCT FROM p.discovery_id
          OR child.business_id IS NOT NULL OR child.grant_id IS NOT NULL))
        OR(c.execution_scope->>'kind'='business' AND(child.anchor_kind<>'business'
          OR child.business_id IS DISTINCT FROM c.business_id OR child.grant_id IS DISTINCT FROM c.grant_id))
        THEN RAISE EXCEPTION 'exact immutable NULL-safe direct graph required' USING ERRCODE='23514';END IF;
      SELECT coalesce(max(sequence),0),count(*) INTO mx,ct FROM public.control_workspace_team_events WHERE team_thread_id=th.id;
      IF th.event_sequence<>mx OR mx<>ct THEN RAISE EXCEPTION 'exact direct history clock required' USING ERRCODE='23514';END IF;
      IF(SELECT count(*) FROM public.control_workspace_team_members WHERE team_thread_id=th.id)<>2
        THEN RAISE EXCEPTION 'source-fixed direct member graph required' USING ERRCODE='23514';END IF;
      IF EXISTS(SELECT 1 FROM public.control_workspace_team_members m WHERE m.team_thread_id=th.id AND(
        m.role NOT IN('coordinator','adviser') OR m.capability_id<>CASE m.role WHEN 'coordinator' THEN 'workspace.consult_coordinator.v1' ELSE 'workspace.business_adviser.v1' END
        OR m.user_id<>c.user_id OR m.organization_id<>c.organization_id OR m.portfolio_id<>c.portfolio_id OR m.environment_id<>c.environment_id))
        THEN RAISE EXCEPTION 'exact source-fixed direct member capabilities required' USING ERRCODE='23514';END IF;
      IF tbl IN('{TABLE}','control_workspace_team_threads','control_workspace_team_members') THEN RETURN;END IF;
      tid=CASE WHEN tbl='control_workspace_team_turns' THEN j->>'id' ELSE j->>'task_id' END;
      SELECT * INTO t FROM public.control_tasks WHERE id=tid;
      SELECT * INTO tr FROM public.control_workspace_team_turns WHERE id=tid;
      IF t.id IS NULL OR tr.id IS NULL OR t.kind<>'{KIND}' OR tr.task_kind<>t.kind
        OR t.thread_id<>c.task_thread_id OR t.business_id IS DISTINCT FROM c.business_id OR tr.business_id IS DISTINCT FROM c.business_id
        OR t.user_id<>c.user_id OR t.organization_id<>c.organization_id OR t.environment_id<>c.environment_id
        OR tr.user_id<>c.user_id OR tr.organization_id<>c.organization_id OR tr.portfolio_id<>c.portfolio_id OR tr.environment_id<>c.environment_id
        OR tr.topic_id<>child.id OR tr.team_thread_id<>th.id OR tr.task_thread_id<>c.task_thread_id
        OR tr.agent_creation_id IS NOT NULL OR tr.agent_purpose IS NOT NULL OR c.mode<>'consultant'
        OR NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=t.session_id AND s.user_id=t.user_id
          AND s.environment_id=t.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())
        THEN RAISE EXCEPTION 'exact current direct turn required' USING ERRCODE='23514';END IF;
      IF tbl='control_workspace_team_attempts' THEN
        IF t.status<>'running' OR t.run_id IS DISTINCT FROM j->>'run_id' OR t.source_revision<>j->>'source_revision'
          OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR tr.deadline<=clock_timestamp()
          OR tr.context IS NULL OR tr.context_sha256 IS NULL OR j->>'state'<>'reserved'
          OR j->>'phase'<>'direct' OR (j->>'ordinal')::INTEGER<>1
          THEN RAISE EXCEPTION 'one current reserved direct call required' USING ERRCODE='23514';END IF;
      ELSIF tbl='control_workspace_team_events' THEN
        IF j->>'native_episode_task_id' IS NOT NULL THEN RAISE EXCEPTION 'consultant is not native agent admission' USING ERRCODE='23514';END IF;
        IF j->>'author_type'='user' THEN
          IF j->>'id'<>tr.owner_event_id OR j->>'kind'<>'owner_message' OR j->>'content'<>t.message
            THEN RAISE EXCEPTION 'exact direct owner input required' USING ERRCODE='23514';END IF;
        ELSE
          SELECT * INTO a FROM public.control_workspace_team_attempts WHERE id=j->>'attempt_id' AND task_id=t.id;
          IF a.id IS NULL OR a.state<>'succeeded' OR a.phase<>'direct' OR a.ordinal<>1 OR a.run_id IS DISTINCT FROM t.run_id
            OR a.source_revision<>t.source_revision OR j->>'source_revision'<>t.source_revision
            OR j->>'kind'<>'answer' OR j->>'author_type'<>c.recipient->>'role'
            OR t.status<>'running' OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR tr.deadline<=clock_timestamp()
            OR NOT EXISTS(SELECT 1 FROM public.control_workspace_team_members m WHERE m.id=j->>'participant_id'
              AND m.team_thread_id=th.id AND m.role=c.recipient->>'role')
            THEN RAISE EXCEPTION 'actual chosen consultant direct receipt required' USING ERRCODE='23514';END IF;
        END IF;
        IF j->>'reply_to_event_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.control_workspace_team_events e JOIN public.control_tasks rt ON rt.id=e.task_id
          WHERE e.id=j->>'reply_to_event_id' AND e.team_thread_id=th.id AND e.sequence<(j->>'sequence')::INTEGER AND rt.sequence<=t.sequence)
          THEN RAISE EXCEPTION 'earlier same-chat reply required' USING ERRCODE='23514';END IF;
      END IF;
      END$$"""
    return [task_guard, team_guard,
        "REVOKE ALL ON FUNCTION workspace_direct_task_fence() FROM PUBLIC",
        "REVOKE ALL ON FUNCTION workspace_direct_team_check(VARCHAR,JSONB) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION workspace_direct_team_check(VARCHAR,JSONB) TO pinet_runtime",
        f"""CREATE FUNCTION workspace_direct_binding_fence() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
          BEGIN
          IF NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id
            AND s.environment_id=NEW.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())
            THEN RAISE EXCEPTION 'current direct create session required' USING ERRCODE='23514';END IF;
          PERFORM public.workspace_direct_team_check('{TABLE}',to_jsonb(NEW));RETURN NEW;END$$""",
        "REVOKE ALL ON FUNCTION workspace_direct_binding_fence() FROM PUBLIC",
        f"CREATE CONSTRAINT TRIGGER direct_binding_fence AFTER INSERT ON {TABLE} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_direct_binding_fence()",
        *[f"CREATE CONSTRAINT TRIGGER direct_task_fence AFTER INSERT OR UPDATE ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_direct_task_fence()"
          for table in ("control_task_threads", "control_tasks", "control_task_runs", "control_task_events")]]


def daily_sql():
    from .calibration_budget_schema import daily_sql as native_daily_sql
    before = """        +(SELECT count(*) FROM public.control_task_runs r JOIN public.control_tasks t ON t.id=r.task_id"""
    hold = f"""        +(SELECT coalesce(sum(greatest(0,1-(SELECT count(*) FROM public.control_workspace_team_attempts a WHERE a.task_id=t.id))),0)
          FROM public.control_tasks t WHERE t.user_id=u AND t.environment_id=e AND t.kind='{KIND}'
          AND(t.status='queued' OR(t.status='running' AND t.lease_until>clock_timestamp())))
"""
    value = native_daily_sql()
    if value.count(before) != 1:
        raise RuntimeError("Unknown current shared quota expression")
    # Existing daily actual TeamAttempt/native-call counts already include the
    # direct rows. Add only the one unconsumed direct hold, never a second charge.
    return value.replace(before, hold + before, 1)


def usage_sql():
    return f"""CREATE FUNCTION workspace_direct_run_usage(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR) RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE j JSONB;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_tasks t JOIN public.control_task_runs r ON r.id=t.run_id AND r.task_id=t.id
          JOIN public.{TABLE} c ON c.task_thread_id=t.thread_id
          WHERE t.id=tid AND t.kind='{KIND}' AND t.run_id=rid AND t.user_id=u AND t.environment_id=e AND t.source_revision=src
            AND c.user_id=t.user_id AND c.organization_id=t.organization_id AND c.environment_id=t.environment_id
            AND c.business_id IS NOT DISTINCT FROM t.business_id AND r.business_id IS NOT DISTINCT FROM t.business_id
            AND r.user_id=t.user_id AND r.organization_id=t.organization_id AND r.environment_id=t.environment_id)
        THEN RETURN NULL;END IF;
      SELECT jsonb_object_agg(key,total) INTO j FROM(SELECT kv.key,sum((kv.value::text)::BIGINT) total
        FROM public.control_workspace_team_attempts a CROSS JOIN LATERAL jsonb_each(a.usage) kv
        WHERE a.task_id=tid AND a.run_id=rid AND a.user_id=u AND a.environment_id=e AND a.source_revision=src
          AND a.state<>'reserved' AND kv.key IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens') GROUP BY kv.key) sums;
      RETURN j;END$$"""


def revoked_settle_sql():
    from ..director.schema import SETTLE
    before = "k NOT IN ('chat.consult','acquisition.reviewed_capture','workspace.team_turn')"
    join = "AND business_id=t.business_id AND organization_id=t.organization_id FOR UPDATE;"
    source = SETTLE.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1)
    if source.count(before) != 1 or source.count(join) != 1:
        raise RuntimeError("Unknown current hidden accounting function")
    return source.replace(before, before[:-1] + f",'{KIND}')", 1).replace(join,
        f"AND(business_id=t.business_id OR(k='{KIND}' AND business_id IS NOT DISTINCT FROM t.business_id)) "
        "AND organization_id=t.organization_id FOR UPDATE;", 1)


def release_sql():
    return f"""CREATE FUNCTION workspace_direct_release_queue(u VARCHAR,e VARCHAR,src VARCHAR) RETURNS INTEGER
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE t public.control_tasks%ROWTYPE;n INTEGER=0;stamp TIMESTAMPTZ;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR src IS NULL OR src!~'^[a-f0-9]{{40}}$' THEN RETURN 0;END IF;
      FOR t IN SELECT * FROM public.control_tasks q WHERE q.user_id=u AND q.environment_id=e AND q.kind='{KIND}'
        AND q.status='queued' AND NOT EXISTS(SELECT 1 FROM public.control_task_runs r WHERE r.task_id=q.id)
        AND(q.source_revision<>src OR NOT EXISTS(SELECT 1 FROM public.{TABLE} c
          JOIN public.control_workspace_team_turns tr ON tr.id=q.id AND tr.team_thread_id=c.team_thread_id
          JOIN public.control_sessions s ON s.id=q.session_id AND s.user_id=q.user_id AND s.environment_id=q.environment_id
          WHERE c.task_thread_id=q.thread_id AND c.user_id=q.user_id AND c.organization_id=q.organization_id AND c.environment_id=q.environment_id
            AND c.business_id IS NOT DISTINCT FROM q.business_id AND c.mode='consultant' AND tr.deadline>clock_timestamp()
            AND tr.context IS NULL AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
            AND public.workspace_direct_parent(to_jsonb(c),TRUE))) ORDER BY q.id FOR UPDATE OF q
      LOOP
        stamp=clock_timestamp();
        UPDATE public.control_tasks SET status='failed',failure_code='authorization_revoked',result=NULL,lease_until=NULL,
          updated_at=stamp,event_sequence=event_sequence+1 WHERE id=t.id;
        INSERT INTO public.control_task_events(id,user_id,organization_id,business_id,environment_id,created_at,task_id,sequence,status,failure_code)
          SELECT gen_random_uuid()::text,user_id,organization_id,business_id,environment_id,stamp,id,event_sequence,status,failure_code
          FROM public.control_tasks WHERE id=t.id;
        n=n+1;
      END LOOP;RETURN n;END$$"""


def migration_statements():
    values = []
    for table in ("control_task_threads", "control_tasks", "control_task_runs", "control_task_events",
            "control_workspace_team_threads", "control_workspace_team_turns", "control_workspace_team_attempts"):
        values.append(f"ALTER TABLE {table} ALTER COLUMN business_id DROP NOT NULL")
    values += ["ALTER TABLE control_workspace_team_threads ALTER COLUMN grant_id DROP NOT NULL",
        "ALTER TABLE control_task_threads ADD CONSTRAINT uq_task_thread_owned_scope UNIQUE(id,organization_id,user_id,environment_id)",
        ddl(), *policies(), *guard_functions(),
        "ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_kind_check",
        f"ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_kind_check CHECK(kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn','{KIND}'))",
        f"ALTER TABLE control_tasks ADD CONSTRAINT control_task_business_execution_check CHECK(business_id IS NOT NULL OR kind='{KIND}')",
        "ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_session_kind_check",
        f"ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_session_kind_check CHECK((kind IN('chat.consult','workspace.team_turn','{KIND}') AND session_id IS NOT NULL) OR(kind='acquisition.reviewed_capture' AND session_id IS NULL))",
        "ALTER TABLE control_tasks DROP CONSTRAINT control_tasks_message_check",
        f"ALTER TABLE control_tasks ADD CONSTRAINT control_tasks_message_check CHECK(length(message) BETWEEN 1 AND CASE WHEN kind IN('workspace.team_turn','{KIND}') THEN 2500 ELSE 1000 END)",
        "ALTER TABLE control_workspace_team_turns DROP CONSTRAINT control_workspace_team_turns_task_kind_check",
        f"ALTER TABLE control_workspace_team_turns ADD CONSTRAINT control_workspace_team_turns_task_kind_check CHECK(task_kind IN('workspace.team_turn','{KIND}'))",
        daily_sql(), usage_sql(), release_sql(), revoked_settle_sql(),
        "REVOKE ALL ON FUNCTION workspace_direct_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION workspace_direct_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
        "REVOKE ALL ON FUNCTION workspace_direct_release_queue(VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION workspace_direct_release_queue(VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime"]
    return values
