"""Explicit model preparation on common Task/Run, never capture permission.

No SQL executes on import. Only the reviewed migration installs these barriers.
Actual source/private-file authority remains the integrating caller's duty.
"""

KIND = "acquisition.model_prepare"
MODEL, EFFORT, ADAPTER = "gpt-6.1-sol", "high", "acquisition-model-prepare.v1"
TABLE_AUTH = "acquisition_model_authorizations"
TABLE_TASK = "acquisition_model_task_bindings"
TABLE_ATTEMPT = "acquisition_model_attempts"
TABLES = (TABLE_AUTH, TABLE_TASK, TABLE_ATTEMPT)
TOKEN_KEYS = ("input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens")

OLD_KIND = "kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn','workspace.direct_turn')"
OLD_SESSION = "(kind IN('chat.consult','workspace.team_turn','workspace.direct_turn') AND session_id IS NOT NULL) OR(kind='acquisition.reviewed_capture' AND session_id IS NULL)"
OLD_BUSINESS = "business_id IS NOT NULL OR kind='workspace.direct_turn'"
BOUNDARY_BEFORE = """RETURN CASE WHEN t.kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn')
          AND t.business_id IS NOT NULL THEN 'legacy' ELSE NULL END;"""
BOUNDARY_AFTER = f"""RETURN CASE WHEN t.kind IN('chat.consult','acquisition.reviewed_capture','workspace.team_turn','{KIND}')
          AND t.business_id IS NOT NULL AND(t.kind<>'{KIND}' OR t.session_id IS NOT NULL)
          THEN 'legacy' ELSE NULL END;"""


def patch_boundary(definition, *, downgrade=False):
    before, after = (BOUNDARY_AFTER, BOUNDARY_BEFORE) if downgrade else (BOUNDARY_BEFORE, BOUNDARY_AFTER)
    definition = definition.replace("\r\n", "\n")
    if ("FUNCTION public.workspace_direct_task_boundary(" not in definition
            or definition.count(before) != 1 or not downgrade and KIND in definition):
        raise RuntimeError("Unknown or ambiguous0045 business Task boundary")
    return definition.replace(before, after, 1)


def probe_sql():
    return [f"""CREATE TEMP TABLE pinet_model_{name}_probe(kind VARCHAR,session_id VARCHAR,business_id VARCHAR,
        CHECK({expression})) ON COMMIT DROP""" for name, expression in (
        ("kind_old", OLD_KIND), ("session_old", OLD_SESSION), ("business", OLD_BUSINESS),
        ("kind_new", f"({OLD_KIND}) OR kind='{KIND}'"),
        ("session_new", f"({OLD_SESSION}) OR(kind='{KIND}' AND session_id IS NOT NULL AND business_id IS NOT NULL)"))]


def task_checks(rows, probes, *, downgrade=False):
    current = {row["name"]: row["expression"] for row in rows}
    if len(current) != len(rows):
        raise RuntimeError("Ambiguous Task CHECK names")
    expected = "new" if downgrade else "old"
    for name, key in (("control_tasks_kind_check", "kind_"+expected),
            ("control_tasks_session_kind_check", "session_"+expected),
            ("control_task_business_execution_check", "business")):
        if current.get(name) != probes[key]:
            raise RuntimeError("Unknown0045 Task kind/session/business CHECK")
    # Recompiling pg_get_expr output changes array coercion spelling on PG18.
    # Emit the original reviewed expression, keeping future probe comparison exact.
    kind = OLD_KIND if downgrade else f"({OLD_KIND}) OR kind='{KIND}'"
    session = OLD_SESSION if downgrade else f"({OLD_SESSION}) OR(kind='{KIND}' AND session_id IS NOT NULL AND business_id IS NOT NULL)"
    return [item for name, expression in (("control_tasks_kind_check", kind),
            ("control_tasks_session_kind_check", session)) for item in (
        f"ALTER TABLE control_tasks DROP CONSTRAINT {name}",
        f"ALTER TABLE control_tasks ADD CONSTRAINT {name} CHECK({expression})")]


