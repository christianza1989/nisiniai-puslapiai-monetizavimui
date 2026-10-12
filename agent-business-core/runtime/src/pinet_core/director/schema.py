"""Immutable private input receipts; no broadening of existing runtime identities."""

TABLE = "control_director_contexts"
FUNCTION_NAMES = ("director_pin_reader", "director_settle_revoked_task", "director_context_exists")


def function_security_sql(*, privileges=True):
    authority = """p.prosecdef AND (r.rolsuper OR r.rolbypassrls)
        AND 'search_path=pg_catalog, public'=ANY(p.proconfig)"""
    if privileges:
        authority += """ AND has_function_privilege(current_user,p.oid,'EXECUTE')
          AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
            WHERE a.grantee=0 AND a.privilege_type='EXECUTE')"""
    return f"""SELECT count(*)=3 AND coalesce(bool_and({authority}),false)
        FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
        WHERE p.pronamespace='public'::regnamespace
        AND p.proname IN ('director_pin_reader','director_settle_revoked_task','director_context_exists')"""


CONTEXT_EXISTS = """CREATE FUNCTION director_context_exists(tid VARCHAR,u VARCHAR,e VARCHAR)
 RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT u IS NOT DISTINCT FROM current_setting('pinet.control_user',true)
 AND e IS NOT DISTINCT FROM current_setting('pinet.environment',true)
 AND EXISTS(SELECT 1 FROM public.control_director_contexts c
   WHERE c.task_id=tid AND c.user_id=u AND c.environment_id=e)
 $$"""
DDL = f"""CREATE TABLE {TABLE} (
 id VARCHAR PRIMARY KEY, task_id VARCHAR NOT NULL, business_id VARCHAR NOT NULL,
 organization_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,
 site_id VARCHAR NOT NULL,adapter_id VARCHAR NOT NULL,environment_class VARCHAR NOT NULL CHECK(environment_class='test'),
 created_at TIMESTAMPTZ NOT NULL,input_sha256 VARCHAR NOT NULL CHECK(input_sha256 ~ '^[a-f0-9]{{64}}$'),
 data JSONB NOT NULL CHECK(jsonb_typeof(data)='object'),
 CONSTRAINT fk_director_exact_run_scope FOREIGN KEY(id,task_id,business_id,organization_id,user_id,environment_id)
 REFERENCES control_task_runs(id,task_id,business_id,organization_id,user_id,environment_id))"""

PIN = """CREATE FUNCTION director_pin_reader(b VARCHAR,e VARCHAR,s VARCHAR,a VARCHAR,u VARCHAR,o VARCHAR)
 RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 BEGIN
 IF u IS DISTINCT FROM current_setting('pinet.control_user',true)
 OR o IS DISTINCT FROM current_setting('pinet.director_organization',true)
 OR e IS DISTINCT FROM current_setting('pinet.environment',true)
 OR b IS DISTINCT FROM current_setting('pinet.business',true)
 OR NOT public.acquisition_pin_module(b,e,s,a) THEN RETURN FALSE; END IF;
 PERFORM 1 FROM public.acquisition_modules m WHERE m.business_id=b AND m.environment_id=e
 AND m.site_id=s AND m.adapter_id=a AND m.organization_id=o;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 PERFORM 1 FROM public.control_users x WHERE x.id=u AND x.environment_id=e AND x.enabled FOR SHARE;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 PERFORM 1 FROM public.control_memberships m WHERE m.user_id=u AND m.environment_id=e
 AND m.organization_id=o AND m.role='owner' AND m.enabled FOR SHARE;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 PERFORM 1 FROM public.control_business_grants g WHERE g.business_id=b AND g.environment_id=e
 AND g.organization_id=o AND g.enabled FOR SHARE;
 RETURN FOUND;
 END $$"""

