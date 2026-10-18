"""Additive SQL for Root's composed migration; importing never installs a schema."""
from .models import CONFIG_KEYS, EXACT_KEYS, NATIVE_KEYS, TABLE
from .service import MATERIAL_KEYS


def canonical_sql():
    # This payload has strings/null/arrays/objects and one integer sequence. Its
    # UTF-8 JSON representation matches creation.service.digest, including keys.
    return """CREATE FUNCTION business_source_json_canonical(j JSONB) RETURNS TEXT
      LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=pg_catalog,public AS $$DECLARE v TEXT;BEGIN
      CASE jsonb_typeof(j)
      WHEN 'object' THEN SELECT '{'||coalesce(string_agg(to_jsonb(key)::text||':'||
        public.business_source_json_canonical(value),',' ORDER BY key COLLATE "C"),'')||'}' INTO v FROM jsonb_each(j);
      WHEN 'array' THEN SELECT '['||coalesce(string_agg(public.business_source_json_canonical(value),','
        ORDER BY ordinal),'')||']' INTO v FROM jsonb_array_elements(j) WITH ORDINALITY a(value,ordinal);
      ELSE v=j::text;END CASE;RETURN v;END$$"""


def payload_sql():
    return r"""CREATE FUNCTION business_source_payload_valid(j JSONB) RETURNS BOOLEAN
      LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public AS $$DECLARE f JSONB;v TEXT;BEGIN
      IF j IS NULL OR jsonb_typeof(j)<>'object' OR octet_length(j::text)>32768
        OR j-ARRAY['version','external_revision','artifact_ref','artifact_sha256','knowledge_sha256',
          'profile_sha256','review_evidence_refs','facts']<>'{}'::jsonb
        OR NOT j ?& ARRAY['version','external_revision','artifact_ref','artifact_sha256','knowledge_sha256',
          'profile_sha256','review_evidence_refs','facts']
        OR j->>'version' IS DISTINCT FROM 'external-business-source.v1' THEN RETURN FALSE;END IF;
      FOREACH v IN ARRAY ARRAY['external_revision','artifact_ref','artifact_sha256','knowledge_sha256'] LOOP
        IF jsonb_typeof(j->v) IS DISTINCT FROM 'string' THEN RETURN FALSE;END IF;
      END LOOP;
      IF length(j->>'external_revision') NOT BETWEEN 1 AND 200 OR length(j->>'artifact_ref') NOT BETWEEN 1 AND 1024
        OR j->>'artifact_sha256' !~ '^[a-f0-9]{64}$' OR j->>'knowledge_sha256' !~ '^[a-f0-9]{64}$'
        OR NOT(j->'profile_sha256'='null'::jsonb OR(jsonb_typeof(j->'profile_sha256')='string'
          AND j->>'profile_sha256' ~ '^[a-f0-9]{64}$'))
        OR jsonb_typeof(j->'review_evidence_refs') IS DISTINCT FROM 'array'
        OR jsonb_typeof(j->'facts') IS DISTINCT FROM 'array' THEN RETURN FALSE;END IF;
      IF jsonb_array_length(j->'review_evidence_refs') NOT BETWEEN 1 AND 12
        OR jsonb_array_length(j->'facts')>40 THEN RETURN FALSE;END IF;
      FOR f IN SELECT value FROM jsonb_array_elements(j->'review_evidence_refs') LOOP
        IF jsonb_typeof(f)<>'string' OR length(f#>>'{}') NOT BETWEEN 1 AND 1024 THEN RETURN FALSE;END IF;
      END LOOP;
      IF(SELECT count(*)<>count(DISTINCT value) FROM jsonb_array_elements(j->'review_evidence_refs'))
        THEN RETURN FALSE;END IF;
      FOR f IN SELECT value FROM jsonb_array_elements(j->'facts') LOOP
        IF jsonb_typeof(f)<>'object' OR f-ARRAY['id','text','source_ref']<>'{}'::jsonb
          OR NOT f ?& ARRAY['id','text','source_ref'] OR jsonb_typeof(f->'id') IS DISTINCT FROM 'string'
          OR jsonb_typeof(f->'text') IS DISTINCT FROM 'string' OR jsonb_typeof(f->'source_ref') IS DISTINCT FROM 'string'
          OR f->>'id' !~ '^[a-zA-Z0-9_-]{1,80}$' OR length(f->>'text') NOT BETWEEN 3 AND 2000
          OR length(f->>'source_ref') NOT BETWEEN 1 AND 1024 THEN RETURN FALSE;END IF;
      END LOOP;
      IF(SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(j->'facts'))
        THEN RETURN FALSE;END IF;
      FOR v IN SELECT value#>>'{}' FROM jsonb_path_query(j,'strict $.** ? (@.type() == "string")') LOOP
        IF v !~ '[^[:space:]]' OR v ~ E'[\x01-\x08\x0B-\x1F\x7F]' THEN RETURN FALSE;END IF;
      END LOOP;RETURN TRUE;END$$"""