def tables_sql():
    return [f"""CREATE TABLE {TABLE_AUTH}(
      id VARCHAR PRIMARY KEY CHECK(id~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$'),
      environment_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
      user_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,site_id VARCHAR NOT NULL,adapter_id VARCHAR NOT NULL,
      creation_id VARCHAR NOT NULL REFERENCES control_creations(id) ON DELETE RESTRICT,
      registration_id VARCHAR NOT NULL REFERENCES control_creation_registrations(id) ON DELETE RESTRICT,
      registration_fingerprint VARCHAR NOT NULL CHECK(registration_fingerprint~'^[a-f0-9]{{64}}$'),
      agent_id VARCHAR NOT NULL REFERENCES control_customer_agent_modules(id) ON DELETE RESTRICT,
      config_id VARCHAR NOT NULL REFERENCES control_customer_agent_configs(id) ON DELETE RESTRICT,
      config_revision INTEGER NOT NULL CHECK(config_revision BETWEEN 1 AND 2147483647),
      config_sha256 VARCHAR NOT NULL CHECK(config_sha256~'^[a-f0-9]{{64}}$'),
      purpose VARCHAR NOT NULL CHECK(purpose IN('customer_research','email')),
      session_id VARCHAR NOT NULL,source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
      module_snapshot JSONB NOT NULL CHECK(jsonb_typeof(module_snapshot)='object' AND octet_length(module_snapshot::text)<=16384),
      module_fingerprint VARCHAR NOT NULL CHECK(module_fingerprint~'^[a-f0-9]{{64}}$'),
      work_registration_sha256 VARCHAR NOT NULL CHECK(work_registration_sha256~'^[a-f0-9]{{64}}$'),
      maximum_attempts INTEGER NOT NULL CHECK(maximum_attempts BETWEEN 1 AND 30),
      approved_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,
      CHECK(expires_at>approved_at AND expires_at<=approved_at+INTERVAL '3600 seconds'),
      enabled BOOLEAN NOT NULL,model VARCHAR NOT NULL CHECK(model='{MODEL}'),
      effort VARCHAR NOT NULL CHECK(effort='{EFFORT}'),fingerprint VARCHAR NOT NULL CHECK(fingerprint~'^[a-f0-9]{{64}}$'),
      UNIQUE(id,business_id,organization_id,user_id,environment_id),
      FOREIGN KEY(business_id,environment_id) REFERENCES control_business_grants(business_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(portfolio_id,organization_id,environment_id) REFERENCES control_portfolios(id,organization_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(session_id,user_id,environment_id) REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)""",
        f"""CREATE TABLE {TABLE_TASK}(
      task_id VARCHAR PRIMARY KEY,authorization_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,
      organization_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,
      kind VARCHAR NOT NULL CHECK(kind='{KIND}'),input JSONB NOT NULL
        CHECK(jsonb_typeof(input)='object' AND octet_length(input::text)<=262144),
      input_sha256 VARCHAR NOT NULL CHECK(input_sha256~'^[a-f0-9]{{64}}$'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      UNIQUE(task_id,authorization_id,business_id,organization_id,user_id,environment_id),
      FOREIGN KEY(task_id,business_id,organization_id,user_id,environment_id,kind)
        REFERENCES control_tasks(id,business_id,organization_id,user_id,environment_id,kind) ON DELETE RESTRICT,
      FOREIGN KEY(authorization_id,business_id,organization_id,user_id,environment_id)
        REFERENCES {TABLE_AUTH}(id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT)""",
        f"""CREATE TABLE {TABLE_ATTEMPT}(
      id VARCHAR PRIMARY KEY CHECK(id~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$'),
      authorization_id VARCHAR NOT NULL,task_id VARCHAR NOT NULL,run_id VARCHAR NOT NULL,
      business_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,
      ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 1 AND 3),role VARCHAR NOT NULL CHECK(role IN('researcher','writer','reviewer')),
      packet JSONB NOT NULL CHECK(jsonb_typeof(packet)='object' AND octet_length(packet::text)<=262144),
      packet_sha256 VARCHAR NOT NULL CHECK(packet_sha256~'^[a-f0-9]{{64}}$'),
      instruction_sha256 VARCHAR NOT NULL CHECK(instruction_sha256~'^[a-f0-9]{{64}}$'),
      model VARCHAR NOT NULL CHECK(model='{MODEL}'),effort VARCHAR NOT NULL CHECK(effort='{EFFORT}'),
      source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
      state VARCHAR NOT NULL CHECK(state IN('reserved','succeeded','failed')),
      reserved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),finished_at TIMESTAMPTZ,
      usage JSONB,output JSONB CHECK(output IS NULL OR(jsonb_typeof(output)='object' AND octet_length(output::text)<=131072)),
      CHECK((state='reserved' AND finished_at IS NULL AND usage IS NULL AND output IS NULL)
        OR(state='succeeded' AND finished_at IS NOT NULL AND output IS NOT NULL)
        OR(state='failed' AND finished_at IS NOT NULL AND output IS NULL)),
      CHECK(finished_at IS NULL OR finished_at>=reserved_at),
      UNIQUE(task_id,ordinal),
      FOREIGN KEY(task_id,authorization_id,business_id,organization_id,user_id,environment_id)
        REFERENCES {TABLE_TASK}(task_id,authorization_id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(run_id,task_id,business_id,organization_id,user_id,environment_id)
        REFERENCES control_task_runs(id,task_id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT)""",
        f"CREATE INDEX ix_acquisition_model_auth_attempts ON {TABLE_ATTEMPT}(authorization_id)"]