SETTLE = """CREATE FUNCTION director_settle_revoked_task(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR,k VARCHAR,j JSONB,eid VARCHAR)
 RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 DECLARE t RECORD; r RECORD; stamp TIMESTAMPTZ;
 BEGIN
 IF u IS DISTINCT FROM current_setting('pinet.control_user',true)
 OR e IS DISTINCT FROM current_setting('pinet.environment',true)
 OR k NOT IN ('chat.consult','acquisition.reviewed_capture') THEN RETURN FALSE; END IF;
 IF j IS NOT NULL THEN
   IF jsonb_typeof(j) <> 'object' OR length(j::text)>2048 THEN RETURN FALSE; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_each(j) x WHERE
     (x.key !~ '^[a-z_]+_tokens$' AND NOT(k='acquisition.reviewed_capture' AND x.key='model_calls' AND x.value='0'::jsonb))
     OR jsonb_typeof(x.value) <> 'number') THEN RETURN FALSE; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_each(j) x WHERE (x.value::text)::numeric<0
     OR (x.value::text)::numeric>1000000000 OR trunc((x.value::text)::numeric)<>(x.value::text)::numeric) THEN RETURN FALSE; END IF;
 END IF;
 SELECT * INTO t FROM public.control_tasks WHERE id=tid AND user_id=u AND environment_id=e
 AND source_revision=src AND kind=k FOR UPDATE;
 IF NOT FOUND OR t.run_id IS DISTINCT FROM rid OR t.status NOT IN ('running','failed','cancelled') THEN RETURN FALSE; END IF;
 SELECT * INTO r FROM public.control_task_runs WHERE id=rid AND task_id=tid AND user_id=u AND environment_id=e
 AND business_id=t.business_id AND organization_id=t.organization_id FOR UPDATE;
 IF NOT FOUND OR r.status NOT IN ('running','failed','cancelled') THEN RETURN FALSE; END IF;
 stamp=clock_timestamp();
 IF t.status='running' THEN
   UPDATE public.control_tasks SET status='failed',failure_code=CASE WHEN lease_until<=stamp THEN 'worker_interrupted' ELSE 'authorization_revoked' END,
     result=NULL,lease_until=NULL,updated_at=stamp,event_sequence=event_sequence+1 WHERE id=tid;
   INSERT INTO public.control_task_events(id,environment_id,organization_id,business_id,user_id,created_at,task_id,sequence,status,failure_code)
     SELECT eid,environment_id,organization_id,business_id,user_id,stamp,id,event_sequence,status,failure_code FROM public.control_tasks WHERE id=tid;
   t.status='failed';
 END IF;
 -- Never replace a first known settlement. No result, effect or success argument exists.
 UPDATE public.control_task_runs SET status=t.status,finished_at=coalesce(finished_at,stamp),usage=coalesce(usage,j),cost_microusd=NULL WHERE id=rid;
 RETURN TRUE;
 END $$"""


def grants_sql():
    return [
        f"REVOKE ALL ON {TABLE} FROM pinet_runtime",
        f"GRANT SELECT,INSERT ON {TABLE} TO pinet_runtime",
        "REVOKE ALL ON FUNCTION director_pin_reader(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION director_pin_reader(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
        "REVOKE ALL ON FUNCTION director_settle_revoked_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION director_settle_revoked_task(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB,VARCHAR) TO pinet_runtime",
        "REVOKE ALL ON FUNCTION director_context_exists(VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION director_context_exists(VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
    ]


def isolation_sql():
    scope = " AND ".join(
        f"{key}=current_setting('pinet.acq_{key}',true)"
        for key in ["business_id", "environment_id", "site_id", "adapter_id", "environment_class"]
    )
    scope += " AND user_id=current_setting('pinet.control_user',true) AND organization_id=current_setting('pinet.director_organization',true)"
    scope += f""" AND EXISTS(SELECT 1 FROM control_business_grants g JOIN control_memberships m
      ON m.organization_id=g.organization_id AND m.environment_id=g.environment_id
      WHERE g.business_id={TABLE}.business_id AND g.organization_id={TABLE}.organization_id
      AND g.environment_id={TABLE}.environment_id AND g.enabled AND m.enabled AND m.role='owner'
      AND m.user_id={TABLE}.user_id)"""
    return [
        f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY",
        f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
        f"CREATE POLICY director_scope ON {TABLE} USING ({scope}) WITH CHECK ({scope})",
        PIN,
        SETTLE,
        CONTEXT_EXISTS,
        *grants_sql(),
    ]