def fingerprint_sql():
    pairs = []
    for key in MATERIAL_KEYS:
        expression = f"j->'{key}'"
        if key in ("reviewed_at", "expires_at"):
            expression = (f"to_jsonb(to_char((j->>'{key}')::timestamptz AT TIME ZONE 'UTC',"
                "'YYYY-MM-DD\"T\"HH24:MI:SS.US')||'+00:00')")
        pairs += [f"'{key}',{expression}"]
    return f"""CREATE FUNCTION business_source_fingerprint(j JSONB) RETURNS TEXT
      LANGUAGE SQL IMMUTABLE STRICT SET search_path=pg_catalog,public AS $$
      SELECT encode(sha256(convert_to(public.business_source_json_canonical(jsonb_build_object(
        {','.join(pairs)})),'UTF8')),'hex')$$"""


def table_sql():
    unique = ",\n".join(f"CONSTRAINT {name} UNIQUE({','.join(keys)})" for name, keys in (
        ("uq_business_source_binding_identity", EXACT_KEYS),
        ("uq_business_source_config_identity", CONFIG_KEYS),
        ("uq_business_source_native_identity", NATIVE_KEYS)))
    return f"""CREATE TABLE {TABLE}(
      id VARCHAR PRIMARY KEY CHECK(id~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$'),
      user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,
      environment_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,
      site_id VARCHAR NOT NULL,canonical_host VARCHAR NOT NULL,
      sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 2147483647),
      payload JSONB NOT NULL CHECK(public.business_source_payload_valid(payload)),
      source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
      authorizing_session_id VARCHAR NOT NULL,request_id VARCHAR NOT NULL
        CHECK(request_id~'^[a-f0-9]{{8}}(-[a-f0-9]{{4}}){{3}}-[a-f0-9]{{12}}$'),
      request_fingerprint VARCHAR NOT NULL CHECK(request_fingerprint~'^[a-f0-9]{{64}}$'),
      fingerprint VARCHAR NOT NULL CHECK(fingerprint~'^[a-f0-9]{{64}}$'),
      reviewed_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
      CHECK(isfinite(reviewed_at) AND isfinite(expires_at) AND created_at=reviewed_at
        AND expires_at>=reviewed_at+INTERVAL '30 seconds' AND expires_at<=reviewed_at+INTERVAL '30 days'),
      CHECK(revoked_at IS NULL OR(isfinite(revoked_at) AND revoked_at>=reviewed_at)),
      UNIQUE(id,user_id,organization_id,portfolio_id,environment_id),{unique},
      CONSTRAINT uq_business_source_request UNIQUE(user_id,environment_id,request_id),
      CONSTRAINT uq_business_source_sequence UNIQUE(user_id,organization_id,portfolio_id,environment_id,business_id,sequence),
      FOREIGN KEY(business_id,site_id,canonical_host) REFERENCES businesses(id,site_id,canonical_host) ON DELETE RESTRICT,
      FOREIGN KEY(grant_id,business_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_business_grants(id,business_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(authorizing_session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)"""


