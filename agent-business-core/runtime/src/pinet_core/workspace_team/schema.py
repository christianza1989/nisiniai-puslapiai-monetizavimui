"""Additive schema and independent authority constraints for the team domain."""
OWNER = "user_id,organization_id,portfolio_id,environment_id"
BINDING = "id," + OWNER
OWNED = "id VARCHAR PRIMARY KEY,user_id VARCHAR NOT NULL,organization_id VARCHAR NOT NULL,portfolio_id VARCHAR NOT NULL,environment_id VARCHAR NOT NULL,created_at TIMESTAMPTZ NOT NULL"
PREFIX = "control_workspace_team_"
TABLES = tuple(PREFIX + item for item in ("threads", "members", "turns", "attempts", "events"))


def ddl():
    threads, members, turns, attempts, events = TABLES
    return [
        f"""CREATE TABLE {threads}({OWNED},topic_id VARCHAR NOT NULL UNIQUE,task_thread_id VARCHAR NOT NULL UNIQUE,
        business_id VARCHAR NOT NULL,grant_id VARCHAR NOT NULL,event_sequence INTEGER NOT NULL DEFAULT 0 CHECK(event_sequence BETWEEN 0 AND 2147483647),
        UNIQUE({BINDING}),UNIQUE(id,topic_id,task_thread_id,business_id,{OWNER}),FOREIGN KEY(topic_id,{OWNER}) REFERENCES control_workspace_topics({BINDING}) ON DELETE CASCADE,
        FOREIGN KEY(task_thread_id,business_id,organization_id,user_id,environment_id) REFERENCES control_task_threads(id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT,
        FOREIGN KEY(grant_id,business_id,organization_id,portfolio_id,environment_id) REFERENCES control_business_grants(id,business_id,organization_id,portfolio_id,environment_id) ON DELETE RESTRICT)""",
        f"""CREATE TABLE {members}({OWNED},team_thread_id VARCHAR NOT NULL,role VARCHAR NOT NULL CHECK(role IN ('coordinator','adviser')),
        capability_id VARCHAR NOT NULL,CHECK((role='coordinator' AND capability_id='workspace.consult_coordinator.v1') OR(role='adviser' AND capability_id='workspace.business_adviser.v1')),
        UNIQUE({BINDING}),UNIQUE(team_thread_id,role),UNIQUE(id,team_thread_id,role,{OWNER}),
        FOREIGN KEY(team_thread_id,{OWNER}) REFERENCES {threads}({BINDING}) ON DELETE CASCADE)""",
        f"""CREATE TABLE {turns}({OWNED},team_thread_id VARCHAR NOT NULL,topic_id VARCHAR NOT NULL,task_thread_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,
        task_kind VARCHAR NOT NULL CHECK(task_kind='workspace.team_turn'),owner_event_id VARCHAR NOT NULL,context JSONB,context_sha256 VARCHAR,context_cutoff INTEGER,
        roster_sha256 VARCHAR NOT NULL CHECK(roster_sha256~'^[a-f0-9]{{64}}$'),deadline TIMESTAMPTZ NOT NULL CHECK(deadline>created_at),
        CHECK((context IS NULL AND context_sha256 IS NULL AND context_cutoff IS NULL) OR(context IS NOT NULL AND context_sha256 IS NOT NULL AND context_cutoff IS NOT NULL AND context_sha256~'^[a-f0-9]{{64}}$' AND context_cutoff>=1)),
        UNIQUE({BINDING}),UNIQUE(id,team_thread_id,{OWNER}),FOREIGN KEY(team_thread_id,topic_id,task_thread_id,business_id,{OWNER}) REFERENCES {threads}(id,topic_id,task_thread_id,business_id,{OWNER}) ON DELETE CASCADE,
        FOREIGN KEY(topic_id,{OWNER}) REFERENCES control_workspace_topics({BINDING}) ON DELETE CASCADE,
        FOREIGN KEY(id,task_thread_id,business_id,organization_id,user_id,environment_id,task_kind) REFERENCES control_tasks(id,thread_id,business_id,organization_id,user_id,environment_id,kind) ON DELETE RESTRICT)""",
        f"""CREATE TABLE {attempts}({OWNED},task_id VARCHAR NOT NULL,team_thread_id VARCHAR NOT NULL,run_id VARCHAR NOT NULL,business_id VARCHAR NOT NULL,
        ordinal INTEGER NOT NULL CHECK(ordinal BETWEEN 1 AND 3),phase VARCHAR NOT NULL CHECK((ordinal,phase) IN((1,'plan'),(2,'adviser'),(3,'synthesis'))),
        state VARCHAR NOT NULL CHECK(state IN ('reserved','succeeded','failed')),context JSONB NOT NULL,context_sha256 VARCHAR NOT NULL CHECK(context_sha256~'^[a-f0-9]{{64}}$'),
        instruction_sha256 VARCHAR NOT NULL CHECK(instruction_sha256~'^[a-f0-9]{{64}}$'),model VARCHAR NOT NULL CHECK(model='gpt-6.1-sol'),effort VARCHAR NOT NULL CHECK(effort='high'),
        source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),finished_at TIMESTAMPTZ,usage JSONB,
        CHECK((state='reserved' AND finished_at IS NULL AND usage IS NULL) OR(state<>'reserved' AND finished_at IS NOT NULL AND finished_at>=created_at)),
        UNIQUE({BINDING}),UNIQUE(task_id,ordinal),UNIQUE(id,task_id,team_thread_id,{OWNER}),FOREIGN KEY(task_id,team_thread_id,{OWNER}) REFERENCES {turns}(id,team_thread_id,{OWNER}) ON DELETE CASCADE,
        FOREIGN KEY(run_id,task_id,business_id,organization_id,user_id,environment_id) REFERENCES control_task_runs(id,task_id,business_id,organization_id,user_id,environment_id) ON DELETE RESTRICT)""",
        f"""CREATE TABLE {events}({OWNED},task_id VARCHAR NOT NULL,team_thread_id VARCHAR NOT NULL,sequence INTEGER NOT NULL CHECK(sequence BETWEEN 1 AND 2147483647),
        author_type VARCHAR NOT NULL CHECK(author_type IN ('user','coordinator','adviser')),author_user_id VARCHAR,participant_id VARCHAR,attempt_id VARCHAR,
        kind VARCHAR NOT NULL CHECK(kind IN ('owner_message','assignment','answer')),reply_to_event_id VARCHAR,content VARCHAR NOT NULL CHECK(length(content) BETWEEN 1 AND 8000),
        content_sha256 VARCHAR NOT NULL CHECK(content_sha256~'^[a-f0-9]{{64}}$'),source_revision VARCHAR NOT NULL CHECK(source_revision~'^[a-f0-9]{{40}}$'),
        CHECK((author_type='user' AND author_user_id IS NOT NULL AND author_user_id=user_id AND participant_id IS NULL AND attempt_id IS NULL AND kind='owner_message') OR(author_type<>'user' AND author_user_id IS NULL AND participant_id IS NOT NULL AND attempt_id IS NOT NULL AND kind<>'owner_message')),
        CHECK(kind<>'assignment' OR author_type='coordinator'),UNIQUE({BINDING}),UNIQUE(team_thread_id,sequence),UNIQUE(attempt_id),UNIQUE(id,task_id,team_thread_id,{OWNER}),UNIQUE(id,team_thread_id,{OWNER}),
        CONSTRAINT fk_workspace_team_event_turn FOREIGN KEY(task_id,team_thread_id,{OWNER}) REFERENCES {turns}(id,team_thread_id,{OWNER}) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
        FOREIGN KEY(participant_id,team_thread_id,author_type,{OWNER}) REFERENCES {members}(id,team_thread_id,role,{OWNER}) DEFERRABLE INITIALLY DEFERRED,
        FOREIGN KEY(attempt_id,task_id,team_thread_id,{OWNER}) REFERENCES {attempts}(id,task_id,team_thread_id,{OWNER}) DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT fk_workspace_team_reply FOREIGN KEY(reply_to_event_id,team_thread_id,{OWNER}) REFERENCES {events}(id,team_thread_id,{OWNER}) ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED)""",
        f"ALTER TABLE {turns} ADD CONSTRAINT fk_workspace_team_owner_event FOREIGN KEY(owner_event_id,id,team_thread_id,{OWNER}) REFERENCES {events}(id,task_id,team_thread_id,{OWNER}) DEFERRABLE INITIALLY DEFERRED",
    ]


