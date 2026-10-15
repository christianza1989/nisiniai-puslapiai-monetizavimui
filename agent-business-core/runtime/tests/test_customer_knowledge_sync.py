"""Actual maintained public projection and separate restricted-PG transfer/permission gates."""

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import (  # noqa: F401 - explicit shared fixtures
    accepted,
    creation,
    customers,
    provision,
    registration,
)
from test_customer_profile import profile as profile_fixture

from pinet_core import knowledge_index as index
from pinet_core import onboarding
from pinet_core.config import settings
from pinet_core.models import KnowledgeState, utcnow

ROOT = Path(__file__).resolve().parents[1]
profile = profile_fixture
PUBLIC = Path(os.environ.get("PINET_PUBLIC_CORE_PATH", str(ROOT.parents[2] / "dovanos-memorycasting")))
spec = importlib.util.spec_from_file_location(
    "customer_knowledge_sync", ROOT / "scripts/customer_knowledge_sync.py"
)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root, encoding="utf-8").strip()


def node(source):
    return json.loads(
        subprocess.check_output(["node", "--input-type=module", "-e", source], encoding="utf-8")
    )


def prepared_projection(tmp_path):
    core = tmp_path / "core"
    helper_names = [
        "lib/content-projection-v2.mjs",
        "scripts/content-package-v2.mjs",
        "scripts/content-package-core.mjs",
        "scripts/content-v2-admission.mjs",
        "schemas/content-package.v2.schema.json",
    ]
    for name in helper_names:
        file = core / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes((PUBLIC / name).read_bytes())
    (core / ".gitignore").write_text("output/\n")
    git(core, "init", "-b", "codex/isolated-projection-test")
    git(core, "add", ".")
    git(
        core,
        "-c",
        "user.name=Synthetic fixture",
        "-c",
        "user.email=fixture@example.com",
        "commit",
        "-m",
        "Owned projection fixture",
    )
    site = "creation-" + uuid4().hex
    fixture = node(f"""
        import {{nativeFixture,approveFixture}} from {json.dumps((PUBLIC / "tests/fixtures/native-niche-v2.mjs").as_uri())};
        const pkg=nativeFixture({{siteId:{json.dumps(site)},boundary:'2099-01-01T00:00:00.000Z'}});
        for(let i=0;i<32;i++){{const p=structuredClone(pkg.pages[3]);p.id='additional-'+i;p.slug='papildomas-'+i;pkg.pages.push(p);}}
        console.log(JSON.stringify(approveFixture(pkg)));
    """)
    sandbox = core / "output/preview"
    for name in helper_names:
        file = sandbox / name
        file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(core / name, file)
    directory = sandbox / "content-packages" / site
    directory.mkdir(parents=True)
    (sandbox / "lib/generated").mkdir()
    (sandbox / "config").mkdir()
    raw = json.dumps(fixture, ensure_ascii=False).encode()
    (directory / "content-package.json").write_bytes(raw)
    (directory / "activation.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "scope": "local-preview",
                "testOnly": True,
                "siteId": site,
                "canonicalHost": fixture["canonicalHost"],
                "renderer": "niche",
                "packageSha256": hashlib.sha256(raw).hexdigest(),
                "reviewer": "synthetic-local-test",
                "acceptedAt": utcnow().isoformat(),
            }
        )
    )
    (sandbox / "lib/generated/content-packages.json").write_text(json.dumps([fixture]))
    (sandbox / "config/niche-network.json").write_text(
        json.dumps(
            {
                "defaultEmail": fixture["site"]["contact"]["email"],
                "operatorName": fixture["site"]["operatorName"],
            }
        )
    )
    (sandbox / "config/commerce-targets.json").write_text('{"targets":[]}')
    request = {
        "public_core": str(core),
        "public_source_revision": git(core, "rev-parse", "HEAD"),
        "sandbox": str(sandbox),
        "site_id": site,
        "canonical_host": fixture["canonicalHost"],
        "package_sha256": hashlib.sha256(raw).hexdigest(),
        "base_revision": 0,
    }
    return request, fixture


def project(request):
    return subprocess.run(
        ["node", str(ROOT / "scripts/customer_knowledge_projection.mjs")],
        input=json.dumps(request),
        capture_output=True,
        encoding="utf-8",
        timeout=30,
    )


def test_projection_full_inventory_uses_actual_shared_future_filter_and_typed_transport(tmp_path):
    request, fixture = prepared_projection(tmp_path)
    result = project(request)
    assert result.returncode == 0, result.stderr
    value = json.loads(result.stdout)
    header = index.Begin.model_validate(value["transport"]["header"]).model_dump(mode="json")
    fragments = {str(f["ordinal"]): f for b in value["transport"]["batches"] for f in b["fragments"]}
    pages = index.assemble(header, fragments)
    assert len(pages) == 38 and len(value["transport"]["batches"]) > 1
    assert "future" not in {p["id"] for p in pages}
    assert "https://" + fixture["canonicalHost"] + "/gidai/veliau" not in json.dumps(pages)
    assert "SLAPTAS BŪSIMAS" not in json.dumps(pages)
    assert (
        value["evidence"]["scope"] == "isolated-local-approved-v2-projection"
        and not value["evidence"]["public_domain_launch_verified"]
    )


