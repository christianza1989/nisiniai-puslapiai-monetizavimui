"""Additive recipient-less branch on the 0050 common Task/attempt fences."""

from .evidence_contract import VERSION


def input_current_sql():
    return f"""CREATE FUNCTION acquisition_evidence_role_input_current(j JSONB,aid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE a public.acquisition_model_authorizations%ROWTYPE;p public.acquisition_model_authorizations%ROWTYPE;
        b public.acquisition_model_task_bindings%ROWTYPE;t public.control_tasks%ROWTYPE;r public.control_task_runs%ROWTYPE;
        label TEXT;seen TEXT[]='{{}}';item JSONB;parent JSONB;now_at TIMESTAMPTZ;BEGIN
      IF jsonb_typeof(j) IS DISTINCT FROM 'object' OR j->>'version' IS DISTINCT FROM '{VERSION}'
        OR (j-ARRAY['version','request_id','authorization_id','role','team','campaign','prospect','evidence','job_text','parents'])<>'{{}}'::jsonb
        OR (SELECT count(*) FROM jsonb_object_keys(j))<>10
        OR j->>'role' NOT IN('research','qualification') OR j->>'authorization_id' IS DISTINCT FROM aid
        OR jsonb_typeof(j->'team') IS DISTINCT FROM 'object' OR jsonb_typeof(j->'parents') IS DISTINCT FROM 'array'
        OR jsonb_typeof(j->'campaign') IS DISTINCT FROM 'object' OR jsonb_typeof(j->'evidence') IS DISTINCT FROM 'object'
        OR jsonb_typeof(j->'prospect') IS DISTINCT FROM 'object'
        OR jsonb_typeof(j->'job_text') IS DISTINCT FROM 'string' OR length(j->>'job_text') NOT BETWEEN 1 AND 3000
        OR length(j::text)>100000 THEN RETURN FALSE;END IF;
      SELECT * INTO a FROM public.acquisition_model_authorizations WHERE id=aid;
      IF NOT FOUND OR a.execution_role IS DISTINCT FROM j->>'role' OR a.purpose<>'customer_research'
        OR a.id IS DISTINCT FROM j->'team'->(j->>'role')->>'authorization_id'
        OR a.site_id IS DISTINCT FROM j->'campaign'->>'site_id'
        OR(SELECT count(*) FROM jsonb_object_keys(j->'team'))<>6 THEN RETURN FALSE;END IF;
      FOREACH label IN ARRAY ARRAY['research','qualification','writer','reply','quality','coordinator'] LOOP
        SELECT * INTO p FROM public.acquisition_model_authorizations WHERE id=j->'team'->label->>'authorization_id';
        IF NOT FOUND OR p.execution_role IS DISTINCT FROM label
          OR p.purpose IS DISTINCT FROM (CASE WHEN label IN('research','qualification') THEN 'customer_research'
             WHEN label IN('writer','reply') THEN 'email' ELSE 'custom' END)
          OR p.fingerprint IS DISTINCT FROM j->'team'->label->>'fingerprint'
          OR p.agent_id=ANY(seen) OR NOT public.acquisition_model_authorization_current(p.id)
          OR ROW(p.business_id,p.environment_id,p.organization_id,p.user_id,p.portfolio_id,p.site_id,p.creation_id,
            p.registration_id,p.external_binding_id,p.registration_fingerprint,p.session_id,p.source_revision,
            p.module_fingerprint,p.module_snapshot,p.adapter_id,p.work_registration_sha256)
          IS DISTINCT FROM ROW(a.business_id,a.environment_id,a.organization_id,a.user_id,a.portfolio_id,a.site_id,a.creation_id,
            a.registration_id,a.external_binding_id,a.registration_fingerprint,a.session_id,a.source_revision,
            a.module_fingerprint,a.module_snapshot,a.adapter_id,a.work_registration_sha256) THEN RETURN FALSE;END IF;
        seen=array_append(seen,p.agent_id);
        IF EXISTS(SELECT 1 FROM public.acquisition_model_task_bindings prior WHERE prior.authorization_id=p.id
          AND prior.kind='acquisition.agent_role' AND prior.input->>'version' IS DISTINCT FROM '{VERSION}') THEN RETURN FALSE;END IF;
      END LOOP;
      now_at=clock_timestamp();
      IF j->'campaign'->>'mode' IS DISTINCT FROM 'research_only'
        OR j->'campaign'->'enabled' IS DISTINCT FROM 'true'::jsonb
        OR j->'campaign'->'paused' IS DISTINCT FROM 'false'::jsonb
        OR j->'campaign'->>'expires_at' IS NULL OR (j->'campaign'->>'expires_at')::timestamptz<=now_at
        OR jsonb_typeof(j->'campaign'->'facts') IS DISTINCT FROM 'array'
        OR jsonb_array_length(j->'campaign'->'facts') NOT BETWEEN 1 AND 40
        OR ((j->'evidence')-ARRAY['directory','plan_sha256','receipt_sha256','packet_sha256','approved_at','expires_at'])<>'{{}}'::jsonb
        OR (SELECT count(*) FROM jsonb_object_keys(j->'evidence'))<>6
        OR j->'evidence'->>'directory' IS NULL OR length(j->'evidence'->>'directory') NOT BETWEEN 1 AND 1024
        OR j->'evidence'->>'approved_at' IS NULL OR j->'evidence'->>'expires_at' IS NULL
        OR (j->'evidence'->>'approved_at')::timestamptz>now_at
        OR (j->'evidence'->>'expires_at')::timestamptz<=now_at
        OR (j->'evidence'->>'expires_at')::timestamptz<=(j->'evidence'->>'approved_at')::timestamptz
        OR (j->'evidence'->>'expires_at')::timestamptz>(j->'evidence'->>'approved_at')::timestamptz+interval '1 day'
        THEN RETURN FALSE;END IF;
      FOREACH label IN ARRAY ARRAY['plan_sha256','receipt_sha256','packet_sha256'] LOOP
        IF j->'evidence'->>label IS NULL OR (j->'evidence'->>label)!~'^[a-f0-9]{{64}}$' THEN RETURN FALSE;END IF;
      END LOOP;
      FOR item IN SELECT value FROM jsonb_array_elements(j->'campaign'->'facts') LOOP
        IF item->>'expires_at' IS NULL OR(item->>'expires_at')::timestamptz<=now_at THEN RETURN FALSE;END IF;
      END LOOP;
      IF ((j->'prospect')-ARRAY['organization_key','name','requested_country','evidence'])<>'{{}}'::jsonb
        OR(SELECT count(*) FROM jsonb_object_keys(j->'prospect'))<>4
        OR j->'prospect'->>'organization_key' IS NULL OR length(j->'prospect'->>'organization_key') NOT BETWEEN 3 AND 120
        OR j->'prospect'->>'name' IS NULL OR length(j->'prospect'->>'name') NOT BETWEEN 2 AND 200
        OR j->'prospect'->>'requested_country' IS NULL OR j->'prospect'->>'requested_country'!~'^[A-Z]{{2}}$'
        OR jsonb_typeof(j->'campaign'->'countries') IS DISTINCT FROM 'array'
        OR NOT coalesce(j->'campaign'->'countries' @> jsonb_build_array(j->'prospect'->>'requested_country'),FALSE)
        OR jsonb_typeof(j->'prospect'->'evidence') IS DISTINCT FROM 'array'
        OR jsonb_array_length(j->'prospect'->'evidence') NOT BETWEEN 1 AND 12 THEN RETURN FALSE;END IF;
      seen='{{}}';
      FOR item IN SELECT value FROM jsonb_array_elements(j->'prospect'->'evidence') LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR(item-ARRAY['id','source_id','url','checked_at','expires_at','visible_text_sha256','start','end','text'])<>'{{}}'::jsonb
          OR(SELECT count(*) FROM jsonb_object_keys(item))<>9
          OR item->>'id' IS NULL OR item->>'id'=ANY(seen) OR item->>'id'!~'^[a-zA-Z0-9_-]{{1,80}}$'
          OR item->>'url' IS NULL OR item->>'url'!~'^https://'
          OR item->>'visible_text_sha256' IS NULL OR item->>'visible_text_sha256'!~'^[a-f0-9]{{64}}$'
          OR item->>'checked_at' IS NULL OR item->>'expires_at' IS NULL
          OR item->>'source_id' IS NULL OR item->>'start' IS NULL OR item->>'end' IS NULL OR item->>'text' IS NULL
          OR(item->>'checked_at')::timestamptz>(j->'evidence'->>'approved_at')::timestamptz
          OR(item->>'checked_at')::timestamptz<now_at-interval '1 day'
          OR(item->>'expires_at')::timestamptz<=now_at
          OR(item->>'start')::integer<0 OR(item->>'end')::integer-(item->>'start')::integer<>char_length(item->>'text')
          OR char_length(item->>'text') NOT BETWEEN 3 AND 2000 THEN RETURN FALSE;END IF;
        seen=array_append(seen,item->>'id');
      END LOOP;
      IF EXISTS(SELECT 1 FROM public.acquisition_campaigns c WHERE c.business_id=a.business_id
        AND c.environment_id=a.environment_id AND c.site_id=a.site_id AND c.adapter_id=a.adapter_id
        AND c.campaign_id=j->'campaign'->>'campaign_id' AND c.stopped) THEN RETURN FALSE;END IF;
      IF j->>'role'='research' THEN RETURN jsonb_array_length(j->'parents')=0;END IF;
      IF jsonb_array_length(j->'parents')<>1 THEN RETURN FALSE;END IF;
      parent=j->'parents'->0;
      IF parent->>'role' IS DISTINCT FROM 'research' THEN RETURN FALSE;END IF;
      SELECT * INTO b FROM public.acquisition_model_task_bindings WHERE task_id=parent->>'task_id';
      SELECT * INTO t FROM public.control_tasks WHERE id=parent->>'task_id';
      SELECT * INTO r FROM public.control_task_runs WHERE id=parent->>'run_id' AND task_id=t.id;
      IF b.task_id IS NULL OR t.id IS NULL OR r.id IS NULL OR b.kind<>'acquisition.agent_role' OR t.kind<>b.kind
        OR t.status<>'succeeded' OR r.status<>'succeeded' OR t.run_id<>r.id
        OR b.authorization_id IS DISTINCT FROM j->'team'->'research'->>'authorization_id'
        OR b.input->>'version' IS DISTINCT FROM '{VERSION}' OR b.input->>'role' IS DISTINCT FROM 'research'
        OR(b.input-ARRAY['request_id','authorization_id','role','parents','job_text'])
          IS DISTINCT FROM(j-ARRAY['request_id','authorization_id','role','parents','job_text'])
        OR ROW(t.source_revision,t.user_id,t.business_id,t.environment_id,t.organization_id)
          IS DISTINCT FROM ROW(a.source_revision,a.user_id,a.business_id,a.environment_id,a.organization_id)
        OR t.result->'handoff'->>'output_sha256' IS DISTINCT FROM parent->>'output_sha256'
        OR NOT EXISTS(SELECT 1 FROM public.acquisition_model_attempts x WHERE x.task_id=t.id AND x.run_id=r.id
          AND x.ordinal=1 AND x.role='research' AND x.authorization_id=b.authorization_id
          AND x.state='succeeded' AND x.output=t.result->'output') THEN RETURN FALSE;END IF;
      RETURN TRUE;
      EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow
        OR numeric_value_out_of_range OR invalid_parameter_value THEN RETURN FALSE;END$$"""


