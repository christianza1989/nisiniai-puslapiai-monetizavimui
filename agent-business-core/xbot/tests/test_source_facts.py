"""Projection/compatibility and maintained fake Agent; no live authority or model."""

import copy
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from pydantic import ValidationError
from test_runtime import FakeTransport, queue

from xbot.agent import Agent, Draft, Review
from xbot.contracts import Profile
from xbot.module import Binding, ModuleAdapter
from xbot.service import Service
from xbot.source_facts import manifest_hash, project, text_hash, validate_citations, validate_manifest
from xbot.store import Store, fingerprint

pytest_plugins = ["test_runtime"]


def pages(lengths=(4126, 1656, 3099), host="source.example.invalid"):
    result = []
    for i, length in enumerate(lengths):
        tail = "\n Capacity and price remain unconfirmed. "
        result.append(
            {
                "id": f"page-{i:02}",
                "title": f"Synthetic {i}",
                "url": f"https://{host}/source-{i}/",
                "revision_hash": "a" * 64,
                "projection_hash": "b" * 64,
                "text": ("ą👩\u200d💻\n\t" * length)[: length - len(tail)] + tail,
            }
        )
    return result


def test_exact_unicode_source_groups_and_separate_digests():
    original = pages()
    value = project(list(reversed(original)), canonical_host="source.example.invalid")
    manifest, texts = validate_manifest(
        value["facts"], value["source_fact_manifest"], canonical_host="source.example.invalid"
    )
    assert [len(t) for t in texts] == [4126, 1656, 3099]
    assert texts == [p["text"] for p in original]
    assert len(value["facts"]) == 6 and all(len(f) <= 1800 for f in value["facts"])
    assert [len(g.fact_indices) for g in manifest.groups] == [3, 1, 2]
    assert fingerprint(value["facts"]) != value["source_fact_manifest_sha256"]
    assert manifest_hash(manifest) == value["source_fact_manifest_sha256"]
    assert [g.text_sha256 for g in manifest.groups] == [text_hash(p["text"]) for p in original]
    assert project(original, canonical_host="source.example.invalid") == value


@pytest.mark.parametrize("lengths", [(18001,), (1,) * 36, (18000,) * 4, ()])
def test_capacity_never_drops_text_or_increases_bounds(lengths):
    # Short capacity-only inputs avoid a synthetic tail longer than the page.
    original = [
        {
            "id": f"page-{i:02}",
            "title": "Synthetic",
            "url": "https://source.example.invalid/",
            "revision_hash": "a" * 64,
            "projection_hash": "b" * 64,
            "text": "x" * n,
        }
        for i, n in enumerate(lengths)
    ]
    with pytest.raises(ValueError, match="source_facts_capacity_exceeded"):
        project(original, canonical_host="source.example.invalid")


@pytest.mark.parametrize("change", ["text", "span", "order", "full_hash", "missing", "foreign_url", "bool_index"])
def test_manifest_tamper_and_foreign_scope_fail(change):
    value = project(pages(), canonical_host="source.example.invalid")
    facts, m = value["facts"], value["source_fact_manifest"]
    if change == "text":
        facts[0] = "z" + facts[0][1:]
    elif change == "span":
        m["fragments"][0]["start"] = 1
    elif change == "order":
        m["groups"].reverse()
    elif change == "full_hash":
        m["groups"][0]["text_sha256"] = "f" * 64
    elif change == "missing":
        facts.pop()
    elif change == "foreign_url":
        m["groups"][0]["url"] = "https://foreign.example.invalid/"
    else:
        m["groups"][0]["fact_indices"][0] = False
    with pytest.raises((ValueError, ValidationError)):
        validate_manifest(facts, m, canonical_host="source.example.invalid")


@pytest.mark.parametrize("indices", [[0], [1, 2], [0, 1, 2, 4], [0, 0, 1, 2], [False], [999], list(range(11))])
def test_citation_requires_entire_group_including_qualifier_tail(indices):
    value = project(pages(), canonical_host="source.example.invalid")
    with pytest.raises(ValueError):
        validate_citations(value["facts"], value["source_fact_manifest"], indices)
    validate_citations(value["facts"], value["source_fact_manifest"], [0, 1, 2])
    validate_citations(
        value["facts"], value["source_fact_manifest"], []
    )  # A harmless question is not a fabricated fact.


def test_fixed_prepatch_legacy_shape_hash_and_noop_reads(tmp_path):
    witness = json.loads((Path(__file__).parent / "fixtures/source-facts-legacy.json").read_text("utf-8"))
    p, b = json.loads(witness["profile_serialized"]), json.loads(witness["binding_serialized"])
    for _ in range(2):
        hydrated = Profile.model_validate(p).model_dump()
        binding = Binding.model_validate(b)
        assert json.dumps(hydrated) == witness["profile_serialized"]
        assert json.dumps(binding.model_dump()) == witness["binding_serialized"]
        assert hashlib.sha256(json.dumps(hydrated).encode()).hexdigest() == witness["profile_sha256"]
        assert hashlib.sha256(json.dumps(binding.model_dump()).encode()).hexdigest() == witness["binding_sha256"]
        assert fingerprint(hydrated["facts"]) == witness["facts_sha256"]
        ModuleAdapter.validate_profile(hydrated, binding)
    store = Store(tmp_path / "legacy.sqlite")
    with store.tx() as tx:
        tx.execute("INSERT INTO profiles VALUES(?,?,?)", (p["site_id"], 1, witness["profile_serialized"]))
    for _ in range(2):
        assert store.profile(p["site_id"])["profile"] == p
    with store.tx() as tx:
        assert tx.execute("SELECT payload FROM profiles").fetchone()[0] == witness["profile_serialized"]


