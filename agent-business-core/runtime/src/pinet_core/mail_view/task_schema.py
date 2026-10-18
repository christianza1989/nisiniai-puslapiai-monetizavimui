"""Separate bounded display permission on common Task/Run; no SQL on import."""
from ..acquisition import model_schema as predecessor

KIND="mail.display_translate"
MODEL,EFFORT,ADAPTER="gpt-6.1-sol","high","mail-display-task.v1"
TABLE_POLICY="control_mail_display_policies"
TABLE_JOB="control_mail_display_jobs"
TABLES=(TABLE_POLICY,TABLE_JOB)
TOKENS=("input_tokens","output_tokens","cached_input_tokens","reasoning_output_tokens")
OLD_KIND=f"({predecessor.OLD_KIND}) OR kind='{predecessor.KIND}'"
OLD_SESSION=f"({predecessor.OLD_SESSION}) OR(kind='{predecessor.KIND}' AND session_id IS NOT NULL AND business_id IS NOT NULL)"
OLD_BUSINESS=predecessor.OLD_BUSINESS
BOUNDARY_BEFORE=predecessor.BOUNDARY_AFTER
BOUNDARY_AFTER=BOUNDARY_BEFORE.replace(f"'{predecessor.KIND}')",f"'{predecessor.KIND}','{KIND}')",1).replace(
    "THEN 'legacy'",f"AND(t.kind<>'{KIND}' OR t.session_id IS NOT NULL)\n          THEN 'legacy'",1)


def patch_boundary(definition,*,downgrade=False):
    definition=definition.replace("\r\n","\n")
    before,after=(BOUNDARY_AFTER,BOUNDARY_BEFORE) if downgrade else (BOUNDARY_BEFORE,BOUNDARY_AFTER)
    if ("FUNCTION public.workspace_direct_task_boundary(" not in definition or definition.count(before)!=1
            or not downgrade and KIND in definition):
        raise RuntimeError("Unknown0046 typed business Task boundary")
    return definition.replace(before,after,1)


def probe_sql():
    return [f"CREATE TEMP TABLE pinet_display_{name}_probe(kind VARCHAR,session_id VARCHAR,business_id VARCHAR,CHECK({value})) ON COMMIT DROP"
        for name,value in (("kind_old",OLD_KIND),("session_old",OLD_SESSION),("business",OLD_BUSINESS),
        ("kind_new",f"({OLD_KIND}) OR kind='{KIND}'"),
        ("session_new",f"({OLD_SESSION}) OR(kind='{KIND}' AND session_id IS NOT NULL AND business_id IS NOT NULL)"))]


def task_checks(rows,probes,*,downgrade=False):
    current={row["name"]:row["expression"] for row in rows}
    if len(current)!=len(rows):
        raise RuntimeError("Ambiguous Task checks")
    expected="new" if downgrade else "old"
    for name,key in (("control_tasks_kind_check","kind_"+expected),
        ("control_tasks_session_kind_check","session_"+expected),("control_task_business_execution_check","business")):
        if current.get(name)!=probes[key]:
            raise RuntimeError("Unknown0046 Task kind/Session/Business checks")
    kind=OLD_KIND if downgrade else f"({OLD_KIND}) OR kind='{KIND}'"
    session=OLD_SESSION if downgrade else f"({OLD_SESSION}) OR(kind='{KIND}' AND session_id IS NOT NULL AND business_id IS NOT NULL)"
    return [sql for name,value in (("control_tasks_kind_check",kind),("control_tasks_session_kind_check",session))
        for sql in (f"ALTER TABLE control_tasks DROP CONSTRAINT {name}",f"ALTER TABLE control_tasks ADD CONSTRAINT {name} CHECK({value})")]


