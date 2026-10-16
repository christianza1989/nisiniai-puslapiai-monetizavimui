"""Additive opt-in native preview, with exact known predecessor function patches."""
from . import direct_schema
from .episode_schema import NEW_AUTHOR_CHECK, normalized_check

TABLE = "control_workspace_direct_previews"
VERSION = "workspace-native-preview-turn.v1"
NATIVE = "customer-agent-direct-preview.v1"
QUALITY = "customer-agent-direct-quality.v1"
AUTHOR_CHECK = "(" + NEW_AUTHOR_CHECK + ") OR (native_episode_task_id IS NOT NULL AND native_episode_task_id=task_id AND author_type='saved_agent' AND kind='answer' AND author_user_id IS NULL AND participant_id IS NULL AND attempt_id IS NULL)"


def author_sql(rows):
    expected = normalized_check(NEW_AUTHOR_CHECK)
    matches = [row for row in rows if normalized_check(row["expression"]) == expected]
    if expected is None or len(matches) != 1:
        raise RuntimeError("Unknown or ambiguous current native author CHECK")
    name = '"' + matches[0]["name"].replace('"', '""') + '"'
    return [f"ALTER TABLE control_workspace_team_events DROP CONSTRAINT {name}",
        f"ALTER TABLE control_workspace_team_events ADD CONSTRAINT {name} CHECK({AUTHOR_CHECK})"]


def global_team_patch(value):
    before = "BEGIN\n      IF TG_TABLE_NAME='control_workspace_team_attempts' AND to_jsonb(NEW)->>'phase'='direct'"
    after = """BEGIN
      IF TG_TABLE_NAME='control_workspace_team_events' AND to_jsonb(NEW)->>'author_type'='saved_agent'
        AND NOT EXISTS(SELECT 1 FROM public.control_workspace_direct_chats c JOIN public.control_workspace_direct_previews b ON b.id=c.id
          WHERE c.team_thread_id=to_jsonb(NEW)->>'team_thread_id' AND c.mode='agent_preview')
        THEN RAISE EXCEPTION 'saved author requires exact direct native preview' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME='control_workspace_team_attempts' AND to_jsonb(NEW)->>'phase'='direct'"""
    return patch(value, "control_workspace_team_fence", [(before, after)])


def patch(definition, name, changes):
    definition = definition.replace("\r\n", "\n")
    if "FUNCTION public." + name + "(" not in definition:
        raise RuntimeError("Unknown native preview predecessor function")
    for before, after in changes:
        if definition.count(before) != 1:
            raise RuntimeError("Unknown or ambiguous native preview predecessor body")
        definition = definition.replace(before, after, 1)
    return definition


def task_patch(value):
    # PL/pgSQL's IF scanner stops at a top-level THEN. Protect the SQL CASE's
    # inner THEN with parentheses rather than changing the function delimiter.
    return patch(value, "workspace_direct_task_fence", [(
        "OR c.mode<>'consultant' OR c.recipient->>'kind'<>'consultant'",
        """OR NOT((c.mode='consultant' AND c.recipient->>'kind'='consultant')
          OR(c.mode='agent_preview' AND c.recipient->>'kind'='saved_agent' AND c.business_id IS NOT NULL
            AND EXISTS(SELECT 1 FROM public.control_workspace_direct_previews b WHERE b.id=c.id)
            AND EXISTS(SELECT 1 FROM public.control_workspace_calibration_allocations a WHERE a.task_id=t.id
              AND a.plan->>'version'='workspace-native-preview-turn.v1' AND a.plan->>'task_id'=t.id
              AND a.plan->>'chat_id'=c.id AND a.business_id=c.business_id AND a.session_id=t.session_id)))"""),
        ("OR NEW.adapter_revision<>'codex-workspace-direct.v1'", "OR NEW.adapter_revision<>(CASE c.mode WHEN 'agent_preview' THEN 'workspace-native-direct-preview.v1' ELSE 'codex-workspace-direct.v1' END)")])


