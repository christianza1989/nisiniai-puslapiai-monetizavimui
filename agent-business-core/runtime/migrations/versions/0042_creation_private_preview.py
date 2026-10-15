"""Explicit private host bindings and append-only native intake recovery receipts."""
from alembic import op

revision = "0042_creation_private_preview"
down_revision = "0041_workspace_agent_episode"
REQUESTS = "control_creation_private_intake_requests"
RECEIPTS = "control_creation_private_intake_receipts"
OWNER = "user_id,organization_id,portfolio_id,environment_id"


def statements():
    owner_columns = OWNER.replace(",", " VARCHAR NOT NULL,") + " VARCHAR NOT NULL"
    sql = [f"""CREATE TABLE {REQUESTS}(id VARCHAR PRIMARY KEY,{owner_columns},created_at TIMESTAMPTZ NOT NULL,
      creation_id VARCHAR NOT NULL,revision_id VARCHAR NOT NULL,accepted_revision INTEGER NOT NULL
        CHECK(accepted_revision BETWEEN 1 AND 20),session_id VARCHAR NOT NULL,idempotency_key VARCHAR NOT NULL,
      request_fingerprint VARCHAR NOT NULL CHECK(request_fingerprint~'^[a-f0-9]{{64}}$'),
      context_sha256 VARCHAR NOT NULL CHECK(context_sha256~'^[a-f0-9]{{64}}$'),
      context JSONB NOT NULL CHECK(jsonb_typeof(context)='object' AND octet_length(context::text)<=262144),
      run_id VARCHAR NOT NULL,lease_until TIMESTAMPTZ NOT NULL,
      UNIQUE(id,{OWNER}),UNIQUE(user_id,environment_id,idempotency_key),
      FOREIGN KEY(creation_id,{OWNER}) REFERENCES control_creations(id,{OWNER}) ON DELETE RESTRICT,
      FOREIGN KEY(revision_id,{OWNER}) REFERENCES control_creation_revisions(id,{OWNER}) ON DELETE RESTRICT,
      CONSTRAINT fk_private_intake_session FOREIGN KEY(session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT,
      CHECK(coalesce(context->>'version'='creation-private-intake-binding.v1'
        AND context ?& ARRAY['accepted','source_context','creation_source_revision','native_host','source_revision','native_sources']
        AND context->>'creation_id'=creation_id AND context->>'session_id'=session_id
        AND context->>'user_id'=user_id AND context->>'organization_id'=organization_id
        AND context->>'portfolio_id'=portfolio_id AND context->>'environment_id'=environment_id
        AND context->'accepted'->>'revision_id'=revision_id
        AND (context->'accepted'->>'accepted_revision')::INTEGER=accepted_revision
        AND context->'accepted'->>'candidate_sha256'~'^[a-f0-9]{{64}}$'
        AND context->'accepted'->>'accepted_source_revision'~'^[a-f0-9]{{40}}$'
        AND context->'accepted'->>'coordinator_sha256'~'^[a-f0-9]{{64}}$'
        AND context->>'source_revision'~'^[a-f0-9]{{40}}$'
        AND context->>'native_host'=replace(creation_id,'-','')||'.preview.invalid',false)))""",
      f"CREATE INDEX ix_private_intake_history ON {REQUESTS}(creation_id,created_at DESC,id)",
      f"""CREATE TABLE {RECEIPTS}(id VARCHAR PRIMARY KEY,{owner_columns},created_at TIMESTAMPTZ NOT NULL,
        recovery_id VARCHAR NOT NULL UNIQUE,run_id VARCHAR NOT NULL,state VARCHAR NOT NULL
          CHECK(state IN('private_draft_imported','failed')),failure_code VARCHAR,
        intake JSONB,intake_sha256 VARCHAR NOT NULL CHECK(intake_sha256~'^[a-f0-9]{{64}}$'),
        FOREIGN KEY(recovery_id,{OWNER}) REFERENCES {REQUESTS}(id,{OWNER}) ON DELETE RESTRICT,
        CHECK((state='failed' AND failure_code~'^[a-z0-9_]{{1,80}}$' AND intake IS NULL)
          OR (state='private_draft_imported' AND failure_code IS NULL AND intake IS NOT NULL
            AND jsonb_typeof(intake)='object' AND octet_length(intake::text)<=1048576)))"""]
    for table in (REQUESTS, RECEIPTS):
        # RLS denies foreign scope; deferred fences below additionally observe current actor/revision at commit.
        condition = f"""{table}.environment_id=current_setting('pinet.environment',true)
          AND ({table}.environment_id='local' OR {table}.environment_id LIKE 'test-%')
          AND {table}.user_id=current_setting('pinet.control_user',true)
          AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
            ON a.user_id=u.id AND a.environment_id=u.environment_id
            WHERE u.id={table}.user_id AND u.environment_id={table}.environment_id AND u.enabled AND a.verified_at IS NOT NULL)
          AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
            ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
            WHERE m.user_id={table}.user_id AND m.environment_id={table}.environment_id
            AND m.organization_id={table}.organization_id AND m.enabled AND m.role='owner' AND p.id={table}.portfolio_id)"""
        sql.extend([f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
            f"CREATE POLICY private_intake_scope ON {table} USING({condition}) WITH CHECK({condition})",
            f"REVOKE ALL ON {table} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {table} TO pinet_runtime"])
    sql.extend([f"GRANT UPDATE(run_id,lease_until) ON {REQUESTS} TO pinet_runtime",
      f"""CREATE FUNCTION control_private_intake_request_immutable() RETURNS TRIGGER LANGUAGE plpgsql
      SET search_path=pg_catalog,public AS $$BEGIN
        IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['run_id','lease_until']) IS DISTINCT FROM
          (to_jsonb(OLD)-ARRAY['run_id','lease_until']) OR EXISTS(SELECT 1 FROM public.{RECEIPTS} WHERE recovery_id=OLD.id)
          OR OLD.lease_until>clock_timestamp() THEN
          RAISE EXCEPTION 'immutable private intake binding' USING ERRCODE='23514';END IF;
        RETURN NEW;END$$""",
      "REVOKE ALL ON FUNCTION control_private_intake_request_immutable() FROM PUBLIC",
      f"CREATE TRIGGER private_intake_request_immutable BEFORE UPDATE OR DELETE ON {REQUESTS} FOR EACH ROW EXECUTE FUNCTION control_private_intake_request_immutable()",
      """CREATE FUNCTION control_private_intake_receipt_immutable() RETURNS TRIGGER LANGUAGE plpgsql
      SET search_path=pg_catalog,public AS $$BEGIN RAISE EXCEPTION 'immutable private intake receipt' USING ERRCODE='23514';END$$""",
      "REVOKE ALL ON FUNCTION control_private_intake_receipt_immutable() FROM PUBLIC",
      f"CREATE TRIGGER private_intake_receipt_immutable BEFORE UPDATE OR DELETE ON {RECEIPTS} FOR EACH ROW EXECUTE FUNCTION control_private_intake_receipt_immutable()",
      f"""CREATE FUNCTION control_private_intake_fence() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
      DECLARE b public.{REQUESTS}%ROWTYPE;c public.control_creations%ROWTYPE;r public.control_creation_revisions%ROWTYPE;
      BEGIN
        IF TG_TABLE_NAME='{REQUESTS}' THEN b:=NEW;
        ELSE SELECT * INTO b FROM public.{REQUESTS} WHERE id=NEW.recovery_id FOR SHARE;
          IF NOT FOUND OR NEW.run_id<>b.run_id OR NEW.user_id<>b.user_id OR NEW.environment_id<>b.environment_id
            OR NEW.organization_id<>b.organization_id OR NEW.portfolio_id<>b.portfolio_id THEN
            RAISE EXCEPTION 'exact private intake execution required' USING ERRCODE='23514';END IF;
          IF NEW.state='private_draft_imported' AND NOT coalesce(NEW.intake->>'version'='customer-content-intake.v1'
            AND NEW.intake->>'state'='private-draft-imported' AND NEW.intake->>'creationId'=b.creation_id
            AND (NEW.intake->>'acceptedRevision')::INTEGER=b.accepted_revision
            AND NEW.intake->>'sourceHash'=b.context->'accepted'->>'candidate_sha256'
            AND NEW.intake->>'canonicalHost'=b.context->>'native_host'
            AND NEW.intake->>'fullF1'='UNVERIFIED' AND NEW.intake->>'launch'='UNVERIFIED'
            AND NEW.intake->>'deployment'='not-performed',false) THEN
            RAISE EXCEPTION 'exact private native receipt required' USING ERRCODE='23514';END IF;
        END IF;
        -- Hold actor/owner rows through this commit, including a concurrent revocation.
        PERFORM 1 FROM public.control_sessions s JOIN public.control_users u
          ON u.id=s.user_id AND u.environment_id=s.environment_id
          JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id
          WHERE s.id=b.session_id AND s.user_id=b.user_id AND s.environment_id=b.environment_id FOR SHARE OF s,u,a;
        PERFORM 1 FROM public.control_memberships m JOIN public.control_portfolios p
          ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
          WHERE m.user_id=b.user_id AND m.organization_id=b.organization_id AND m.environment_id=b.environment_id
          AND p.id=b.portfolio_id FOR SHARE OF m,p;
        IF b.lease_until<=clock_timestamp() OR b.lease_until>clock_timestamp()+INTERVAL '100 seconds'
          OR b.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
          OR b.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
          OR NOT EXISTS(SELECT 1 FROM public.control_sessions s JOIN public.control_users u
            ON u.id=s.user_id AND u.environment_id=s.environment_id
            JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id
            WHERE s.id=b.session_id AND s.user_id=b.user_id AND s.environment_id=b.environment_id
            AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND u.enabled AND a.verified_at IS NOT NULL)
          OR NOT EXISTS(SELECT 1 FROM public.control_memberships m JOIN public.control_portfolios p
            ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
            WHERE m.user_id=b.user_id AND m.organization_id=b.organization_id AND m.environment_id=b.environment_id
            AND m.enabled AND m.role='owner' AND p.id=b.portfolio_id) THEN
          RAISE EXCEPTION 'current private intake actor required' USING ERRCODE='23514';END IF;
        SELECT * INTO c FROM public.control_creations WHERE id=b.creation_id AND user_id=b.user_id
          AND organization_id=b.organization_id AND portfolio_id=b.portfolio_id AND environment_id=b.environment_id FOR SHARE;
        IF NOT FOUND OR c.current_revision<>b.accepted_revision OR c.status<>'draft_ready' OR c.active_job_id IS NOT NULL
          OR c.canonical_host IS NOT NULL OR c.source_revision IS DISTINCT FROM (b.context->>'creation_source_revision')
          OR EXISTS(SELECT 1 FROM public.control_creation_archives x WHERE x.creation_id=c.id AND x.environment_id=c.environment_id)
          THEN RAISE EXCEPTION 'current private intake revision required' USING ERRCODE='23514';END IF;
        SELECT * INTO r FROM public.control_creation_revisions WHERE id=b.revision_id;
        IF NOT FOUND OR r.creation_id<>c.id OR r.sequence<>b.accepted_revision
          OR r.material_hash IS DISTINCT FROM (b.context->'accepted'->>'candidate_sha256')
          OR r.source_revision IS DISTINCT FROM (b.context->'accepted'->>'accepted_source_revision')
          OR NOT EXISTS(SELECT 1 FROM public.control_creation_jobs j WHERE j.id=r.job_id AND j.status='succeeded'
            AND j.creation_id=c.id AND j.user_id=b.user_id AND j.environment_id=b.environment_id)
          OR NOT EXISTS(SELECT 1 FROM public.control_creation_team_events e
            WHERE e.id=b.context->'accepted'->>'coordinator_event_id' AND e.creation_id=c.id AND e.job_id=r.job_id
            AND e.state='succeeded' AND e.payload->>'decision'='accept_draft'
            AND e.payload->>'candidate_sha256'=r.material_hash) THEN
          RAISE EXCEPTION 'exact accepted private material required' USING ERRCODE='23514';END IF;
        RETURN NEW;END$$""",
      "REVOKE ALL ON FUNCTION control_private_intake_fence() FROM PUBLIC",
      f"CREATE CONSTRAINT TRIGGER private_intake_request_fence AFTER INSERT OR UPDATE ON {REQUESTS} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_private_intake_fence()",
      f"CREATE CONSTRAINT TRIGGER private_intake_receipt_fence AFTER INSERT ON {RECEIPTS} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_private_intake_fence()"])
    return sql


def upgrade():
    for sql in statements():
        op.execute(sql)


def downgrade():
    if op.get_bind().exec_driver_sql(f"SELECT EXISTS(SELECT 1 FROM {REQUESTS})").scalar():
        raise RuntimeError("Retained private intake history requires explicit preservation")
    op.execute(f"DROP TABLE {RECEIPTS}")
    op.execute(f"DROP TABLE {REQUESTS}")
    for function in ("control_private_intake_fence", "control_private_intake_receipt_immutable", "control_private_intake_request_immutable"):
        op.execute(f"DROP FUNCTION {function}()")
