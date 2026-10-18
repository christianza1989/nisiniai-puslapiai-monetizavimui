"""Reply approval binds one authenticated inbound; old initial plans stay strict."""

from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_gmail_campaign import plan

from pinet_core.mail_provider.campaign import CampaignPlan
from pinet_core.mail_provider.conversation import ConversationPlan


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
