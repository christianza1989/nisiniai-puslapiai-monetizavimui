"""Wire/copy/secret boundaries only; no actual model, DB, inbox, or UI acceptance."""

import json
import tempfile
import traceback
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from test_acquisition import NOW, FakeLab, fixture
from test_acquisition_adoption import entry

from pinet_core.acquisition import normal_config, work_config
from pinet_core.acquisition.correspondence import recipient_hash, reviewed_copy
from pinet_core.acquisition.engine import prepare
from pinet_core.acquisition.interfaces import Scope
from pinet_core.acquisition.ledger import LedgerError
from pinet_core.acquisition.work_interfaces import InboundCapture


def inbound():
    return {
        "scope": entry()["scope"],
        "adapter_id": "madbeauty-native",
        "request_id": str(uuid4()),
        "thread_id": "thread-test",
        "parent_mail_id": "mail-test",
        "sender": "owner@example.test",
        "recipient": "info@pinet.lt",
        "message_id": "<incoming@example.test>",
        "in_reply_to": "<original@pinet.lt>",
        "body": "Synthetic reply",
        "subject": "Test",
    }


def work_entry():
    return {
        "scope": entry()["scope"],
        "adapter_id": "madbeauty-native",
        "inbound_key_id": "work-test",
        "inbound_secret": "c" * 64,
        "permissions": ["inbound-capture"],
    }


class CopyTests(unittest.IsolatedAsyncioTestCase):
    async def test_exact_existing_engine_review_accepted(self):
        campaign, prospect = fixture()
        prepared = await prepare(campaign, prospect, FakeLab(), NOW)
        self.assertEqual(reviewed_copy(campaign, prospect, prepared).next_action, "draft")

    async def test_copy_or_review_fingerprint_rejections(self):
        campaign, prospect = fixture()
        original = await prepare(campaign, prospect, FakeLab(), NOW)
        for change in (
            {"external_sent": 0},
            {"state": "blocked"},
            {"reasons": ["failed"]},
            {"review": None},
            {"instruction_hash": "a" * 64},
            {"contact_blocks": []},
            {"assessment": {**original["assessment"], "offer_fact_ids": ["invented"]}},
            {"assessment": {**original["assessment"], "subject": "subject\r\nBcc: test"}},
            {"review": {**original["review"], "factual": False}},
        ):
            with self.subTest(change=tuple(change)), self.assertRaises(LedgerError):
                reviewed_copy(campaign, prospect, {**original, **change})


class BoundaryTests(unittest.TestCase):
    def value(self, **change):
        return InboundCapture.model_validate_json(json.dumps({**inbound(), **change}))

    def test_external_sent_strict_false(self):
        for value in (True, 0, "false"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.value(external_sent=value)

    def test_exact_synthetic_recipient_only(self):
        for value in (
            "owner@gmail.com",
            "OWNER@example.test",
            "owner..test@example.test",
            "owner.@example.test",
        ):
            with self.subTest(value=value), self.assertRaises((ValueError, LedgerError)):
                recipient_hash(value)

    def test_mail_identity_headers_and_references(self):
        for changes in (
            {"subject": "Test\nBcc: person"},
            {"message_id": "bad"},
            {"in_reply_to": "<bad\r\n@pinet.lt>"},
            {"references": ["broken"]},
            {"references": ["<original@pinet.lt>"] * 2},
            {"recipient": "other@pinet.lt"},
            {"unexpected": True},
        ):
            with self.subTest(changes=tuple(changes)), self.assertRaises(ValueError):
                self.value(**changes)

    def test_raw_body_scope_path_and_clock_are_signed(self):
        registration = work_config.Registration.model_validate_json(json.dumps({"entries": [work_entry()]}))
        value = self.value()
        raw, path, now = (
            value.model_dump_json().encode(),
            "/integrations/acquisition-work/v1/sites/madbeauty/inbound-capture",
            12345,
        )
        headers = work_config.sign_request(registration.entries[0], path, raw, now)
        work_config.verify_request(registration, headers, path, raw, now, value)
        for changed_path, changed_body, clock, candidate in (
            (path + "x", raw, now, value),
            (path, raw + b" ", now, value),
            (path, raw, now + 301, value),
            (
                path,
                raw,
                now,
                value.model_copy(update={"scope": value.scope.model_copy(update={"site_id": "foreign"})}),
            ),
        ):
            with self.subTest(path=changed_path, clock=clock), self.assertRaises(ValueError):
                work_config.verify_request(
                    registration, headers, changed_path, changed_body, clock, candidate
                )

    def test_native_capture_signature_not_work_authority(self):
        from pinet_core.acquisition.transport_auth import WebhookGrant, sign_request

        value = self.value()
        path, raw = (
            "/integrations/acquisition-work/v1/sites/madbeauty/inbound-capture",
            value.model_dump_json().encode(),
        )
        work = work_config.Registration.model_validate_json(json.dumps({"entries": [work_entry()]}))
        old = WebhookGrant("work-test", b"c" * 32, "madbeauty-native", value.scope, frozenset({"capture"}))
        with self.assertRaises(ValueError):
            work_config.verify_request(work, sign_request(old, path, raw, 12345), path, raw, 12345, value)

    def read(self, value):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            artifacts = root / "artifacts"
            artifacts.mkdir()
            capture, work = artifacts / "capture.private.json", artifacts / "work.private.json"
            capture.write_text(json.dumps({"entries": [entry()]}), encoding="utf-8")
            work.write_text(json.dumps(value), encoding="utf-8")
            cfg = SimpleNamespace(
                acquisition_work_enabled=True,
                acquisition_capture_enabled=True,
                control_mode="local",
                smtp_enabled=False,
                voice_enabled=False,
                database_url="postgresql+asyncpg://runtime:synthetic@127.0.0.1:15438/test-only",
                environment="test-safe-registration",
                acquisition_capture_config=str(capture),
                acquisition_work_config=str(work),
            )
            with patch.object(normal_config, "ROOT", root):
                return work_config.read_registration(cfg)

    def test_dedicated_registration_valid(self):
        registration, digest = self.read({"entries": [work_entry()]})
        self.assertEqual(len(digest), 64)
        self.assertEqual(registration.entries[0].scope, Scope.model_validate(entry()["scope"]))

    def test_reused_key_id_secret_or_foreign_mapping_denied(self):
        for change in (
            {"inbound_secret": "a" * 64},
            {"inbound_key_id": "synthetic-recipient"},
            {"adapter_id": "other"},
            {"permissions": ["capture"]},
        ):
            with self.subTest(change=tuple(change)), self.assertRaises(ValueError):
                self.read({"entries": [{**work_entry(), **change}]})

    def test_invalid_registration_hides_keys(self):
        raw_secret = "z" * 64
        try:
            self.read({"entries": [{**work_entry(), "inbound_secret": raw_secret}]})
        except ValueError as error:
            rendered = "".join(traceback.format_exception(error))
            self.assertNotIn(raw_secret, rendered)
            self.assertIn("invalid_work_registration", str(error))
        else:
            self.fail("Invalid secret accepted")

    def test_duplicate_work_scopes_denied(self):
        with self.assertRaises(ValueError):
            self.read({"entries": [work_entry(), work_entry()]})
