"""Shared actor/day call accounting; child reservations cannot multiply root allowances."""
from sqlalchemy import text

from ..config import settings
from ..tasks.codex import RunnerError


async def call_slot(tx, user_id, *, additional=0):
    cfg = settings()
    if not 1 <= cfg.chat_daily_limit <= 100:
        raise RunnerError("task_rate_limited")
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "chat-admission:"+cfg.environment+":"+user_id})
    await release_queue(tx, user_id)
    count = await tx.scalar(text("SELECT workspace_team_daily_reserved(:u,:e)"), {"u": user_id, "e": cfg.environment})
    if count is None:
        raise RunnerError("authorization_revoked")
    if count + additional > cfg.chat_daily_limit:
        raise RunnerError("task_rate_limited")


async def release_queue(tx, user_id):
    cfg = settings()
    await tx.scalar(text("SELECT workspace_team_release_queue(:u,:e,:s)"),
        {"u": user_id, "e": cfg.environment, "s": cfg.control_source_revision})


async def saved_usage(tx, *, task_id, run_id, user_id, environment_id, source_revision):
    if await tx.scalar(text("SELECT to_regprocedure('workspace_calibration_run_usage(character varying,character varying,character varying,character varying)') IS NOT NULL")):
        native = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task_id, "r": run_id, "u": user_id, "e": environment_id})
        if native is not None:
            # Allocated native-only runs cannot have ordinary role attempts.
            # This is one view of the deduplicated native ledger, not MAX over
            # independent calls or an additional monetary usage charge.
            return native["usage"]
    return await tx.scalar(text("SELECT workspace_team_run_usage(:t,:r,:u,:e,:s)"),
        {"t": task_id, "r": run_id, "u": user_id, "e": environment_id, "s": source_revision})


def merge_usage(observed, saved):
    # Both are aggregate views of the same immutable call reservations, never two charges.
    result = dict(observed or {})
    for key, value in (saved or {}).items():
        result[key] = max(value, result.get(key, 0))
    return result or None


