"""Additive local identity/portfolio pilot; no changes to legacy business UUIDs."""
from alembic import op

revision = "0010_control"
down_revision = "0009_facebook"

DDL = (
    """CREATE TABLE control_users (
      id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, username VARCHAR NOT NULL,
      password_hash VARCHAR NOT NULL, identity_issuer VARCHAR NOT NULL, identity_subject VARCHAR NOT NULL,
      enabled BOOLEAN NOT NULL, UNIQUE(id,environment_id), UNIQUE(username,environment_id),
      UNIQUE(identity_issuer,identity_subject,environment_id))""",
    """CREATE TABLE control_organizations (
      id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, key VARCHAR NOT NULL,
      display_name VARCHAR NOT NULL, UNIQUE(id,environment_id), UNIQUE(key,environment_id))""",
    """CREATE TABLE control_memberships (
      id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL,
      organization_id VARCHAR NOT NULL, role VARCHAR NOT NULL CHECK(role IN ('owner','viewer')),
      enabled BOOLEAN NOT NULL, UNIQUE(user_id,organization_id,environment_id),
      FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE,
      FOREIGN KEY(organization_id,environment_id) REFERENCES control_organizations(id,environment_id) ON DELETE CASCADE)""",
    """CREATE TABLE control_portfolios (
      id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, organization_id VARCHAR NOT NULL,
      display_name VARCHAR NOT NULL, UNIQUE(id,organization_id,environment_id),
      UNIQUE(organization_id,environment_id),
      FOREIGN KEY(organization_id,environment_id) REFERENCES control_organizations(id,environment_id) ON DELETE CASCADE)""",
    """CREATE TABLE control_business_grants (
      id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, portfolio_id VARCHAR NOT NULL,
      organization_id VARCHAR NOT NULL, business_id VARCHAR NOT NULL REFERENCES businesses(id),
      display_name VARCHAR NOT NULL, stage VARCHAR CHECK(stage IN ('phase_one','expanded')),
      connection_status VARCHAR NOT NULL CHECK(connection_status IN
        ('pending','registered','connected','stale','conflict','unavailable')),
      runtime_status VARCHAR NOT NULL CHECK(runtime_status IN ('registered','not_connected','unknown')),
      last_verified_activity_at TIMESTAMP WITH TIME ZONE, evidence_revision VARCHAR NOT NULL,
      enabled BOOLEAN NOT NULL, UNIQUE(business_id,environment_id),
      FOREIGN KEY(portfolio_id,organization_id,environment_id)
      REFERENCES control_portfolios(id,organization_id,environment_id) ON DELETE CASCADE)""",
    """CREATE TABLE control_sessions (
      id VARCHAR PRIMARY KEY, environment_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL,
      token_hash VARCHAR NOT NULL UNIQUE, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL, revoked_at TIMESTAMP WITH TIME ZONE,
      FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE)""",
    """CREATE TABLE control_login_buckets (
      key VARCHAR NOT NULL, environment_id VARCHAR NOT NULL, window_start TIMESTAMP WITH TIME ZONE NOT NULL,
      attempts INTEGER NOT NULL, PRIMARY KEY(key,environment_id))""",
    "CREATE INDEX ix_control_membership_actor ON control_memberships(user_id,environment_id,organization_id)",
    "CREATE INDEX ix_control_grant_portfolio ON control_business_grants(portfolio_id,environment_id,business_id)",
    "CREATE INDEX ix_control_session_expiry ON control_sessions(expires_at)",
)

ACTOR = "current_setting('pinet.control_user',true)"
ENV = "environment_id = current_setting('pinet.environment',true)"
MEMBER = f"""EXISTS (SELECT 1 FROM control_memberships m WHERE m.user_id={ACTOR}
 AND m.organization_id=organization_id AND m.environment_id=current_setting('pinet.environment',true)
 AND m.enabled AND m.role IN ('owner','viewer'))"""


def upgrade():
    for sql in DDL:
        op.execute(sql)
    policies = {
        "control_users": f"{ENV} AND (id={ACTOR} OR username=current_setting('pinet.control_login',true))",
        "control_memberships": f"{ENV} AND user_id={ACTOR}",
        # Correlated org column must be qualified, never compare m.organization_id to itself.
        "control_organizations": f"{ENV} AND {MEMBER.replace('=organization_id', '=control_organizations.id')}",
        "control_portfolios": f"{ENV} AND {MEMBER.replace('=organization_id', '=control_portfolios.organization_id')}",
        "control_business_grants": f"{ENV} AND {MEMBER.replace('=organization_id', '=control_business_grants.organization_id')}",
        "control_sessions": f"{ENV} AND (user_id={ACTOR} OR token_hash=current_setting('pinet.control_token',true))",
        "control_login_buckets": ENV,
    }
    for table, expression in policies.items():
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY control_scope ON {table} USING ({expression}) WITH CHECK ({expression})")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        op.execute(f"GRANT SELECT ON {table} TO pinet_runtime")
    op.execute("GRANT INSERT,UPDATE ON control_sessions,control_login_buckets TO pinet_runtime")


def downgrade():
    tables = ("control_login_buckets", "control_sessions", "control_business_grants", "control_portfolios",
              "control_memberships", "control_organizations", "control_users")
    # Policies reference memberships; remove those dependencies before dropping FK-ordered tables.
    for table in tables:
        op.execute(f"DROP POLICY control_scope ON {table}")
    for table in tables:
        op.execute(f"DROP TABLE {table}")
