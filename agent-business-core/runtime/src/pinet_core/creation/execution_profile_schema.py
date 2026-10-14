"""Additive capture/fences; no historical Job or Attempt data changes."""
TABLE = "control_pipeline_model_profiles"
PARENTS = {"creation": ("control_creation_jobs", "control_creation_attempts", "creation_job_id"),
    "discovery": ("control_business_discovery_jobs", "control_business_discovery_attempts", "discovery_job_id"),
    "guide": ("control_content_work_jobs", "control_content_work_attempts", "guide_job_id")}
OWNER = "user_id,organization_id,portfolio_id,environment_id"


def statements():
    parents = ",".join(f"FOREIGN KEY({field},{OWNER}) REFERENCES {table}(id,{OWNER}) ON DELETE CASCADE"
        for table, _, field in PARENTS.values())
    yield f"""CREATE TABLE {TABLE}(id VARCHAR PRIMARY KEY,
      {OWNER.replace(',', ' VARCHAR NOT NULL,')} VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      profile VARCHAR NOT NULL CHECK(profile='local_sol61_high_v1'),
      source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),session_id VARCHAR NOT NULL,
      creation_job_id VARCHAR,discovery_job_id VARCHAR,guide_job_id VARCHAR,
      CHECK(num_nonnulls(creation_job_id,discovery_job_id,guide_job_id)=1),
      CHECK(environment_id='local' OR environment_id LIKE 'test-%'),
      UNIQUE(id,{OWNER}),UNIQUE(creation_job_id),UNIQUE(discovery_job_id),UNIQUE(guide_job_id),{parents},
      FOREIGN KEY(session_id,user_id,environment_id) REFERENCES control_sessions(id,user_id,environment_id))"""
    yield f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY"
    yield f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY"
    yield f"""CREATE POLICY pipeline_model_profile_scope ON {TABLE} USING(
      environment_id=current_setting('pinet.environment',true) AND user_id=current_setting('pinet.control_user',true)
      AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
        ON a.user_id=u.id AND a.environment_id=u.environment_id WHERE u.id={TABLE}.user_id
        AND u.environment_id={TABLE}.environment_id AND u.enabled AND a.verified_at IS NOT NULL)
      AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
        ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
        WHERE m.user_id={TABLE}.user_id AND m.environment_id={TABLE}.environment_id AND m.enabled AND m.role='owner'
        AND m.organization_id={TABLE}.organization_id AND p.id={TABLE}.portfolio_id))"""
    yield f"REVOKE ALL ON {TABLE} FROM pinet_runtime"
    yield f"GRANT SELECT ON {TABLE} TO pinet_runtime"
    yield """CREATE FUNCTION control_pipeline_profile_immutable() RETURNS TRIGGER LANGUAGE plpgsql
      SET search_path=pg_catalog,public AS $$BEGIN RAISE EXCEPTION 'immutable pipeline model profile' USING ERRCODE='23514';END$$"""
    yield "REVOKE ALL ON FUNCTION control_pipeline_profile_immutable() FROM PUBLIC"
    yield f"CREATE TRIGGER pipeline_model_profile_immutable BEFORE UPDATE ON {TABLE} FOR EACH ROW EXECUTE FUNCTION control_pipeline_profile_immutable()"
    branches = "\n".join(f"WHEN '{table}' THEN {field} := NEW.id;" for table, _, field in PARENTS.values())
    yield f"""CREATE FUNCTION control_pipeline_profile_capture() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
      SET search_path=pg_catalog,public AS $$DECLARE
      chosen TEXT := current_setting('pinet.pipeline_execution_profile',true);
      creation_job_id VARCHAR;discovery_job_id VARCHAR;guide_job_id VARCHAR;
      BEGIN
      IF chosen IS NULL OR chosen='' OR chosen='default' THEN RETURN NEW;END IF;
      IF chosen<>'local_sol61_high_v1' OR current_setting('pinet.pipeline_execution_mode',true) IS DISTINCT FROM 'local'
        OR NEW.status<>'queued' OR NEW.run_id IS NOT NULL
        OR NOT (NEW.environment_id='local' OR NEW.environment_id LIKE 'test-%')
        OR NEW.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR NEW.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id
          AND s.environment_id=NEW.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())
        OR NOT EXISTS(SELECT 1 FROM public.control_users u JOIN public.control_customer_accounts a
          ON a.user_id=u.id AND a.environment_id=u.environment_id WHERE u.id=NEW.user_id
          AND u.environment_id=NEW.environment_id AND u.enabled AND a.verified_at IS NOT NULL)
        OR NOT EXISTS(SELECT 1 FROM public.control_memberships m JOIN public.control_portfolios p
          ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
          WHERE m.user_id=NEW.user_id AND m.environment_id=NEW.environment_id AND m.enabled AND m.role='owner'
          AND m.organization_id=NEW.organization_id AND p.id=NEW.portfolio_id)
        THEN RAISE EXCEPTION 'admitted local pipeline model profile required' USING ERRCODE='23514';END IF;
      CASE TG_TABLE_NAME {branches} ELSE RAISE EXCEPTION 'invalid profile parent';END CASE;
      INSERT INTO public.{TABLE}(id,{OWNER},profile,source_revision,session_id,creation_job_id,discovery_job_id,guide_job_id)
      VALUES(gen_random_uuid()::text,NEW.user_id,NEW.organization_id,NEW.portfolio_id,NEW.environment_id,
        chosen,NEW.source_revision,NEW.session_id,creation_job_id,discovery_job_id,guide_job_id);
      RETURN NEW;END$$"""
    yield "REVOKE ALL ON FUNCTION control_pipeline_profile_capture() FROM PUBLIC"
    for table, _, _ in PARENTS.values():
        yield f"CREATE TRIGGER pipeline_model_profile_capture AFTER INSERT ON {table} FOR EACH ROW EXECUTE FUNCTION control_pipeline_profile_capture()"
    for kind, (parent, attempts, field) in PARENTS.items():
        legacy = "NEW.model IN('gpt-6-luna','gpt-6.1-sol')" if kind == "discovery" else (
            "(NEW.model='gpt-6-luna' OR (NEW.model='gpt-6.1-sol' AND NEW.role IN('critic','coordinator')))" )
        yield f"""CREATE FUNCTION control_{kind}_model_profile_fence() RETURNS TRIGGER LANGUAGE plpgsql
          SET search_path=pg_catalog,public AS $$DECLARE chosen VARCHAR;revision VARCHAR;parent_session VARCHAR;
          profile_revision VARCHAR;profile_session VARCHAR;BEGIN
          SELECT j.source_revision,j.session_id INTO revision,parent_session FROM public.{parent} j WHERE j.id=NEW.job_id
            AND j.user_id=NEW.user_id AND j.organization_id=NEW.organization_id AND j.portfolio_id=NEW.portfolio_id
            AND j.environment_id=NEW.environment_id;
          IF NOT FOUND THEN RAISE EXCEPTION 'current model profile parent required' USING ERRCODE='23514';END IF;
          SELECT p.profile,p.source_revision,p.session_id INTO chosen,profile_revision,profile_session
            FROM public.{TABLE} p WHERE p.{field}=NEW.job_id
            AND p.user_id=NEW.user_id AND p.organization_id=NEW.organization_id AND p.portfolio_id=NEW.portfolio_id
            AND p.environment_id=NEW.environment_id;
          IF (chosen IS NULL AND NOT {legacy}) OR (chosen IS NOT NULL AND
            (chosen<>'local_sol61_high_v1' OR NEW.model<>'gpt-6.1-sol' OR NEW.source_revision IS DISTINCT FROM revision
              OR profile_revision IS DISTINCT FROM revision OR profile_session IS DISTINCT FROM parent_session
              OR NOT (NEW.environment_id='local' OR NEW.environment_id LIKE 'test-%')))
            THEN RAISE EXCEPTION 'bound pipeline role model required' USING ERRCODE='23514';END IF;
          RETURN NEW;END$$"""
        yield f"REVOKE ALL ON FUNCTION control_{kind}_model_profile_fence() FROM PUBLIC"
        yield f"CREATE TRIGGER pipeline_model_attempt_fence BEFORE INSERT ON {attempts} FOR EACH ROW EXECUTE FUNCTION control_{kind}_model_profile_fence()"
        if kind != "discovery":
            yield f"ALTER TABLE {attempts} DROP CONSTRAINT {attempts}_review_model_check"
            yield f"ALTER TABLE {attempts} ADD CONSTRAINT {attempts}_review_model_check CHECK(model IN('gpt-6-luna','gpt-6.1-sol'))"
