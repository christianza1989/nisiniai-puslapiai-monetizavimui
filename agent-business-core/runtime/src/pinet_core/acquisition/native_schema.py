"""Additive phase/reply barriers over0046; historical installers remain frozen."""
from .model_schema import ADAPTER, KIND, TABLE_ATTEMPT, TABLE_AUTH, TABLE_TASK

REPLY = "acquisition.model_reply"
REPLY_ADAPTER = "acquisition-model-reply.v1"


def helpers():
    return [f"""CREATE FUNCTION acquisition_native_pair_current(j JSONB,aid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE r public.{TABLE_AUTH}%ROWTYPE;e public.{TABLE_AUTH}%ROWTYPE;stage TEXT;BEGIN
      IF NOT(j ? 'native') THEN RETURN NOT(j ? 'stage');END IF;
      IF jsonb_typeof(j->'native') IS DISTINCT FROM 'object' THEN RETURN FALSE;END IF;
      stage=j->>'stage';IF stage IS NULL OR stage NOT IN('research','email','reply') THEN RETURN FALSE;END IF;
      SELECT * INTO r FROM public.{TABLE_AUTH} WHERE id=j->'native'->>'research_authorization_id';
      SELECT * INTO e FROM public.{TABLE_AUTH} WHERE id=j->'native'->>'email_authorization_id';
      IF r.id IS NULL OR e.id IS NULL OR r.purpose<>'customer_research' OR e.purpose<>'email' OR r.agent_id=e.agent_id
        OR r.fingerprint IS DISTINCT FROM j->'native'->>'research_fingerprint'
        OR e.fingerprint IS DISTINCT FROM j->'native'->>'email_fingerprint'
        OR aid IS DISTINCT FROM (CASE WHEN stage='research' THEN r.id ELSE e.id END)
        OR ROW(r.business_id,r.environment_id,r.organization_id,r.user_id,r.portfolio_id,r.site_id,r.creation_id,
          r.registration_id,r.registration_fingerprint,r.session_id,r.source_revision,r.module_fingerprint,
          r.module_snapshot,r.adapter_id,r.work_registration_sha256)
        IS DISTINCT FROM ROW(e.business_id,e.environment_id,e.organization_id,e.user_id,e.portfolio_id,e.site_id,e.creation_id,
          e.registration_id,e.registration_fingerprint,e.session_id,e.source_revision,e.module_fingerprint,
          e.module_snapshot,e.adapter_id,e.work_registration_sha256) THEN RETURN FALSE;END IF;
      RETURN public.acquisition_model_authorization_current(r.id) AND public.acquisition_model_authorization_current(e.id);
      END$$""",
      f"""CREATE FUNCTION acquisition_native_handoff_current(j JSONB) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE b public.{TABLE_TASK}%ROWTYPE;q public.{TABLE_ATTEMPT}%ROWTYPE;v public.{TABLE_ATTEMPT}%ROWTYPE;BEGIN
      IF j->>'stage' IS DISTINCT FROM 'email' THEN RETURN FALSE;END IF;
      SELECT saved.* INTO b FROM public.{TABLE_TASK} saved JOIN public.control_tasks t ON t.id=saved.task_id
        JOIN public.control_task_runs run ON run.task_id=t.id AND run.id=t.run_id
        WHERE t.id=j->'handoff'->>'task_id' AND run.id=j->'handoff'->>'run_id'
        AND t.kind='{KIND}' AND t.status='succeeded' AND run.status='succeeded'
        AND saved.authorization_id=j->'native'->>'research_authorization_id'
        AND saved.input->>'stage'='research' AND saved.input->'native'=j->'native'
        AND saved.input->>'recipient'=j->>'recipient' AND saved.input->'prospect'=j->'prospect'
        AND((saved.input->'campaign')-'mode')=((j->'campaign')-'mode')
        AND t.source_revision=current_setting('pinet.execution_source_revision',true);
      IF NOT FOUND THEN RETURN FALSE;END IF;
      SELECT * INTO q FROM public.{TABLE_ATTEMPT} WHERE task_id=b.task_id AND ordinal=1 AND role='researcher' AND state='succeeded';
      SELECT * INTO v FROM public.{TABLE_ATTEMPT} WHERE task_id=b.task_id AND ordinal=2 AND role='reviewer' AND state='succeeded';
      RETURN q.id IS NOT NULL AND v.id IS NOT NULL AND q.output->>'fit'='yes' AND q.output->>'next_action'='research'
        AND q.output->>'subject'='' AND q.output->>'body'=''
        AND v.output @> jsonb_build_object('factual',true,'relevant',true,'one_clear_next_step',true,
          'no_unverified_promises',true,'no_source_instructions',true);
      END$$""",
      f"""CREATE FUNCTION acquisition_native_task_current(tid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE j public.{TABLE_TASK}%ROWTYPE;BEGIN
      SELECT * INTO j FROM public.{TABLE_TASK} WHERE task_id=tid;
      IF NOT FOUND OR NOT public.acquisition_native_pair_current(j.input,j.authorization_id)
        OR(j.kind='{REPLY}' AND j.input->>'stage' IS DISTINCT FROM 'reply') THEN RETURN FALSE;END IF;
      RETURN j.input->>'stage' IS DISTINCT FROM 'email' OR public.acquisition_native_handoff_current(j.input);END$$""",
      f"""CREATE FUNCTION acquisition_native_role_allowed(tid VARCHAR,label VARCHAR,pos INTEGER) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$DECLARE stage TEXT;first_role TEXT;names TEXT[];BEGIN
      IF NOT public.acquisition_native_task_current(tid) THEN RETURN FALSE;END IF;
      SELECT input->>'stage' INTO stage FROM public.{TABLE_TASK} WHERE task_id=tid;
      SELECT array_agg(role ORDER BY ordinal) INTO names FROM public.{TABLE_ATTEMPT} WHERE task_id=tid;
      IF stage IS NULL THEN RETURN coalesce((pos=1 AND label='researcher')
        OR(names=ARRAY['researcher'] AND label IN('writer','reviewer'))
        OR(names=ARRAY['researcher','writer'] AND label='reviewer'),FALSE);END IF;
      first_role=CASE stage WHEN 'research' THEN 'researcher' WHEN 'email' THEN 'writer' WHEN 'reply' THEN 'reply_coordinator' END;
      RETURN coalesce((pos=1 AND label=first_role) OR(pos=2 AND names=ARRAY[first_role] AND label='reviewer'),FALSE);END$$"""]