def accounting_sql():
    return ["""CREATE FUNCTION workspace_team_release_queue(u VARCHAR,e VARCHAR,src VARCHAR) RETURNS INTEGER
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE t public.control_tasks%ROWTYPE;n INTEGER=0;stamp TIMESTAMPTZ;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true) OR src IS NULL OR src!~'^[a-f0-9]{40}$' THEN RETURN 0;END IF;
      FOR t IN SELECT * FROM public.control_tasks q WHERE q.user_id=u AND q.environment_id=e AND q.status='queued'
        AND q.kind IN('chat.consult','workspace.team_turn') AND NOT EXISTS(SELECT 1 FROM public.control_task_runs r WHERE r.task_id=q.id)
        AND(q.source_revision<>src OR NOT EXISTS(SELECT 1 FROM public.control_users x JOIN public.control_sessions s ON s.user_id=x.id AND s.environment_id=x.environment_id
          JOIN public.control_memberships m ON m.user_id=x.id AND m.environment_id=x.environment_id
          JOIN public.control_business_grants g ON g.organization_id=m.organization_id AND g.environment_id=m.environment_id
          WHERE x.id=q.user_id AND x.environment_id=q.environment_id AND x.enabled AND s.id=q.session_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
          AND m.enabled AND m.role='owner' AND g.enabled AND g.business_id=q.business_id AND g.organization_id=q.organization_id)
          OR(q.kind='workspace.team_turn' AND NOT EXISTS(SELECT 1 FROM public.control_workspace_team_turns tr
            JOIN public.control_workspace_team_threads th ON th.id=tr.team_thread_id
            JOIN public.control_workspace_topics p ON p.id=tr.topic_id
            JOIN public.control_customer_accounts a ON a.user_id=q.user_id AND a.environment_id=q.environment_id
            JOIN public.control_business_grants g ON g.id=th.grant_id AND g.business_id=th.business_id AND g.environment_id=th.environment_id
            WHERE tr.id=q.id AND tr.deadline>clock_timestamp() AND tr.context IS NULL AND tr.business_id=q.business_id
              AND th.task_thread_id=q.thread_id AND th.user_id=q.user_id AND th.organization_id=q.organization_id AND th.environment_id=q.environment_id
              AND p.user_id=th.user_id AND p.organization_id=th.organization_id AND p.portfolio_id=th.portfolio_id AND p.environment_id=th.environment_id
              AND p.anchor_kind='business' AND p.business_id=th.business_id AND p.grant_id=th.grant_id AND p.archived_at IS NULL AND a.verified_at IS NOT NULL AND g.enabled)))
        ORDER BY q.id FOR UPDATE OF q
      LOOP
        stamp=clock_timestamp();
        UPDATE public.control_tasks SET status='failed',failure_code='authorization_revoked',result=NULL,lease_until=NULL,updated_at=stamp,event_sequence=event_sequence+1 WHERE id=t.id;
        INSERT INTO public.control_task_events(id,user_id,organization_id,business_id,environment_id,created_at,task_id,sequence,status,failure_code)
          VALUES(gen_random_uuid()::text,t.user_id,t.organization_id,t.business_id,t.environment_id,stamp,t.id,t.event_sequence+1,'failed','authorization_revoked');n=n+1;
      END LOOP;RETURN n;END$$""",
      "REVOKE ALL ON FUNCTION workspace_team_release_queue(VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION workspace_team_release_queue(VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
      """CREATE FUNCTION workspace_team_run_usage(tid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR) RETURNS JSONB
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE j JSONB;BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_tasks t JOIN public.control_task_runs r ON r.task_id=t.id WHERE t.id=tid AND t.run_id=rid AND t.user_id=u
          AND t.environment_id=e AND t.source_revision=src AND t.kind='workspace.team_turn' AND r.id=rid AND r.user_id=u AND r.environment_id=e) THEN RETURN NULL;END IF;
      SELECT jsonb_object_agg(key,total) INTO j FROM(SELECT kv.key,sum((kv.value::text)::BIGINT) total
        FROM public.control_workspace_team_attempts a CROSS JOIN LATERAL jsonb_each(a.usage) kv
        WHERE a.task_id=tid AND a.run_id=rid AND a.user_id=u AND a.environment_id=e AND a.source_revision=src
          AND a.state<>'reserved' AND kv.key IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens') GROUP BY kv.key) sums;RETURN j;END$$""",
      "REVOKE ALL ON FUNCTION workspace_team_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION workspace_team_run_usage(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
      """CREATE FUNCTION workspace_team_daily_reserved(u VARCHAR,e VARCHAR) RETURNS BIGINT
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE n BIGINT; BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_users WHERE id=u AND environment_id=e AND enabled) THEN RETURN NULL;END IF;
      SELECT (SELECT count(*) FROM public.control_tasks t WHERE t.user_id=u AND t.environment_id=e
          AND t.kind='chat.consult' AND t.status='queued')
        +(SELECT coalesce(sum(CASE WHEN t.status='queued' THEN 3 ELSE greatest(0,3-(SELECT count(*) FROM public.control_workspace_team_attempts a WHERE a.task_id=t.id)) END),0)
          FROM public.control_tasks t WHERE t.user_id=u AND t.environment_id=e AND t.kind='workspace.team_turn'
          AND (t.status='queued' OR(t.status='running' AND t.lease_until>clock_timestamp())))
        +(SELECT count(*) FROM public.control_task_runs r JOIN public.control_tasks t ON t.id=r.task_id
        WHERE r.user_id=u AND r.environment_id=e AND t.kind='chat.consult'
        AND r.created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        +(SELECT count(*) FROM public.control_workspace_team_attempts a WHERE a.user_id=u AND a.environment_id=e
        AND a.created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') INTO n;RETURN n;END$$""",
      "REVOKE ALL ON FUNCTION workspace_team_daily_reserved(VARCHAR,VARCHAR) FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION workspace_team_daily_reserved(VARCHAR,VARCHAR) TO pinet_runtime",
      """CREATE FUNCTION workspace_team_settle_attempt(aid VARCHAR,rid VARCHAR,u VARCHAR,e VARCHAR,src VARCHAR,s VARCHAR,j JSONB) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE a public.control_workspace_team_attempts%ROWTYPE; BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true) OR s IS NULL OR s NOT IN('succeeded','failed')
        OR (j IS NOT NULL AND (jsonb_typeof(j)<>'object' OR EXISTS(SELECT 1 FROM jsonb_each(j) kv WHERE kv.key NOT IN('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens') OR jsonb_typeof(kv.value)<>'number' OR kv.value::text!~'^[0-9]+$' OR length(kv.value::text)>10 OR kv.value::text::BIGINT>1000000000))) THEN RETURN FALSE;END IF;
      SELECT * INTO a FROM public.control_workspace_team_attempts WHERE id=aid AND run_id=rid AND user_id=u AND environment_id=e AND source_revision=src FOR UPDATE;
      IF NOT FOUND THEN RETURN FALSE;END IF;
      IF a.state<>'reserved' THEN RETURN a.state=s AND a.usage IS NOT DISTINCT FROM j;END IF;
      UPDATE public.control_workspace_team_attempts SET state=s,usage=j,finished_at=clock_timestamp() WHERE id=aid;RETURN TRUE;END$$""",
      "REVOKE ALL ON FUNCTION workspace_team_settle_attempt(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB) FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION workspace_team_settle_attempt(VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,JSONB) TO pinet_runtime",
      """CREATE FUNCTION workspace_team_actor_busy(u VARCHAR,e VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$BEGIN
      IF u IS DISTINCT FROM current_setting('pinet.control_user',true) OR e IS DISTINCT FROM current_setting('pinet.environment',true) THEN RETURN TRUE;END IF;
      RETURN EXISTS(SELECT 1 FROM public.control_tasks t LEFT JOIN public.control_task_runs r ON r.id=t.run_id AND r.task_id=t.id
        WHERE t.user_id=u AND t.environment_id=e AND (t.status='running' OR(t.status='cancelled' AND r.status='running')) AND t.lease_until>clock_timestamp());END$$""",
      "REVOKE ALL ON FUNCTION workspace_team_actor_busy(VARCHAR,VARCHAR) FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION workspace_team_actor_busy(VARCHAR,VARCHAR) TO pinet_runtime"]
