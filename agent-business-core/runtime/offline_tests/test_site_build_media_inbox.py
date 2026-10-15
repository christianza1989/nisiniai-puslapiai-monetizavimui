"""No provider or operational state: real bounded inbox bytes and dispatch boundary."""
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.control.routes import ControlError
from pinet_core.site_build import media, service, worker


@pytest.fixture
def inbox(tmp_path):
    root = tmp_path / "runtime" / "artifacts"
    root.mkdir(parents=True)
    cid = str(uuid4())
    target = root / "customer-content" / cid / "revision-1" / "media-inbox" / "next.json"
    target.parent.mkdir(parents=True)
    return root, cid, target


def save(target, attachment):
    target.write_text(json.dumps({"version": "site-build-media.v1", "attachment": attachment}), encoding="utf-8")


def test_missing_inbox_is_read_only_and_does_not_create_case_or_media(tmp_path):
    root = tmp_path / "artifacts"
    root.mkdir()
    assert media.read_next(root, str(uuid4()), 1) is None
    assert list(root.iterdir()) == []


def test_exact_case_and_revision_are_selected_without_mutating_receipt(inbox):
    root, cid, target = inbox
    save(target, {"source_name": "baldo-pavirsius.png", "alt": "Ąžuolinis staliukas"})
    before = target.read_bytes()
    assert media.read_next(root, cid, 1)["alt"] == "Ąžuolinis staliukas"
    assert media.read_next(root, str(uuid4()), 1) is None
    assert media.read_next(root, cid, 2) is None
    assert target.read_bytes() == before


@pytest.mark.parametrize("body", [b"", b"x" * (media.LIMIT + 1), b"\xff", b"{", b"[]",
    b'{"version":"site-build-media.v1","attachment":{},"extra":true}',
    b'{"version":"wrong","attachment":{}}',
    b'{"version":"site-build-media.v1","attachment":{},"attachment":{}}',
    b'{"version":"site-build-media.v1","attachment":{"alt":"a","alt":"b"}}'],
    ids=["empty", "oversize", "non-utf8", "truncated", "array", "extra", "wrong-version", "duplicate-root", "duplicate-attachment"])
def test_corrupt_oversize_ambiguous_or_extra_payload_never_becomes_noop(inbox, body):
    root, cid, target = inbox
    target.write_bytes(body)
    with pytest.raises(ControlError, match="site_build_media_inbox_invalid"):
        media.read_next(root, cid, 1)
    assert target.read_bytes() == body


@pytest.mark.parametrize("revision", [0, 21, True, "1", None])
def test_invalid_revision_cannot_select_another_case(inbox, revision):
    root, cid, _ = inbox
    with pytest.raises(ControlError, match="site_build_media_inbox_invalid"):
        media.read_next(root, cid, revision)


def test_replaced_file_between_check_and_open_is_refused(inbox, monkeypatch):
    root, cid, target = inbox
    save(target, {"original": True})
    original_open = media.os.open

    def replaced(path, flags):
        alternative = target.with_name("replacement.json")
        save(alternative, {"replacement": True})
        alternative.replace(target)
        return original_open(path, flags)

    monkeypatch.setattr(media.os, "open", replaced)
    with pytest.raises(ControlError, match="site_build_media_inbox_invalid"):
        media.read_next(root, cid, 1)


def test_symlink_inbox_cannot_import_a_foreign_receipt(inbox, tmp_path):
    root, cid, target = inbox
    outside = tmp_path / "foreign.json"
    save(outside, {})
    try:
        target.symlink_to(outside)
    except OSError:
        pytest.skip("OS does not permit creating this symlink fixture")
    with pytest.raises(ControlError, match="site_build_media_inbox_invalid"):
        media.read_next(root, cid, 1)


async def test_absent_inbox_never_imports_or_dispatches_provider(inbox, monkeypatch):
    root, cid, _ = inbox
    monkeypatch.setattr(media.studio, "configuration", lambda: (None, None, root, {}))
    assert await media.advance(object(), object(), SimpleNamespace(id=cid, current_revision=1), {}) is None