def tables_sql():
    return [f"""CREATE TABLE {TABLE_POLICY}(
      id VARCHAR PRIMARY KEY CHECK(id~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$'),
      environment_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,
      portfolio_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,session_id VARCHAR NOT NULL,
      source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
      instruction_sha256 VARCHAR NOT NULL CHECK(instruction_sha256~'^[a-f0-9]{{64}}$'),
      target_language VARCHAR NOT NULL CHECK(target_language='lt'),model VARCHAR NOT NULL CHECK(model='{MODEL}'),
      effort VARCHAR NOT NULL CHECK(effort='{EFFORT}'),maximum_calls INTEGER NOT NULL CHECK(maximum_calls BETWEEN 1 AND 30),
      mail_created_after TIMESTAMPTZ NOT NULL,approved_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,
      CHECK(expires_at>approved_at AND expires_at<=approved_at+INTERVAL '3600 seconds'),enabled BOOLEAN NOT NULL,
      fingerprint VARCHAR NOT NULL CHECK(fingerprint~'^[a-f0-9]{{64}}$'),
      UNIQUE(id,business_id,organization_id,user_id,environment_id),
      FOREIGN KEY(grant_id,business_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_business_grants(id,business_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(session_id,user_id,environment_id) REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)""",
      f"""CREATE TABLE {TABLE_JOB}(
      task_id VARCHAR PRIMARY KEY,policy_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
      user_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,kind VARCHAR NOT NULL CHECK(kind='{KIND}'),
      mail_id VARCHAR NOT NULL,case_id VARCHAR NOT NULL,source_sha256 VARCHAR NOT NULL CHECK(source_sha256~'^[a-f0-9]{{64}}$'),
      instruction_sha256 VARCHAR NOT NULL CHECK(instruction_sha256~'^[a-f0-9]{{64}}$'),
      target_language VARCHAR NOT NULL CHECK(target_language='lt'),run_id VARCHAR,reserved_at TIMESTAMPTZ,
      CHECK((run_id IS NULL)=(reserved_at IS NULL)),record JSONB CHECK(record IS NULL OR(jsonb_typeof(record)='object' AND octet_length(record::text)<=200000)),
      CHECK(record IS NULL OR run_id IS NOT NULL),created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      CONSTRAINT uq_mail_display_source UNIQUE(business_id,environment_id,mail_id,source_sha256,instruction_sha256,target_language),
      FOREIGN KEY(task_id,business_id,organization_id,user_id,environment_id,kind)
        REFERENCES control_tasks(id,business_id,organization_id,user_id,environment_id,kind) ON DELETE RESTRICT,
      FOREIGN KEY(policy_id,business_id,organization_id,user_id,environment_id)
        REFERENCES {TABLE_POLICY}(id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(mail_id,business_id,environment_id) REFERENCES mail_messages(id,business_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(case_id,business_id,environment_id) REFERENCES cases(id,business_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(run_id,task_id,business_id,organization_id,user_id,environment_id)
        REFERENCES control_task_runs(id,task_id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT)""",
      f"CREATE INDEX ix_mail_display_policy_slots ON {TABLE_JOB}(policy_id)"]


def usage_sql():
    return """CREATE FUNCTION mail_display_valid_usage(j JSONB) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE
      SET search_path=pg_catalog,public AS $$DECLARE kv RECORD;BEGIN
      IF j IS NULL OR j='null'::jsonb THEN RETURN TRUE;END IF;
      IF jsonb_typeof(j)<>'object' THEN RETURN FALSE;END IF;
      FOR kv IN SELECT key,value FROM jsonb_each(j) LOOP
        IF kv.key NOT IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens')
          OR jsonb_typeof(kv.value)<>'number' OR kv.value::text!~'^[0-9]{1,10}$' THEN RETURN FALSE;END IF;
        IF kv.value::text::BIGINT>1000000000 THEN RETURN FALSE;END IF;
      END LOOP;RETURN TRUE;END$$"""


def current_sql():
    return f"""CREATE FUNCTION mail_display_policy_current(aid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$BEGIN
      RETURN EXISTS(SELECT 1 FROM public.{TABLE_POLICY} a JOIN public.control_business_grants g
        ON g.id=a.grant_id AND g.business_id=a.business_id AND g.organization_id=a.organization_id
          AND g.portfolio_id=a.portfolio_id AND g.environment_id=a.environment_id
        JOIN public.control_memberships member ON member.organization_id=a.organization_id
          AND member.user_id=a.user_id AND member.environment_id=a.environment_id
        JOIN public.control_users u ON u.id=a.user_id AND u.environment_id=a.environment_id
        JOIN public.control_customer_accounts ca ON ca.user_id=a.user_id AND ca.environment_id=a.environment_id AND ca.verified_at IS NOT NULL
        JOIN public.control_sessions s ON s.id=a.session_id AND s.user_id=a.user_id AND s.environment_id=a.environment_id
        WHERE a.id=aid AND a.enabled AND g.enabled AND member.enabled AND member.role='owner' AND u.enabled
        AND a.user_id=current_setting('pinet.control_user',true) AND a.environment_id=current_setting('pinet.environment',true)
        AND a.source_revision=current_setting('pinet.execution_source_revision',true)
        AND a.approved_at<=clock_timestamp() AND a.expires_at>clock_timestamp()
        AND a.expires_at<=s.expires_at AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp());END$$"""


