"""Additive0050 barriers; old installers and old two-role material stay frozen."""

from .agent_role_contract import ADAPTER, KIND, PURPOSE, ROLES


def input_current_sql():
    purposes = " ".join(f"WHEN '{role}' THEN '{PURPOSE[role]}'" for role in ROLES)
    return f"""CREATE FUNCTION acquisition_agent_role_input_current(j JSONB,aid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE a public.acquisition_model_authorizations%ROWTYPE;p public.acquisition_model_authorizations%ROWTYPE;
        b public.acquisition_model_task_bindings%ROWTYPE;t public.control_tasks%ROWTYPE;r public.control_task_runs%ROWTYPE;
        item JSONB;label TEXT;seen TEXT[]='{{}}';n INTEGER;m JSONB;expected_revision INTEGER;BEGIN
      IF j->>'version' IS DISTINCT FROM 'acquisition-agent-role.v1'
        OR jsonb_typeof(j->'team') IS DISTINCT FROM 'object'
        OR jsonb_typeof(j->'parents') IS DISTINCT FROM 'array'
        OR j->>'authorization_id' IS DISTINCT FROM aid THEN RETURN FALSE;END IF;
      SELECT * INTO a FROM public.acquisition_model_authorizations WHERE id=aid;
      IF NOT FOUND OR a.execution_role IS NULL OR a.execution_role IS DISTINCT FROM j->>'role'
        OR a.id IS DISTINCT FROM j->'team'->(j->>'role')->>'authorization_id'
        OR(SELECT count(*) FROM jsonb_object_keys(j->'team'))<>6 THEN RETURN FALSE;END IF;
      FOREACH label IN ARRAY ARRAY['research','qualification','writer','reply','quality','coordinator'] LOOP
        SELECT * INTO p FROM public.acquisition_model_authorizations WHERE id=j->'team'->label->>'authorization_id';
        IF NOT FOUND OR p.execution_role IS DISTINCT FROM label
          OR p.purpose IS DISTINCT FROM (CASE label {purposes} END)
          OR p.fingerprint IS DISTINCT FROM j->'team'->label->>'fingerprint'
          OR p.agent_id=ANY(seen) OR NOT public.acquisition_model_authorization_current(p.id)
          OR ROW(p.business_id,p.environment_id,p.organization_id,p.user_id,p.portfolio_id,p.site_id,p.creation_id,
            p.registration_id,p.external_binding_id,p.registration_fingerprint,p.session_id,p.source_revision,
            p.module_fingerprint,p.module_snapshot,p.adapter_id,p.work_registration_sha256)
          IS DISTINCT FROM ROW(a.business_id,a.environment_id,a.organization_id,a.user_id,a.portfolio_id,a.site_id,a.creation_id,
            a.registration_id,a.external_binding_id,a.registration_fingerprint,a.session_id,a.source_revision,
            a.module_fingerprint,a.module_snapshot,a.adapter_id,a.work_registration_sha256) THEN RETURN FALSE;END IF;
        seen=array_append(seen,p.agent_id);
        IF EXISTS(SELECT 1 FROM public.acquisition_model_task_bindings prior
          WHERE prior.authorization_id=p.id AND prior.kind='{KIND}'
          AND (CASE WHEN jsonb_typeof(prior.input->'calibration')='object'
            THEN (prior.input->'calibration')-'case_id' ELSE NULL END)
          IS DISTINCT FROM (CASE WHEN jsonb_typeof(j->'calibration')='object'
            THEN (j->'calibration')-'case_id' ELSE NULL END)) THEN RETURN FALSE;END IF;
      END LOOP;
      n=jsonb_array_length(j->'parents');label=j->>'role';
      IF n>1 OR(label<>'coordinator' AND n<>1) THEN RETURN FALSE;END IF;
      FOR item IN SELECT value FROM jsonb_array_elements(j->'parents') LOOP
        IF (label='coordinator' AND item->>'role'<>'quality')
          OR(label='research' AND item->>'role'<>'coordinator')
          OR(label='qualification' AND item->>'role'<>'research')
          OR(label='writer' AND item->>'role'<>'qualification')
          OR(label='reply' AND item->>'role'<>'quality')
          OR(label='quality' AND item->>'role' NOT IN('writer','reply')) THEN RETURN FALSE;END IF;
        SELECT * INTO b FROM public.acquisition_model_task_bindings WHERE task_id=item->>'task_id';
        SELECT * INTO t FROM public.control_tasks WHERE id=item->>'task_id';
        SELECT * INTO r FROM public.control_task_runs WHERE id=item->>'run_id' AND task_id=t.id;
        IF b.task_id IS NULL OR t.id IS NULL OR r.id IS NULL OR b.kind<>'{KIND}' OR t.kind<>'{KIND}'
          OR t.status<>'succeeded' OR r.status<>'succeeded' OR t.run_id<>r.id
          OR b.authorization_id IS DISTINCT FROM j->'team'->(item->>'role')->>'authorization_id'
          OR b.input->'team' IS DISTINCT FROM j->'team' OR b.input->'campaign' IS DISTINCT FROM j->'campaign'
          OR b.input->'prospect' IS DISTINCT FROM j->'prospect' OR b.input->>'recipient' IS DISTINCT FROM j->>'recipient'
          OR b.input->'calibration' IS DISTINCT FROM j->'calibration'
          OR b.input->>'role' IS DISTINCT FROM item->>'role'
          OR t.source_revision<>a.source_revision OR t.user_id<>a.user_id OR t.business_id<>a.business_id
          OR t.environment_id<>a.environment_id OR t.organization_id<>a.organization_id
          OR t.result->'handoff'->>'output_sha256' IS DISTINCT FROM item->>'output_sha256'
          OR NOT EXISTS(SELECT 1 FROM public.acquisition_model_attempts x WHERE x.task_id=t.id AND x.run_id=r.id
            AND x.ordinal=1 AND x.role=item->>'role' AND x.authorization_id=b.authorization_id
            AND x.state='succeeded' AND x.output=t.result->'output') THEN RETURN FALSE;END IF;
        IF label='writer' AND NOT coalesce(t.result->'output' @> jsonb_build_object('eligible_for_draft',true,'fit','yes'),FALSE)
          THEN RETURN FALSE;END IF;
        IF label='research' AND NOT coalesce(t.result->'output' @> jsonb_build_object('action','route','next_role','research'),FALSE)
          THEN RETURN FALSE;END IF;
        IF label='reply' AND NOT coalesce(t.result->'output' @> jsonb_build_object('factual',true,'relevant',true,'one_clear_next_step',true,
          'no_unverified_promises',true,'no_source_instructions',true),FALSE) THEN RETURN FALSE;END IF;
        IF label='quality' AND item->>'role'='reply' THEN m=b.input->'mail';END IF;
      END LOOP;
      IF label='reply' THEN m=j->'mail';END IF;
      IF m IS NOT NULL AND m<>'null'::jsonb THEN
        expected_revision=(m->>'revision')::INTEGER;
        IF label='quality' AND EXISTS(SELECT 1 FROM public.acquisition_work_receipts w
          WHERE w.business_id=a.business_id AND w.environment_id=a.environment_id AND w.site_id=a.site_id
          AND w.adapter_id=a.adapter_id AND w.operation='decision' AND w.request_id=j->>'request_id'
          AND w.thread_id=m->>'thread_id') THEN expected_revision=expected_revision+1;END IF;
        IF NOT EXISTS(SELECT 1 FROM public.acquisition_correspondence_threads th
          JOIN public.acquisition_mail_bindings mb ON mb.thread_id=th.thread_id AND mb.business_id=th.business_id
            AND mb.environment_id=th.environment_id AND mb.site_id=th.site_id AND mb.adapter_id=th.adapter_id
          WHERE th.business_id=a.business_id AND th.environment_id=a.environment_id AND th.site_id=a.site_id
            AND th.adapter_id=a.adapter_id AND th.thread_id=m->>'thread_id' AND th.revision=expected_revision
            AND th.last_inbound_id=m->>'inbound_id' AND mb.mail_id=m->>'inbound_id'
            AND mb.direction='inbound' AND mb.input_sha256=m->>'input_sha256'
            AND th.source_revision=a.source_revision AND th.campaign=j->'campaign' AND th.prospect=j->'prospect')
          THEN RETURN FALSE;END IF;
      ELSIF label='reply' THEN RETURN FALSE;END IF;
      RETURN TRUE;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN FALSE;END$$"""