@pytest.mark.parametrize("changed", [False, True])
async def test_real_strict_inbox_delegates_same_owner_and_original_fences_once(inbox, monkeypatch, changed):
    from pinet_core.creation import media as attachment

    root, cid, target = inbox
    request = {"accepted_revision": 1, "candidate_sha256": "a" * 64, "canonical_host": "media.example.test",
        "page_id": "page-" + "b" * 24, "expected_site_sha256": "c" * 64,
        "expected_revision_sha256": "d" * 64, "expected_planning_sha256": "e" * 64,
        "source_name": "existing.png", "source_sha256": "f" * 64, "mime": "image/png",
        "alt": "Tikras bandymo failas", "rights": "Izoliuotas sintetinis bandymas"}
    save(target, request)
    before = target.read_bytes()
    tx, session = object(), object()
    calls = []

    async def attach(actual_tx, actual_session, actual_id, value):
        assert actual_tx is tx and actual_session is session and actual_id == cid
        assert isinstance(value, attachment.MediaAttachment)
        assert all(getattr(value, key) == expected for key, expected in request.items())
        calls.append(value)
        return {"attachment": {"changed": changed, "requestHash": "1" * 64, "receiptSha256": "2" * 64}}

    monkeypatch.setattr(media.studio, "configuration", lambda: (None, None, root, {}))
    monkeypatch.setattr(attachment, "attach", attach)
    creation = SimpleNamespace(id=cid, current_revision=1)
    proof = {key: request[key] for key in ("accepted_revision", "candidate_sha256", "canonical_host")}
    result = await media.advance(tx, session, creation, proof)
    assert result == ({"page_id": request["page_id"]} if changed else None)
    assert len(calls) == 1 and target.read_bytes() == before
    assert len(list((target.parent / "completed").glob("*.json"))) == 1
    # A later legitimate GUIDE write changes target revision. The completed
    # operation must not call the strict attachment primitive a second time.
    assert await media.advance(tx, session, creation, proof) is None
    assert len(calls) == 1

    ack = next((target.parent / "completed").glob("*.json"))
    saved = ack.read_bytes()
    corrupted = json.loads(saved)
    corrupted["candidateSha256"] = "9" * 64
    ack.write_text(json.dumps(corrupted), encoding="utf-8")
    with pytest.raises(ControlError, match="site_build_media_ack_invalid"):
        await media.advance(tx, session, creation, proof)
    assert len(calls) == 1


async def test_replaced_next_remains_pending_and_foreign_proof_cannot_use_old_ack(inbox, monkeypatch):
    from pinet_core.creation import media as attachment

    root, cid, target = inbox
    request = {"accepted_revision": 1, "candidate_sha256": "a" * 64, "canonical_host": "media.example.test",
        "page_id": "page-" + "b" * 24, "expected_site_sha256": "c" * 64,
        "expected_revision_sha256": "d" * 64, "expected_planning_sha256": "e" * 64,
        "source_name": "existing.png", "source_sha256": "f" * 64, "mime": "image/png",
        "alt": "Pirmasis vaizdas", "rights": "Sintetinis testas"}
    save(target, request)
    creation = SimpleNamespace(id=cid, current_revision=1)
    proof = {key: request[key] for key in ("accepted_revision", "candidate_sha256", "canonical_host")}
    calls = []

    async def attach(*args):
        calls.append(args[-1].alt)
        if len(calls) == 1:
            save(target, {**request, "alt": "Antrasis vaizdas"})
        return {"attachment": {"changed": True, "requestHash": "1" * 64, "receiptSha256": "2" * 64}}

    monkeypatch.setattr(media.studio, "configuration", lambda: (None, None, root, {}))
    monkeypatch.setattr(attachment, "attach", attach)
    await media.advance(object(), object(), creation, proof)
    replacement = target.read_bytes()
    assert calls == ["Pirmasis vaizdas"]
    await media.advance(object(), object(), creation, proof)
    assert calls == ["Pirmasis vaizdas", "Antrasis vaizdas"]
    assert target.read_bytes() == replacement
    assert len(list((target.parent / "completed").glob("*.json"))) == 2
    with pytest.raises(ControlError, match="media_context_stale"):
        await media.advance(object(), object(), creation, {**proof, "candidate_sha256": "9" * 64})
    assert len(calls) == 2


@pytest.mark.parametrize("extra", [{"source_path": "C:/foreign.png"}, {"source_name": "../../foreign.png"},
                                  {"accepted_revision": True}])
async def test_invalid_attachment_does_not_reach_bridge(inbox, monkeypatch, extra):
    from pinet_core.creation import media as attachment

    root, cid, target = inbox
    save(target, extra)

    async def forbidden(*_):
        pytest.fail("Invalid receipt must not dispatch the bridge")

    monkeypatch.setattr(media.studio, "configuration", lambda: (None, None, root, {}))
    monkeypatch.setattr(attachment, "attach", forbidden)
    with pytest.raises(ControlError, match="site_build_media_inbox_invalid"):
        await media.advance(object(), object(), SimpleNamespace(id=cid, current_revision=1), {})


@pytest.mark.parametrize("state", ["updated", "blocked"])
async def test_media_observation_cannot_dispatch_creation_or_guide_provider(monkeypatch, state):
    cid = str(uuid4())

    async def advance(_):
        return service.observation(cid, "media_preparation", state)

    async def forbidden(**_):
        pytest.fail("Media attachment cannot dispatch a text/model worker")

    monkeypatch.setattr(service, "advance", advance)
    monkeypatch.setattr(worker.creations, "execute_once", forbidden)
    monkeypatch.setattr(worker.guides, "execute_once", forbidden)
    result = await worker.tick(cid)
    assert result["executed"] is False
    assert result["foundation_status"] == result["public_launch"] == "UNVERIFIED"