def row_fence_sql():
    return f"""CREATE FUNCTION mail_display_row_fence() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
      SET search_path=pg_catalog,public AS $$DECLARE t public.control_tasks%ROWTYPE;p public.{TABLE_POLICY}%ROWTYPE;
      m public.mail_messages%ROWTYPE;n BIGINT;BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'retained mail display history' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='{TABLE_POLICY}' THEN
        IF TG_OP='UPDATE' THEN
          IF(to_jsonb(NEW)-'enabled') IS DISTINCT FROM(to_jsonb(OLD)-'enabled') OR NOT OLD.enabled OR NEW.enabled THEN
            RAISE EXCEPTION 'immutable display policy; disable only' USING ERRCODE='23514';END IF;
        ELSIF NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id
          AND s.environment_id=NEW.environment_id AND s.expires_at>=NEW.expires_at) THEN
          RAISE EXCEPTION 'display policy Session cap required' USING ERRCODE='23514';
        END IF;RETURN NEW;
      END IF;
      IF TG_OP='UPDATE' THEN
        IF current_setting('pinet.mail_display_mutation',true) IS DISTINCT FROM OLD.task_id
          OR(to_jsonb(NEW)-ARRAY['run_id','reserved_at','record']) IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['run_id','reserved_at','record'])
          OR(OLD.run_id IS NOT NULL AND(NEW.run_id IS DISTINCT FROM OLD.run_id OR NEW.reserved_at IS DISTINCT FROM OLD.reserved_at))
          OR(OLD.record IS NOT NULL AND NEW.record IS DISTINCT FROM OLD.record) THEN
          RAISE EXCEPTION 'immutable display Job; exact typed mutation only' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF NEW.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR NEW.environment_id IS DISTINCT FROM current_setting('pinet.environment',true) THEN
        RAISE EXCEPTION 'exact display actor required' USING ERRCODE='23514';END IF;
      SELECT * INTO t FROM public.control_tasks WHERE id=NEW.task_id FOR UPDATE;
      SELECT * INTO p FROM public.{TABLE_POLICY} WHERE id=NEW.policy_id FOR UPDATE;
      IF t.id IS NULL OR p.id IS NULL OR t.kind<>'{KIND}' OR t.business_id IS DISTINCT FROM NEW.business_id
        OR t.organization_id<>NEW.organization_id OR t.user_id<>NEW.user_id OR t.environment_id<>NEW.environment_id
        OR p.business_id<>NEW.business_id OR p.organization_id<>NEW.organization_id OR p.user_id<>NEW.user_id OR p.environment_id<>NEW.environment_id
        OR t.session_id IS DISTINCT FROM p.session_id OR t.source_revision<>p.source_revision
        OR NEW.instruction_sha256<>p.instruction_sha256 OR NEW.target_language<>p.target_language
        OR t.status<>'queued' OR t.run_id IS NOT NULL OR NEW.run_id IS NOT NULL OR NEW.reserved_at IS NOT NULL OR NEW.record IS NOT NULL
        OR NOT public.mail_display_policy_current(p.id) THEN
        RAISE EXCEPTION 'current exact queued display binding required' USING ERRCODE='23514';END IF;
      SELECT * INTO m FROM public.mail_messages WHERE id=NEW.mail_id AND business_id=NEW.business_id AND environment_id=NEW.environment_id;
      IF NOT FOUND OR m.case_id<>NEW.case_id OR m.created_at<p.mail_created_after THEN
        RAISE EXCEPTION 'exact eligible display Mail/Case required' USING ERRCODE='23514';END IF;
      SELECT count(*) INTO n FROM public.{TABLE_JOB} j JOIN public.control_tasks q ON q.id=j.task_id
        WHERE j.policy_id=p.id AND(j.reserved_at IS NOT NULL OR q.status IN('queued','running'));
      IF n>=p.maximum_calls AND NOT EXISTS(SELECT 1 FROM public.{TABLE_JOB} seen
        WHERE seen.business_id=NEW.business_id AND seen.environment_id=NEW.environment_id AND seen.mail_id=NEW.mail_id
        AND seen.source_sha256=NEW.source_sha256 AND seen.instruction_sha256=NEW.instruction_sha256 AND seen.target_language=NEW.target_language) THEN
        RAISE EXCEPTION 'display policy slots exhausted' USING ERRCODE='23514';END IF;
      NEW.created_at=clock_timestamp();RETURN NEW;END$$"""