def extend(definition, mode):
    """Patch only the reviewed0048/49 function body, preserving its legacy branch."""
    if KIND in definition or "acquisition.model_reply" not in definition:
        raise RuntimeError("unknown_agent_role_predecessor")
    old = "'acquisition.model_prepare','acquisition.model_reply'"
    if old not in definition:
        raise RuntimeError("unknown_agent_role_kind_predecessor")
    result = definition.replace(old, old + f",'{KIND}'")
    for prefix in ("t.", ""):
        old_case = f"CASE WHEN {prefix}kind='acquisition.model_reply' THEN 'acquisition-model-reply.v1' ELSE 'acquisition-model-prepare.v1' END"
        result = result.replace(
            old_case,
            f"CASE WHEN {prefix}kind='{KIND}' THEN '{ADAPTER}' WHEN {prefix}kind='acquisition.model_reply' THEN 'acquisition-model-reply.v1' ELSE 'acquisition-model-prepare.v1' END",
        )
    if mode == "fence":
        anchor = "IF NOT public.acquisition_native_pair_current(NEW.input,NEW.authorization_id)"
        if result.count(anchor) != 1:
            raise RuntimeError("unknown_agent_role_binding_fence")
        result = result.replace(
            anchor,
            f"IF (NEW.kind='{KIND}') IS DISTINCT FROM (a.execution_role IS NOT NULL)\n"
            f"          OR(NEW.kind='{KIND}' AND NOT public.acquisition_agent_role_input_current(NEW.input,NEW.authorization_id))\n"
            f"          OR(NEW.kind<>'{KIND}' AND NOT public.acquisition_native_pair_current(NEW.input,NEW.authorization_id))",
            1,
        )
    return result


