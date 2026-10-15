"""One native-receipt alternative in the maintained team event provenance.

Migration patches exactly one known CHECK and one known function branch. Every
other history/owner/session/roster/source condition survives verbatim. The proof
is SECURITY INVOKER under the caller's owner and business RLS scope; completion
must hold native parents before Task and validate constraints while still running.
This is provenance, never a passing grade, admission or channel authorization.
"""
import re

EVENTS = "control_workspace_team_events"
PROOF = "workspace_team_native_episode"
OLD_AUTHOR_CHECK = """(author_type='user' AND author_user_id IS NOT NULL AND author_user_id=user_id
 AND participant_id IS NULL AND attempt_id IS NULL AND kind='owner_message') OR
 (author_type<>'user' AND author_user_id IS NULL AND participant_id IS NOT NULL
 AND attempt_id IS NOT NULL AND kind<>'owner_message')"""
NEW_AUTHOR_CHECK = f"""(native_episode_task_id IS NULL AND ({OLD_AUTHOR_CHECK})) OR
 (native_episode_task_id IS NOT NULL AND native_episode_task_id=task_id AND author_type='coordinator'
 AND kind='answer' AND author_user_id IS NULL AND participant_id IS NOT NULL AND attempt_id IS NULL)"""

# Exact body bytes from canonical 0032; pg_get_functiondef retains its body.
ATTEMPT_BRANCH = """IF NEW.author_type<>'user' THEN
          SELECT * INTO a FROM public.control_workspace_team_attempts WHERE id=NEW.attempt_id AND task_id=t.id;
          IF NOT FOUND OR a.state<>'succeeded' OR a.run_id IS DISTINCT FROM t.run_id OR a.source_revision<>NEW.source_revision OR t.source_revision<>NEW.source_revision
            OR t.status<>'running' OR t.lease_until IS NULL OR t.lease_until<=clock_timestamp() OR tr.deadline IS NULL OR tr.deadline<=clock_timestamp()
            OR (NEW.author_type='adviser' AND a.phase<>'adviser') OR (NEW.author_type='coordinator' AND a.phase NOT IN('plan','synthesis'))
            OR (NEW.kind='assignment' AND a.phase<>'plan')
            THEN RAISE EXCEPTION 'current settled phase required' USING ERRCODE='23514';END IF;
        END IF;"""
NATIVE_BRANCH = f"""IF NEW.native_episode_task_id IS NOT NULL THEN
          IF NEW.native_episode_task_id IS DISTINCT FROM t.id OR NEW.source_revision IS DISTINCT FROM t.source_revision
            OR NOT public.{PROOF}(t.id,NEW.source_revision)
            THEN RAISE EXCEPTION 'exact completed native episode required' USING ERRCODE='23514';END IF;
        ELSE
        {ATTEMPT_BRANCH}
        END IF;"""


def patch_fence(definition, *, downgrade=False):
    """Fail closed on an unknown/ambiguous branch, preserving all other bytes."""
    before, after = (NATIVE_BRANCH, ATTEMPT_BRANCH) if downgrade else (ATTEMPT_BRANCH, NATIVE_BRANCH)
    definition = definition.replace("\r\n", "\n")
    if ("FUNCTION public.control_workspace_team_fence()" not in definition
            or definition.count(before) != 1 or (not downgrade and "NEW.native_episode_task_id" in definition)):
        raise RuntimeError("Unknown or ambiguous workspace team provenance branch")
    return definition.replace(before, after, 1)