def owner_predicate(table):
    # Common actor enumeration knows only user/environment; no ambient business
    # or acquisition scope is required to find the actor's exact private binding.
    return f"""{table}.user_id=current_setting('pinet.control_user',true)
      AND {table}.environment_id=current_setting('pinet.environment',true)
      AND EXISTS(SELECT 1 FROM public.control_business_grants g JOIN public.control_memberships m
        ON m.organization_id=g.organization_id AND m.environment_id=g.environment_id
        JOIN public.control_users u ON u.id=m.user_id AND u.environment_id=m.environment_id
        WHERE g.business_id={table}.business_id AND g.organization_id={table}.organization_id
        AND g.environment_id={table}.environment_id AND g.enabled AND m.enabled AND m.role='owner'
        AND m.user_id={table}.user_id AND u.enabled)"""


def grants_sql():
    statements = []
    for table in TABLES:
        statements += [f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
            f"CREATE POLICY model_owned ON {table} USING({owner_predicate(table)}) WITH CHECK({owner_predicate(table)})",
            f"REVOKE ALL ON {table} FROM PUBLIC,pinet_runtime",
            f"GRANT {'SELECT' if table == TABLE_AUTH else 'SELECT,INSERT'} ON {table} TO pinet_runtime"]
    return statements


def usage_valid_sql():
    return """CREATE FUNCTION acquisition_model_valid_usage(j JSONB) RETURNS BOOLEAN
      LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public AS $$DECLARE kv RECORD;BEGIN
      IF j IS NULL THEN RETURN TRUE;END IF;
      IF jsonb_typeof(j)<>'object' THEN RETURN FALSE;END IF;
      IF j-ARRAY['known','tokens']<>'{}'::jsonb
        OR j->'known' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(j->'tokens') IS DISTINCT FROM 'object'
        OR j->'tokens'='{}'::jsonb THEN RETURN FALSE;END IF;
      FOR kv IN SELECT key,value FROM jsonb_each(j->'tokens') LOOP
        IF kv.key NOT IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens')
          OR jsonb_typeof(kv.value)<>'number' OR kv.value::text!~'^[0-9]{1,10}$'
          THEN RETURN FALSE;END IF;
        IF kv.value::text::BIGINT>1000000000 THEN RETURN FALSE;END IF;
      END LOOP;RETURN TRUE;END$$"""


