"""Receipt chronology, causality and privacy, without provider or database calls."""

from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_customer_quality import row

from pinet_core import quality_context
from pinet_core.customer_agents import quality


def event(sequence, kind, key, payload):
    return SimpleNamespace(id=str(uuid4()), sequence=sequence, kind=kind, event_key=key, payload=payload)


def history():
    events, state = [], {}
    for index, amount in enumerate(("100", "50")):
        request, run = str(uuid4()), str(uuid4())
        client = event(
            len(events) + 1, "client_transcript", "client:" + request, {"text": "Synthetic correction"}
        )
        events.append(client)
        events.append(
            event(
                len(events) + 1,
                "provider_attempt",
                "attempt:" + request,
                dict(
                    request_id=request,
                    run_id=run,
                    epoch=index + 1,
                    model="gpt-6-luna",
                    need_revision=index,
                    private_auth="NEVER_PROJECT_THIS",
                ),
            )
        )
        events.append(
            event(
                len(events) + 1,
                "provider_usage",
                "usage:" + request,
                dict(request_id=request, run_id=run, model="gpt-6-luna", failure_code=None, usage=None),
            )
        )
        state = deepcopy(state)
        if not index:
            state["goal"] = dict(value="Synthetic course", status="proposed", evidence=client.id)
            state["deadline"] = dict(value="Tentatively next week", status="proposed", evidence=client.id)
        state["budget"] = dict(value=amount, status="proposed", evidence=client.id)
        events.append(
            event(
                len(events) + 1,
                "tool",
                "need:" + request,
                dict(
                    name="need.patch",
                    result=dict(revision=index + 1, fields=deepcopy(state), recommendations_invalidated=True),
                ),
            )
        )
        events.append(
            event(
                len(events) + 1,
                "customer_text_result",
                "result:" + request,
                dict(request_id=request, status="succeeded", reply="Synthetic reply"),
            )
        )
    value = row()
    value.state = "finalized"
    value.payload["need"] = state
    value.need_revision = 2
    return value, events


async def test_actual_need_receipts_are_in_existing_quality_timeline(monkeypatch):
    value, events = history()

    async def source(*_):
        return dict(schema_version=2, site_id="synthetic", pages=[])

    monkeypatch.setattr(quality, "current_source", source)
    original = deepcopy((value.payload, [e.payload for e in events]))
    data = await quality.projection(None, value, events, [], [])
    receipts = [e for e in data["timeline"] if e["kind"] == "need_patch"]
    assert len(receipts) == 2, "Real accepted need receipts are missing from the quality input"
    assert receipts[0]["state_after"]["budget"]["value"] == "100"
    assert receipts[1]["state_after"]["budget"]["value"] == "50"
    assert receipts[1]["state_after"]["deadline"]["evidence"] == events[0].id
    assert [r["id"] for r in data["evidence"]] == [events[i].id for i in (0, 4, 5, 9)]
    assert original == (value.payload, [e.payload for e in events])
    assert "NEVER_PROJECT_THIS" not in str(data)


def test_full_state_preserves_unchanged_earlier_evidence_and_exact_chronology():
    value, events = history()
    original = deepcopy((value.payload, [e.payload for e in events]))
    receipts = quality.need_receipts(value, events)
    assert [(r["base_revision"], r["revision"]) for r in receipts] == [(0, 1), (1, 2)]
    assert receipts[-1]["client_event_id"] == events[5].id
    assert receipts[-1]["state_after"]["goal"]["evidence"] == events[0].id
    assert receipts[-1]["state_after"]["budget"]["evidence"] == events[5].id
    assert original == (value.payload, [e.payload for e in events])
    assert "NEVER_PROJECT_THIS" not in str(receipts)


