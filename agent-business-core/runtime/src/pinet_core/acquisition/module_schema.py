"""Normal-core registration, separate from the immutable capture-v1 schema."""

TABLE = "acquisition_modules"
DDL = """CREATE TABLE acquisition_modules (
 business_id VARCHAR NOT NULL REFERENCES businesses(id), environment_id VARCHAR NOT NULL,
 organization_id VARCHAR NOT NULL, approved_by_user_id VARCHAR NOT NULL,
 site_id VARCHAR NOT NULL, adapter_id VARCHAR NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT FALSE, permissions JSONB NOT NULL CHECK(jsonb_typeof(permissions)='array'),
 source_revision VARCHAR NOT NULL CHECK(source_revision ~ '^[a-f0-9]{40}$'),
 approved_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>approved_at),
 PRIMARY KEY(business_id,environment_id),
 FOREIGN KEY(business_id,environment_id) REFERENCES control_business_grants(business_id,environment_id),
 FOREIGN KEY(approved_by_user_id,environment_id) REFERENCES control_users(id,environment_id),
 FOREIGN KEY(organization_id,environment_id) REFERENCES control_organizations(id,environment_id))"""

PIN_FUNCTION = """CREATE FUNCTION acquisition_pin_module(b VARCHAR,e VARCHAR,s VARCHAR,a VARCHAR)
 RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 BEGIN
 IF b IS DISTINCT FROM current_setting('pinet.acq_business_id',true)
 OR e IS DISTINCT FROM current_setting('pinet.acq_environment_id',true)
 OR s IS DISTINCT FROM current_setting('pinet.acq_site_id',true)
 OR a IS DISTINCT FROM current_setting('pinet.acq_adapter_id',true)
 OR current_setting('pinet.acq_environment_class',true) IS DISTINCT FROM 'test' THEN RETURN FALSE; END IF;
 PERFORM 1 FROM public.acquisition_modules m WHERE m.business_id=b AND m.environment_id=e
 AND m.site_id=s AND m.adapter_id=a FOR SHARE;
 RETURN FOUND;
 END $$"""


def grants_sql():
    return [
        f"REVOKE ALL ON {TABLE} FROM pinet_runtime",
        f"GRANT SELECT ON {TABLE} TO pinet_runtime",
        "REVOKE ALL ON FUNCTION acquisition_pin_module(VARCHAR,VARCHAR,VARCHAR,VARCHAR) FROM PUBLIC",
        "GRANT EXECUTE ON FUNCTION acquisition_pin_module(VARCHAR,VARCHAR,VARCHAR,VARCHAR) TO pinet_runtime",
    ]


def isolation_sql():
    owner = f"""{TABLE}.business_id=current_setting('pinet.business',true)
     AND {TABLE}.environment_id=current_setting('pinet.environment',true)
     AND EXISTS(SELECT 1 FROM control_business_grants g JOIN control_memberships m
       ON m.organization_id=g.organization_id AND m.environment_id=g.environment_id
       WHERE g.business_id={TABLE}.business_id AND g.environment_id={TABLE}.environment_id
       AND g.organization_id={TABLE}.organization_id AND g.enabled AND m.enabled AND m.role='owner'
       AND m.user_id=current_setting('pinet.control_user',true))"""
    native = " AND ".join(
        f"{TABLE}.{c}=current_setting('pinet.acq_{c}',true)"
        for c in ("business_id", "environment_id", "site_id", "adapter_id")
    )
    native += " AND current_setting('pinet.acq_environment_class',true)='test'"
    return [
        f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY",
        f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY",
        f"CREATE POLICY acquisition_module_scope ON {TABLE} FOR SELECT USING (({owner}) OR ({native}))",
        PIN_FUNCTION,
        *grants_sql(),
    ]
