"""Durable synthetic correspondence; existing core Case/MailMessage remain canonical."""

from .ledger_schema import KEY, SCOPE

TABLES = (
    "acquisition_contact_policies",
    "acquisition_correspondence_threads",
    "acquisition_mail_bindings",
    "acquisition_work_receipts",
)
DDL = (
    f"""CREATE TABLE acquisition_contact_policies ({SCOPE}, recipient_hash VARCHAR NOT NULL,
    state VARCHAR NOT NULL CHECK(state IN ('active','hold','stopped')), revision INTEGER NOT NULL CHECK(revision>0),
    reason VARCHAR NOT NULL, resume_condition_quote TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    CHECK(recipient_hash ~ '^[a-f0-9]{{64}}$'), PRIMARY KEY({KEY},recipient_hash))""",
    f"""CREATE TABLE acquisition_correspondence_threads ({SCOPE}, thread_id VARCHAR NOT NULL,
    case_id VARCHAR NOT NULL, recipient_hash VARCHAR NOT NULL, campaign_id VARCHAR NOT NULL,
    prospect_id VARCHAR NOT NULL, source_revision VARCHAR NOT NULL CHECK(source_revision ~ '^[a-f0-9]{{40}}$'),
    campaign JSONB NOT NULL, prospect JSONB NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
    last_inbound_id VARCHAR, created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY({KEY},thread_id), UNIQUE({KEY},campaign_id,prospect_id), UNIQUE({KEY},case_id),
    FOREIGN KEY({KEY},recipient_hash) REFERENCES acquisition_contact_policies({KEY},recipient_hash),
    FOREIGN KEY(case_id,business_id,environment_id) REFERENCES cases(id,business_id,environment_id))""",
    f"""CREATE TABLE acquisition_mail_bindings ({SCOPE}, mail_id VARCHAR NOT NULL,
    thread_id VARCHAR NOT NULL, direction VARCHAR NOT NULL CHECK(direction IN ('inbound','outbound')),
    payload_sha256 VARCHAR NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{{64}}$'),
    input_sha256 VARCHAR NOT NULL CHECK(input_sha256 ~ '^[a-f0-9]{{64}}$'),
    created_at TIMESTAMPTZ NOT NULL, PRIMARY KEY({KEY},mail_id),
    FOREIGN KEY({KEY},thread_id) REFERENCES acquisition_correspondence_threads({KEY},thread_id),
    FOREIGN KEY(mail_id,business_id,environment_id) REFERENCES mail_messages(id,business_id,environment_id))""",
    f"""CREATE TABLE acquisition_work_receipts ({SCOPE}, operation VARCHAR NOT NULL
    CHECK(operation IN ('capture','inbound','decision')), request_id VARCHAR NOT NULL,
    body_sha256 VARCHAR NOT NULL CHECK(body_sha256 ~ '^[a-f0-9]{{64}}$'), response_body TEXT NOT NULL,
    thread_id VARCHAR NOT NULL, created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY({KEY},operation,request_id),
    FOREIGN KEY({KEY},thread_id) REFERENCES acquisition_correspondence_threads({KEY},thread_id))""",
)


def runtime_grants_sql():
    statements = []
    for table in TABLES:
        privileges = "SELECT,INSERT" if table in TABLES[2:] else "SELECT,INSERT,UPDATE"
        statements.extend(
            (f"REVOKE ALL ON {table} FROM pinet_runtime", f"GRANT {privileges} ON {table} TO pinet_runtime")
        )
    return statements


def isolation_sql():
    predicate = " AND ".join(
        f"{column}=current_setting('pinet.acq_{column}',true)" for column in KEY.split(",")
    )
    statements = []
    for table in TABLES:
        statements.extend(
            (
                f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY",
                f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
                f"CREATE POLICY acquisition_scope ON {table} USING ({predicate}) WITH CHECK ({predicate})",
            )
        )
    return [*statements, *runtime_grants_sql()]