def normalized_check(expression):
    """Compare the known boolean tree; never erase grouping or literal bytes.

    This deliberately small grammar accepts only the predicates in this CHECK.
    PostgreSQL's operand parentheses/text casts and associative AND/OR grouping
    are harmless. Unknown SQL syntax cannot become an eligible migration anchor.
    """
    matches = list(re.finditer(r"'(?:[^']|'')*'|::text\b|<>|=|[A-Za-z_][A-Za-z_0-9]*|[()]", expression))
    end, tokens = 0, []
    for match in matches:
        if expression[end:match.start()].strip():
            return None
        token = match.group()
        if token != "::text":
            tokens.append(token if token.startswith("'") else token.lower())
        end = match.end()
    if expression[end:].strip():
        return None
    # pg_get_expr also groups individual VARCHAR operands before their casts.
    while True:
        shortened, index = [], 0
        while index < len(tokens):
            if (index+2 < len(tokens) and tokens[index] == "(" and tokens[index+2] == ")"
                    and re.fullmatch(r"[a-z_][a-z_0-9]*|'(?:[^']|'')*'", tokens[index+1])):
                shortened.append(tokens[index+1])
                index += 3
            else:
                shortened.append(tokens[index])
                index += 1
        if shortened == tokens:
            break
        tokens = shortened
    index = 0

    def primary():
        nonlocal index
        if index < len(tokens) and tokens[index] == "(":
            index += 1
            result = chain("or")
            if index >= len(tokens) or tokens[index] != ")":
                raise ValueError("unbalanced check")
            index += 1
            return result
        start = index
        while index < len(tokens) and tokens[index] not in {"and", "or", "(", ")"}:
            index += 1
        atom = tuple(tokens[start:index])
        if not (len(atom) == 3 and atom[1] in {"=", "<>"}
                or len(atom) == 3 and atom[1:] == ("is", "null")
                or len(atom) == 4 and atom[1:] == ("is", "not", "null")):
            raise ValueError("unknown check predicate")
        return ("atom", atom)

    def chain(operator):
        nonlocal index
        child = primary if operator == "and" else lambda: chain("and")
        parts = [child()]
        while index < len(tokens) and tokens[index] == operator:
            index += 1
            parts.append(child())
        flat = [item for part in parts for item in (part[1] if part[0] == operator else [part])]
        return flat[0] if len(flat) == 1 else (operator, tuple(flat))

    try:
        result = chain("or")
        return result if index == len(tokens) else None
    except (ValueError, IndexError):
        return None


def author_check_sql(rows, *, downgrade=False):
    """Only the exact canonical unnamed CHECK is eligible, never a name guess."""
    before, after = (NEW_AUTHOR_CHECK, OLD_AUTHOR_CHECK) if downgrade else (OLD_AUTHOR_CHECK, NEW_AUTHOR_CHECK)
    matches = [row for row in rows if normalized_check(row["expression"]) == normalized_check(before)]
    if len(matches) != 1:
        raise RuntimeError("Unknown or ambiguous workspace author/attempt CHECK")
    name = '"' + matches[0]["name"].replace('"', '""') + '"'
    return [f"ALTER TABLE {EVENTS} DROP CONSTRAINT {name}",
            f"ALTER TABLE {EVENTS} ADD CONSTRAINT {name} CHECK({after})"]