def boundary_patch(value):
    # Only widen the repaired failure/accounting classifier for the actual
    # immutable native binding and its existing three-call allocation. The
    # invoker's live/output checks remain in workspace_direct_task_fence.
    return patch(value, "workspace_direct_task_boundary", [(
        "OR c.mode<>'consultant' OR c.business_id IS DISTINCT FROM t.business_id",
        """OR NOT coalesce((c.mode='consultant' OR(c.mode='agent_preview' AND c.recipient->>'kind'='saved_agent'
          AND c.business_id IS NOT NULL AND c.grant_id IS NOT NULL
          AND EXISTS(SELECT 1 FROM public.control_workspace_direct_previews b WHERE b.id=c.id
            AND b.business_id=c.business_id AND b.grant_id=c.grant_id AND b.user_id=c.user_id
            AND b.organization_id=c.organization_id AND b.portfolio_id=c.portfolio_id AND b.environment_id=c.environment_id)
          AND EXISTS(SELECT 1 FROM public.control_workspace_calibration_allocations a WHERE a.task_id=t.id
            AND a.plan->>'version'='workspace-native-preview-turn.v1' AND a.plan->>'task_id'=t.id
            AND a.plan->>'chat_id'=c.id AND a.business_id=c.business_id AND a.user_id=t.user_id
            AND a.organization_id=t.organization_id AND a.environment_id=t.environment_id
            AND a.session_id=t.session_id AND a.source_revision=t.source_revision))),FALSE)
        OR c.business_id IS DISTINCT FROM t.business_id"""), (
        "AND j->>'adapter_revision'='codex-workspace-direct.v1'",
        "AND j->>'adapter_revision'=(CASE c.mode WHEN 'agent_preview' THEN 'workspace-native-direct-preview.v1' ELSE 'codex-workspace-direct.v1' END)")])


def team_patch(value):
    return patch(value, "workspace_direct_team_check", [(
        "IF tbl IN('control_workspace_direct_chats','control_workspace_team_threads','control_workspace_team_members') THEN RETURN;END IF;",
        """IF c.mode='agent_preview' AND NOT EXISTS(SELECT 1 FROM public.control_workspace_direct_previews b WHERE b.id=c.id
          AND b.business_id=c.business_id AND b.grant_id=c.grant_id)
          THEN RAISE EXCEPTION 'actual native preview Conversation required' USING ERRCODE='23514';END IF;
        IF tbl IN('control_workspace_direct_chats','control_workspace_team_threads','control_workspace_team_members') THEN RETURN;END IF;"""),
        ("OR tr.agent_creation_id IS NOT NULL OR tr.agent_purpose IS NOT NULL OR c.mode<>'consultant'",
         "OR tr.agent_creation_id IS NOT NULL OR tr.agent_purpose IS NOT NULL OR c.mode NOT IN('consultant','agent_preview')"),
        ("IF tbl='control_workspace_team_attempts' THEN", "IF tbl='control_workspace_team_attempts' THEN\n        IF c.mode='agent_preview' THEN RAISE EXCEPTION 'native preview cannot dispatch consultant phases' USING ERRCODE='23514';END IF;"),
        ("IF j->>'native_episode_task_id' IS NOT NULL THEN RAISE EXCEPTION 'consultant is not native agent admission' USING ERRCODE='23514';END IF;",
         "IF c.mode='agent_preview' THEN PERFORM public.workspace_direct_preview_event(j);RETURN;END IF;\n        IF j->>'native_episode_task_id' IS NOT NULL THEN RAISE EXCEPTION 'consultant is not native agent admission' USING ERRCODE='23514';END IF;")])


def allocation_patch(value):
    before = "BEGIN\n      SELECT * INTO t FROM public.control_tasks WHERE id=NEW.task_id FOR UPDATE;"
    after = """BEGIN
      IF EXISTS(SELECT 1 FROM public.control_workspace_direct_chats c JOIN public.control_tasks dt ON dt.thread_id=c.task_thread_id
        WHERE dt.id=NEW.task_id AND dt.kind='workspace.direct_turn' AND c.mode='agent_preview') THEN
        PERFORM public.workspace_direct_preview_budget_check(TG_TABLE_NAME::VARCHAR,to_jsonb(NEW),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END);
        RETURN NEW;
      END IF;
      SELECT * INTO t FROM public.control_tasks WHERE id=NEW.task_id FOR UPDATE;"""
    return patch(value, "workspace_calibration_insert", [(before, after)])


def release_patch(value):
    return patch(value, "workspace_direct_release_queue", [("c.mode='consultant' AND tr.deadline>clock_timestamp()",
        """c.mode IN('consultant','agent_preview') AND tr.deadline>clock_timestamp()
          AND(c.mode='consultant' OR EXISTS(SELECT 1 FROM public.control_workspace_direct_previews b
            JOIN public.control_workspace_calibration_allocations a ON a.task_id=q.id
            WHERE b.id=c.id AND a.plan->>'version'='workspace-native-preview-turn.v1' AND a.expires_at>clock_timestamp()))""")])