def current_sql():
    return f"""CREATE FUNCTION acquisition_model_authorization_current(aid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE a public.{TABLE_AUTH}%ROWTYPE;m public.acquisition_modules%ROWTYPE;now_at TIMESTAMPTZ;BEGIN
      SELECT * INTO a FROM public.{TABLE_AUTH} WHERE id=aid;
      IF NOT FOUND OR a.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR a.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        OR a.source_revision IS DISTINCT FROM current_setting('pinet.execution_source_revision',true)
        OR NOT a.enabled THEN RETURN FALSE;END IF;
      SELECT * INTO m FROM public.acquisition_modules WHERE business_id=a.business_id AND environment_id=a.environment_id;
      now_at=clock_timestamp();
      IF NOT FOUND OR NOT m.enabled OR a.approved_at>now_at OR a.expires_at<=now_at
        OR m.approved_at>now_at OR m.expires_at<=now_at OR m.source_revision<>a.source_revision
        OR m.organization_id<>a.organization_id OR m.approved_by_user_id<>a.user_id
        OR m.site_id<>a.site_id OR m.adapter_id<>a.adapter_id
        OR(a.module_snapshot-ARRAY['approved_at','expires_at']) IS DISTINCT FROM jsonb_build_object(
          'business_id',m.business_id,'environment_id',m.environment_id,'organization_id',m.organization_id,
          'approved_by_user_id',m.approved_by_user_id,'site_id',m.site_id,'adapter_id',m.adapter_id,
          'enabled',m.enabled,'permissions',m.permissions,'source_revision',m.source_revision)
        OR(a.module_snapshot->>'approved_at')::TIMESTAMPTZ IS DISTINCT FROM m.approved_at
        OR(a.module_snapshot->>'expires_at')::TIMESTAMPTZ IS DISTINCT FROM m.expires_at
        THEN RETURN FALSE;END IF;
      RETURN EXISTS(SELECT 1 FROM public.control_creation_registrations r
        JOIN public.control_creations c ON c.id=r.creation_id
        JOIN public.control_business_grants g ON g.id=r.grant_id
        JOIN public.control_memberships member ON member.organization_id=g.organization_id AND member.environment_id=g.environment_id
        JOIN public.control_users u ON u.id=member.user_id AND u.environment_id=member.environment_id
        JOIN public.control_customer_accounts account ON account.user_id=u.id AND account.environment_id=u.environment_id
        JOIN public.control_sessions s ON s.id=a.session_id AND s.user_id=u.id AND s.environment_id=u.environment_id
        JOIN public.control_customer_agent_modules agent ON agent.id=a.agent_id
        JOIN public.control_customer_agent_configs cfg ON cfg.id=a.config_id AND cfg.agent_id=agent.id
        WHERE r.id=a.registration_id AND r.fingerprint=a.registration_fingerprint AND r.revoked_at IS NULL
        AND r.creation_id=a.creation_id AND r.business_id=a.business_id AND r.site_id=a.site_id
        AND r.user_id=a.user_id AND r.organization_id=a.organization_id AND r.portfolio_id=a.portfolio_id AND r.environment_id=a.environment_id
        AND c.current_revision=r.accepted_revision AND c.user_id=a.user_id AND c.organization_id=a.organization_id
        AND c.portfolio_id=a.portfolio_id AND c.environment_id=a.environment_id AND c.active_job_id IS NULL AND c.status NOT IN('queued','running')
        AND g.business_id=a.business_id AND g.organization_id=a.organization_id AND g.portfolio_id=a.portfolio_id
        AND g.environment_id=a.environment_id AND g.enabled AND u.id=a.user_id AND u.enabled
        AND member.user_id=a.user_id AND member.enabled AND member.role='owner' AND account.verified_at IS NOT NULL
        AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
        AND agent.creation_id=a.creation_id AND agent.registration_id=r.id AND agent.registration_fingerprint=r.fingerprint
        AND agent.business_id=a.business_id AND agent.user_id=a.user_id AND agent.organization_id=a.organization_id
        AND agent.portfolio_id=a.portfolio_id AND agent.environment_id=a.environment_id
        AND agent.purpose=a.purpose AND agent.current_revision=a.config_revision
        AND cfg.revision=a.config_revision AND cfg.config_sha256=a.config_sha256
        AND cfg.user_id=a.user_id AND cfg.organization_id=a.organization_id AND cfg.portfolio_id=a.portfolio_id
        AND cfg.environment_id=a.environment_id);
      EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN RETURN FALSE;
      END$$"""