@pytest.mark.parametrize(
    "change",
    [
        "package_hash",
        "host",
        "source",
        "compiled",
        "contact",
        "operator",
        "helper",
        "admission",
        "unapproved",
    ],
)
def test_projection_rejects_conflicting_provenance_before_transfer(tmp_path, change):
    request, fixture = prepared_projection(tmp_path)
    sandbox = Path(request["sandbox"])
    if change == "package_hash":
        request["package_sha256"] = "0" * 64
    elif change == "host":
        request["canonical_host"] = "other.example"
    elif change == "source":
        request["public_source_revision"] = "0" * 40
    elif change == "compiled":
        (sandbox / "lib/generated/content-packages.json").write_text("[]")
    elif change in {"contact", "operator"}:
        (sandbox / "config/niche-network.json").write_text(
            json.dumps(
                {
                    "defaultEmail": "foreign@example.com"
                    if change == "contact"
                    else fixture["site"]["contact"]["email"],
                    "operatorName": "Foreign operator"
                    if change == "operator"
                    else fixture["site"]["operatorName"],
                }
            )
        )
    elif change == "helper":
        (sandbox / "lib/content-projection-v2.mjs").write_text("export const tampered=true;")
    elif change == "admission":
        file = sandbox / "content-packages" / request["site_id"] / "activation.json"
        value = json.loads(file.read_text())
        value["testOnly"] = False
        file.write_text(json.dumps(value))
    elif change == "unapproved":
        file = sandbox / "content-packages" / request["site_id"] / "content-package.json"
        fixture["pages"][0]["approval"]["status"] = "draft"
        raw = json.dumps(fixture).encode()
        file.write_bytes(raw)
        request["package_sha256"] = hashlib.sha256(raw).hexdigest()
    result = project(request)
    assert result.returncode != 0 and not result.stdout
    assert "Customer projection failed" in result.stderr


async def native_transport(value, *, incomplete=False):
    metadata = {
        "site_id": value["site_id"],
        "canonical_host": value["canonical_host"],
        "contact_email": "owner@example.com",
        "operator": "Synthetic local operator",
        "generated_at": utcnow().isoformat(),
        "deployment_id": "synthetic-index",
    }
    pages = [
        {
            "id": "page-" + str(i),
            "title": "Synthetic public page " + str(i),
            "url": "https://" + value["canonical_host"] + "/page-" + str(i),
            "text": "Synthetic local projection only, not deployment.",
            "revision_hash": "a" * 64,
            "projection_hash": "b" * 64,
        }
        for i in range(35)
    ]
    transfer = uuid4().hex
    fragments = [{**p, "ordinal": i, "page_ordinal": i, "part": 0, "parts": 1} for i, p in enumerate(pages)]
    content_hash = index.content_hash(metadata, pages)
    return {
        "evidence": {
            "scope": "isolated-local-approved-v2-projection",
            "public_source_revision": value["public_source_revision"],
            "package_sha256": value["package_sha256"],
            "public_domain_launch_verified": False,
        },
        "transport": {
            "header": {
                "schema_version": 2,
                "transfer_id": transfer,
                "base_revision": value["base_revision"],
                "metadata": metadata,
                "page_count": 35,
                "fragment_count": 35,
                "content_hash": content_hash,
            },
            "batches": [
                {"transfer_id": transfer, "fragments": fragments[i : i + 10]}
                for i in range(0, 30 if incomplete else 35, 10)
            ],
            "commit": {"transfer_id": transfer, "content_hash": content_hash},
        },
    }


@pytest.mark.parametrize("admit_source", [False, True])
async def test_actual_atomic_transfer_source_admission_separate_profile_and_channels(
    profile, monkeypatch, admit_source
):
    c = profile
    for key in ("voice_enabled", "smtp_enabled"):
        monkeypatch.setattr(settings(), key, False)
    request, _, _, _ = await accepted(c)
    saved = await provision(c, request)
    value = {
        **request,
        "public_core": "synthetic-test",
        "public_source_revision": "c" * 40,
        "sandbox": "synthetic-test",
        "package_sha256": "d" * 64,
        "admit_source": admit_source,
    }
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        receipt = await sync.sync(
            tx, environment=c["environment"], request=value, project_runner=native_transport
        )
        ready = await onboarding.status(tx, saved["site_id"])
    assert receipt["page_count"] == 35 and receipt["knowledge_ref"]["schema_version"] == 2
    assert ready["source_ready"] == admit_source and not ready["learning_admitted"]
    assert receipt["profile_admission"] == receipt["channel_activation"] == "not_performed"
    assert receipt["accepted_source_revision"] == request["accepted_source_revision"]