def daily_sql():
    before = "t.kind='workspace.direct_turn'\n          AND(t.status='queued'"
    source = direct_schema.daily_sql()
    if source.count(before) != 1:
        raise RuntimeError("Unknown current direct quota expression")
    return source.replace(before, "t.kind='workspace.direct_turn'\n          AND NOT EXISTS(SELECT 1 FROM public.control_workspace_calibration_allocations a WHERE a.task_id=t.id)\n          AND(t.status='queued'", 1)


def table_sql():
    owner = direct_schema.OWNER
    return [f"""CREATE TABLE {TABLE}(
      id VARCHAR PRIMARY KEY,{owner.replace(',', ' VARCHAR NOT NULL,')} VARCHAR NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,business_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,conversation_id VARCHAR NOT NULL UNIQUE,
      snapshot JSONB NOT NULL CHECK(coalesce(jsonb_typeof(snapshot)='object' AND snapshot->>'version'='{NATIVE}',FALSE)),
      snapshot_sha256 VARCHAR NOT NULL CHECK(snapshot_sha256~'^[a-f0-9]{{64}}$'),
      native_scope JSONB NOT NULL CHECK(jsonb_typeof(native_scope)='object'),
      native_scope_sha256 VARCHAR NOT NULL CHECK(native_scope_sha256~'^[a-f0-9]{{64}}$'),
      UNIQUE(id,{owner}),FOREIGN KEY(id,{owner}) REFERENCES control_workspace_direct_chats(id,{owner}) ON DELETE RESTRICT,
      FOREIGN KEY(conversation_id,business_id,environment_id) REFERENCES conversations(id,business_id,environment_id) ON DELETE RESTRICT)""",
      f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
      f"""CREATE POLICY direct_native_owner ON {TABLE} USING(user_id=current_setting('pinet.control_user',true)
        AND environment_id=current_setting('pinet.environment',true) AND EXISTS(SELECT 1 FROM control_workspace_direct_chats c
          WHERE c.id={TABLE}.id AND c.mode='agent_preview' AND c.business_id={TABLE}.business_id
            AND c.grant_id={TABLE}.grant_id AND c.user_id={TABLE}.user_id AND c.organization_id={TABLE}.organization_id
            AND c.portfolio_id={TABLE}.portfolio_id AND c.environment_id={TABLE}.environment_id))""",
      f"REVOKE ALL ON {TABLE} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {TABLE} TO pinet_runtime",
      f"CREATE TRIGGER direct_preview_immutable BEFORE UPDATE OR DELETE ON {TABLE} FOR EACH ROW EXECUTE FUNCTION workspace_direct_immutable()",
      """CREATE FUNCTION workspace_direct_preview_binding() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
        DECLARE c public.control_workspace_direct_chats%ROWTYPE;v public.conversations%ROWTYPE;BEGIN
        SELECT * INTO c FROM public.control_workspace_direct_chats WHERE id=NEW.id;
        SELECT * INTO v FROM public.conversations WHERE id=NEW.conversation_id AND business_id=NEW.business_id AND environment_id=NEW.environment_id;
        IF coalesce((c.id IS NULL OR v.id IS NULL OR c.mode<>'agent_preview' OR c.business_id<>NEW.business_id OR c.grant_id<>NEW.grant_id
          OR NOT public.workspace_direct_parent(to_jsonb(c),TRUE) OR NEW.snapshot->>'preview_id'<>c.id
          OR NEW.snapshot->>'user_id'<>c.user_id OR NEW.snapshot->>'session_id'<>c.session_id
          OR NEW.snapshot->>'environment_id'<>c.environment_id OR NEW.snapshot->>'execution_source_revision'<>c.source_revision
          OR NEW.snapshot->>'agent_id'<>c.recipient->>'agent_id' OR NEW.snapshot->>'config_revision_id'<>c.recipient->>'revision_id'
          OR NEW.snapshot->>'config_revision'<>c.recipient->>'revision' OR NEW.snapshot->>'config_sha256'<>c.recipient->>'configuration_sha256'
          OR v.payload->'customer_text_binding'->'task_calibration' IS DISTINCT FROM NEW.snapshot
          OR EXISTS(SELECT 1 FROM unnest(ARRAY['user_id','organization_id','portfolio_id','environment_id','business_id','grant_id']) k
            WHERE NEW.native_scope->>k IS DISTINCT FROM to_jsonb(c)->>k)
          OR NEW.native_scope->>'session_id'<>c.session_id OR NEW.native_scope->>'source_revision'<>c.source_revision),TRUE)
          THEN RAISE EXCEPTION 'exact current native Conversation/configuration binding required' USING ERRCODE='23514';END IF;
        RETURN NEW;END$$""",
      "REVOKE ALL ON FUNCTION workspace_direct_preview_binding() FROM PUBLIC",
      f"CREATE CONSTRAINT TRIGGER direct_preview_binding AFTER INSERT ON {TABLE} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION workspace_direct_preview_binding()"]


