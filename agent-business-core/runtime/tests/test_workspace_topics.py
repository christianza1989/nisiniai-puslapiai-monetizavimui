import hashlib
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_topics.wire import (
    AppendMessage,
    Create,
    History,
    MessageResult,
    MessageView,
    ReceiptView,
    SetMetadata,
    Topics,
    TopicView,
)


def topic(**changes):
    now = datetime.now(UTC)
    return dict(topic_id=uuid4(), portfolio_id=uuid4(), anchor=dict(kind="portfolio", selection_id=uuid4()),
        title="Sintetinė tema", pinned=False, archived_at=None, metadata_revision=1, message_sequence=0,
        created_at=now, updated_at=now, execution="not_connected", can_store_message=True, can_dispatch=False, **changes)


def message(topic_id=None, sequence=1):
    content = "Sintetinė žinutė: @agentas yra tekstas, ne dispatch."
    return dict(message_id=uuid4(), topic_id=topic_id or uuid4(), sequence=sequence, author_type="user",
        author_user_id=uuid4(), content=content, content_sha256=hashlib.sha256(content.encode()).hexdigest(),
        stored_source_revision="a"*40, created_at=datetime.now(UTC), dispatch_state="stored_without_dispatch")


def test_inputs_bound_plain_text_and_never_accept_author_or_runtime_fields():
    Create(idempotency_key=uuid4(), anchor=dict(kind="portfolio", selection_id=uuid4()), title="Verslo tema")
    SetMetadata(idempotency_key=uuid4(), expected_metadata_revision=1, title="Naujas vardas", pinned=True, archived=False)
    for title in (" ", "a"*121, "Paslėpta\x01", "Vardas\x85", "\ud800"):
        with pytest.raises(ValidationError):
            Create(idempotency_key=uuid4(), anchor=dict(kind="portfolio", selection_id=uuid4()), title=title)
    for text in ("\n\t", "a"*2501, "a\x01", "a\x85", "\ud800"):
        with pytest.raises(ValidationError):
            AppendMessage(idempotency_key=uuid4(), content=text)
    valid = dict(idempotency_key=uuid4(), content="Lietuviškas klausimas\nIr nauja eilutė.")
    AppendMessage(**valid)
    for key in ("author_type", "author_user_id", "recipient", "source_revision", "capabilities", "dispatch"):
        with pytest.raises(ValidationError):
            AppendMessage(**valid, **{key: "arbitrary"})


def test_topic_projection_cannot_fabricate_dispatch_or_archived_write_state():
    value = topic()
    TopicView.model_validate(value)
    for patch in ({"can_dispatch": True}, {"execution": "running"}, {"archived_at": value["created_at"]}):
        with pytest.raises(ValidationError):
            TopicView.model_validate(value | patch)
    TopicView.model_validate(value | {"archived_at": value["created_at"], "can_store_message": False})
    from pinet_core.workspace_topics.wire import MAX_CLOCK
    TopicView.model_validate(value | {"message_sequence": MAX_CLOCK, "can_store_message": False})
    with pytest.raises(ValidationError):
        TopicView.model_validate(value | {"message_sequence": MAX_CLOCK})


def test_message_projection_retains_exact_user_content_and_refuses_forged_sender():
    value = message()
    MessageView.model_validate(value)
    for patch in ({"author_type": "coordinator"}, {"dispatch_state": "queued"}, {"content": "Changed"}):
        with pytest.raises(ValidationError):
            MessageView.model_validate(value | patch)


def test_page_and_history_bind_identity_cutoff_and_immutable_sequence():
    value = topic()
    Topics(portfolio_id=value["portfolio_id"], anchor=value["anchor"], items=[value], next_cursor=None,
        can_create_topic=True, execution="not_connected")
    with pytest.raises(ValidationError):
        Topics(portfolio_id=value["portfolio_id"], anchor=None, items=[value, value], next_cursor=None,
            can_create_topic=True, execution="not_connected")
    first, second = message(value["topic_id"]), message(value["topic_id"], 2)
    History(topic_id=value["topic_id"], items=[first, second], next_cursor=None, cutoff_sequence=2)
    for items, cutoff in (([second, first], 2), ([first, first], 2), ([second], 1), ([message()], 2)):
        with pytest.raises(ValidationError):
            History(topic_id=value["topic_id"], items=items, next_cursor=None, cutoff_sequence=cutoff)


def test_receipt_binds_exact_message_and_cannot_claim_current_permission():
    m = message()
    r = dict(receipt_id=uuid4(), topic_id=m["topic_id"], idempotency_key=uuid4(), operation="append_message",
        accepted_metadata=None, message_id=m["message_id"], message_sequence=m["sequence"],
        content_sha256=m["content_sha256"], accepted_source_revision="a"*40, accepted_at=m["created_at"])
    MessageResult(receipt=r, message=m)
    for patch in ({"message_id": uuid4()}, {"message_sequence": 2}, {"content_sha256": "b"*64}):
        with pytest.raises(ValidationError):
            MessageResult(receipt=r | patch, message=m)
    with pytest.raises(ValidationError):
        ReceiptView.model_validate(r | {"can_store_message": True})
    with pytest.raises(ValidationError):
        ReceiptView.model_validate(r | {"operation": "set_metadata"})


def test_reciprocal_model_keys_match_one_receipt_message_pair():
    from pinet_core.workspace_topics.models import Message, Receipt
    for table, constraint in ((Message.__table__, "fk_workspace_message_receipt_pair"),
                              (Receipt.__table__, "fk_workspace_receipt_message_pair")):
        fk = next(f for f in table.foreign_key_constraints if f.name == constraint)
        assert fk.deferrable and fk.initially == "DEFERRED"
        assert len(fk.elements) == 7
        assert {e.parent.name for e in fk.elements} >= {"topic_id", "user_id", "environment_id"}
    assert next(f for f in Receipt.__table__.foreign_key_constraints
                if f.name == "fk_workspace_receipt_session").ondelete == "RESTRICT"