async def test_incomplete_transfer_rolls_back_and_cannot_admit_source(profile, monkeypatch):
    c = profile
    for key in ("voice_enabled", "smtp_enabled"):
        monkeypatch.setattr(settings(), key, False)
    request, _, _, _ = await accepted(c)
    saved = await provision(c, request)
    value = {
        **request,
        "public_core": "synthetic-test",
        "public_source_revision": "c" * 40,
        "sandbox": "synthetic-test",
        "package_sha256": "d" * 64,
        "admit_source": True,
    }

    async def partial(value):
        return await native_transport(value, incomplete=True)

    with pytest.raises(HTTPException, match="knowledge_fragments_incomplete"):
        async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
            await sync.sync(tx, environment=c["environment"], request=value, project_runner=partial)
    async with AsyncSession(c["admin"]) as tx:
        assert not await tx.scalar(
            select(KnowledgeState).where(
                KnowledgeState.business_id == saved["business_id"],
                KnowledgeState.environment_id == c["environment"],
            )
        )


async def test_unwritable_receipt_parent_is_rejected_before_any_projection_or_database(monkeypatch, tmp_path):
    input_file = tmp_path / "input.json"
    input_file.write_text("{}")
    output = tmp_path / "missing-parent/receipt.json"
    events = []

    class Engine:
        async def dispose(self):
            events.append("disposed")

    class Tx:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            events.append("transaction_exit")

        def begin(self):
            return self

    def engine(*args, **kwargs):
        events.append("database_engine")
        return Engine()

    async def runner(*args, **kwargs):
        events.append("projection_and_database_mutation")
        return {"page_count": 1, "source_admitted_by_this_operation": True}

    monkeypatch.setattr(sync, "create_async_engine", engine)
    monkeypatch.setattr(sync, "AsyncSession", lambda *args, **kwargs: Tx())
    monkeypatch.setattr(sync, "sync", runner)
    monkeypatch.setattr(
        sys, "argv", ["customer_knowledge_sync", "--input", str(input_file), "--receipt", str(output)]
    )
    with pytest.raises(OSError):
        await sync.main()
    assert events == [], "Bad receipt destination must not mutate or commit a source"


@pytest.mark.parametrize("failed_status", [None, "prepared", "committed", "partial_committed"])
async def test_private_receipt_is_durable_before_commit_and_postcommit_failure_is_explicit(
    monkeypatch, tmp_path, capsys, failed_status
):
    input_file, output = tmp_path / "input.json", tmp_path / "receipt.json"
    input_file.write_text("{}")
    events = []

    class Engine:
        async def dispose(self):
            events.append("disposed")

    class Transaction:
        async def __aenter__(self):
            return self

        async def __aexit__(self, kind, *args):
            if kind is None:
                assert json.loads(output.read_text())["status"] == "prepared"
            events.append("rolled_back" if kind else "committed")

    class Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        def begin(self):
            return Transaction()

    def engine(*args, **kwargs):
        assert json.loads(output.read_text())["status"] == "reserved"
        events.append("engine")
        return Engine()

    async def runner(*args, **kwargs):
        events.append("transfer")
        return {
            "page_count": 7,
            "source_admitted_by_this_operation": True,
            "knowledge_ref": {"knowledge_revision": 1},
        }

    original = sync.write_receipt

    def fail_write(saved, status, result=None):
        if status == "committed" and failed_status == "partial_committed":
            saved.seek(0)
            saved.write('{"status":"com')
            saved.truncate()
            saved.flush()
            raise OSError("Synthetic partial receipt disk failure")
        if status == failed_status:
            raise OSError("Synthetic receipt disk failure")
        return original(saved, status, result)

    monkeypatch.setattr(sync, "write_receipt", fail_write)
    monkeypatch.setattr(sync, "create_async_engine", engine)
    monkeypatch.setattr(sync, "AsyncSession", lambda *args, **kwargs: Session())
    monkeypatch.setattr(sync, "sync", runner)
    monkeypatch.setattr(
        sys, "argv", ["customer_knowledge_sync", "--input", str(input_file), "--receipt", str(output)]
    )
    if failed_status in {"committed", "partial_committed"}:
        with pytest.raises(sync.CommittedReceiptUnavailable, match="committed_receipt_unavailable"):
            await sync.main()
        assert json.loads(output.read_text())["status"] == "prepared"
        assert json.loads(output.read_text())["knowledge_ref"]["knowledge_revision"] == 1
        assert events == ["engine", "transfer", "committed", "disposed"]
    elif failed_status == "prepared":
        with pytest.raises(OSError, match="Synthetic receipt disk failure"):
            await sync.main()
        assert events == ["engine", "transfer", "rolled_back", "disposed"]
    else:
        await sync.main()
        receipt = json.loads(output.read_text())
        marker = json.loads(Path(str(output) + ".status.json").read_text())
        assert receipt["status"] == "prepared" and receipt["knowledge_ref"]["knowledge_revision"] == 1
        assert (
            marker["status"] == "committed"
            and marker["receipt_sha256"] == hashlib.sha256(output.read_bytes()).hexdigest()
        )
        assert events == ["engine", "transfer", "committed", "disposed"]
        assert json.loads(capsys.readouterr().out)["status"] == "complete"