def owner_predicate():
    return f"""{TABLE}.user_id=current_setting('pinet.control_user',true)
      AND {TABLE}.environment_id=current_setting('pinet.environment',true)
      AND EXISTS(SELECT 1 FROM public.control_business_grants g
        JOIN public.control_memberships m ON m.organization_id=g.organization_id AND m.environment_id=g.environment_id
        JOIN public.control_users u ON u.id=m.user_id AND u.environment_id=m.environment_id
        JOIN public.control_customer_accounts a ON a.user_id=u.id AND a.environment_id=u.environment_id
        WHERE g.id={TABLE}.grant_id AND g.business_id={TABLE}.business_id
        AND g.organization_id={TABLE}.organization_id AND g.portfolio_id={TABLE}.portfolio_id
        AND g.environment_id={TABLE}.environment_id AND g.enabled AND m.user_id={TABLE}.user_id
        AND m.enabled AND m.role='owner' AND u.enabled AND a.verified_at IS NOT NULL)"""


def authority_sql():
    return ["""CREATE FUNCTION business_source_grant_pin(bid VARCHAR) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE g public.control_business_grants%ROWTYPE;uid TEXT;env TEXT;BEGIN
      uid=current_setting('pinet.control_user',true);env=current_setting('pinet.environment',true);
      IF uid IS NULL OR uid='' OR env IS NULL OR env='' THEN RETURN FALSE;END IF;
      SELECT * INTO g FROM public.control_business_grants WHERE business_id=bid AND environment_id=env;
      IF NOT FOUND OR NOT g.enabled THEN RETURN FALSE;END IF;
      PERFORM 1 FROM public.control_users u JOIN public.control_customer_accounts a
        ON a.user_id=u.id AND a.environment_id=u.environment_id WHERE u.id=uid AND u.environment_id=env
        AND u.enabled AND a.verified_at IS NOT NULL FOR SHARE OF a;
      IF NOT FOUND THEN RETURN FALSE;END IF;
      PERFORM 1 FROM public.control_memberships m WHERE m.user_id=uid AND m.environment_id=env
        AND m.organization_id=g.organization_id AND m.enabled AND m.role='owner' FOR SHARE;
      IF NOT FOUND THEN RETURN FALSE;END IF;
      PERFORM 1 FROM public.control_portfolios p WHERE p.id=g.portfolio_id AND p.organization_id=g.organization_id
        AND p.environment_id=env FOR SHARE;
      IF NOT FOUND THEN RETURN FALSE;END IF;
      PERFORM 1 FROM public.businesses WHERE id=bid FOR SHARE;
      IF NOT FOUND THEN RETURN FALSE;END IF;
      PERFORM 1 FROM public.control_business_grants WHERE id=g.id AND business_id=bid AND environment_id=env
        AND organization_id=g.organization_id AND portfolio_id=g.portfolio_id AND enabled FOR SHARE;
      RETURN FOUND;END$$""",
      f"""CREATE FUNCTION business_source_binding_pin(aid VARCHAR,require_current BOOLEAN) RETURNS BOOLEAN
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      DECLARE b public.{TABLE}%ROWTYPE;latest INTEGER;now_at TIMESTAMPTZ;BEGIN
      SELECT * INTO b FROM public.{TABLE} WHERE id=aid;
      IF NOT FOUND OR b.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR b.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        OR require_current IS NULL THEN RETURN FALSE;END IF;
      IF NOT public.business_source_grant_pin(b.business_id) THEN RETURN FALSE;END IF;
      SELECT * INTO b FROM public.{TABLE} WHERE id=aid FOR SHARE;
      IF NOT EXISTS(SELECT 1 FROM public.control_business_grants g JOIN public.businesses s ON s.id=g.business_id
        WHERE g.id=b.grant_id AND g.business_id=b.business_id AND g.organization_id=b.organization_id
        AND g.portfolio_id=b.portfolio_id AND g.environment_id=b.environment_id AND g.enabled
        AND s.site_id=b.site_id AND s.canonical_host=b.canonical_host)
        OR NOT public.business_source_payload_valid(b.payload)
        OR b.fingerprint IS DISTINCT FROM public.business_source_fingerprint(to_jsonb(b)) THEN RETURN FALSE;END IF;
      IF NOT require_current THEN RETURN TRUE;END IF;
      SELECT max(sequence) INTO latest FROM public.{TABLE} WHERE user_id=b.user_id
        AND organization_id=b.organization_id AND portfolio_id=b.portfolio_id AND environment_id=b.environment_id
        AND business_id=b.business_id;
      now_at=clock_timestamp();RETURN coalesce(b.sequence=latest AND b.revoked_at IS NULL
        AND b.reviewed_at<=now_at AND b.expires_at>now_at,FALSE);END$$""",
      """CREATE FUNCTION business_source_binding_current(aid VARCHAR) RETURNS BOOLEAN
      LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog,public AS $$
      SELECT public.business_source_binding_pin(aid,true)$$"""]