def fence_sql():
    return f"""CREATE FUNCTION acquisition_model_row_fence() RETURNS TRIGGER
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE t public.control_tasks%ROWTYPE;r public.control_task_runs%ROWTYPE;
        a public.{TABLE_AUTH}%ROWTYPE;b public.{TABLE_TASK}%ROWTYPE;n BIGINT;names TEXT[];BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'retained model history' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='{TABLE_AUTH}' THEN
        IF TG_OP='UPDATE' AND((to_jsonb(NEW)-'enabled')<>(to_jsonb(OLD)-'enabled') OR NOT OLD.enabled OR NEW.enabled)
          THEN RAISE EXCEPTION 'immutable model authorization; disable only' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF TG_OP='UPDATE' THEN
        IF TG_TABLE_NAME<>'{TABLE_ATTEMPT}' THEN
          RAISE EXCEPTION 'immutable model Task binding' USING ERRCODE='23514';END IF;
        IF current_setting('pinet.model_attempt_settlement',true) IS DISTINCT FROM OLD.id
          OR(to_jsonb(NEW)-ARRAY['state','finished_at','usage','output'])<>(to_jsonb(OLD)-ARRAY['state','finished_at','usage','output'])
          OR OLD.state<>'reserved' OR NEW.state NOT IN('succeeded','failed')
          OR NOT public.acquisition_model_valid_usage(NEW.usage)
          THEN RAISE EXCEPTION 'immutable model receipt; exact settlement only' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF NEW.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR NEW.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        THEN RAISE EXCEPTION 'exact model actor required' USING ERRCODE='23514';END IF;
      SELECT * INTO t FROM public.control_tasks WHERE id=NEW.task_id FOR UPDATE;
      IF NOT FOUND OR t.kind<>'{KIND}' OR t.business_id IS DISTINCT FROM NEW.business_id
        OR t.organization_id<>NEW.organization_id OR t.user_id<>NEW.user_id OR t.environment_id<>NEW.environment_id
        THEN RAISE EXCEPTION 'exact model Task required' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='{TABLE_ATTEMPT}' THEN
        SELECT * INTO r FROM public.control_task_runs WHERE id=NEW.run_id AND task_id=t.id FOR UPDATE;
        IF NOT FOUND OR r.business_id IS DISTINCT FROM t.business_id OR r.organization_id<>t.organization_id
          OR r.user_id<>t.user_id OR r.environment_id<>t.environment_id OR r.status<>'running'
          OR r.model<>'{MODEL}' OR r.effort<>'{EFFORT}' OR r.adapter_revision<>'{ADAPTER}'
          THEN RAISE EXCEPTION 'exact model Run required' USING ERRCODE='23514';END IF;
      END IF;
      -- Global per-authorization budget is serialized AFTER Task/Run locks.
      SELECT * INTO a FROM public.{TABLE_AUTH} WHERE id=NEW.authorization_id FOR UPDATE;
      IF NOT FOUND OR a.business_id IS DISTINCT FROM NEW.business_id OR a.organization_id<>NEW.organization_id
        OR a.user_id<>NEW.user_id OR a.environment_id<>NEW.environment_id
        OR t.session_id IS DISTINCT FROM a.session_id OR t.source_revision<>a.source_revision
        OR NOT public.acquisition_model_authorization_current(a.id)
        THEN RAISE EXCEPTION 'current exact model authority required' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='{TABLE_TASK}' THEN
        IF t.status<>'queued' OR t.run_id IS NOT NULL THEN
          RAISE EXCEPTION 'new queued model Task required' USING ERRCODE='23514';END IF;
        NEW.created_at=clock_timestamp();RETURN NEW;
      END IF;
      SELECT * INTO b FROM public.{TABLE_TASK} WHERE task_id=t.id AND authorization_id=a.id;
      IF NOT FOUND OR t.status<>'running' OR t.run_id IS DISTINCT FROM NEW.run_id
        OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR NEW.source_revision<>a.source_revision
        OR NEW.state<>'reserved' OR NEW.finished_at IS NOT NULL OR NEW.usage IS NOT NULL OR NEW.output IS NOT NULL
        THEN RAISE EXCEPTION 'current reserved model call required' USING ERRCODE='23514';END IF;
      SELECT count(*) INTO n FROM public.{TABLE_ATTEMPT} WHERE authorization_id=a.id;
      IF n>=a.maximum_attempts THEN RAISE EXCEPTION 'model authorization exhausted' USING ERRCODE='23514';END IF;
      SELECT array_agg(role ORDER BY ordinal),count(*) INTO names,n FROM public.{TABLE_ATTEMPT} WHERE task_id=t.id;
      IF n>=3 OR NEW.ordinal<>n+1 OR EXISTS(SELECT 1 FROM public.{TABLE_ATTEMPT} WHERE task_id=t.id AND state<>'succeeded')
        OR NOT coalesce((n=0 AND NEW.role='researcher') OR(names=ARRAY['researcher'] AND NEW.role IN('writer','reviewer'))
          OR(names=ARRAY['researcher','writer'] AND NEW.role='reviewer'),FALSE)
        THEN RAISE EXCEPTION 'fixed unreplayed model role order required' USING ERRCODE='23514';END IF;
      NEW.reserved_at=clock_timestamp();RETURN NEW;END$$"""


def parent_fence_sql():
    return f"""CREATE FUNCTION acquisition_model_parent_fence() RETURNS TRIGGER
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$BEGIN
      IF TG_TABLE_NAME='control_tasks' THEN
        IF EXISTS(SELECT 1 FROM public.{TABLE_TASK} WHERE task_id=OLD.id) THEN
          IF(to_jsonb(NEW)-ARRAY['message','status','result','failure_code','run_id','lease_until','updated_at','event_sequence'])
            IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['message','status','result','failure_code','run_id','lease_until','updated_at','event_sequence'])
            OR(OLD.run_id IS NOT NULL AND NEW.run_id IS DISTINCT FROM OLD.run_id)
            THEN RAISE EXCEPTION 'immutable bound model Task identity' USING ERRCODE='23514';END IF;
        END IF;
      ELSE
        IF EXISTS(SELECT 1 FROM public.control_tasks WHERE id=NEW.task_id AND kind='{KIND}') THEN
          IF NEW.model<>'{MODEL}' OR NEW.effort<>'{EFFORT}' OR NEW.adapter_revision<>'{ADAPTER}' THEN
            RAISE EXCEPTION 'exact bound model Run required' USING ERRCODE='23514';END IF;
          IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM public.control_tasks WHERE id=NEW.task_id AND run_id=NEW.id) THEN
            RAISE EXCEPTION 'one-shot bound model Run required' USING ERRCODE='23514';END IF;
        END IF;
        IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.{TABLE_TASK} WHERE task_id=OLD.task_id)
          AND(to_jsonb(NEW)-ARRAY['status','finished_at','usage','cost_microusd'])
            IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['status','finished_at','usage','cost_microusd'])
          THEN RAISE EXCEPTION 'immutable bound model Run identity' USING ERRCODE='23514';END IF;
      END IF;RETURN NEW;END$$"""