def extend_native_task(definition):
    anchor = "IF NOT FOUND OR NOT public.acquisition_native_pair_current(j.input,j.authorization_id)"
    if KIND in definition or definition.count(anchor) != 1:
        raise RuntimeError("unknown_agent_role_native_task_predecessor")
    return definition.replace(
        anchor,
        f"IF FOUND AND j.kind='{KIND}' THEN\n"
        "        RETURN public.acquisition_agent_role_input_current(j.input,j.authorization_id);END IF;\n      "
        + anchor,
        1,
    )


def extend_native_role(definition):
    anchor = "IF NOT public.acquisition_native_task_current(tid) THEN RETURN FALSE;END IF;"
    if KIND in definition or definition.count(anchor) != 1:
        raise RuntimeError("unknown_agent_role_native_role_predecessor")
    return definition.replace(
        anchor,
        f"IF EXISTS(SELECT 1 FROM public.acquisition_model_task_bindings WHERE task_id=tid AND kind='{KIND}') THEN\n"
        "        RETURN pos=1 AND NOT EXISTS(SELECT 1 FROM public.acquisition_model_attempts WHERE task_id=tid)\n"
        "          AND EXISTS(SELECT 1 FROM public.acquisition_model_task_bindings b JOIN public.acquisition_model_authorizations a\n"
        "            ON a.id=b.authorization_id WHERE b.task_id=tid AND a.execution_role=label\n"
        "            AND public.acquisition_agent_role_input_current(b.input,a.id));END IF;\n      " + anchor,
        1,
    )


def patch_boundary(definition):
    anchor = "'acquisition.model_reply')"
    if KIND in definition or definition.count(anchor) != 1:
        raise RuntimeError("unknown_agent_role_business_boundary")
    return definition.replace(anchor, "'acquisition.model_reply','" + KIND + "')", 1)
