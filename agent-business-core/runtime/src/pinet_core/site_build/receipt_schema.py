"""Additive forced RLS and independent current-authority insertion fence."""
TABLE = "control_site_foundation_receipts"
OWNER = "user_id,organization_id,portfolio_id,environment_id"


def statements():
    table = TABLE
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
    parents = ",".join(f"FOREIGN KEY({key},{OWNER}) REFERENCES {parent}(id,{OWNER}) ON DELETE CASCADE"
        for key, parent in (("creation_id", "control_creations"), ("approval_id", "control_business_build_approvals"),
                            ("revision_id", "control_creation_revisions")))
    return [f"""CREATE TABLE {table}(id VARCHAR PRIMARY KEY,{OWNER.replace(',', ' VARCHAR NOT NULL,')} VARCHAR NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,creation_id VARCHAR NOT NULL,approval_id VARCHAR NOT NULL,revision_id VARCHAR NOT NULL,
      accepted_revision INTEGER NOT NULL CHECK(accepted_revision BETWEEN 1 AND 20),session_id VARCHAR NOT NULL,
      idempotency_key VARCHAR NOT NULL,command VARCHAR NOT NULL CHECK(command IN('candidate','verify-local')),
      request_fingerprint VARCHAR NOT NULL CHECK(request_fingerprint~'^[a-f0-9]{{64}}$'),
      scope_sha256 VARCHAR NOT NULL CHECK(scope_sha256~'^[a-f0-9]{{64}}$'),observation_sha256 VARCHAR NOT NULL CHECK(observation_sha256~'^[a-f0-9]{{64}}$'),
      state VARCHAR NOT NULL CHECK(state IN('blocked','candidate','verified-local')),
      scope JSONB NOT NULL CHECK(jsonb_typeof(scope)='object' AND octet_length(scope::text)<=262144),
      observation JSONB NOT NULL CHECK(jsonb_typeof(observation)='object' AND octet_length(observation::text)<=1048576),
      CHECK(coalesce((scope ?& ARRAY['creation_id','approval_id','session_id','user_id','organization_id','portfolio_id','environment_id','accepted','approval_fingerprint']
        AND jsonb_typeof(scope->'accepted')='object'
        AND scope->'accepted' ?& ARRAY['revision_id','accepted_revision','candidate_sha256','accepted_source_revision']),false)),
      CHECK(coalesce(observation ?& ARRAY['state','scope_sha256','version','admission','deployment','channel_activation','calibration_status'],false)),
      UNIQUE(id,{OWNER}),CONSTRAINT uq_foundation_receipt_request UNIQUE(user_id,environment_id,idempotency_key),{parents},
      CONSTRAINT fk_foundation_receipt_session FOREIGN KEY(session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT,
      CHECK(coalesce((scope->>'creation_id'=creation_id AND scope->>'approval_id'=approval_id AND scope->>'session_id'=session_id
        AND scope->>'user_id'=user_id AND scope->>'organization_id'=organization_id AND scope->>'portfolio_id'=portfolio_id
        AND scope->>'environment_id'=environment_id AND scope->'accepted'->>'revision_id'=revision_id
        AND (scope->'accepted'->>'accepted_revision')::INTEGER=accepted_revision),false)),
      CHECK(coalesce((observation->>'state'=state AND observation->>'scope_sha256'=scope_sha256
        AND observation->>'version'='native-foundation-evidence.v1' AND observation->>'admission'='not_performed'
        AND observation->>'deployment'='not_performed' AND observation->>'channel_activation'='not_performed'
        AND observation->>'calibration_status'='UNVERIFIED'),false)))""",
      f"CREATE INDEX ix_foundation_receipt_history ON {table}(creation_id,created_at DESC,id)",
      f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
      f"CREATE POLICY foundation_receipt_scope ON {table} USING({condition}) WITH CHECK({condition})",
      f"REVOKE ALL ON {table} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {table} TO pinet_runtime",
      """CREATE FUNCTION control_foundation_receipt_immutable() RETURNS TRIGGER LANGUAGE plpgsql
        SET search_path=pg_catalog,public AS $$BEGIN RAISE EXCEPTION 'immutable foundation receipt' USING ERRCODE='23514';END$$""",
      "REVOKE ALL ON FUNCTION control_foundation_receipt_immutable() FROM PUBLIC",
      f"CREATE TRIGGER foundation_receipt_immutable BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION control_foundation_receipt_immutable()",
      """CREATE FUNCTION control_foundation_receipt_fence() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
        DECLARE c public.control_creations%ROWTYPE;a public.control_business_build_approvals%ROWTYPE;r public.control_creation_revisions%ROWTYPE;
        BEGIN
        IF NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id
          AND s.environment_id=NEW.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp())
          OR NOT EXISTS(SELECT 1 FROM public.control_users u WHERE u.id=NEW.user_id AND u.environment_id=NEW.environment_id AND u.enabled)
          THEN RAISE EXCEPTION 'current foundation actor required' USING ERRCODE='23514';END IF;
        SELECT * INTO c FROM public.control_creations WHERE id=NEW.creation_id AND user_id=NEW.user_id
          AND organization_id=NEW.organization_id AND portfolio_id=NEW.portfolio_id AND environment_id=NEW.environment_id;
        IF NOT FOUND OR c.current_revision<>NEW.accepted_revision OR c.status<>'draft_ready' OR c.active_job_id IS NOT NULL
          OR EXISTS(SELECT 1 FROM public.control_creation_archives x WHERE x.creation_id=c.id AND x.environment_id=c.environment_id)
          THEN RAISE EXCEPTION 'current foundation revision required' USING ERRCODE='23514';END IF;
        SELECT * INTO a FROM public.control_business_build_approvals WHERE id=NEW.approval_id;
        IF NOT FOUND OR a.creation_id<>c.id OR a.fingerprint IS DISTINCT FROM (NEW.scope->>'approval_fingerprint')
          THEN RAISE EXCEPTION 'exact foundation approval required' USING ERRCODE='23514';END IF;
        SELECT * INTO r FROM public.control_creation_revisions WHERE id=NEW.revision_id;
        IF NOT FOUND OR r.creation_id<>c.id OR r.sequence<>NEW.accepted_revision
          OR r.material_hash IS DISTINCT FROM (NEW.scope->'accepted'->>'candidate_sha256')
          OR r.source_revision IS DISTINCT FROM (NEW.scope->'accepted'->>'accepted_source_revision')
          THEN RAISE EXCEPTION 'exact foundation native proof required' USING ERRCODE='23514';END IF;
        RETURN NEW;END$$""",
      "REVOKE ALL ON FUNCTION control_foundation_receipt_fence() FROM PUBLIC",
      f"CREATE CONSTRAINT TRIGGER foundation_receipt_fence AFTER INSERT ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_foundation_receipt_fence()"]
