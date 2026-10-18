"""0051 append-only zero-dispatch successors. No SQL on import."""

from . import task_schema as previous


def fence_sql():
    return """CREATE FUNCTION mail_display_reauthorization_fence() RETURNS TRIGGER
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE ancestor RECORD;t public.control_tasks%ROWTYPE;prior_job public.control_mail_display_jobs%ROWTYPE;
      p public.control_mail_display_policies%ROWTYPE;tip public.control_mail_display_jobs%ROWTYPE;n INTEGER;
      BEGIN
      IF NEW.previous_task_id IS NULL THEN
        IF NEW.generation<>0 THEN RAISE EXCEPTION 'root display generation required' USING ERRCODE='23514';END IF;
        IF EXISTS(SELECT 1 FROM public.control_mail_display_jobs WHERE policy_id=NEW.policy_id AND previous_task_id IS NOT NULL) THEN
          RAISE EXCEPTION 'display reauthorization named sources only' USING ERRCODE='23514';END IF;
        RETURN NEW;
      END IF;
      IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND(rolsuper OR rolbypassrls))
        OR current_setting('pinet.mail_display_reauthorization',true) IS DISTINCT FROM NEW.policy_id THEN
        RAISE EXCEPTION 'explicit privileged display reauthorization required' USING ERRCODE='23514';END IF;
      SELECT * INTO tip FROM public.control_mail_display_jobs WHERE task_id=NEW.previous_task_id;
      IF NOT FOUND OR ROW(tip.business_id,tip.organization_id,tip.user_id,tip.environment_id,tip.mail_id,tip.case_id,
          tip.source_sha256,tip.instruction_sha256,tip.target_language)
        IS DISTINCT FROM ROW(NEW.business_id,NEW.organization_id,NEW.user_id,NEW.environment_id,NEW.mail_id,NEW.case_id,
          NEW.source_sha256,NEW.instruction_sha256,NEW.target_language)
        OR NEW.generation<>tip.generation+1 OR NEW.policy_id=tip.policy_id THEN
        RAISE EXCEPTION 'exact display predecessor required' USING ERRCODE='23514';END IF;
      -- Lock every ancestor Task before Policy/Job locks, matching common worker order.
      FOR ancestor IN WITH RECURSIVE chain AS(
        SELECT task_id,previous_task_id,generation FROM public.control_mail_display_jobs WHERE task_id=NEW.previous_task_id
        UNION ALL SELECT j.task_id,j.previous_task_id,j.generation FROM public.control_mail_display_jobs j
          JOIN chain c ON j.task_id=c.previous_task_id) SELECT * FROM chain ORDER BY generation LOOP
        PERFORM 1 FROM public.control_tasks WHERE id=ancestor.task_id FOR UPDATE;
      END LOOP;
      FOR ancestor IN WITH RECURSIVE chain AS(
        SELECT * FROM public.control_mail_display_jobs WHERE task_id=NEW.previous_task_id
        UNION ALL SELECT j.* FROM public.control_mail_display_jobs j JOIN chain c ON j.task_id=c.previous_task_id)
        SELECT * FROM chain ORDER BY generation LOOP
        SELECT * INTO t FROM public.control_tasks WHERE id=ancestor.task_id;
        SELECT * INTO p FROM public.control_mail_display_policies WHERE id=ancestor.policy_id FOR UPDATE;
        SELECT * INTO prior_job FROM public.control_mail_display_jobs WHERE task_id=ancestor.task_id FOR UPDATE;
        IF NOT((t.status='queued' AND t.failure_code IS NULL)
          OR(t.status='failed' AND t.failure_code IS NOT DISTINCT FROM 'authorization_revoked'))
          OR t.run_id IS NOT NULL OR t.lease_until IS NOT NULL
          OR(t.result IS NOT NULL AND t.result IS DISTINCT FROM 'null'::jsonb)
          OR prior_job.run_id IS NOT NULL OR prior_job.reserved_at IS NOT NULL OR prior_job.record IS NOT NULL
          OR p.enabled OR p.user_id IS DISTINCT FROM NEW.user_id OR p.environment_id IS DISTINCT FROM NEW.environment_id
          OR EXISTS(SELECT 1 FROM public.control_task_runs WHERE task_id=t.id) THEN
          RAISE EXCEPTION 'display lineage was dispatched or is not stopped' USING ERRCODE='23514';END IF;
      END LOOP;
      IF EXISTS(SELECT 1 FROM public.control_mail_display_jobs WHERE previous_task_id=NEW.previous_task_id) THEN
        RAISE EXCEPTION 'display successor retained' USING ERRCODE='23514';END IF;
      SELECT * INTO p FROM public.control_mail_display_policies WHERE id=NEW.policy_id FOR UPDATE;
      IF NOT public.mail_display_policy_current(p.id) THEN
        RAISE EXCEPTION 'fresh display policy required' USING ERRCODE='23514';END IF;
      SELECT count(*) INTO n FROM public.control_mail_display_jobs j JOIN public.control_tasks q ON q.id=j.task_id
        WHERE j.policy_id=p.id AND(j.reserved_at IS NOT NULL OR q.status IN('queued','running'));
      IF n>=p.maximum_calls THEN RAISE EXCEPTION 'display policy slots exhausted' USING ERRCODE='23514';END IF;
      RETURN NEW;END$$"""


def projection_sql():
    sql = previous.projection_sql().replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1)
    before = "AND bound.source_sha256=sha AND bound.instruction_sha256=ins AND bound.target_language='lt';"
    if sql.count(before) != 1:
        raise RuntimeError("unknown_display_projection_predecessor")
    return sql.replace(before, before[:-1] + " ORDER BY bound.generation DESC LIMIT 1;")


def statements():
    return [
        "ALTER TABLE control_mail_display_jobs ADD COLUMN previous_task_id VARCHAR REFERENCES control_mail_display_jobs(task_id) ON DELETE RESTRICT",
        "ALTER TABLE control_mail_display_jobs ADD COLUMN generation INTEGER NOT NULL DEFAULT 0 CHECK(generation BETWEEN 0 AND 32)",
        "ALTER TABLE control_mail_display_jobs DROP CONSTRAINT uq_mail_display_source",
        "ALTER TABLE control_mail_display_jobs ADD CONSTRAINT uq_mail_display_source UNIQUE(business_id,environment_id,mail_id,source_sha256,instruction_sha256,target_language,generation)",
        "CREATE UNIQUE INDEX uq_mail_display_successor ON control_mail_display_jobs(previous_task_id) WHERE previous_task_id IS NOT NULL",
        fence_sql(),
        "REVOKE ALL ON FUNCTION mail_display_reauthorization_fence() FROM PUBLIC",
        "CREATE TRIGGER mail_display_reauthorization_fence BEFORE INSERT ON control_mail_display_jobs FOR EACH ROW EXECUTE FUNCTION mail_display_reauthorization_fence()",
        projection_sql(),
    ]