def test_manifest_is_separately_bound_even_when_fact_text_does_not_change():
    from test_finish import binding

    from xbot.store import Conflict

    original = project(pages(), canonical_host="source.example.invalid")
    p = Profile(
        site_id="source-test",
        canonical="https://source.example.invalid",
        facts=original["facts"],
        source_fact_manifest=original["source_fact_manifest"],
    ).model_dump()
    bound = binding(p, source_fact_manifest_sha256=original["source_fact_manifest_sha256"])
    p.update(business_id=bound.business_id, environment_id=bound.environment_id, source_binding=bound.model_dump())
    ModuleAdapter.validate_profile(p, bound)
    changed = copy.deepcopy(p)
    changed["source_fact_manifest"]["groups"][0]["title"] = "Changed source provenance"
    assert fingerprint(changed["facts"]) == bound.facts_sha256
    with pytest.raises(Conflict, match="manifest_changed"):
        ModuleAdapter.validate_profile(changed, bound)
    with pytest.raises(ValidationError):
        Draft(text="A synthetic question?", media_brief="", fact_indices=[True])


def test_authorized_private_historical_snapshot_reconstruction_only():
    path = os.environ.get("XBOT_SOURCE_FIXTURE_FILE")
    if not path:
        pytest.skip("optional private historical projection; no current authority claim")
    raw = Path(path).read_bytes()
    if hashlib.sha256(raw).hexdigest() != "fb340810e5809eee2ddf296a576ffb8ffa76c58b5f7eee0150d4356bcabe4b43":
        raise AssertionError("Private historical fixture identity mismatch")
    value = json.loads(raw)
    original = sorted(value["pages"], key=lambda p: p["id"])
    result = project(original, canonical_host=urlsplit(original[0]["url"]).netloc)
    manifest, texts = validate_manifest(result["facts"], result["source_fact_manifest"])
    if any(a != p["text"] for a, p in zip(texts, original, strict=True)):
        raise AssertionError("Private full source reconstruction failed")
    assert [g.text_length for g in manifest.groups] == [4126, 1656, 3099]
    assert len(result["facts"]) == 6
    assert [g.text_sha256 for g in manifest.groups] == [
        "89813231a4e6b6d8c67c4b89688a5df1933531698dd9bd1d7dbd2a9f7f927141",
        "dfbc1a166014c456075c8595f9d112c3950a973647e373fd8f84e843c131c725",
        "7118fae79959f209c9292030152f697102190b677a796c9f0d3fafbb80856066",
    ]


class Runner:
    def __init__(self, indices):
        self.indices, self.seen, self.usage, self.receipt_sink = indices, [], [], None

    async def ask(self, schema, _, evidence):
        self.seen.append((schema.__name__, copy.deepcopy(evidence)))
        self.usage.append({"input_tokens": 7, "output_tokens": 3})
        if schema is Draft:
            return Draft(text="Capacity and price remain unconfirmed.", media_brief="", fact_indices=self.indices)
        return Review(approved=True, unsupported_claims=[], reasons=[])


@pytest.mark.parametrize("partial", [False, True])
async def test_maintained_draft_and_review_share_full_groups_and_citation_gate(env, partial):
    store, config = env
    base = store.profile("phonebridger")
    source = pages(host=urlsplit(base["profile"]["canonical"]).netloc)
    projected = project(source, canonical_host=urlsplit(source[0]["url"]).netloc)
    new_profile = {
        **base["profile"],
        "facts": projected["facts"],
        "source_fact_manifest": projected["source_fact_manifest"],
    }
    store.update_profile(new_profile, base["revision"], "Synthetic complete source")
    runner = Runner([0] if partial else [0, 1, 2])
    service = Service(store, config, FakeTransport(), agent_factory=lambda: Agent(runner=runner))
    config.codex_enabled = True
    queue(
        store,
        kind="draft",
        payload={"title": "Synthetic source", "angle": "Only current approved source"},
        key="synthetic-source-draft",
    )
    result = await service.run_once("phonebridger")
    assert result["state"] == ("blocked" if partial else "completed")
    assert [s for s, _ in runner.seen] == ["Draft", "Review"]
    for _, evidence in runner.seen:
        group = evidence["source_groups"][0]
        assert "".join(evidence["facts"][i] for i in group["fact_indices"]) == source[0]["text"]
        assert evidence["source_fact_manifest"] == projected["source_fact_manifest"]
    assert runner.seen[0][1]["facts"] == runner.seen[1][1]["facts"]
    assert bool(store.records("phonebridger", "draft")) != partial
    assert store.model_usage_totals("phonebridger")["usage"] == {"input_tokens": 14, "output_tokens": 6}
