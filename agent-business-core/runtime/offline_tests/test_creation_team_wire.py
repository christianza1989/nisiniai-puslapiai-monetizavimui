"""Global durable timeline counters are independent of bounded response windows."""
from pinet_core.creation.team_wire import AttemptView, TeamEventView, TeamView


def test_global_event_counter_does_not_bound_history_or_per_job_calls():
    sequence = TeamEventView.model_json_schema()["properties"]["sequence"]
    assert sequence["minimum"] == 1 and "maximum" not in sequence
    assert AttemptView.model_json_schema()["properties"]["sequence"]["maximum"] == 6
    response = TeamView.model_json_schema()["properties"]
    assert response["attempts"]["maxItems"] == 120
    assert response["events"]["maxItems"] == 300