def trigger_sql():
    return f"""CREATE FUNCTION business_source_binding_fence() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$DECLARE n INTEGER;BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'source history is retained' USING ERRCODE='23514';END IF;
      IF TG_OP='UPDATE' THEN
        IF(to_jsonb(NEW)-'revoked_at') IS DISTINCT FROM(to_jsonb(OLD)-'revoked_at')
          OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_at>clock_timestamp() THEN
          RAISE EXCEPTION 'source versions are immutable' USING ERRCODE='23514';END IF;RETURN NEW;
      END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended('business-source:'||NEW.environment_id||':'||NEW.business_id,0));
      IF NEW.user_id IS DISTINCT FROM current_setting('pinet.control_user',true)
        OR NEW.environment_id IS DISTINCT FROM current_setting('pinet.environment',true)
        OR NOT public.business_source_grant_pin(NEW.business_id)
        OR NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=NEW.authorizing_session_id
          AND s.user_id=NEW.user_id AND s.environment_id=NEW.environment_id AND s.revoked_at IS NULL
          AND s.expires_at>clock_timestamp()) THEN
        RAISE EXCEPTION 'current reviewed owner is required' USING ERRCODE='23514';END IF;
      SELECT coalesce(max(sequence),0)+1 INTO n FROM public.{TABLE} WHERE user_id=NEW.user_id
        AND organization_id=NEW.organization_id AND portfolio_id=NEW.portfolio_id
        AND environment_id=NEW.environment_id AND business_id=NEW.business_id;
      IF NEW.sequence<>n OR NEW.reviewed_at>clock_timestamp() OR NEW.revoked_at IS NOT NULL
        OR NEW.fingerprint IS DISTINCT FROM public.business_source_fingerprint(to_jsonb(NEW)) THEN
        RAISE EXCEPTION 'exact append-only source version required' USING ERRCODE='23514';END IF;
      RETURN NEW;END$$"""


def upgrade_sql():
    """Only migration owner calls this, once; no broad grants or old-row updates."""
    statements = [canonical_sql(), payload_sql(), fingerprint_sql(), table_sql(), *authority_sql(), trigger_sql(),
        f"CREATE TRIGGER business_source_binding_fence BEFORE INSERT OR UPDATE OR DELETE ON {TABLE} "
        "FOR EACH ROW EXECUTE FUNCTION business_source_binding_fence()",
        f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
        f"CREATE POLICY business_source_owned ON {TABLE} USING({owner_predicate()})",
        f"REVOKE ALL ON {TABLE} FROM PUBLIC,pinet_runtime", f"GRANT SELECT ON {TABLE} TO pinet_runtime"]
    internal = ("business_source_json_canonical(jsonb)", "business_source_payload_valid(jsonb)",
        "business_source_fingerprint(jsonb)", "business_source_binding_fence()")
    public = ("business_source_grant_pin(varchar)", "business_source_binding_pin(varchar,boolean)",
        "business_source_binding_current(varchar)")
    statements += [f"REVOKE ALL ON FUNCTION {signature} FROM PUBLIC,pinet_runtime" for signature in (*internal, *public)]
    statements += [f"GRANT EXECUTE ON FUNCTION {signature} TO pinet_runtime" for signature in public]
    return statements