def parent_fence_sql():
    return f"""CREATE FUNCTION mail_display_parent_fence() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
      SET search_path=pg_catalog,public AS $$BEGIN
      IF TG_TABLE_NAME='control_tasks' THEN
        IF EXISTS(SELECT 1 FROM public.{TABLE_JOB} WHERE task_id=OLD.id) AND(
          (to_jsonb(NEW)-ARRAY['message','status','result','failure_code','run_id','lease_until','updated_at','event_sequence'])
          IS DISTINCT FROM(to_jsonb(OLD)-ARRAY['message','status','result','failure_code','run_id','lease_until','updated_at','event_sequence'])
          OR(OLD.run_id IS NOT NULL AND NEW.run_id IS DISTINCT FROM OLD.run_id)) THEN
          RAISE EXCEPTION 'immutable display Task identity' USING ERRCODE='23514';END IF;
      ELSE
        IF EXISTS(SELECT 1 FROM public.control_tasks WHERE id=NEW.task_id AND kind='{KIND}') THEN
          IF NEW.model<>'{MODEL}' OR NEW.effort<>'{EFFORT}' OR NEW.adapter_revision<>'{ADAPTER}' THEN
            RAISE EXCEPTION 'exact display Run identity required' USING ERRCODE='23514';END IF;
          IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM public.control_tasks WHERE id=NEW.task_id AND run_id=NEW.id) THEN
            RAISE EXCEPTION 'one-shot display Run required' USING ERRCODE='23514';END IF;
        END IF;
        IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.{TABLE_JOB} WHERE task_id=OLD.task_id)
          AND(to_jsonb(NEW)-ARRAY['status','finished_at','usage','cost_microusd']) IS DISTINCT FROM
            (to_jsonb(OLD)-ARRAY['status','finished_at','usage','cost_microusd']) THEN
          RAISE EXCEPTION 'immutable bound display Run identity' USING ERRCODE='23514';END IF;
      END IF;RETURN NEW;END$$"""


DECL=f"""t public.control_tasks%ROWTYPE;r public.control_task_runs%ROWTYPE;
  p public.{TABLE_POLICY}%ROWTYPE;j public.{TABLE_JOB}%ROWTYPE;"""
# Preliminary Job lookup reads only its immutable policy id. Locks follow the
# agreed Task -> Run -> Policy -> Job order; no new actor locks in accounting.
LOCKED=f"""IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true) THEN RETURN FALSE;END IF;
  SELECT * INTO t FROM public.control_tasks WHERE id=tid FOR UPDATE;
  IF NOT FOUND OR t.kind<>'{KIND}' OR t.user_id IS DISTINCT FROM u OR t.environment_id IS DISTINCT FROM e
    OR t.source_revision IS DISTINCT FROM src OR t.run_id IS DISTINCT FROM rid THEN RETURN FALSE;END IF;
  SELECT * INTO r FROM public.control_task_runs WHERE id=rid AND task_id=tid FOR UPDATE;
  IF NOT FOUND OR r.business_id IS DISTINCT FROM t.business_id OR r.organization_id<>t.organization_id
    OR r.user_id IS DISTINCT FROM u OR r.environment_id IS DISTINCT FROM e
    OR r.model<>'{MODEL}' OR r.effort<>'{EFFORT}' OR r.adapter_revision<>'{ADAPTER}' THEN RETURN FALSE;END IF;
  SELECT * INTO j FROM public.{TABLE_JOB} WHERE task_id=tid;
  IF NOT FOUND THEN RETURN FALSE;END IF;
  SELECT * INTO p FROM public.{TABLE_POLICY} WHERE id=j.policy_id FOR UPDATE;
  SELECT * INTO j FROM public.{TABLE_JOB} WHERE task_id=tid FOR UPDATE;
  IF p.id IS NULL OR j.business_id IS DISTINCT FROM t.business_id OR j.organization_id<>t.organization_id
    OR j.user_id IS DISTINCT FROM u OR j.environment_id IS DISTINCT FROM e OR j.kind<>'{KIND}'
    OR p.source_revision IS DISTINCT FROM src OR p.session_id IS DISTINCT FROM t.session_id
    OR(j.run_id IS NOT NULL AND j.run_id IS DISTINCT FROM rid) THEN RETURN FALSE;END IF;"""
LIVE="""t.status='running' AND r.status='running' AND t.lease_until>clock_timestamp()
  AND public.mail_display_policy_current(p.id)"""


