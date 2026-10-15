"""Additive bounded native-call allowance on the maintained Task ledger.

Consumption replaces one held slot atomically. Terminal/expired allocations
release only unused slots; committed calls remain counted even without usage.
Allocation authority expires by UTC midnight, independently of provider drain.
"""
ALLOCATION = "control_workspace_calibration_allocations"
CALL = "control_workspace_calibration_calls"


def daily_sql():
    return f"""CREATE OR REPLACE FUNCTION workspace_team_daily_reserved(u VARCHAR,e VARCHAR) RETURNS BIGINT
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE n BIGINT; BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_users WHERE id=u AND environment_id=e AND enabled) THEN RETURN NULL;END IF;
      SELECT (SELECT count(*) FROM public.control_tasks t WHERE t.user_id=u AND t.environment_id=e
          AND t.kind='chat.consult' AND t.status='queued')
        +(SELECT coalesce(sum(CASE WHEN t.status='queued' THEN 3 ELSE greatest(0,3-(SELECT count(*) FROM public.control_workspace_team_attempts a WHERE a.task_id=t.id)) END),0)
          FROM public.control_tasks t WHERE t.user_id=u AND t.environment_id=e AND t.kind='workspace.team_turn'
          AND NOT EXISTS(SELECT 1 FROM public.{ALLOCATION} x WHERE x.task_id=t.id)
          AND (t.status='queued' OR(t.status='running' AND t.lease_until>clock_timestamp())))
        +(SELECT count(*) FROM public.control_task_runs r JOIN public.control_tasks t ON t.id=r.task_id
        WHERE r.user_id=u AND r.environment_id=e AND t.kind='chat.consult'
        AND r.created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        +(SELECT count(*) FROM public.control_workspace_team_attempts a WHERE a.user_id=u AND a.environment_id=e
        AND a.created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        +(SELECT count(*) FROM public.{CALL} c WHERE c.user_id=u AND c.environment_id=e
          AND c.created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        +(SELECT coalesce(sum(greatest(0,a.call_limit-(SELECT count(*) FROM public.{CALL} c WHERE c.task_id=a.task_id))),0)
          FROM public.{ALLOCATION} a JOIN public.control_tasks t ON t.id=a.task_id
          WHERE a.user_id=u AND a.environment_id=e AND a.expires_at>clock_timestamp()
          AND (t.status='queued' OR(t.status='running' AND t.lease_until>clock_timestamp()))) INTO n;RETURN n;END$$"""


def statements():
    return [
        f"""CREATE TABLE {ALLOCATION}(
          task_id VARCHAR PRIMARY KEY, user_id VARCHAR NOT NULL, organization_id VARCHAR NOT NULL,
          portfolio_id VARCHAR NOT NULL, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
          session_id VARCHAR NOT NULL, source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
          plan JSONB NOT NULL CHECK(jsonb_typeof(plan)='object'),
          plan_sha256 VARCHAR NOT NULL CHECK(plan_sha256~'^[a-f0-9]{{64}}$'),
          call_limit INTEGER NOT NULL CHECK(call_limit BETWEEN 3 AND 10),
          run_id VARCHAR, context_sha256 VARCHAR,
          CHECK((run_id IS NULL AND context_sha256 IS NULL) OR(run_id IS NOT NULL AND context_sha256~'^[a-f0-9]{{64}}$')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), expires_at TIMESTAMPTZ NOT NULL,
          CHECK(expires_at>created_at AND expires_at<=((date_trunc('day',created_at AT TIME ZONE 'UTC')+INTERVAL '1 day') AT TIME ZONE 'UTC')),
          UNIQUE(task_id,business_id,user_id,environment_id),
          FOREIGN KEY(task_id,business_id,organization_id,user_id,environment_id)
            REFERENCES control_tasks(id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT,
          FOREIGN KEY(task_id,user_id,organization_id,portfolio_id,environment_id)
            REFERENCES control_workspace_team_turns(id,user_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT,
          FOREIGN KEY(session_id) REFERENCES control_sessions(id) ON DELETE RESTRICT,
          FOREIGN KEY(run_id,task_id,business_id,organization_id,user_id,environment_id)
            REFERENCES control_task_runs(id,task_id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT)""",
        f"""CREATE TABLE {CALL}(
          id VARCHAR PRIMARY KEY, task_id VARCHAR NOT NULL, run_id VARCHAR NOT NULL,
          organization_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
          conversation_id VARCHAR NOT NULL, call_key VARCHAR NOT NULL CHECK(length(call_key) BETWEEN 1 AND 160),
          kind VARCHAR NOT NULL CHECK(kind IN('customer_text','customer_quality')),
          material JSONB NOT NULL CHECK(jsonb_typeof(material)='object'),
          material_sha256 VARCHAR NOT NULL CHECK(material_sha256~'^[a-f0-9]{{64}}$'),
          created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
          UNIQUE(business_id,environment_id,conversation_id,call_key),
          FOREIGN KEY(task_id,business_id,user_id,environment_id)
            REFERENCES {ALLOCATION}(task_id,business_id,user_id,environment_id) ON DELETE RESTRICT,
          FOREIGN KEY(run_id,task_id,business_id,organization_id,user_id,environment_id)
            REFERENCES control_task_runs(id,task_id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT,
          FOREIGN KEY(conversation_id,call_key) REFERENCES conversation_events(conversation_id,event_key)
            DEFERRABLE INITIALLY DEFERRED)""",
        *protections(), daily_sql(), usage_sql(),
        "REVOKE ALL ON FUNCTION workspace_calibration_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION workspace_calibration_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
    ]