def budget_sql():
    return """CREATE FUNCTION workspace_direct_preview_budget_check(tbl VARCHAR,j JSONB,old JSONB) RETURNS VOID
      LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      DECLARE t public.control_tasks%ROWTYPE;c public.control_workspace_direct_chats%ROWTYPE;b public.control_workspace_direct_previews%ROWTYPE;
        a public.control_workspace_calibration_allocations%ROWTYPE;tr public.control_workspace_team_turns%ROWTYPE;pl JSONB;BEGIN
      SELECT * INTO t FROM public.control_tasks WHERE id=j->>'task_id' FOR UPDATE;
      SELECT * INTO c FROM public.control_workspace_direct_chats WHERE task_thread_id=t.thread_id AND mode='agent_preview';
      SELECT * INTO b FROM public.control_workspace_direct_previews WHERE id=c.id;
      SELECT * INTO tr FROM public.control_workspace_team_turns WHERE id=t.id;
      IF tbl='control_workspace_calibration_allocations' THEN pl=j->'plan';
      ELSE SELECT * INTO a FROM public.control_workspace_calibration_allocations WHERE task_id=t.id;pl=a.plan;END IF;
      IF coalesce((t.id IS NULL OR c.id IS NULL OR b.id IS NULL OR tr.id IS NULL OR t.kind<>'workspace.direct_turn'
        OR t.business_id IS DISTINCT FROM c.business_id OR t.business_id IS NULL OR j->>'business_id'<>t.business_id
        OR j->>'user_id'<>t.user_id OR j->>'organization_id'<>t.organization_id OR j->>'environment_id'<>t.environment_id
        OR pl->>'version'<>'workspace-native-preview-turn.v1' OR pl->>'task_id'<>t.id OR pl->>'chat_id'<>c.id
        OR pl->>'conversation_id'<>b.conversation_id OR pl->>'message'<>t.message OR pl->'snapshot' IS DISTINCT FROM b.snapshot
        OR pl->'scope'->>'session_id'<>t.session_id OR pl->'scope'->>'source_revision'<>t.source_revision
        OR EXISTS(SELECT 1 FROM unnest(ARRAY['user_id','organization_id','business_id','environment_id']) k
          WHERE pl->'scope'->>k IS DISTINCT FROM to_jsonb(t)->>k)
        OR pl->'scope'->>'portfolio_id'<>c.portfolio_id OR pl->'scope'->>'grant_id'<>c.grant_id
        OR NOT public.workspace_direct_parent(to_jsonb(c),TRUE)
        OR t.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR t.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=t.session_id AND s.user_id=t.user_id AND s.environment_id=t.environment_id
          AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())),TRUE)
        THEN RAISE EXCEPTION 'exact current saved-preview Task allowance required' USING ERRCODE='23514';END IF;
      IF tbl='control_workspace_calibration_allocations' THEN
        IF coalesce((j->>'call_limit'<>'3' OR j->>'session_id'<>t.session_id OR j->>'source_revision'<>t.source_revision
          OR j->>'portfolio_id'<>c.portfolio_id),TRUE) THEN RAISE EXCEPTION 'exact three-call native allowance required' USING ERRCODE='23514';END IF;
        IF old IS NULL THEN
          IF t.status<>'queued' OR t.run_id IS NOT NULL OR j->>'run_id' IS NOT NULL OR j->>'context_sha256' IS NOT NULL
            OR abs(extract(epoch FROM (j->>'created_at')::TIMESTAMPTZ-clock_timestamp()))>1
            THEN RAISE EXCEPTION 'new native direct allowance required' USING ERRCODE='23514';END IF;
        ELSE
          IF (j-ARRAY['run_id','context_sha256'])<>(old-ARRAY['run_id','context_sha256']) OR old->>'run_id' IS NOT NULL
            OR j->>'run_id' IS DISTINCT FROM t.run_id OR j->>'context_sha256' IS DISTINCT FROM tr.context_sha256 OR t.status<>'running'
            THEN RAISE EXCEPTION 'single claimed native direct allowance required' USING ERRCODE='23514';END IF;
        END IF;
      ELSE
        IF coalesce((a.task_id IS NULL OR t.status<>'running' OR t.run_id IS DISTINCT FROM j->>'run_id' OR a.run_id IS DISTINCT FROM t.run_id
          OR a.context_sha256 IS DISTINCT FROM tr.context_sha256 OR tr.context IS NULL OR tr.deadline<=clock_timestamp()
          OR a.expires_at<=clock_timestamp() OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp()
          OR abs(extract(epoch FROM (j->>'created_at')::TIMESTAMPTZ-clock_timestamp()))>1
          OR j->>'conversation_id'<>b.conversation_id OR j->'material'->>'version'<>'customer-agent-direct-call.v1'
          OR j->'material'->>'preview_id'<>c.id OR j->'material'->>'preview_turn_id'<>t.id
          OR j->'material'->>'conversation_id'<>b.conversation_id OR j->'material'->>'kind'<>j->>'kind'
          OR j->'material'->>'call_key'<>j->>'call_key' OR j->'material'->>'model'<>pl->>'model'
          OR j->'material'->>'source_revision'<>t.source_revision OR j->'material'->>'protected_case_sha256' IS NOT NULL
          OR EXISTS(SELECT 1 FROM unnest(ARRAY['creation_id','agent_id','config_revision_id','config_revision','config_sha256',
            'admission_id','admission_fingerprint','episode_id','script_sha256']) k WHERE j->'material'->>k IS DISTINCT FROM b.snapshot->>k)
          OR(j->>'kind'='customer_text' AND(j->'material'->>'request_id'<>pl->>'text_request_id'
            OR j->'material'->>'request_input_sha256'<>pl->>'message_sha256' OR j->'material'->>'number'<>'1'))
          OR(j->>'kind'='customer_quality' AND(j->'material'->>'request_id'<>pl->>'quality_request_id'
            OR j->'material'->>'request_input_sha256'<>tr.context->>'quality_request_sha256'
            OR j->'material'->>'number' NOT IN('1','2')))
          OR(SELECT count(*) FROM public.control_workspace_calibration_calls x WHERE x.task_id=t.id)>=3),TRUE)
          THEN RAISE EXCEPTION 'one exact bounded native preview call required' USING ERRCODE='23514';END IF;
      END IF;END$$"""


