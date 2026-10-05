"""Optional private acquisition records and one environment/account lease."""
from alembic import op

revision = "0009_facebook"
down_revision = "0008_mail"

STATEMENTS = (
    '''CREATE TABLE facebook_records (
       id VARCHAR PRIMARY KEY, business_id VARCHAR NOT NULL, environment_id VARCHAR NOT NULL,
       created_at TIMESTAMP WITH TIME ZONE NOT NULL, payload JSONB NOT NULL,
       kind VARCHAR NOT NULL, record_key VARCHAR NOT NULL, state VARCHAR NOT NULL,
       revision INTEGER NOT NULL, case_id VARCHAR,
       UNIQUE(id,business_id,environment_id),
       UNIQUE(business_id,environment_id,kind,record_key),
       FOREIGN KEY(case_id,business_id,environment_id)
       REFERENCES cases(id,business_id,environment_id) ON DELETE CASCADE)''',
    "CREATE INDEX ix_facebook_records_queue ON facebook_records (business_id,environment_id,kind,state,created_at)",
    "ALTER TABLE facebook_records ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE facebook_records FORCE ROW LEVEL SECURITY",
    '''CREATE POLICY tenant_scope ON facebook_records
       USING (business_id = current_setting('pinet.business',true)
          AND environment_id = current_setting('pinet.environment',true))
       WITH CHECK (business_id = current_setting('pinet.business',true)
          AND environment_id = current_setting('pinet.environment',true))''',
    '''CREATE TABLE facebook_account_leases (
       environment_id VARCHAR NOT NULL, account_key VARCHAR NOT NULL,
       epoch INTEGER NOT NULL, owner VARCHAR, lease_until TIMESTAMP WITH TIME ZONE,
       PRIMARY KEY(environment_id,account_key))''',
    "ALTER TABLE facebook_account_leases ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE facebook_account_leases FORCE ROW LEVEL SECURITY",
    '''CREATE POLICY environment_coordination ON facebook_account_leases
       USING (environment_id = current_setting('pinet.environment',true))
       WITH CHECK (environment_id = current_setting('pinet.environment',true))''',
    "GRANT SELECT,INSERT,UPDATE,DELETE ON facebook_records,facebook_account_leases TO pinet_runtime",
)


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.execute("DROP TABLE facebook_account_leases")
    op.execute("DROP TABLE facebook_records")