FUNCTIONS = {
    "acquisition_model_row_fence()": "fence",
    "acquisition_model_parent_fence()": "parent",
    "acquisition_model_settle_attempt(varchar,varchar,varchar,varchar,varchar,varchar,jsonb,jsonb)": "settle",
    "acquisition_model_run_usage(varchar,varchar,varchar,varchar,varchar)": "usage",
    "acquisition_model_settle_task(varchar,varchar,varchar,varchar,varchar,jsonb,varchar)": "task",
}


def extend(definition, mode):
    if REPLY in definition or KIND not in definition:
        raise RuntimeError("Unknown0047 acquisition function predecessor")
    result = definition.replace(f"t.kind<>'{KIND}'", f"t.kind NOT IN('{KIND}','{REPLY}')")
    result = result.replace(f"t.kind='{KIND}'", f"t.kind IN('{KIND}','{REPLY}')")
    # Parent trigger uses NEW.task_id rather than the t record.
    result = result.replace(f"kind='{KIND}'", f"kind IN('{KIND}','{REPLY}')")
    result = result.replace(f"r.adapter_revision<>'{ADAPTER}'",
        f"r.adapter_revision IS DISTINCT FROM (CASE WHEN t.kind='{REPLY}' THEN '{REPLY_ADAPTER}' ELSE '{ADAPTER}' END)")
    result = result.replace(f"r.adapter_revision='{ADAPTER}'",
        f"r.adapter_revision=(CASE WHEN t.kind='{REPLY}' THEN '{REPLY_ADAPTER}' ELSE '{ADAPTER}' END)")
    if mode == "parent":
        result = result.replace(f"NEW.adapter_revision<>'{ADAPTER}'", f"NEW.adapter_revision IS DISTINCT FROM "
            f"(SELECT CASE WHEN kind='{REPLY}' THEN '{REPLY_ADAPTER}' ELSE '{ADAPTER}' END FROM public.control_tasks WHERE id=NEW.task_id)")
    if mode == "fence":
        anchor = "NEW.created_at=clock_timestamp();RETURN NEW;"
        extra = f"""IF NOT public.acquisition_native_pair_current(NEW.input,NEW.authorization_id)
          OR(NEW.kind='{REPLY}' AND(NEW.input->>'stage' IS DISTINCT FROM 'reply'
            OR NEW.input->>'thread_id' IS NULL OR NEW.input->>'inbound_id' IS NULL))
          OR(NEW.input->>'stage'='email' AND NOT public.acquisition_native_handoff_current(NEW.input)) THEN
          RAISE EXCEPTION 'exact native phase lineage required' USING ERRCODE='23514';END IF;"""
        if result.count(anchor) != 1:
            raise RuntimeError("Unknown0047 binding fence")
        result = result.replace(anchor, extra+anchor)
        before = """OR NOT coalesce((n=0 AND NEW.role='researcher') OR(names=ARRAY['researcher'] AND NEW.role IN('writer','reviewer'))
          OR(names=ARRAY['researcher','writer'] AND NEW.role='reviewer'),FALSE)"""
        if result.count(before) != 1:
            raise RuntimeError("Unknown0047 role fence")
        result = result.replace(before, "OR NOT public.acquisition_native_role_allowed(t.id,NEW.role,NEW.ordinal)")
    if mode == "settle":
        before = "AND public.acquisition_model_authorization_current(authority.id));"
        if result.count(before) != 1:
            raise RuntimeError("Unknown0047 settlement fence")
        result = result.replace(before, "AND public.acquisition_model_authorization_current(authority.id) "
            "AND public.acquisition_native_task_current(t.id));")
    return result