def proof_sql():
    return f"""CREATE FUNCTION {PROOF}(tid VARCHAR,src VARCHAR) RETURNS BOOLEAN
      LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
      SELECT EXISTS(
        SELECT 1 FROM public.control_tasks t
        JOIN public.control_task_runs r ON r.id=t.run_id AND r.task_id=t.id
          AND r.business_id=t.business_id AND r.organization_id=t.organization_id
          AND r.user_id=t.user_id AND r.environment_id=t.environment_id AND r.status='running'
        JOIN public.control_workspace_team_turns tr ON tr.id=t.id
        JOIN public.control_workspace_calibration_allocations a ON a.task_id=t.id AND a.run_id=t.run_id
          AND a.user_id=t.user_id AND a.organization_id=t.organization_id AND a.portfolio_id=tr.portfolio_id
          AND a.business_id=t.business_id AND a.environment_id=t.environment_id AND a.session_id=t.session_id
          AND a.source_revision=t.source_revision AND a.context_sha256=tr.context_sha256
        JOIN public.control_sessions s ON s.id=t.session_id AND s.user_id=t.user_id
          AND s.environment_id=t.environment_id AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
        JOIN public.conversations c ON c.business_id=t.business_id AND c.environment_id=t.environment_id
          AND c.payload->'customer_text_binding'->'task_calibration'=
            (a.plan->'snapshot')||jsonb_build_object('episode_id',a.plan->>'episode_id','script_sha256',a.plan->>'script_sha256')
        JOIN public.jobs j ON j.conversation_id=c.id AND j.business_id=c.business_id AND j.environment_id=c.environment_id
          AND j.kind='quality' AND j.state='succeeded'
          AND j.payload->>'dispatch'='customer-quality-dispatch.v1'
          AND j.payload->>'request_id'=a.plan->>'quality_request_id' AND j.payload->>'model'=a.plan->>'model'
          AND j.payload->>'request_input_sha256'=a.plan->>'quality_request_sha256'
        WHERE t.id=tid AND t.kind='workspace.team_turn' AND t.status='running' AND t.source_revision=src
          AND t.user_id=current_setting('pinet.control_user',true) AND t.environment_id=current_setting('pinet.environment',true)
          AND t.lease_until>clock_timestamp() AND tr.deadline>clock_timestamp() AND a.expires_at>clock_timestamp()
          AND tr.context IS NOT NULL AND tr.context_sha256 IS NOT NULL
          AND tr.context->>'_agent_episode_plan_sha256'=a.plan_sha256
          AND a.plan->'scope'->>'user_id'=t.user_id AND a.plan->'scope'->>'session_id'=t.session_id
          AND a.plan->'scope'->>'business_id'=t.business_id AND a.plan->'scope'->>'organization_id'=t.organization_id
          AND a.plan->'scope'->>'portfolio_id'=tr.portfolio_id AND a.plan->'scope'->>'environment_id'=t.environment_id
          AND a.plan->'scope'->>'source_revision'=t.source_revision
          AND c.payload->'customer_text_binding'->>'user_id'=t.user_id
          AND c.payload->'customer_text_binding'->>'session_id'=t.session_id
          AND c.payload->'customer_text_binding'->>'environment_id'=t.environment_id
          AND a.plan->'snapshot'->>'user_id'=t.user_id AND a.plan->'snapshot'->>'session_id'=t.session_id
          AND a.plan->'snapshot'->>'environment_id'=t.environment_id
          AND a.plan->'snapshot'->>'execution_source_revision'=t.source_revision
          AND EXISTS(SELECT 1 FROM public.control_workspace_calibration_calls x
            JOIN public.conversation_events ev ON ev.conversation_id=x.conversation_id AND ev.event_key=x.call_key
              AND ev.business_id=x.business_id AND ev.environment_id=x.environment_id AND ev.kind='provider_attempt'
            WHERE x.task_id=t.id AND x.run_id=t.run_id AND x.user_id=t.user_id AND x.organization_id=t.organization_id
              AND x.business_id=t.business_id AND x.environment_id=t.environment_id AND x.conversation_id=c.id
              AND x.kind='customer_text' AND x.material->>'episode_id'=a.plan->>'episode_id'
              AND x.material->>'script_sha256'=a.plan->>'script_sha256' AND x.material->>'model'=a.plan->>'model')
          AND EXISTS(SELECT 1 FROM public.control_workspace_calibration_calls x
            JOIN public.conversation_events ev ON ev.conversation_id=x.conversation_id AND ev.event_key=x.call_key
              AND ev.business_id=x.business_id AND ev.environment_id=x.environment_id AND ev.kind='quality_provider_attempt'
            WHERE x.task_id=t.id AND x.run_id=t.run_id AND x.user_id=t.user_id AND x.organization_id=t.organization_id
              AND x.business_id=t.business_id AND x.environment_id=t.environment_id AND x.conversation_id=c.id
              AND x.kind='customer_quality' AND x.material->>'episode_id'=a.plan->>'episode_id'
              AND x.material->>'script_sha256'=a.plan->>'script_sha256' AND x.material->>'model'=a.plan->>'model'
              AND x.material->>'request_id'=a.plan->>'quality_request_id'
              AND x.material->>'request_input_sha256'=a.plan->>'quality_request_sha256'
              AND x.call_key='quality-attempt:'||j.id||':'||(x.material->>'number'))
      )$$"""