def reserve_sql():
    return f"""CREATE FUNCTION mail_display_reserve(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE {DECL} n BIGINT;BEGIN
      {LOCKED}
      IF NOT coalesce(({LIVE}),FALSE) OR j.run_id IS NOT NULL OR j.record IS NOT NULL THEN RETURN FALSE;END IF;
      IF NOT EXISTS(SELECT 1 FROM public.mail_messages m WHERE m.id=j.mail_id AND m.case_id=j.case_id
        AND m.business_id=j.business_id AND m.environment_id=j.environment_id AND m.created_at>=p.mail_created_after) THEN RETURN FALSE;END IF;
      SELECT count(*) INTO n FROM public.{TABLE_JOB} WHERE policy_id=p.id AND reserved_at IS NOT NULL;
      IF n>=p.maximum_calls OR NOT coalesce(({LIVE}),FALSE) THEN RETURN FALSE;END IF;
      PERFORM set_config('pinet.mail_display_mutation',tid,true);
      UPDATE public.{TABLE_JOB} SET run_id=rid,reserved_at=clock_timestamp() WHERE task_id=tid;
      PERFORM set_config('pinet.mail_display_mutation','',true);
      UPDATE public.control_task_runs SET usage=NULL,cost_microusd=NULL WHERE id=rid;
      RETURN TRUE;END$$"""


def run_usage_sql():
    return f"""CREATE FUNCTION mail_display_run_usage(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR) RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE saved JSONB;tokens JSONB='{{}}'::jsonb;kv RECORD;calls INTEGER;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true) THEN RETURN NULL;END IF;
      SELECT r.usage,CASE WHEN j.run_id=r.id AND j.reserved_at IS NOT NULL THEN 1 ELSE 0 END INTO saved,calls
        FROM public.control_tasks t JOIN public.control_task_runs r ON r.task_id=t.id
        JOIN public.{TABLE_JOB} j ON j.task_id=t.id JOIN public.{TABLE_POLICY} p ON p.id=j.policy_id
        WHERE t.id=tid AND r.id=rid AND t.run_id=rid AND t.kind='{KIND}' AND t.user_id=u AND t.environment_id=e
        AND t.source_revision=src AND p.source_revision=src AND p.session_id=t.session_id AND(j.run_id IS NULL OR j.run_id=r.id)
        AND r.business_id=t.business_id AND r.organization_id=t.organization_id AND r.user_id=u AND r.environment_id=e
        AND r.model='{MODEL}' AND r.effort='{EFFORT}' AND r.adapter_revision='{ADAPTER}';
      IF NOT FOUND THEN RETURN NULL;END IF;
      IF calls=1 AND jsonb_typeof(saved)='object' THEN
        FOR kv IN SELECT key,value FROM jsonb_each(saved) WHERE key IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens') LOOP
          tokens=jsonb_set(tokens,ARRAY[kv.key],kv.value);
        END LOOP;
      END IF;
      IF NOT public.mail_display_valid_usage(tokens) OR tokens='{{}}'::jsonb THEN tokens=NULL;END IF;
      RETURN jsonb_build_object('usage',tokens,'model_calls',calls,'unknown_usage_calls',CASE WHEN calls=1 AND tokens IS NULL THEN 1 ELSE 0 END,
        'usage_complete',calls=0 OR tokens IS NOT NULL);END$$"""