def protections():
    result = []
    for table in (ALLOCATION, CALL):
        condition = (f"{table}.user_id=current_setting('pinet.control_user',true) AND "
            f"{table}.environment_id=current_setting('pinet.environment',true) AND EXISTS(SELECT 1 FROM "
            f"control_tasks t WHERE t.id={table}.task_id AND t.user_id={table}.user_id "
            f"AND t.business_id={table}.business_id AND t.environment_id={table}.environment_id)")
        result.extend([f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
            f"CREATE POLICY calibration_task_scope ON {table} USING({condition}) WITH CHECK({condition})",
            f"REVOKE ALL ON {table} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {table} TO pinet_runtime"])
    result += [f"GRANT UPDATE(run_id,context_sha256) ON {ALLOCATION} TO pinet_runtime",
        f"""CREATE FUNCTION workspace_calibration_insert() RETURNS TRIGGER LANGUAGE plpgsql
      SET search_path=pg_catalog,public AS $$DECLARE t public.control_tasks%ROWTYPE;a public.{ALLOCATION}%ROWTYPE;BEGIN
      SELECT * INTO t FROM public.control_tasks WHERE id=NEW.task_id FOR UPDATE;
      IF NOT FOUND OR t.kind<>'workspace.team_turn' OR t.user_id<>NEW.user_id OR t.business_id<>NEW.business_id
        OR t.environment_id<>NEW.environment_id OR t.organization_id<>NEW.organization_id
        OR NEW.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR NEW.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        THEN RAISE EXCEPTION 'exact calibration Task required' USING ERRCODE='23514';END IF;
      IF TG_OP='INSERT' AND abs(extract(epoch FROM NEW.created_at-clock_timestamp()))>1
        THEN RAISE EXCEPTION 'current reservation timestamp required' USING ERRCODE='23514';END IF;
      IF NOT EXISTS(SELECT 1 FROM control_sessions s WHERE s.id=t.session_id AND s.user_id=t.user_id
        AND s.environment_id=t.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())
        THEN RAISE EXCEPTION 'current authorizing session required' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='{ALLOCATION}' THEN
        IF TG_OP='INSERT' THEN
          IF t.status<>'queued' OR t.run_id IS NOT NULL OR NEW.run_id IS NOT NULL OR NEW.context_sha256 IS NOT NULL
            OR t.session_id<>NEW.session_id OR t.source_revision<>NEW.source_revision
            OR EXISTS(SELECT 1 FROM public.control_workspace_team_attempts x WHERE x.task_id=t.id)
            OR abs(extract(epoch FROM NEW.created_at-clock_timestamp()))>1
            THEN RAISE EXCEPTION 'new queued calibration allowance required' USING ERRCODE='23514';END IF;
        ELSE
          IF (to_jsonb(NEW)-ARRAY['run_id','context_sha256'])<>(to_jsonb(OLD)-ARRAY['run_id','context_sha256'])
            OR OLD.run_id IS NOT NULL OR NEW.run_id IS NULL OR NEW.context_sha256 IS NULL
            OR t.status<>'running' OR t.run_id IS DISTINCT FROM NEW.run_id
            OR NOT EXISTS(SELECT 1 FROM control_workspace_team_turns tr WHERE tr.id=t.id AND tr.context_sha256=NEW.context_sha256)
            THEN RAISE EXCEPTION 'single exact calibration run binding required' USING ERRCODE='23514';END IF;
        END IF;
      ELSE
        SELECT * INTO a FROM public.{ALLOCATION} WHERE task_id=t.id;
        IF NOT FOUND OR t.status<>'running' OR t.run_id IS DISTINCT FROM NEW.run_id
          OR a.run_id IS DISTINCT FROM NEW.run_id OR a.context_sha256 IS NULL
          OR t.source_revision<>a.source_revision OR t.session_id<>a.session_id
          OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR a.expires_at<=clock_timestamp()
          OR NOT EXISTS(SELECT 1 FROM control_workspace_team_turns tr WHERE tr.id=t.id
            AND tr.context_sha256=a.context_sha256 AND tr.deadline>clock_timestamp())
          OR NEW.material->>'kind' IS DISTINCT FROM NEW.kind
          OR NEW.material->>'conversation_id' IS DISTINCT FROM NEW.conversation_id
          OR NEW.material->>'call_key' IS DISTINCT FROM NEW.call_key
          OR NEW.material->>'model' IS DISTINCT FROM a.plan->>'model'
          OR NEW.material->>'episode_id' IS DISTINCT FROM a.plan->>'episode_id'
          OR NEW.material->>'script_sha256' IS DISTINCT FROM a.plan->>'script_sha256'
          OR(NEW.kind='customer_quality' AND NEW.material->>'request_input_sha256' IS DISTINCT FROM a.plan->>'quality_request_sha256')
          OR NEW.material->>'source_revision' IS DISTINCT FROM a.source_revision
          OR NEW.material->'protected_case_sha256' IS DISTINCT FROM a.plan->'protected_case_sha256'
          OR EXISTS(SELECT 1 FROM unnest(ARRAY['creation_id','agent_id','config_revision_id','config_revision',
            'config_sha256','admission_id','admission_fingerprint']) k
            WHERE NEW.material->>k IS DISTINCT FROM a.plan->'snapshot'->>k)
          OR (SELECT count(*) FROM public.{CALL} x WHERE x.task_id=t.id)>=a.call_limit
          THEN RAISE EXCEPTION 'current bounded calibration allowance required' USING ERRCODE='23514';END IF;
      END IF;RETURN NEW;END$$""",
        "REVOKE ALL ON FUNCTION workspace_calibration_insert() FROM PUBLIC",
        f"CREATE TRIGGER calibration_allocation_insert BEFORE INSERT OR UPDATE ON {ALLOCATION} FOR EACH ROW EXECUTE FUNCTION workspace_calibration_insert()",
        f"CREATE TRIGGER calibration_call_insert BEFORE INSERT ON {CALL} FOR EACH ROW EXECUTE FUNCTION workspace_calibration_insert()",
        """CREATE FUNCTION workspace_calibration_team_attempt() RETURNS TRIGGER LANGUAGE plpgsql
          SET search_path=pg_catalog,public AS $$BEGIN
          IF EXISTS(SELECT 1 FROM control_workspace_calibration_allocations WHERE task_id=NEW.task_id)
          THEN RAISE EXCEPTION 'native allowance cannot dispatch ordinary team phases' USING ERRCODE='23514';END IF;
          RETURN NEW;END$$""",
        "REVOKE ALL ON FUNCTION workspace_calibration_team_attempt() FROM PUBLIC",
        "CREATE TRIGGER calibration_team_attempt BEFORE INSERT ON control_workspace_team_attempts FOR EACH ROW EXECUTE FUNCTION workspace_calibration_team_attempt()",
        """CREATE FUNCTION workspace_calibration_native_event() RETURNS TRIGGER LANGUAGE plpgsql
          SET search_path=pg_catalog,public AS $$DECLARE ev public.conversation_events%ROWTYPE;BEGIN
          SELECT * INTO ev FROM public.conversation_events WHERE conversation_id=NEW.conversation_id AND event_key=NEW.call_key;
          IF NOT FOUND OR ev.business_id<>NEW.business_id OR ev.environment_id<>NEW.environment_id
            OR ev.kind<>(CASE NEW.kind WHEN 'customer_text' THEN 'provider_attempt' ELSE 'quality_provider_attempt' END)
            OR ev.payload->>'model' IS DISTINCT FROM NEW.material->>'model'
            OR ev.payload->>'prompt_sha256' IS DISTINCT FROM NEW.material->>'prompt_sha256'
            OR ev.payload->>'schema_sha256' IS DISTINCT FROM NEW.material->>'schema_sha256'
            THEN RAISE EXCEPTION 'exact native provider reservation required' USING ERRCODE='23514';END IF;
          RETURN NEW;END$$""",
        "REVOKE ALL ON FUNCTION workspace_calibration_native_event() FROM PUBLIC",
        f"CREATE CONSTRAINT TRIGGER calibration_native_event AFTER INSERT ON {CALL} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_calibration_native_event()",
    ]
    return result


