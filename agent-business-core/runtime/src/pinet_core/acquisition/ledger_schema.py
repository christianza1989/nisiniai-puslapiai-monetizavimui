"""Shared DDL for the reserved migration and isolated PostgreSQL acceptance."""
TABLES = ('acquisition_campaigns', 'acquisition_invitations', 'acquisition_challenges', 'acquisition_receipts')
SCOPE = '''business_id VARCHAR NOT NULL REFERENCES businesses(id), environment_id VARCHAR NOT NULL,
 site_id VARCHAR NOT NULL, environment_class VARCHAR NOT NULL CHECK(environment_class IN ('test','production')),
 adapter_id VARCHAR NOT NULL'''
KEY = 'business_id,environment_id,site_id,environment_class,adapter_id'
DDL = (
    f'''CREATE TABLE acquisition_campaigns ({SCOPE}, campaign_id VARCHAR NOT NULL, stopped BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY({KEY},campaign_id))''',
    f'''CREATE TABLE acquisition_invitations ({SCOPE}, invitation_ref VARCHAR NOT NULL,
    campaign_id VARCHAR NOT NULL, prospect_id VARCHAR NOT NULL, offer_revision VARCHAR NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>issued_at),
    canonical_recipient TEXT, canonical_source VARCHAR NOT NULL, address_rule VARCHAR NOT NULL,
    recipient_key_id VARCHAR NOT NULL, native_account_ref VARCHAR, bound_at TIMESTAMPTZ, provider_ref VARCHAR,
    conversion JSONB, retired_at TIMESTAMPTZ, retired_account_hash VARCHAR,
    PRIMARY KEY({KEY},invitation_ref), UNIQUE({KEY},provider_ref),
    FOREIGN KEY({KEY},campaign_id) REFERENCES acquisition_campaigns({KEY},campaign_id))''',
    f'''CREATE TABLE acquisition_challenges ({SCOPE}, challenge_nonce VARCHAR NOT NULL,
    invitation_ref VARCHAR NOT NULL, recipient_key_id VARCHAR NOT NULL, address_rule VARCHAR NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL CHECK(expires_at>issued_at),
    consumed_at TIMESTAMPTZ, PRIMARY KEY({KEY},challenge_nonce),
    FOREIGN KEY({KEY},invitation_ref) REFERENCES acquisition_invitations({KEY},invitation_ref))''',
    f'''CREATE TABLE acquisition_receipts ({SCOPE}, operation VARCHAR NOT NULL, request_id VARCHAR NOT NULL,
    invitation_ref VARCHAR NOT NULL, body_sha256 VARCHAR NOT NULL, response_body TEXT NOT NULL,
    status_code INTEGER NOT NULL CHECK(status_code BETWEEN 200 AND 499), created_at TIMESTAMPTZ NOT NULL,
    provider_ref VARCHAR, source_revision INTEGER CHECK(source_revision>0),
    PRIMARY KEY({KEY},operation,request_id), UNIQUE({KEY},provider_ref,source_revision))''',
)


def runtime_grants_sql():
    """Restore module-owned privileges, including already broadened bootstrap grants.

    Run only for the complete acquisition schema through the trusted migration or
    bootstrap owner. Does not create tables/policies or authorize an application.
    """
    statements = []
    for table in TABLES:
        privileges = 'SELECT,INSERT' if table == 'acquisition_receipts' else 'SELECT,INSERT,UPDATE'
        statements.extend((f'REVOKE ALL ON {table} FROM pinet_runtime',
                           f'GRANT {privileges} ON {table} TO pinet_runtime'))
    return statements


def isolation_sql():
    statements = []
    for table in TABLES:
        predicate = ' AND '.join(f"{column}=current_setting('pinet.acq_{column}',true)"
                                 for column in ('business_id', 'environment_id', 'site_id',
                                                'environment_class', 'adapter_id'))
        statements.extend((f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY',
                           f'ALTER TABLE {table} FORCE ROW LEVEL SECURITY',
                           f'CREATE POLICY acquisition_scope ON {table} USING ({predicate}) WITH CHECK ({predicate})'))
    return [*statements, *runtime_grants_sql()]
