"""Scheduling outcomes are separate from quality acceptance."""

FINITE={'FINITE_GRAPH_BUDGET','FINITE_TIME_BOUNDARY'}


def disposition(result, visit_chunks):
    if result['graph']['closed'] and result['stopReason'] is None:
        return 'SOURCE_CLOSED'
    reason=result.get('stopReason')
    if reason in {'DISK_RESERVE','OWNER_PAUSE','GRANT_CHANGED','MATCHING_GLOBAL_RESERVATION_REQUIRED'}:
        return 'GLOBAL_HOLD'
    if reason and (reason.startswith('UnknownOutcome') or reason=='SESSION_NOT_AVAILABLE'):
        return 'TRANSPORT_REVIEW'
    if reason in FINITE:
        return 'DEFER_GROWING' if visit_chunks>=10 else 'CONTINUE_CURRENT'
    return 'MODEL_REVIEW'


def remaining_order(jobs, state):
    complete=set(state['completedSource'])
    problems={r['job'] for r in state['tail']}
    deferred=set(state.get('deferredQueue',[]))
    pending=[j for j in jobs if j['job'] not in complete|problems]
    # Stable priority order first, then the earlier growing graphs in their
    # saved order. Never throw away an incomplete checkpoint after a budget.
    lookup={j['job']:j for j in pending}
    return [j for j in pending if j['job'] not in deferred]+[lookup[k] for k in state.get('deferredQueue',[]) if k in lookup]


def continuation_visits(state):
    """Preserve a growing run across supervisor restarts, reset after deferral."""
    if 'growingVisits' not in state:
        excluded=set(state.get('completedSource',[]))|set(state.get('deferredQueue',[]))
        state['growingVisits']={key:count for key,count in state.get('chunks',{}).items() if key not in excluded}
    return state['growingVisits']


def record_visit(state,job,result):
    visits=continuation_visits(state)
    visits[job]=visits.get(job,0)+1
    outcome=disposition(result,visits[job])
    if outcome in {'SOURCE_CLOSED','DEFER_GROWING'}:visits.pop(job,None)
    return outcome