def protections():
    threads, members, turns, attempts, events = TABLES
    sql = []
    for table in TABLES:
        link = "t.id=" + table + ".id" if table == threads else "t.id=" + table + ".team_thread_id"
        condition = f"""EXISTS(SELECT 1 FROM {threads} t JOIN control_workspace_topics p ON p.id=t.topic_id
        WHERE {link} AND t.user_id={table}.user_id AND t.organization_id={table}.organization_id AND t.portfolio_id={table}.portfolio_id AND t.environment_id={table}.environment_id
        AND p.anchor_kind='business' AND p.business_id=t.business_id AND p.grant_id=t.grant_id
        AND p.user_id=t.user_id AND p.organization_id=t.organization_id AND p.portfolio_id=t.portfolio_id AND p.environment_id=t.environment_id)"""
        if table == threads:
            condition = f"""EXISTS(SELECT 1 FROM control_workspace_topics p WHERE p.id={table}.topic_id AND p.user_id={table}.user_id
            AND p.organization_id={table}.organization_id AND p.portfolio_id={table}.portfolio_id AND p.environment_id={table}.environment_id
            AND p.anchor_kind='business' AND p.business_id={table}.business_id AND p.grant_id={table}.grant_id)"""
        sql += [f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY", f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY",
            f"CREATE POLICY workspace_team_scope ON {table} USING({condition}) WITH CHECK({condition})",
            f"REVOKE ALL ON {table} FROM pinet_runtime", f"GRANT SELECT,INSERT ON {table} TO pinet_runtime"]
    sql += [f"GRANT UPDATE(event_sequence) ON {threads} TO pinet_runtime",
        f"GRANT UPDATE(context,context_sha256,context_cutoff,deadline) ON {turns} TO pinet_runtime",
        f"GRANT UPDATE(state,finished_at,usage) ON {attempts} TO pinet_runtime",
        """CREATE FUNCTION control_workspace_team_mutation() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$BEGIN
        IF TG_TABLE_NAME='control_workspace_team_threads' THEN
          IF (to_jsonb(NEW)-'event_sequence')<>(to_jsonb(OLD)-'event_sequence') OR NEW.event_sequence<=OLD.event_sequence THEN RAISE EXCEPTION 'immutable team binding' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='control_workspace_team_turns' THEN
          IF (to_jsonb(NEW)-ARRAY['context','context_sha256','context_cutoff','deadline'])<>(to_jsonb(OLD)-ARRAY['context','context_sha256','context_cutoff','deadline']) OR OLD.context IS NOT NULL OR NEW.context IS NULL OR NEW.deadline>OLD.deadline THEN RAISE EXCEPTION 'immutable turn context' USING ERRCODE='23514'; END IF;
        ELSIF TG_TABLE_NAME='control_workspace_team_attempts' THEN
          IF (to_jsonb(NEW)-ARRAY['state','finished_at','usage'])<>(to_jsonb(OLD)-ARRAY['state','finished_at','usage']) OR OLD.state<>'reserved' OR NEW.state='reserved' THEN RAISE EXCEPTION 'immutable reserved attempt' USING ERRCODE='23514'; END IF;
        ELSE RAISE EXCEPTION 'immutable team record' USING ERRCODE='23514'; END IF;RETURN NEW;END$$""",
        "REVOKE ALL ON FUNCTION control_workspace_team_mutation() FROM PUBLIC"]
    for table in TABLES:
        sql += [f"CREATE TRIGGER workspace_team_mutation BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION control_workspace_team_mutation()"]
    sql += [f"""CREATE FUNCTION control_workspace_team_fence() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
      DECLARE th public.{threads}%ROWTYPE;t public.control_tasks%ROWTYPE;p public.control_workspace_topics%ROWTYPE;a public.{attempts}%ROWTYPE;tr public.{turns}%ROWTYPE;mx BIGINT;ct BIGINT;tid VARCHAR;
      BEGIN
      IF TG_TABLE_NAME='{threads}' THEN SELECT * INTO th FROM public.{threads} WHERE id=NEW.id;
      ELSE SELECT * INTO th FROM public.{threads} WHERE id=NEW.team_thread_id;END IF;
      IF NOT FOUND THEN RAISE EXCEPTION 'current team scope unavailable' USING ERRCODE='23514';END IF;
      SELECT * INTO p FROM public.control_workspace_topics WHERE id=th.topic_id AND user_id=th.user_id AND organization_id=th.organization_id AND portfolio_id=th.portfolio_id AND environment_id=th.environment_id;
      IF NOT FOUND OR p.archived_at IS NOT NULL OR p.business_id<>th.business_id OR p.grant_id<>th.grant_id THEN RAISE EXCEPTION 'current team anchor unavailable' USING ERRCODE='23514';END IF;
      SELECT coalesce(max(sequence),0),count(*) INTO mx,ct FROM public.{events} WHERE team_thread_id=th.id;
      IF th.event_sequence<>mx OR mx<>ct THEN RAISE EXCEPTION 'exact team history clock required' USING ERRCODE='23514';END IF;
      IF TG_TABLE_NAME IN('{turns}','{attempts}','{events}') THEN
        IF TG_TABLE_NAME='{turns}' THEN tid=NEW.id;ELSE tid=NEW.task_id;END IF;
        SELECT * INTO t FROM public.control_tasks WHERE id=tid;
        IF NOT FOUND OR t.kind<>'workspace.team_turn' OR t.business_id<>th.business_id OR t.thread_id<>th.task_thread_id THEN RAISE EXCEPTION 'exact team task required' USING ERRCODE='23514';END IF;
        IF NOT EXISTS(SELECT 1 FROM public.control_sessions s WHERE s.id=t.session_id AND s.user_id=t.user_id AND s.environment_id=t.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'current authorizing session required' USING ERRCODE='23514';END IF;
        SELECT * INTO tr FROM public.{turns} WHERE id=t.id;
        IF TG_TABLE_NAME<>'{turns}' AND (NOT FOUND OR tr.team_thread_id<>th.id) THEN RAISE EXCEPTION 'exact team turn required' USING ERRCODE='23514';END IF;
        IF TG_TABLE_NAME='{attempts}' THEN
          IF t.status<>'running' OR t.run_id IS NULL OR t.run_id IS DISTINCT FROM NEW.run_id OR t.source_revision<>NEW.source_revision
            OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR tr.deadline IS NULL OR tr.deadline<=clock_timestamp()
            OR tr.context IS NULL OR tr.context_sha256 IS NULL OR NEW.state<>'reserved'
            THEN RAISE EXCEPTION 'current reserved call required' USING ERRCODE='23514';END IF;
        END IF;
        IF TG_TABLE_NAME='{events}' THEN
        IF NEW.author_type='user' AND (NEW.id<>tr.owner_event_id OR NEW.kind<>'owner_message' OR NEW.content<>t.message) THEN RAISE EXCEPTION 'exact owner input required' USING ERRCODE='23514';END IF;
        IF NEW.reply_to_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.{events} ev JOIN public.control_tasks rt ON rt.id=ev.task_id
          WHERE ev.id=NEW.reply_to_event_id AND ev.team_thread_id=th.id AND ev.sequence<NEW.sequence AND rt.sequence<=t.sequence) THEN RAISE EXCEPTION 'earlier scoped reply required' USING ERRCODE='23514';END IF;
        IF NEW.author_type<>'user' THEN
          SELECT * INTO a FROM public.{attempts} WHERE id=NEW.attempt_id AND task_id=t.id;
          IF NOT FOUND OR a.state<>'succeeded' OR a.run_id IS DISTINCT FROM t.run_id OR a.source_revision<>NEW.source_revision OR t.source_revision<>NEW.source_revision
            OR t.status<>'running' OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR tr.deadline IS NULL OR tr.deadline<=clock_timestamp()
            OR (NEW.author_type='adviser' AND a.phase<>'adviser') OR (NEW.author_type='coordinator' AND a.phase NOT IN('plan','synthesis'))
            OR (NEW.kind='assignment' AND a.phase<>'plan')
            THEN RAISE EXCEPTION 'current settled phase required' USING ERRCODE='23514';END IF;
        END IF;
        END IF;
      END IF;RETURN NEW;END$$""", "REVOKE ALL ON FUNCTION control_workspace_team_fence() FROM PUBLIC",
      f"CREATE UNIQUE INDEX uq_workspace_team_owner_message ON {events}(task_id) WHERE kind='owner_message'"]
    for table in TABLES:
        operations = "INSERT OR UPDATE" if table in {threads, turns} else "INSERT"
        sql += [f"CREATE CONSTRAINT TRIGGER workspace_team_fence AFTER {operations} ON {table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION control_workspace_team_fence()"]
    return sql


def statements():
    return ddl()+protections()