def settle_sql():
    return f"""CREATE FUNCTION mail_display_settle_task(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR,observed JSONB,reason VARCHAR,eid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE {DECL}
      projection JSONB;tokens JSONB;receipt JSONB;kv RECORD;stamp TIMESTAMPTZ;BEGIN
      IF NOT public.mail_display_valid_usage(observed) OR eid IS NULL OR eid!~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$'
        OR reason IS NULL OR reason NOT IN('authorization_revoked','provider_error','mail_translation_invalid','mail_authority_changed',
          'worker_interrupted','run_timeout','output_invalid','translation_runner_unavailable','translation_deadline_invalid','usage_observed') THEN RETURN FALSE;END IF;
      {LOCKED}
      IF reason='usage_observed' THEN
        IF j.run_id IS NULL OR t.status NOT IN('running','failed','cancelled','succeeded')
          OR r.status NOT IN('running','failed','cancelled','succeeded') THEN RETURN FALSE;END IF;
      ELSE
        IF t.status NOT IN('running','failed','cancelled') OR r.status NOT IN('running','failed','cancelled')
          OR(t.result IS NOT NULL AND t.result<>'null'::jsonb) THEN RETURN FALSE;END IF;
        IF t.status<>'running' AND(r.status NOT IN('running',t.status) OR t.lease_until IS NOT NULL) THEN RETURN FALSE;END IF;
      END IF;
      projection=public.mail_display_run_usage(tid,rid,u,e,src);
      IF projection IS NULL THEN RETURN FALSE;END IF;
      tokens=coalesce(nullif(projection->'usage','null'::jsonb),'{{}}'::jsonb);
      IF j.run_id IS NOT NULL THEN
        FOR kv IN SELECT key,value FROM jsonb_each(coalesce(nullif(observed,'null'::jsonb),'{{}}'::jsonb)) LOOP
          tokens=jsonb_set(tokens,ARRAY[kv.key],to_jsonb(greatest(coalesce((tokens->>kv.key)::BIGINT,0),kv.value::text::BIGINT)));
        END LOOP;
      ELSIF observed IS NOT NULL AND observed NOT IN('null'::jsonb,'{{}}'::jsonb) THEN RETURN FALSE;END IF;
      receipt=tokens || (projection-'usage'-'unknown_usage_calls'-'usage_complete') || jsonb_build_object(
        'unknown_usage_calls',CASE WHEN j.run_id IS NOT NULL AND tokens='{{}}'::jsonb THEN 1 ELSE 0 END,
        'usage_complete',j.run_id IS NULL OR tokens<>'{{}}'::jsonb);
      IF reason='usage_observed' THEN
        IF r.usage IS DISTINCT FROM receipt OR r.cost_microusd IS NOT NULL THEN
          UPDATE public.control_task_runs SET usage=receipt,cost_microusd=NULL WHERE id=rid;END IF;
        RETURN TRUE;
      END IF;
      IF t.status<>'running' AND r.status=t.status THEN
        IF r.usage IS DISTINCT FROM receipt OR r.cost_microusd IS NOT NULL THEN
          UPDATE public.control_task_runs SET usage=receipt,cost_microusd=NULL WHERE id=rid;END IF;
        RETURN TRUE;
      END IF;
      stamp=clock_timestamp();
      IF t.status='running' THEN
        UPDATE public.control_tasks SET status='failed',failure_code=reason,result=NULL,lease_until=NULL,
          updated_at=stamp,event_sequence=event_sequence+1 WHERE id=tid;
        INSERT INTO public.control_task_events(id,environment_id,organization_id,business_id,user_id,created_at,task_id,sequence,status,failure_code)
          SELECT eid,environment_id,organization_id,business_id,user_id,stamp,id,event_sequence,status,failure_code
          FROM public.control_tasks WHERE id=tid;
        t.status='failed';
      END IF;
      UPDATE public.control_task_runs SET status=t.status,finished_at=coalesce(finished_at,stamp),usage=receipt,cost_microusd=NULL WHERE id=rid;
      RETURN TRUE;END$$"""