def event_sql():
    return """CREATE FUNCTION workspace_direct_preview_event(j JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      DECLARE t public.control_tasks%ROWTYPE;tr public.control_workspace_team_turns%ROWTYPE;c public.control_workspace_direct_chats%ROWTYPE;
        b public.control_workspace_direct_previews%ROWTYPE;a public.control_workspace_calibration_allocations%ROWTYPE;ev public.conversation_events%ROWTYPE;BEGIN
      SELECT * INTO t FROM public.control_tasks WHERE id=j->>'task_id';
      SELECT * INTO tr FROM public.control_workspace_team_turns WHERE id=t.id;
      SELECT * INTO c FROM public.control_workspace_direct_chats WHERE task_thread_id=t.thread_id AND mode='agent_preview';
      SELECT * INTO b FROM public.control_workspace_direct_previews WHERE id=c.id;
      SELECT * INTO a FROM public.control_workspace_calibration_allocations WHERE task_id=t.id;
      IF coalesce((c.id IS NULL OR b.id IS NULL OR tr.id IS NULL OR a.task_id IS NULL OR a.plan->>'version'<>'workspace-native-preview-turn.v1'
        OR j->>'team_thread_id'<>c.team_thread_id OR j->>'source_revision'<>t.source_revision),TRUE)
        THEN RAISE EXCEPTION 'exact native direct history required' USING ERRCODE='23514';END IF;
      IF j->>'author_type'='user' THEN
        IF coalesce((j->>'id'<>tr.owner_event_id OR j->>'kind'<>'owner_message' OR j->>'content'<>t.message
          OR j->>'author_user_id'<>t.user_id OR j->>'participant_id' IS NOT NULL OR j->>'attempt_id' IS NOT NULL
          OR j->>'native_episode_task_id' IS NOT NULL),TRUE) THEN RAISE EXCEPTION 'exact native owner input required' USING ERRCODE='23514';END IF;
      ELSE
        SELECT * INTO ev FROM public.conversation_events WHERE conversation_id=b.conversation_id
          AND business_id=t.business_id AND environment_id=t.environment_id AND event_key='result:'||(a.plan->>'text_request_id');
        IF coalesce((j->>'author_type'<>'saved_agent' OR j->>'kind'<>'answer' OR j->>'author_user_id' IS NOT NULL
          OR j->>'participant_id' IS NOT NULL OR j->>'attempt_id' IS NOT NULL OR j->>'native_episode_task_id'<>t.id
          OR j->>'reply_to_event_id'<>tr.owner_event_id OR t.status<>'running' OR t.run_id IS DISTINCT FROM a.run_id
          OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR tr.deadline<=clock_timestamp()
          OR ev.id IS NULL OR ev.kind<>'customer_text_result' OR ev.payload->>'status'<>'succeeded' OR ev.payload->>'reply'<>j->>'content'
          OR NOT EXISTS(SELECT 1 FROM public.jobs q JOIN public.artifacts ar ON ar.conversation_id=q.conversation_id
            AND ar.business_id=q.business_id AND ar.environment_id=q.environment_id AND ar.kind='quality'
            AND ar.payload->>'quality_job_id'=q.id AND ar.revision=(q.payload->>'transcript_revision')::INTEGER
            WHERE q.conversation_id=b.conversation_id AND q.business_id=t.business_id AND q.environment_id=t.environment_id
              AND q.kind='quality' AND q.state='succeeded' AND q.payload->>'direct_preview_version'='customer-agent-direct-quality.v1'
              AND q.payload->>'direct_preview_turn_id'=t.id AND q.payload->>'request_input_sha256'=tr.context->>'quality_request_sha256')),TRUE)
          THEN RAISE EXCEPTION 'actual native reply and independent transcript Quality required' USING ERRCODE='23514';END IF;
      END IF;
      IF j->>'reply_to_event_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.control_workspace_team_events prior
        WHERE prior.id=j->>'reply_to_event_id' AND prior.team_thread_id=c.team_thread_id AND prior.sequence<(j->>'sequence')::INTEGER)
        THEN RAISE EXCEPTION 'earlier exact native chat reply required' USING ERRCODE='23514';END IF;
      END$$"""


