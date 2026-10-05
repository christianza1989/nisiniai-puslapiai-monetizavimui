from conftest import knowledge, start, worker

from pinet_core.config import settings
from pinet_core.jobs import grounded_followup
from pinet_core.service import PROMPT_HASH


async def test_second_profile_has_own_prompt_and_fields_without_automatic_voice(client):
    session = await start(client, "greitossvetaines")
    claimed = await worker(client, session, "/claim", {"owner": "profile-test"}, site="greitossvetaines")
    assert claimed.status_code == 200
    value = claimed.json()
    assert "greitossvetaines.lt" in value["prompt"] and "traktoriupadangos.lt" not in value["prompt"]
    assert "svetainės tikslą" in value["prompt"]
    event = await worker(client, session, "/events", {"epoch": value["epoch"], "event_key": "need",
        "kind": "client_transcript", "text": "Reikia reprezentacinės svetainės su penkiais puslapiais."}, site="greitossvetaines")
    args = {"base_revision": 0, "fields": {"pages": "5"}, "evidence_event_id": event.json()["event_id"]}
    response = await worker(client, session, "/tools", {"epoch": value["epoch"], "call_id": "website-need",
        "name": "need.patch", "arguments": args}, site="greitossvetaines")
    assert response.status_code == 200
    args.update(base_revision=1, fields={"tyre_marking": "420/85 R28"})
    assert (await worker(client, session, "/tools", {"epoch": value["epoch"], "call_id": "wrong-niche",
        "name": "need.patch", "arguments": args}, site="greitossvetaines")).status_code == 422
    assert settings().voice_enabled is False


async def test_tractor_profile_rejects_website_fields(client):
    session = await start(client)
    claimed = (await worker(client, session, "/claim", {"owner": "profile-test"})).json()
    event = (await worker(client, session, "/events", {"epoch": claimed["epoch"], "event_key": "need",
        "kind": "client_transcript", "text": "Sintetinis testas."})).json()
    assert (await worker(client, session, "/tools", {"epoch": claimed["epoch"], "call_id": "wrong-field",
        "name": "need.patch", "arguments": {"base_revision": 0, "fields": {"pages": "5"},
        "evidence_event_id": event["event_id"]}})).status_code == 422


def test_followup_is_profile_specific_and_prefers_relevant_approved_sources():
    current = knowledge("greitossvetaines")
    current["pages"] = [{**current["pages"][0], "id": f"irrelevant-{i}", "title": "Privatumo aprašas", "text": "Duomenų saugojimas"}
                        for i in range(3)] + [{**current["pages"][0], "id": "relevant", "title": "Svetainės puslapiai", "text": "Svetainės puslapiai"}]
    result = grounded_followup({"knowledge": current, "test": True, "release_hash": PROMPT_HASH,
        "evidence": [{"id": "fixture", "speaker": "client", "text": "Reikia svetainės puslapių"}]})
    assert result["source_refs"][0]["id"] == "relevant"
    assert "greitossvetaines.lt" in result["body"] and "traktoriupadangos.lt" not in result["body"]
    assert "padangos žymėjimą" not in result["body"] and result["test"] is True