def store_sql():
    return f"""CREATE FUNCTION mail_display_store_record(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR,value JSONB,observed JSONB) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE {DECL}
      normalized JSONB;receipt JSONB;tokens JSONB;projection JSONB;kv RECORD;BEGIN
      IF NOT public.mail_display_valid_usage(observed) OR value IS NULL OR jsonb_typeof(value)<>'object' OR octet_length(value::text)>200000 THEN RETURN FALSE;END IF;
      {LOCKED}
      IF j.run_id IS DISTINCT FROM rid OR j.reserved_at IS NULL OR NOT coalesce(({LIVE}),FALSE) THEN RETURN FALSE;END IF;
      normalized=nullif(nullif(observed,'null'::jsonb),'{{}}'::jsonb);
      IF value-ARRAY['version','business_id','environment','mail_id','source_sha256','target_language','translated_at','model','reasoning_effort','instruction_sha256','text','usage']<>'{{}}'::jsonb
        OR NOT(value ?& ARRAY['version','business_id','environment','mail_id','source_sha256','target_language','translated_at','model','reasoning_effort','instruction_sha256','text','usage'])
        OR value->>'version' IS DISTINCT FROM 'mail-display-translation.v1' OR value->>'business_id' IS DISTINCT FROM j.business_id
        OR value->>'environment' IS DISTINCT FROM j.environment_id OR value->>'mail_id' IS DISTINCT FROM j.mail_id
        OR value->>'source_sha256' IS DISTINCT FROM j.source_sha256 OR value->>'instruction_sha256' IS DISTINCT FROM j.instruction_sha256
        OR value->>'target_language' IS DISTINCT FROM 'lt' OR value->>'model' IS DISTINCT FROM '{MODEL}' OR value->>'reasoning_effort' IS DISTINCT FROM '{EFFORT}'
        OR NOT public.mail_display_valid_usage(value->'usage') OR nullif(nullif(value->'usage','null'::jsonb),'{{}}'::jsonb) IS DISTINCT FROM normalized
        OR jsonb_typeof(value->'text') IS DISTINCT FROM 'object' OR (value->'text')-ARRAY['subject','body']<>'{{}}'::jsonb
        OR jsonb_typeof(value->'text'->'subject') IS DISTINCT FROM 'string' OR jsonb_typeof(value->'text'->'body') IS DISTINCT FROM 'string'
        OR length(value->'text'->>'subject')>512 OR length(value->'text'->>'body')>32000 OR btrim(value->'text'->>'body')=''
        OR jsonb_typeof(value->'translated_at') IS DISTINCT FROM 'string' OR value->>'translated_at'!~'(Z|[+-][0-9]{{2}}:[0-9]{{2}})$'
        OR(value->>'translated_at')::TIMESTAMPTZ>clock_timestamp() OR(value->>'translated_at')::TIMESTAMPTZ<j.reserved_at THEN RETURN FALSE;END IF;
      IF NOT EXISTS(SELECT 1 FROM public.mail_messages m WHERE m.id=j.mail_id AND m.case_id=j.case_id
        AND m.business_id=j.business_id AND m.environment_id=j.environment_id AND m.created_at>=p.mail_created_after) THEN RETURN FALSE;END IF;
      IF j.record IS NOT NULL AND j.record IS DISTINCT FROM value THEN RETURN FALSE;END IF;
      IF NOT coalesce(({LIVE}),FALSE) THEN RETURN FALSE;END IF;
      IF j.record IS NULL THEN
        PERFORM set_config('pinet.mail_display_mutation',tid,true);
        UPDATE public.{TABLE_JOB} SET record=value WHERE task_id=tid;
        PERFORM set_config('pinet.mail_display_mutation','',true);
      END IF;
      projection=public.mail_display_run_usage(tid,rid,u,e,src);
      tokens=coalesce(nullif(projection->'usage','null'::jsonb),'{{}}'::jsonb);
      FOR kv IN SELECT pair.key,pair.value FROM jsonb_each(coalesce(normalized,'{{}}'::jsonb)) AS pair LOOP
        tokens=jsonb_set(tokens,ARRAY[kv.key],to_jsonb(greatest(coalesce((tokens->>kv.key)::BIGINT,0),kv.value::text::BIGINT)));
      END LOOP;
      receipt=tokens||jsonb_build_object('model_calls',1,'unknown_usage_calls',CASE WHEN tokens='{{}}'::jsonb THEN 1 ELSE 0 END,'usage_complete',tokens<>'{{}}'::jsonb);
      IF r.usage IS DISTINCT FROM receipt OR r.cost_microusd IS NOT NULL THEN
        UPDATE public.control_task_runs SET usage=receipt,cost_microusd=NULL WHERE id=rid;END IF;
      RETURN TRUE;
      EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN RETURN FALSE;
      END$$"""


def projection_sql():
    # Canonical Mail is already business-owner readable. This helper exposes
    # only its derived LT display, never another owner's task/accounting ids.
    marker=f"""SELECT 1 FROM public.control_tasks mark WHERE mark.business_id=b AND mark.environment_id=e
      AND mark.kind='{KIND}' AND mark.status='cancelled' AND mark.run_id IS NULL
      AND mark.failure_code='mail_display_legacy_retained' AND jsonb_typeof(mark.result)='object'
      AND mark.result-ARRAY['state','mail_id','source_sha256','instruction_sha256','target_language']='{{}}'::jsonb
      AND mark.result->>'state'='legacy_retained' AND mark.result->>'mail_id'=m
      AND mark.result->>'instruction_sha256'=ins AND mark.result->>'target_language'='lt'
      AND mark.result->>'source_sha256'~'^[a-f0-9]{{64}}$'"""
    return f"""CREATE FUNCTION mail_display_projection(b VARCHAR,m VARCHAR,u VARCHAR,e VARCHAR,sha VARCHAR,ins VARCHAR) RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE stored JSONB;task_state VARCHAR;run_state VARCHAR;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR ins IS NULL OR ins!~'^[a-f0-9]{{64}}$' OR(sha IS NOT NULL AND sha!~'^[a-f0-9]{{64}}$') THEN RETURN NULL;END IF;
      IF NOT EXISTS(SELECT 1 FROM public.control_business_grants grantrow
        JOIN public.control_memberships memberrow ON memberrow.organization_id=grantrow.organization_id AND memberrow.environment_id=grantrow.environment_id
        JOIN public.control_users identityrow ON identityrow.id=memberrow.user_id AND identityrow.environment_id=memberrow.environment_id
        JOIN public.mail_messages letter ON letter.business_id=grantrow.business_id AND letter.environment_id=grantrow.environment_id
        JOIN public.cases case_row ON case_row.id=letter.case_id AND case_row.business_id=letter.business_id AND case_row.environment_id=letter.environment_id
        WHERE grantrow.business_id=b AND grantrow.environment_id=e AND grantrow.enabled
        AND memberrow.user_id=u AND memberrow.role='owner' AND memberrow.enabled AND identityrow.enabled AND letter.id=m) THEN RETURN NULL;END IF;
      IF sha IS NULL THEN
        IF EXISTS(SELECT 1 FROM public.{TABLE_JOB} bound WHERE bound.business_id=b AND bound.environment_id=e
          AND bound.mail_id=m AND bound.instruction_sha256=ins AND bound.target_language='lt')
          OR EXISTS({marker}) THEN RETURN jsonb_build_object('state','claimed','record',NULL);END IF;
        RETURN NULL;
      END IF;
      SELECT bound.record,parent.status,attempt.status INTO stored,task_state,run_state
        FROM public.{TABLE_JOB} bound JOIN public.control_tasks parent ON parent.id=bound.task_id
        LEFT JOIN public.control_task_runs attempt ON attempt.id=bound.run_id AND attempt.task_id=bound.task_id
        WHERE bound.business_id=b AND bound.environment_id=e AND bound.mail_id=m
        AND bound.source_sha256=sha AND bound.instruction_sha256=ins AND bound.target_language='lt';
      IF FOUND THEN
        IF task_state='succeeded' AND run_state='succeeded' AND stored IS NOT NULL THEN
          RETURN jsonb_build_object('state','ready','record',jsonb_set(stored,ARRAY['usage'],'null'::jsonb,true));
        ELSIF task_state IN('queued','running') THEN RETURN jsonb_build_object('state','pending','record',NULL);
        ELSE RETURN jsonb_build_object('state','unavailable','record',NULL);END IF;
      END IF;
      IF EXISTS({marker} AND mark.result->>'source_sha256'=sha) THEN
        RETURN jsonb_build_object('state','legacy_retained','record',NULL);END IF;
      RETURN NULL;END$$"""