@pytest.mark.parametrize(
    "change",
    [
        "client",
        "attempt",
        "usage",
        "reply",
        "failed_reply",
        "usage_failed",
        "run",
        "epoch",
        "request",
        "base_revision",
        "revision",
        "boolean_revision",
        "recommendations",
        "foreign_field",
        "foreign_evidence",
        "changed_old_evidence",
        "lost_field",
        "extra_field_payload",
        "order",
        "duplicate_key",
        "duplicate_sequence",
        "final_need",
        "final_revision",
    ],
)
def test_missing_or_conflicting_provenance_never_implies_saved_need(change):
    value, events = history()
    if change in {"client", "attempt", "usage", "reply"}:
        events.pop({"client": 5, "attempt": 6, "usage": 7, "reply": 9}[change])
    elif change == "failed_reply":
        events[9].payload["status"] = "failed"
    elif change == "usage_failed":
        events[7].payload["failure_code"] = "output_invalid"
    elif change == "run":
        events[7].payload["run_id"] = str(uuid4())
    elif change == "epoch":
        events[6].payload["epoch"] = 0
    elif change == "request":
        events[6].payload["request_id"] = str(uuid4())
    elif change == "base_revision":
        events[6].payload["need_revision"] = 0
    elif change in {"revision", "boolean_revision"}:
        events[8].payload["result"]["revision"] = 9 if change == "revision" else True
    elif change == "recommendations":
        events[8].payload["result"]["recommendations_invalidated"] = False
    elif change == "foreign_field":
        events[8].payload["result"]["fields"]["email"] = deepcopy(
            events[8].payload["result"]["fields"]["budget"]
        )
    elif change == "foreign_evidence":
        events[8].payload["result"]["fields"]["budget"]["evidence"] = str(uuid4())
    elif change == "changed_old_evidence":
        events[8].payload["result"]["fields"]["budget"]["evidence"] = events[0].id
    elif change == "lost_field":
        del events[8].payload["result"]["fields"]["deadline"]
    elif change == "extra_field_payload":
        events[8].payload["result"]["fields"]["budget"]["private_contact"] = "NEVER_PROJECT_THIS"
    elif change == "order":
        events[7], events[8] = events[8], events[7]
    elif change == "duplicate_key":
        events[9].event_key = events[4].event_key
    elif change == "duplicate_sequence":
        events[9].sequence = events[8].sequence
    elif change == "final_need":
        value.payload["need"]["budget"]["value"] = "999"
    elif change == "final_revision":
        value.need_revision = 1
    with pytest.raises(ValueError, match="need_receipt_conflict"):
        quality.need_receipts(value, events)


def test_unpatched_reply_does_not_claim_save_or_require_known_usage():
    value, events = history()
    value.payload["need"], value.need_revision = {}, 0
    events = [e for e in events[:5] if e.kind != "tool"]
    assert quality.need_receipts(value, events) == []


@pytest.mark.parametrize("raw", [None, "Tentative original qualifier"])
def test_optional_raw_value_normalization_preserves_real_qualifiers(raw):
    value, events = history()
    for receipt in (events[3], events[8]):
        receipt.payload["result"]["fields"]["deadline"]["raw_value"] = raw
    value.payload["need"]["deadline"]["raw_value"] = raw
    nodes = quality.need_receipts(value, events)
    assert nodes[-1]["state_after"]["deadline"].get("raw_value") == raw
    if raw is not None:
        value.payload["need"]["deadline"]["raw_value"] = "Changed qualifier"
        with pytest.raises(ValueError, match="need_receipt_conflict"):
            quality.need_receipts(value, events)


class AttributionLab:
    async def ask(self, schema, instruction, data):
        self.data = data
        return schema(
            root_cause="communication",
            suggested_scope="clarification",
            evidence_event_ids=[data["evidence"][0]["id"]],
            explanation="Synthetic attribution",
        )


@pytest.mark.parametrize("customer", [False, True])
async def test_attribution_receives_validated_customer_receipts_only_in_customer_mode(customer):
    value, events = history()
    evidence, timeline, _ = quality.transcript(events)
    receipts = quality.need_receipts(value, events)
    data = dict(
        evidence=evidence,
        timeline=sorted(timeline + receipts, key=lambda x: x["sequence"]),
        knowledge={},
        need=value.payload["need"],
        actual_core_followup=None,
    )
    if customer:
        data["customer_quality"] = {}
    result = dict(root_cause="knowledge", issues=["Synthetic defect"])
    lab = AttributionLab()
    await quality_context.attribute(lab, result, data)
    assert ("need_receipts" in lab.data) is customer
    if customer:
        assert lab.data["need_receipts"] == receipts
    assert "NEVER_PROJECT_THIS" not in str(lab.data)
