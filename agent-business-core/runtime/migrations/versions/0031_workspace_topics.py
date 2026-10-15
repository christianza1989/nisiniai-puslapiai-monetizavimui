"""Private owner topics and immutable stored text; no dispatch or legacy history rewrite."""
from alembic import op

revision = "0031_workspace_topics"
down_revision = "0030_site_build_candidates"

TOPICS = "control_workspace_topics"
RECEIPTS = "control_workspace_topic_receipts"
MESSAGES = "control_workspace_topic_messages"
OWNER = "user_id,organization_id,portfolio_id,environment_id"
BINDING = "id," + OWNER
OWNED = """id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,
portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL"""


def upgrade():
    op.execute(f"""CREATE TABLE {TOPICS}({OWNED},
      anchor_kind VARCHAR NOT NULL CHECK(anchor_kind IN ('portfolio','discovery','creation','business')),
      discovery_id VARCHAR,creation_id VARCHAR,business_id VARCHAR,grant_id VARCHAR,
      title VARCHAR NOT NULL CHECK(char_length(title) BETWEEN 1 AND 120 AND btrim(title)<>''),
      pinned BOOLEAN NOT NULL,archived_at TIMESTAMPTZ,
      metadata_revision INTEGER NOT NULL CHECK(metadata_revision>=1),
      message_sequence INTEGER NOT NULL CHECK(message_sequence>=0),
      created_source_revision VARCHAR NOT NULL CHECK(created_source_revision ~ '^[a-f0-9]{{40}}$'),
      updated_at TIMESTAMPTZ NOT NULL CHECK(updated_at>=created_at),UNIQUE({BINDING}),
      CONSTRAINT ck_workspace_topic_anchor CHECK(
        (anchor_kind='portfolio' AND discovery_id IS NULL AND creation_id IS NULL AND business_id IS NULL AND grant_id IS NULL)
        OR (anchor_kind='discovery' AND discovery_id IS NOT NULL AND creation_id IS NULL AND business_id IS NULL AND grant_id IS NULL)
        OR (anchor_kind='creation' AND discovery_id IS NULL AND creation_id IS NOT NULL AND business_id IS NULL AND grant_id IS NULL)
        OR (anchor_kind='business' AND discovery_id IS NULL AND creation_id IS NULL AND business_id IS NOT NULL AND grant_id IS NOT NULL)),
      FOREIGN KEY(user_id,environment_id) REFERENCES control_users(id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(portfolio_id,organization_id,environment_id)
        REFERENCES control_portfolios(id,organization_id,environment_id) ON DELETE RESTRICT,
      FOREIGN KEY(discovery_id,{OWNER}) REFERENCES control_business_discoveries({BINDING}) ON DELETE RESTRICT,
      FOREIGN KEY(creation_id,{OWNER}) REFERENCES control_creations({BINDING}) ON DELETE RESTRICT,
      FOREIGN KEY(grant_id,business_id,organization_id,portfolio_id,environment_id)
        REFERENCES control_business_grants(id,business_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT)""")
    op.execute(f"""CREATE TABLE {RECEIPTS}({OWNED},topic_id VARCHAR NOT NULL,
      idempotency_key VARCHAR NOT NULL,fingerprint VARCHAR NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{{64}}$'),
      operation VARCHAR NOT NULL CHECK(operation IN ('create','set_metadata','append_message')),
      authorizing_session_id VARCHAR NOT NULL,
      accepted_source_revision VARCHAR NOT NULL CHECK(accepted_source_revision ~ '^[a-f0-9]{{40}}$'),
      accepted_metadata JSONB,message_id VARCHAR,
      CONSTRAINT ck_workspace_receipt_operation CHECK(
        (operation='append_message' AND message_id IS NOT NULL AND accepted_metadata IS NULL)
        OR (operation IN ('create','set_metadata') AND message_id IS NULL AND accepted_metadata IS NOT NULL
            AND jsonb_typeof(accepted_metadata)='object' AND octet_length(accepted_metadata::text)<=16384
            AND COALESCE(accepted_metadata->>'topic_id'=topic_id,false))),
      UNIQUE({BINDING}),CONSTRAINT uq_workspace_request_key UNIQUE(user_id,environment_id,idempotency_key),
      CONSTRAINT uq_workspace_receipt_pair UNIQUE(id,message_id,topic_id,{OWNER}),
      FOREIGN KEY(topic_id,{OWNER}) REFERENCES {TOPICS}({BINDING}) ON DELETE CASCADE,
      CONSTRAINT fk_workspace_receipt_session FOREIGN KEY(authorizing_session_id,user_id,environment_id)
        REFERENCES control_sessions(id,user_id,environment_id) ON DELETE RESTRICT)""")
    op.execute(f"""CREATE TABLE {MESSAGES}({OWNED},topic_id VARCHAR NOT NULL,receipt_id VARCHAR NOT NULL,
      sequence INTEGER NOT NULL CHECK(sequence>=1),author_user_id VARCHAR NOT NULL CHECK(author_user_id=user_id),
      content VARCHAR NOT NULL CHECK(char_length(content) BETWEEN 1 AND 2500 AND btrim(content)<>'' AND octet_length(content)<=10000),
      content_sha256 VARCHAR NOT NULL CHECK(content_sha256 ~ '^[a-f0-9]{{64}}$'),
      stored_source_revision VARCHAR NOT NULL CHECK(stored_source_revision ~ '^[a-f0-9]{{40}}$'),
      UNIQUE({BINDING}),UNIQUE(topic_id,sequence),
      CONSTRAINT uq_workspace_message_receipt UNIQUE(receipt_id),
      CONSTRAINT uq_workspace_message_pair UNIQUE(receipt_id,id,topic_id,{OWNER}),
      FOREIGN KEY(topic_id,{OWNER}) REFERENCES {TOPICS}({BINDING}) ON DELETE CASCADE)""")
    # The reciprocal keys enforce the same receipt/message pair, not independently existing rows.
    op.execute(f"""ALTER TABLE {RECEIPTS} ADD CONSTRAINT fk_workspace_receipt_message_pair
      FOREIGN KEY(id,message_id,topic_id,{OWNER}) REFERENCES {MESSAGES}(receipt_id,id,topic_id,{OWNER})
      DEFERRABLE INITIALLY DEFERRED""")
    op.execute(f"""ALTER TABLE {MESSAGES} ADD CONSTRAINT fk_workspace_message_receipt_pair
      FOREIGN KEY(receipt_id,id,topic_id,{OWNER}) REFERENCES {RECEIPTS}(id,message_id,topic_id,{OWNER})
      DEFERRABLE INITIALLY DEFERRED""")
    owner = f"""{TOPICS}.environment_id=current_setting('pinet.environment',true)
      AND ({TOPICS}.environment_id='local' OR {TOPICS}.environment_id LIKE 'test-%')
      AND {TOPICS}.user_id=current_setting('pinet.control_user',true)
      AND EXISTS(SELECT 1 FROM control_users u JOIN control_customer_accounts a
        ON a.user_id=u.id AND a.environment_id=u.environment_id
        WHERE u.id={TOPICS}.user_id AND u.environment_id={TOPICS}.environment_id AND u.enabled AND a.verified_at IS NOT NULL)
      AND EXISTS(SELECT 1 FROM control_memberships m JOIN control_portfolios p
        ON p.organization_id=m.organization_id AND p.environment_id=m.environment_id
        WHERE m.user_id={TOPICS}.user_id AND m.environment_id={TOPICS}.environment_id
        AND m.organization_id={TOPICS}.organization_id AND m.enabled AND m.role='owner' AND p.id={TOPICS}.portfolio_id)"""
    anchor = f"""({TOPICS}.anchor_kind='portfolio'
      OR ({TOPICS}.anchor_kind='discovery' AND EXISTS(SELECT 1 FROM control_business_discoveries d
        WHERE d.id={TOPICS}.discovery_id AND d.user_id={TOPICS}.user_id AND d.organization_id={TOPICS}.organization_id
        AND d.portfolio_id={TOPICS}.portfolio_id AND d.environment_id={TOPICS}.environment_id))
      OR ({TOPICS}.anchor_kind='creation' AND EXISTS(SELECT 1 FROM control_creations c
        WHERE c.id={TOPICS}.creation_id AND c.user_id={TOPICS}.user_id AND c.organization_id={TOPICS}.organization_id
        AND c.portfolio_id={TOPICS}.portfolio_id AND c.environment_id={TOPICS}.environment_id))
      OR ({TOPICS}.anchor_kind='business' AND EXISTS(SELECT 1 FROM control_business_grants g
        WHERE g.id={TOPICS}.grant_id AND g.business_id={TOPICS}.business_id AND g.enabled
        AND g.organization_id={TOPICS}.organization_id AND g.portfolio_id={TOPICS}.portfolio_id
        AND g.environment_id={TOPICS}.environment_id)))"""
    for table in (TOPICS, RECEIPTS, MESSAGES):
        condition = f"{owner} AND {anchor}" if table == TOPICS else f"""EXISTS(SELECT 1 FROM {TOPICS} t
          WHERE t.id={table}.topic_id AND t.user_id={table}.user_id AND t.organization_id={table}.organization_id
          AND t.portfolio_id={table}.portfolio_id AND t.environment_id={table}.environment_id)"""
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY workspace_topic_scope ON {table} USING ({condition}) WITH CHECK ({condition})")
        op.execute(f"REVOKE ALL ON {table} FROM PUBLIC,pinet_runtime")
        privileges = "SELECT,INSERT,UPDATE" if table == TOPICS else "SELECT,INSERT"
        op.execute(f"GRANT {privileges} ON {table} TO pinet_runtime")
    op.execute("""CREATE FUNCTION control_workspace_topic_update() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      IF TG_OP='INSERT' THEN
        IF NEW.metadata_revision<>1 OR NEW.message_sequence<>0 THEN
          RAISE EXCEPTION 'New workspace topic starts at metadata1/history0'; END IF;
        RETURN NEW;
      END IF;
      IF (to_jsonb(NEW)-ARRAY['title','pinned','archived_at','metadata_revision','message_sequence','updated_at'])
         IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['title','pinned','archived_at','metadata_revision','message_sequence','updated_at'])
         OR NEW.updated_at<OLD.updated_at THEN RAISE EXCEPTION 'Immutable workspace topic anchor'; END IF;
      IF NEW.metadata_revision::BIGINT=OLD.metadata_revision::BIGINT+1 AND NEW.message_sequence=OLD.message_sequence THEN
        RETURN NEW;
      ELSIF NEW.metadata_revision=OLD.metadata_revision AND NEW.message_sequence::BIGINT=OLD.message_sequence::BIGINT+1
        AND (NEW.title,NEW.pinned,NEW.archived_at) IS NOT DISTINCT FROM (OLD.title,OLD.pinned,OLD.archived_at) THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'One independent topic clock must advance'; END $$""")
    op.execute("""CREATE FUNCTION control_workspace_record_immutable() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      RAISE EXCEPTION 'Immutable workspace message or receipt'; END $$""")
    op.execute(f"""CREATE FUNCTION control_workspace_topic_clock() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM {TOPICS} t WHERE t.id=NEW.id AND t.user_id=NEW.user_id
        AND t.organization_id=NEW.organization_id AND t.portfolio_id=NEW.portfolio_id
        AND t.environment_id=NEW.environment_id) THEN
        RAISE EXCEPTION 'Current topic authority required at acceptance'; END IF;
      IF NEW.message_sequence>0 AND NOT EXISTS(SELECT 1 FROM {MESSAGES} m
        WHERE m.topic_id=NEW.id AND m.sequence=NEW.message_sequence AND m.user_id=NEW.user_id
        AND m.organization_id=NEW.organization_id AND m.portfolio_id=NEW.portfolio_id
        AND m.environment_id=NEW.environment_id) THEN
        RAISE EXCEPTION 'Topic history clock requires its exact committed message'; END IF;
      RETURN NEW; END $$""")
    op.execute(f"""CREATE FUNCTION control_workspace_message_clock() RETURNS TRIGGER
      LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$ BEGIN
      IF NOT EXISTS(SELECT 1 FROM {TOPICS} t WHERE t.id=NEW.topic_id AND t.user_id=NEW.user_id
        AND t.organization_id=NEW.organization_id AND t.portfolio_id=NEW.portfolio_id
        AND t.environment_id=NEW.environment_id AND t.message_sequence>=NEW.sequence) THEN
        RAISE EXCEPTION 'Message cannot exceed the committed topic history clock'; END IF;
      RETURN NEW; END $$""")
    for name in ("control_workspace_topic_update", "control_workspace_record_immutable",
                 "control_workspace_topic_clock", "control_workspace_message_clock"):
        op.execute(f"REVOKE ALL ON FUNCTION {name}() FROM PUBLIC")
    op.execute(f"""CREATE TRIGGER workspace_topic_update BEFORE INSERT OR UPDATE ON {TOPICS}
      FOR EACH ROW EXECUTE FUNCTION control_workspace_topic_update()""")
    for table in (RECEIPTS, MESSAGES):
        op.execute(f"""CREATE TRIGGER workspace_record_immutable BEFORE UPDATE ON {table}
          FOR EACH ROW EXECUTE FUNCTION control_workspace_record_immutable()""")
    op.execute(f"""CREATE CONSTRAINT TRIGGER workspace_topic_clock AFTER INSERT OR UPDATE ON {TOPICS}
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_workspace_topic_clock()""")
    op.execute(f"""CREATE CONSTRAINT TRIGGER workspace_message_clock AFTER INSERT ON {MESSAGES}
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_workspace_message_clock()""")
    op.execute(f"CREATE INDEX ix_workspace_topics ON {TOPICS}(user_id,portfolio_id,environment_id,pinned DESC,created_at DESC,id DESC)")
    op.execute(f"CREATE INDEX ix_workspace_messages ON {MESSAGES}(topic_id,sequence DESC)")


def downgrade():
    op.execute(f"""DO $$ BEGIN IF EXISTS(SELECT 1 FROM {TOPICS}) THEN
      RAISE EXCEPTION 'Workspace history exists; downgrade is refused'; END IF; END $$""")
    op.execute(f"ALTER TABLE {RECEIPTS} DROP CONSTRAINT fk_workspace_receipt_message_pair")
    op.execute(f"ALTER TABLE {MESSAGES} DROP CONSTRAINT fk_workspace_message_receipt_pair")
    for table in (MESSAGES, RECEIPTS, TOPICS):
        op.execute(f"DROP TABLE {table}")
    op.execute("DROP FUNCTION control_workspace_record_immutable()")
    op.execute("DROP FUNCTION control_workspace_topic_update()")
    op.execute("DROP FUNCTION control_workspace_topic_clock()")
    op.execute("DROP FUNCTION control_workspace_message_clock()")
