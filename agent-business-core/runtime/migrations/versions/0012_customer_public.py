"""Local verified customer onboarding and independent approved public projection."""
from alembic import op

revision = "0012_customer_public"
down_revision = "0011_control_tasks"

ENV = "environment_id=current_setting('pinet.environment',true)"
ACTOR = "current_setting('pinet.control_user',true)"
CREATOR = f"""EXISTS (SELECT 1 FROM control_organizations o WHERE o.id=organization_id
 AND o.environment_id=current_setting('pinet.environment',true) AND o.creator_user_id={ACTOR})"""
MEMBER = f"""EXISTS (SELECT 1 FROM control_memberships m WHERE m.organization_id=organization_id
 AND m.environment_id=current_setting('pinet.environment',true) AND m.user_id={ACTOR}
 AND m.enabled AND m.role='owner')"""


def policy(table, name, command, expression, *, check=None):
    using = f"USING ({expression})" if command in {"SELECT", "UPDATE", "ALL"} else ""
    checked = f"WITH CHECK ({check or expression})" if command != "SELECT" else ""
    op.execute(f"CREATE POLICY {name} ON {table} FOR {command} {using} {checked}")


def upgrade():
    op.execute("ALTER TABLE control_organizations ADD COLUMN creator_user_id VARCHAR")
    op.execute("""ALTER TABLE control_organizations ADD CONSTRAINT control_org_creator_fk
     FOREIGN KEY (creator_user_id,environment_id) REFERENCES control_users(id,environment_id)""")
    op.execute("""CREATE TABLE control_customer_accounts (
     id VARCHAR PRIMARY KEY,environment_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,email VARCHAR NOT NULL,
     email_hash VARCHAR NOT NULL,display_name VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL,
     privacy_accepted_at TIMESTAMPTZ NOT NULL,verified_at TIMESTAMPTZ,
     UNIQUE(user_id,environment_id),UNIQUE(email_hash,environment_id),
     FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE)""")
    op.execute("""CREATE TABLE control_customer_tokens (
     id VARCHAR PRIMARY KEY,environment_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,
     purpose VARCHAR NOT NULL CHECK(purpose IN ('verify','recover')),token_hash VARCHAR NOT NULL UNIQUE,
     created_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL,consumed_at TIMESTAMPTZ,
     FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE)""")
    op.execute("CREATE INDEX ix_customer_tokens_user ON control_customer_tokens(user_id,environment_id,purpose)")
    op.execute("""CREATE TABLE control_customer_intakes (
     id VARCHAR PRIMARY KEY,environment_id VARCHAR NOT NULL,user_id VARCHAR NOT NULL,
     organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,
     kind VARCHAR NOT NULL CHECK(kind IN ('claim','create')),display_name VARCHAR NOT NULL,canonical_host VARCHAR,
     description VARCHAR NOT NULL,idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL,
     status VARCHAR NOT NULL CHECK(status IN ('awaiting_evidence','awaiting_review','approved','rejected')),
     business_id VARCHAR REFERENCES businesses(id),created_at TIMESTAMPTZ NOT NULL,updated_at TIMESTAMPTZ NOT NULL,
     decision_note VARCHAR,private_review_evidence VARCHAR,UNIQUE(user_id,environment_id,idempotency_key),
     FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE CASCADE,
     FOREIGN KEY(portfolio_id,organization_id,environment_id)
     REFERENCES control_portfolios(id,organization_id,environment_id) ON DELETE CASCADE)""")
    op.execute("""CREATE TABLE control_public_projects (
     id VARCHAR PRIMARY KEY,environment_id VARCHAR NOT NULL,slug VARCHAR NOT NULL,public_payload JSON NOT NULL,
     private_evidence JSON NOT NULL,revision_hash VARCHAR NOT NULL,approved_hash VARCHAR,
     approved_at TIMESTAMPTZ,publish_at TIMESTAMPTZ NOT NULL,revoked_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ NOT NULL,UNIQUE(slug,environment_id))""")
    for table in ("control_customer_accounts", "control_customer_tokens", "control_customer_intakes",
                  "control_public_projects"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL ON {table} FROM pinet_runtime")
        op.execute(f"GRANT SELECT ON {table} TO pinet_runtime")
    account = f"{ENV} AND (user_id={ACTOR} OR email_hash=current_setting('pinet.customer_email',true))"
    policy("control_customer_accounts", "customer_read", "SELECT", account)
    policy("control_customer_accounts", "customer_insert", "INSERT", f"{ENV} AND user_id={ACTOR} AND verified_at IS NULL")
    policy("control_customer_accounts", "customer_update", "UPDATE", f"{ENV} AND user_id={ACTOR}")
    policy("control_customer_tokens", "customer_read", "SELECT", f"{ENV} AND (user_id={ACTOR} OR "
           "token_hash=current_setting('pinet.customer_token',true))")
    policy("control_customer_tokens", "customer_insert", "INSERT", f"{ENV} AND user_id={ACTOR}")
    policy("control_customer_tokens", "customer_update", "UPDATE", f"{ENV} AND user_id={ACTOR}")
    scoped = f"{ENV} AND user_id={ACTOR} AND " + MEMBER.replace("=organization_id", "=control_customer_intakes.organization_id")
    policy("control_customer_intakes", "customer_read", "SELECT", scoped)
    policy("control_customer_intakes", "customer_insert", "INSERT", scoped + " AND status IN ('awaiting_evidence','awaiting_review')"
           " AND business_id IS NULL AND decision_note IS NULL AND private_review_evidence IS NULL")
    policy("control_public_projects", "public_read", "SELECT", f"{ENV} AND "
           "current_setting('pinet.public_read',true)='yes' AND approved_hash=revision_hash "
           "AND approved_at IS NOT NULL AND revoked_at IS NULL AND publish_at<=CURRENT_TIMESTAMP")
    # Legacy ALL policies were safe with SELECT-only grants; split before adding onboarding writes.
    for table in ("control_users", "control_organizations", "control_memberships", "control_portfolios"):
        op.execute(f"DROP POLICY control_scope ON {table}")
    policy("control_users", "control_scope", "SELECT", f"{ENV} AND (id={ACTOR} OR "
           "username=current_setting('pinet.control_login',true))")
    self_customer = f"{ENV} AND id={ACTOR} AND identity_issuer='pinet-customer'"
    policy("control_users", "customer_insert", "INSERT", self_customer + " AND NOT enabled")
    policy("control_users", "customer_update", "UPDATE", self_customer)
    legacy_member = MEMBER.replace("AND m.role='owner'", "AND m.role IN ('owner','viewer')")
    policy("control_organizations", "control_scope", "SELECT", f"{ENV} AND (creator_user_id={ACTOR} OR "
           + legacy_member.replace("=organization_id", "=control_organizations.id") + ")")
    verified = f"""EXISTS (SELECT 1 FROM control_customer_accounts a WHERE a.user_id={ACTOR}
      AND a.environment_id=current_setting('pinet.environment',true) AND a.verified_at IS NOT NULL)"""
    policy("control_organizations", "customer_insert", "INSERT", f"{ENV} AND creator_user_id={ACTOR} AND {verified}")
    policy("control_memberships", "control_scope", "SELECT", f"{ENV} AND user_id={ACTOR}")
    policy("control_memberships", "customer_insert", "INSERT", f"{ENV} AND user_id={ACTOR} AND role='owner' AND enabled AND "
           + CREATOR.replace("=organization_id", "=control_memberships.organization_id"))
    policy("control_portfolios", "control_scope", "SELECT", f"{ENV} AND "
           + legacy_member.replace("=organization_id", "=control_portfolios.organization_id"))
    policy("control_portfolios", "customer_insert", "INSERT", f"{ENV} AND "
           + CREATOR.replace("=organization_id", "=control_portfolios.organization_id"))
    op.execute("GRANT INSERT,UPDATE ON control_users,control_customer_accounts,control_customer_tokens TO pinet_runtime")
    op.execute("GRANT INSERT ON control_organizations,control_memberships,control_portfolios,control_customer_intakes TO pinet_runtime")


def downgrade():
    for table in ("control_users", "control_organizations", "control_memberships", "control_portfolios"):
        op.execute(f"DROP POLICY customer_insert ON {table}")
        if table == "control_users":
            op.execute(f"DROP POLICY customer_update ON {table}")
        op.execute(f"DROP POLICY control_scope ON {table}")
    for table in ("control_customer_intakes", "control_customer_tokens", "control_customer_accounts", "control_public_projects"):
        op.execute(f"DROP TABLE {table}")
    op.execute("ALTER TABLE control_organizations DROP COLUMN creator_user_id")
    # Restore exactly the prior policies/grants, without rebuilding existing tables.
    from importlib import import_module
    previous = import_module('migrations.versions.0010_control')
    expressions = {"control_users": f"{ENV} AND (id={ACTOR} OR username=current_setting('pinet.control_login',true))",
        "control_memberships": f"{ENV} AND user_id={ACTOR}",
        "control_organizations": f"{ENV} AND " + previous.MEMBER.replace('=organization_id', '=control_organizations.id'),
        "control_portfolios": f"{ENV} AND " + previous.MEMBER.replace('=organization_id', '=control_portfolios.organization_id')}
    for table, expression in expressions.items():
        policy(table, "control_scope", "ALL", expression)
        op.execute(f"REVOKE INSERT,UPDATE ON {table} FROM pinet_runtime")
