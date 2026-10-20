"""Offline candidate only. Uses measured directed edges; never calls Native."""
from collections import defaultdict, deque


def shortest_proven_path(initial, target, edges, known_states):
    if initial not in known_states or target not in known_states:
        return None
    if target == initial:
        return []
    adjacency = defaultdict(list)
    outcomes = defaultdict(set)
    eligible = []
    for edge in edges:
        field = edge.get('field', '')
        if (not edge.get('measured') or not edge.get('wireProof')
                or edge.get('from') not in known_states
                or edge.get('to') not in known_states
                or not field.rsplit('.', 1)[0].endswith(('_OPTIONS', '_DIMENSIONS'))):
            continue
        outcomes[(edge['from'], field, edge['requested'])].add(edge['to'])
        eligible.append(edge)
    for edge in eligible:
        if len(outcomes[(edge['from'], edge['field'], edge['requested'])]) == 1:
            adjacency[edge['from']].append(edge)
    parents = {initial: None}
    queue = deque([initial])
    while queue:
        source = queue.popleft()
        for edge in adjacency[source]:
            destination = edge['to']
            if destination in parents:
                continue
            parents[destination] = edge
            if destination == target:
                result = []
                cursor = target
                while cursor != initial:
                    step = parents[cursor]
                    result.append({k: step[k] for k in ('from', 'field', 'requested', 'to')})
                    cursor = step['from']
                return result[::-1]
            queue.append(destination)
    return None