def statements():
    result=[*tables_sql(),usage_sql(),current_sql(),row_fence_sql(),parent_fence_sql(),reserve_sql(),run_usage_sql(),settle_sql(),store_sql(),projection_sql()]
    for table in TABLES:
        result += [f"CREATE TRIGGER mail_display_row_fence BEFORE INSERT OR UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION mail_display_row_fence()",
          f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY",f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
          f"CREATE POLICY mail_display_owned ON {table} USING({predecessor.owner_predicate(table)}) WITH CHECK({predecessor.owner_predicate(table)})",
          f"REVOKE ALL ON {table} FROM PUBLIC,pinet_runtime",f"GRANT {'SELECT' if table==TABLE_POLICY else 'SELECT,INSERT'} ON {table} TO pinet_runtime"]
    result += ["CREATE TRIGGER mail_display_parent_fence BEFORE UPDATE ON control_tasks FOR EACH ROW EXECUTE FUNCTION mail_display_parent_fence()",
        "CREATE TRIGGER mail_display_parent_fence BEFORE INSERT OR UPDATE ON control_task_runs FOR EACH ROW EXECUTE FUNCTION mail_display_parent_fence()"]
    private=("mail_display_valid_usage(JSONB)","mail_display_policy_current(VARCHAR)","mail_display_row_fence()","mail_display_parent_fence()")
    public=("mail_display_reserve(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)","mail_display_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)",
        "mail_display_settle_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR,VARCHAR)","mail_display_store_record(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,JSONB)",
        "mail_display_projection(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)")
    result += [f"REVOKE ALL ON FUNCTION {signature} FROM PUBLIC" for signature in (*private,*public)]
    result += [f"GRANT EXECUTE ON FUNCTION {signature} TO pinet_runtime" for signature in public]
    return result


def drop_sql():
    return ["DROP TRIGGER mail_display_parent_fence ON control_task_runs","DROP TRIGGER mail_display_parent_fence ON control_tasks",
        f"DROP TABLE {TABLE_JOB}",f"DROP TABLE {TABLE_POLICY}",
        "DROP FUNCTION mail_display_projection(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)",
        "DROP FUNCTION mail_display_store_record(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,JSONB)",
        "DROP FUNCTION mail_display_settle_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR,VARCHAR)",
        "DROP FUNCTION mail_display_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)","DROP FUNCTION mail_display_reserve(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR)",
        "DROP FUNCTION mail_display_parent_fence()","DROP FUNCTION mail_display_row_fence()","DROP FUNCTION mail_display_policy_current(VARCHAR)","DROP FUNCTION mail_display_valid_usage(JSONB)"]