def job_guard_sql():
    return """CREATE FUNCTION workspace_direct_preview_quality_guard() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      DECLARE j JSONB=to_jsonb(NEW);q public.jobs%ROWTYPE;t public.control_tasks%ROWTYPE;a public.control_workspace_calibration_allocations%ROWTYPE;BEGIN
      IF TG_TABLE_NAME='jobs' THEN
        IF NEW.payload->>'direct_preview_version' IS DISTINCT FROM 'customer-agent-direct-quality.v1' THEN
          IF TG_OP='UPDATE' AND OLD.payload->>'direct_preview_version'='customer-agent-direct-quality.v1'
            THEN RAISE EXCEPTION 'immutable preview Quality identity' USING ERRCODE='23514';END IF;RETURN NEW;END IF;
        q=NEW;
        IF TG_OP='UPDATE' THEN
          IF (to_jsonb(NEW)-ARRAY['state','payload'])<>(to_jsonb(OLD)-ARRAY['state','payload'])
            OR (NEW.payload-ARRAY['failure_code','typed_report'])<>(OLD.payload-ARRAY['failure_code','typed_report'])
            OR OLD.state<>'running' OR NEW.state NOT IN('succeeded','failed')
            THEN RAISE EXCEPTION 'immutable native preview Quality request' USING ERRCODE='23514';END IF;
          IF NEW.state='failed' THEN RETURN NEW;END IF; -- accounting/failure only, no output authority
        END IF;
      ELSE
        IF NEW.payload->'direct_preview'->>'direct_preview_version' IS DISTINCT FROM 'customer-agent-direct-quality.v1' THEN RETURN NEW;END IF;
        SELECT * INTO q FROM public.jobs WHERE id=NEW.payload->>'quality_job_id' AND conversation_id=NEW.conversation_id
          AND business_id=NEW.business_id AND environment_id=NEW.environment_id;
        IF q.id IS NULL OR NEW.kind<>'quality' OR NEW.revision<>(q.payload->>'transcript_revision')::INTEGER
          OR NEW.payload->'direct_preview' IS DISTINCT FROM jsonb_build_object('direct_preview_version',q.payload->>'direct_preview_version',
            'direct_preview_turn_id',q.payload->>'direct_preview_turn_id','transcript_revision',(q.payload->>'transcript_revision')::INTEGER,
            'transcript_sha256',q.payload->>'transcript_sha256')
          THEN RAISE EXCEPTION 'exact immutable preview Quality artifact required' USING ERRCODE='23514';END IF;
      END IF;
      SELECT * INTO t FROM public.control_tasks WHERE id=q.payload->>'direct_preview_turn_id';
      SELECT * INTO a FROM public.control_workspace_calibration_allocations WHERE task_id=t.id;
      IF coalesce((t.id IS NULL OR a.task_id IS NULL OR t.kind<>'workspace.direct_turn' OR t.status<>'running' OR t.run_id IS DISTINCT FROM a.run_id
        OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR a.expires_at<=clock_timestamp()
        OR a.plan->>'version'<>'workspace-native-preview-turn.v1' OR a.plan->>'conversation_id'<>q.conversation_id
        OR t.business_id<>q.business_id OR t.environment_id<>q.environment_id OR q.kind<>'quality'
        OR q.payload->>'request_id'<>a.plan->>'quality_request_id'
        OR NOT EXISTS(SELECT 1 FROM public.control_workspace_team_turns tr WHERE tr.id=t.id AND tr.deadline>clock_timestamp()
          AND tr.context_sha256=a.context_sha256 AND tr.context->>'quality_request_sha256'=q.payload->>'request_input_sha256')),TRUE)
        THEN RAISE EXCEPTION 'current claimed preview Quality Task required' USING ERRCODE='23514';END IF;
      RETURN NEW;END$$"""