def settle_sql():
    return f"""CREATE FUNCTION acquisition_model_settle_attempt(aid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR,
      terminal_state VARCHAR,observed_usage JSONB,observed_output JSONB) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE a public.{TABLE_ATTEMPT}%ROWTYPE;t public.control_tasks%ROWTYPE;r public.control_task_runs%ROWTYPE;
        authority public.{TABLE_AUTH}%ROWTYPE;live BOOLEAN;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR terminal_state NOT IN('succeeded','failed') OR terminal_state IS NULL
        OR NOT public.acquisition_model_valid_usage(observed_usage)
        OR(observed_output IS NOT NULL AND(jsonb_typeof(observed_output)<>'object' OR octet_length(observed_output::text)>131072))
        OR(terminal_state='failed' AND observed_output IS NOT NULL) OR(terminal_state='succeeded' AND observed_output IS NULL)
        THEN RETURN FALSE;END IF;
      SELECT * INTO a FROM public.{TABLE_ATTEMPT} WHERE id=aid;
      IF NOT FOUND OR a.run_id IS DISTINCT FROM rid OR a.user_id IS DISTINCT FROM u OR a.environment_id IS DISTINCT FROM e
        OR a.source_revision IS DISTINCT FROM src THEN RETURN FALSE;END IF;
      SELECT * INTO t FROM public.control_tasks WHERE id=a.task_id FOR UPDATE;
      SELECT * INTO r FROM public.control_task_runs WHERE id=rid AND task_id=a.task_id FOR UPDATE;
      SELECT * INTO authority FROM public.{TABLE_AUTH} WHERE id=a.authorization_id FOR UPDATE;
      SELECT * INTO a FROM public.{TABLE_ATTEMPT} WHERE id=aid FOR UPDATE;
      IF t.id IS NULL OR r.id IS NULL OR authority.id IS NULL OR t.kind<>'{KIND}'
        OR t.user_id IS DISTINCT FROM u OR t.environment_id IS DISTINCT FROM e OR t.source_revision IS DISTINCT FROM src
        OR r.business_id IS DISTINCT FROM a.business_id OR r.organization_id<>a.organization_id
        OR r.user_id IS DISTINCT FROM u OR r.environment_id IS DISTINCT FROM e
        OR r.model<>'{MODEL}' OR r.effort<>'{EFFORT}' OR r.adapter_revision<>'{ADAPTER}'
        OR authority.source_revision IS DISTINCT FROM src THEN RETURN FALSE;END IF;
      IF a.state<>'reserved' THEN
        RETURN a.state=terminal_state AND a.usage IS NOT DISTINCT FROM observed_usage AND a.output IS NOT DISTINCT FROM observed_output;
      END IF;
      live=(t.status='running' AND t.run_id=rid AND t.lease_until>clock_timestamp() AND r.status='running'
        AND t.session_id=authority.session_id AND public.acquisition_model_authorization_current(authority.id));
      IF NOT coalesce(live,FALSE) AND(terminal_state<>'failed' OR observed_output IS NOT NULL) THEN RETURN FALSE;END IF;
      PERFORM set_config('pinet.model_attempt_settlement',aid,true);
      UPDATE public.{TABLE_ATTEMPT} SET state=terminal_state,finished_at=clock_timestamp(),
        usage=observed_usage,output=observed_output WHERE id=aid;
      PERFORM set_config('pinet.model_attempt_settlement','',true);
      RETURN TRUE;END$$"""


