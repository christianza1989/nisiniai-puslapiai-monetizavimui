"""Read saved role outcomes without turning reservations into success or exposing receipts."""


def attempt_state(job, attempt):
    fallback = "reserved" if job and job.status in {"queued", "running"} else "interrupted"
    usage = job.usage if job else None
    if not isinstance(usage, dict) or not isinstance(usage.get("roles"), list):
        return fallback
    receipts = usage["roles"]
    # Corrupt/coerced outcomes cannot prove completion. Old jobs without outcomes
    # remain readable; no worker, attempt, accounting or historical record is edited.
    if any(not isinstance(item, dict)
           or type(item.get("sequence")) is not int
           or not 1 <= item["sequence"] <= 6
           or not isinstance(item.get("role"), str)
           or item.get("role") not in {"creator", "critic", "coordinator"}
           or not isinstance(item.get("outcome"), str)
           or item.get("outcome") not in {"succeeded", "failed"} for item in receipts):
        return fallback
    matches = [item for item in receipts if item["sequence"] == attempt.sequence]
    if len(matches) != 1 or matches[0]["role"] != attempt.role:
        return fallback
    return matches[0]["outcome"]