def usage_sql():
    return f"""CREATE FUNCTION workspace_calibration_run_usage(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR) RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE j JSONB; n BIGINT=0; s BIGINT=0; complete BOOLEAN=TRUE; item RECORD; kv RECORD; tokens JSONB; BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.{ALLOCATION} a WHERE a.task_id=tid AND a.run_id=rid AND a.user_id=u AND a.environment_id=e)
        THEN RETURN NULL;END IF;
      FOR item IN SELECT c.kind,c.material,c.call_key,a.payload AS attempt,v.id AS usage_id,v.payload AS receipt
        FROM public.{CALL} c JOIN public.conversation_events a ON a.conversation_id=c.conversation_id
          AND a.business_id=c.business_id AND a.environment_id=c.environment_id AND a.event_key=c.call_key
        LEFT JOIN public.conversation_events v ON v.conversation_id=c.conversation_id
          AND v.business_id=c.business_id AND v.environment_id=c.environment_id
          AND v.kind=CASE c.kind WHEN 'customer_text' THEN 'provider_usage' ELSE 'quality_provider_usage' END
          AND v.payload->>'model'=c.material->>'model'
          AND v.event_key=CASE c.kind WHEN 'customer_text' THEN 'usage:'||substring(c.call_key FROM 9)
            ELSE 'quality-usage:'||substring(c.call_key FROM 17) END
        WHERE c.task_id=tid AND c.run_id=rid AND c.user_id=u AND c.environment_id=e
      LOOP
        n=n+1;
        IF item.usage_id IS NULL THEN complete=FALSE;CONTINUE;END IF;
        s=s+1;
        IF (item.kind='customer_text' AND (item.receipt->>'request_id' IS DISTINCT FROM item.material->>'request_id'
            OR item.attempt->>'run_id' IS NULL OR item.receipt->>'run_id' IS DISTINCT FROM item.attempt->>'run_id'))
          OR(item.kind='customer_quality' AND(item.receipt->>'job_id' IS DISTINCT FROM split_part(item.call_key,':',2)
            OR item.receipt->>'number' IS DISTINCT FROM split_part(item.call_key,':',3)))
          OR item.receipt->'usage'->'known' IS DISTINCT FROM 'true'::jsonb
          OR jsonb_typeof(item.receipt->'usage'->'tokens') IS DISTINCT FROM 'object'
          THEN complete=FALSE;CONTINUE;END IF;
        tokens=item.receipt->'usage'->'tokens';
        IF tokens='{{}}'::jsonb THEN complete=FALSE;END IF;
        FOR kv IN SELECT key,value FROM jsonb_each(tokens) LOOP
          IF kv.key NOT IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens')
            OR jsonb_typeof(kv.value)<>'number' OR kv.value::text!~'^[0-9]{{1,10}}$'
            THEN complete=FALSE;CONTINUE;END IF;
          IF kv.value::text::BIGINT>1000000000 THEN complete=FALSE;CONTINUE;END IF;
          j=jsonb_set(coalesce(j,'{{}}'::jsonb),ARRAY[kv.key],to_jsonb(coalesce((j->>kv.key)::BIGINT,0)+kv.value::text::BIGINT));
        END LOOP;
      END LOOP;
      RETURN jsonb_build_object('usage',j,'reserved_calls',n,'settled_calls',s,'usage_complete',complete AND n>0);END$$"""