LEGACY_VERSION_GUARD = """IF EXISTS(SELECT 1 FROM public.acquisition_model_task_bindings prior
          WHERE prior.authorization_id=p.id AND prior.kind='acquisition.agent_role'
          AND prior.input->>'version' IS DISTINCT FROM 'acquisition-agent-role.v1') THEN RETURN FALSE;END IF;
        """


def extend(definition):
    anchor = "IF j->>'version' IS DISTINCT FROM 'acquisition-agent-role.v1'"
    parent = "OR b.input->'calibration' IS DISTINCT FROM j->'calibration'"
    retained = "IF EXISTS(SELECT 1 FROM public.acquisition_model_task_bindings prior"
    if (
        definition.count(anchor) != 1
        or definition.count(parent) != 1
        or definition.count(retained) != 1
        or VERSION in definition
    ):
        raise RuntimeError("unknown0050_evidence_predecessor")
    return (
        definition.replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION", 1)
        .replace(
            anchor,
            f"IF j->>'version'='{VERSION}' THEN RETURN public.acquisition_evidence_role_input_current(j,aid);END IF;\n      "
            + anchor,
            1,
        )
        .replace(parent, parent + "\n          OR b.input->>'version' IS DISTINCT FROM j->>'version'", 1)
        .replace(retained, LEGACY_VERSION_GUARD + retained, 1)
    )