def run_usage_sql():
    return f"""CREATE FUNCTION acquisition_model_run_usage(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR) RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE item RECORD;kv RECORD;j JSONB;n BIGINT=0;settled BIGINT=0;unknown_count BIGINT=0;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_tasks t JOIN public.control_task_runs r ON r.task_id=t.id
          JOIN public.{TABLE_TASK} b ON b.task_id=t.id JOIN public.{TABLE_AUTH} a ON a.id=b.authorization_id
          WHERE t.id=tid AND r.id=rid AND t.kind='{KIND}' AND t.user_id=u AND t.environment_id=e
          AND t.source_revision=src AND a.source_revision=src AND r.user_id=u AND r.environment_id=e
          AND r.business_id=t.business_id AND r.organization_id=t.organization_id
          AND r.model='{MODEL}' AND r.effort='{EFFORT}' AND r.adapter_revision='{ADAPTER}') THEN RETURN NULL;END IF;
      FOR item IN SELECT state,usage FROM public.{TABLE_ATTEMPT}
        WHERE task_id=tid AND run_id=rid AND user_id=u AND environment_id=e AND source_revision=src LOOP
        n=n+1;IF item.state<>'reserved' THEN settled=settled+1;END IF;
        IF item.usage IS NULL THEN unknown_count=unknown_count+1;CONTINUE;END IF;
        FOR kv IN SELECT key,value FROM jsonb_each(item.usage->'tokens') LOOP
          j=jsonb_set(coalesce(j,'{{}}'::jsonb),ARRAY[kv.key],to_jsonb(coalesce((j->>kv.key)::BIGINT,0)+kv.value::text::BIGINT));
        END LOOP;
      END LOOP;
      RETURN jsonb_build_object('usage',j,'model_calls',n,'settled_calls',settled,
        'unknown_usage_calls',unknown_count,'usage_complete',n>0 AND settled=n AND unknown_count=0);END$$"""


def settle_task_sql():
    return f"""CREATE FUNCTION acquisition_model_settle_task(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR,
      observed_tokens JSONB,eid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE t public.control_tasks%ROWTYPE;r public.control_task_runs%ROWTYPE;
        b public.{TABLE_TASK}%ROWTYPE;a public.{TABLE_AUTH}%ROWTYPE;
        projection JSONB;tokens JSONB;receipt JSONB;kv RECORD;stamp TIMESTAMPTZ;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR eid IS NULL OR eid!~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$' THEN RETURN FALSE;END IF;
      IF observed_tokens IS NOT NULL THEN
        IF jsonb_typeof(observed_tokens)<>'object' THEN RETURN FALSE;END IF;
        FOR kv IN SELECT key,value FROM jsonb_each(observed_tokens) LOOP
          IF kv.key NOT IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens')
            OR jsonb_typeof(kv.value)<>'number' OR kv.value::text!~'^[0-9]{{1,11}}$'
            THEN RETURN FALSE;END IF;
          IF kv.value::text::BIGINT>30000000000 THEN RETURN FALSE;END IF;
        END LOOP;
      END IF;
      SELECT * INTO t FROM public.control_tasks WHERE id=tid FOR UPDATE;
      IF NOT FOUND OR t.kind<>'{KIND}' OR t.user_id IS DISTINCT FROM u OR t.environment_id IS DISTINCT FROM e
        OR t.source_revision IS DISTINCT FROM src OR t.run_id IS DISTINCT FROM rid
        OR t.status NOT IN('running','failed','cancelled')
        OR(t.result IS NOT NULL AND t.result<>'null'::jsonb) THEN RETURN FALSE;END IF;
      SELECT * INTO r FROM public.control_task_runs WHERE id=rid AND task_id=tid FOR UPDATE;
      IF NOT FOUND OR r.business_id IS DISTINCT FROM t.business_id OR r.organization_id<>t.organization_id
        OR r.user_id IS DISTINCT FROM u OR r.environment_id IS DISTINCT FROM e
        OR r.model<>'{MODEL}' OR r.effort<>'{EFFORT}' OR r.adapter_revision<>'{ADAPTER}'
        OR r.status NOT IN('running','failed','cancelled') THEN RETURN FALSE;END IF;
      SELECT * INTO b FROM public.{TABLE_TASK} WHERE task_id=tid;
      IF NOT FOUND OR b.business_id IS DISTINCT FROM t.business_id OR b.organization_id<>t.organization_id
        OR b.user_id IS DISTINCT FROM u OR b.environment_id IS DISTINCT FROM e THEN RETURN FALSE;END IF;
      SELECT * INTO a FROM public.{TABLE_AUTH} WHERE id=b.authorization_id FOR UPDATE;
      IF NOT FOUND OR a.source_revision IS DISTINCT FROM src OR a.business_id IS DISTINCT FROM t.business_id
        OR a.organization_id<>t.organization_id OR a.user_id IS DISTINCT FROM u OR a.environment_id IS DISTINCT FROM e
        OR a.session_id IS DISTINCT FROM t.session_id THEN RETURN FALSE;END IF;
      -- No current actor/Grant/Session/source lease or output authority here.
      -- Only immutable old-source accounting, with counts read from reservations.
      projection=public.acquisition_model_run_usage(tid,rid,u,e,src);
      IF projection IS NULL THEN RETURN FALSE;END IF;
      tokens=coalesce(nullif(projection->'usage','null'::jsonb),'{{}}'::jsonb);
      -- Common cancellation may have retained a known token aggregate first.
      -- Preserve those observations while taking every counter from DB slots.
      IF jsonb_typeof(r.usage)='object' THEN
        FOR kv IN SELECT key,value FROM jsonb_each(r.usage)
          WHERE key IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens') LOOP
          IF jsonb_typeof(kv.value)<>'number' OR kv.value::text!~'^[0-9]{{1,11}}$' THEN RETURN FALSE;END IF;
          IF kv.value::text::BIGINT>30000000000 THEN RETURN FALSE;END IF;
          tokens=jsonb_set(tokens,ARRAY[kv.key],to_jsonb(greatest(coalesce((tokens->>kv.key)::BIGINT,0),kv.value::text::BIGINT)));
        END LOOP;
      END IF;
      FOR kv IN SELECT key,value FROM jsonb_each(coalesce(observed_tokens,'{{}}'::jsonb)) LOOP
        tokens=jsonb_set(tokens,ARRAY[kv.key],to_jsonb(greatest(coalesce((tokens->>kv.key)::BIGINT,0),kv.value::text::BIGINT)));
      END LOOP;
      receipt=tokens || (projection-'usage');
      IF t.status<>'running' AND (r.status NOT IN('running',t.status) OR t.lease_until IS NOT NULL) THEN RETURN FALSE;END IF;
      IF t.status<>'running' AND r.status=t.status THEN
        IF r.usage IS DISTINCT FROM receipt OR r.cost_microusd IS NOT NULL THEN
          UPDATE public.control_task_runs SET usage=receipt,cost_microusd=NULL WHERE id=rid;
        END IF;
        RETURN TRUE;
      END IF;
      stamp=clock_timestamp();
      IF t.status='running' THEN
        UPDATE public.control_tasks SET status='failed',failure_code='authorization_revoked',result=NULL,
          lease_until=NULL,updated_at=stamp,event_sequence=event_sequence+1 WHERE id=tid;
        INSERT INTO public.control_task_events(id,environment_id,organization_id,business_id,user_id,created_at,task_id,sequence,status,failure_code)
          SELECT eid,environment_id,organization_id,business_id,user_id,stamp,id,event_sequence,status,failure_code
          FROM public.control_tasks WHERE id=tid;
        t.status='failed';
      END IF;
      UPDATE public.control_task_runs SET status=t.status,finished_at=coalesce(finished_at,stamp),usage=receipt,cost_microusd=NULL WHERE id=rid;
      RETURN TRUE;END$$"""


