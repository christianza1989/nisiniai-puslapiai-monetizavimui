"""Reply approval binds one authenticated inbound; old initial plans stay strict."""

import hashlib
import json
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_gmail_campaign import plan

from pinet_core.mail_provider.campaign import CampaignPlan
from pinet_core.mail_provider.conversation import ConversationGmail, ConversationPlan
from pinet_core.mail_provider.gmail import GmailError


def reply_plan():
    value = plan()
    value.update(parent_plan_path="C:/private/known-inert-plan.json", parent_plan_sha256="c" * 64)
    value["letters"][0].update(
        parent_mail_id=str(uuid4()),
        inbound_mail_id=str(uuid4()),
        inbound_sha256="d" * 64,
        reviewed_classification="question",
        reviewed_action="reply",
    )
    return value


def test_reply_plan_does_not_become_initial_or_followup_authority():
    value = reply_plan()
    assert ConversationPlan.model_validate(value).letters[0].reviewed_classification == "question"
    with pytest.raises(ValidationError):
        CampaignPlan.model_validate(value)
    with pytest.raises(ValidationError):
        ConversationPlan.model_validate(plan())


def test_owner_acceptance_has_no_other_recipient():
    value = reply_plan()
    value["purpose"] = "owner_acceptance"
    with pytest.raises(ValidationError):
        ConversationPlan.model_validate(value)
    value["letters"][0]["recipient"] = value["sender"]
    assert ConversationPlan.model_validate(value).purpose == "owner_acceptance"


def test_only_sealed_root_or_requested_reply_plans_form_a_bounded_parent_chain(tmp_path):
    root = plan()
    path = tmp_path / "initial.json"
    path.write_text(json.dumps(root), "utf-8")
    previous, digest = path, hashlib.sha256(path.read_bytes()).hexdigest()
    for turn in range(33):
        value = reply_plan()
        value.update(connection_id=root["connection_id"], business_id=root["business_id"], sender=root["sender"],
                     parent_plan_path=str(previous), parent_plan_sha256=digest)
        current = tmp_path / f"reply-{turn}.json"
        current.write_text(json.dumps(value), "utf-8")
        checksum = hashlib.sha256(current.read_bytes()).hexdigest()
        if turn < 32:
            gateway = ConversationGmail(None, root["connection_id"], "unused-known-token", root["business_id"],
                plan_path=current, plan_sha256=checksum)
            assert gateway.plan.parent_plan_sha256 == digest
        else:
            with pytest.raises(GmailError, match="gmail_conversation_parent_limit"):
                ConversationGmail(None, root["connection_id"], "unused-known-token", root["business_id"],
                    plan_path=current, plan_sha256=checksum)
        previous, digest = current, checksum


def test_a_changed_parent_seal_never_becomes_initial_authority(tmp_path):
    root = plan()
    parent = tmp_path / "initial.json"
    parent.write_text(json.dumps(root), "utf-8")
    value = reply_plan()
    value.update(connection_id=root["connection_id"], business_id=root["business_id"], sender=root["sender"],
                 parent_plan_path=str(parent), parent_plan_sha256="0" * 64)
    current = tmp_path / "reply.json"
    current.write_text(json.dumps(value), "utf-8")
    with pytest.raises(GmailError, match="gmail_campaign_plan_unavailable"):
        ConversationGmail(None, root["connection_id"], "unused-known-token", root["business_id"],
            plan_path=current, plan_sha256=hashlib.sha256(current.read_bytes()).hexdigest())


@pytest.mark.parametrize("change", ["refusal", "ooo", "hold", "hash", "parent", "extra"])
def test_reviewed_request_refuses_missing_identity_and_nonrequest_actions(change):
    value = reply_plan()
    if change in {"refusal", "ooo"}:
        value["letters"][0]["reviewed_classification"] = change
    elif change == "hold":
        value["letters"][0]["reviewed_action"] = "hold"
    elif change == "hash":
        value["letters"][0]["inbound_sha256"] = "wrong"
    elif change == "parent":
        del value["letters"][0]["parent_mail_id"]
    else:
        value["resume_marketing"] = True
    with pytest.raises(ValidationError):
        ConversationPlan.model_validate(value)