def extra_sql():
    return [*table_sql(), budget_sql(), event_sql(), job_guard_sql(), daily_sql(),
      "REVOKE ALL ON FUNCTION workspace_direct_preview_budget_check(VARCHAR,JSONB,JSONB) FROM PUBLIC",
      "REVOKE ALL ON FUNCTION workspace_direct_preview_event(JSONB) FROM PUBLIC",
      "REVOKE ALL ON FUNCTION workspace_direct_preview_quality_guard() FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION workspace_direct_preview_budget_check(VARCHAR,JSONB,JSONB),workspace_direct_preview_event(JSONB) TO pinet_runtime",
      "CREATE TRIGGER direct_preview_quality_job BEFORE INSERT OR UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION workspace_direct_preview_quality_guard()",
      "CREATE TRIGGER direct_preview_quality_artifact BEFORE INSERT ON artifacts FOR EACH ROW EXECUTE FUNCTION workspace_direct_preview_quality_guard()"]


def job_indexes():
    predicate = "payload->>'direct_preview_version'='customer-agent-direct-quality.v1'"
    return ["CREATE UNIQUE INDEX uq_jobs_legacy_conversation_kind ON jobs(conversation_id,kind) WHERE payload->>'direct_preview_version' IS DISTINCT FROM 'customer-agent-direct-quality.v1'",
        f"CREATE UNIQUE INDEX uq_jobs_direct_preview_turn ON jobs(conversation_id,kind,(payload->>'direct_preview_turn_id')) WHERE {predicate}",
        f"CREATE UNIQUE INDEX uq_jobs_direct_preview_revision ON jobs(conversation_id,kind,(payload->>'transcript_revision')) WHERE {predicate}",
        """ALTER TABLE jobs ADD CONSTRAINT jobs_direct_preview_shape CHECK(
          payload->>'direct_preview_version' IS DISTINCT FROM 'customer-agent-direct-quality.v1' OR coalesce((kind='quality'
          AND payload->>'dispatch'='customer-quality-dispatch.v1'
          AND payload->>'direct_preview_turn_id'~'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
          AND payload->>'transcript_revision'~'^([1-9]|1[0-9]|20)$' AND payload->>'transcript_sha256'~'^[a-f0-9]{64}$'),FALSE))"""]