def statements():
    result = [*tables_sql(), usage_valid_sql(), current_sql(), fence_sql(), parent_fence_sql(), settle_sql(), run_usage_sql(), settle_task_sql()]
    for table in TABLES:
        result.append(f"CREATE TRIGGER model_row_fence BEFORE INSERT OR UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION acquisition_model_row_fence()")
    result += grants_sql()
    result += ["CREATE TRIGGER model_parent_fence BEFORE UPDATE ON control_tasks FOR EACH ROW EXECUTE FUNCTION acquisition_model_parent_fence()",
        "CREATE TRIGGER model_parent_fence BEFORE INSERT OR UPDATE ON control_task_runs FOR EACH ROW EXECUTE FUNCTION acquisition_model_parent_fence()"]
    signatures = ("acquisition_model_valid_usage(JSONB)", "acquisition_model_authorization_current(VARCHAR)",
        "acquisition_model_row_fence()", "acquisition_model_parent_fence()",
        "acquisition_model_settle_attempt(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,JSONB)",
        "acquisition_model_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)",
        "acquisition_model_settle_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR)")
    result += [f"REVOKE ALL ON FUNCTION {signature} FROM PUBLIC" for signature in signatures]
    result += [f"GRANT EXECUTE ON FUNCTION {signature} TO pinet_runtime" for signature in signatures[-3:]]
    return result


def drop_sql():
    return ["DROP TRIGGER model_parent_fence ON control_task_runs", "DROP TRIGGER model_parent_fence ON control_tasks",
        *[f"DROP TABLE {table}" for table in reversed(TABLES)],
        "DROP FUNCTION acquisition_model_settle_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR)",
        "DROP FUNCTION acquisition_model_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)",
        "DROP FUNCTION acquisition_model_settle_attempt(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,JSONB)",
        "DROP FUNCTION acquisition_model_row_fence()", "DROP FUNCTION acquisition_model_parent_fence()",
        "DROP FUNCTION acquisition_model_authorization_current(VARCHAR)",
        "DROP FUNCTION acquisition_model_valid_usage(JSONB)"]
