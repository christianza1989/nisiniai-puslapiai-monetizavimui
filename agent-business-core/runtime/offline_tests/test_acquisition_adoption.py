"""Safe normal registration boundary; no database, model, or external channel."""

import json
import tempfile
import traceback
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from pinet_core.acquisition import normal_config


def configuration(path):
    return SimpleNamespace(
        acquisition_capture_enabled=True,
        control_mode="local",
        smtp_enabled=False,
        voice_enabled=False,
        database_url="postgresql+asyncpg://runtime:synthetic@127.0.0.1:15438/test-only",
        environment="test-safe-registration",
        acquisition_capture_config=str(path),
    )


def entry():
    return {
        "scope": {
            "business_id": "synthetic-business",
            "site_id": "madbeauty",
            "environment_id": "test-safe-registration",
            "environment_class": "test",
        },
        "adapter_id": "madbeauty-native",
        "transport_key_id": "synthetic-transport",
        "recipient_key_id": "synthetic-recipient",
        "permissions": ["recipient-challenge"],
        "transport_secret": "a" * 64,
        "recipient_secret": "b" * 64,
    }


class NormalRegistrationTests(unittest.TestCase):
    def read(self, value):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            artifacts = root / "artifacts"
            artifacts.mkdir()
            path = artifacts / "synthetic.private.json"
            path.write_text(json.dumps(value), encoding="utf-8")
            with patch.object(normal_config, "ROOT", root):
                return normal_config.read_registration(configuration(path))

    def test_normal_capture_valid_separate_keys(self):
        registration, fingerprint = self.read({"entries": [entry()]})
        self.assertEqual(len(registration.entries), 1)
        self.assertEqual(len(fingerprint), 64)
        self.assertFalse(registration.external_sent)

    def test_invalid_key_never_appears_in_error_or_traceback(self):
        value = entry()
        raw_secret = "z" * 64
        value["transport_secret"] = raw_secret
        try:
            self.read({"entries": [value]})
        except ValueError as error:
            rendered = "".join(traceback.format_exception(error))
            self.assertNotIn(raw_secret, rendered)
            self.assertIn("invalid_capture_registration", str(error))
        else:
            self.fail("invalid key accepted")

    def test_duplicate_registration_error_hides_raw_keys(self):
        try:
            self.read({"entries": [entry(), entry()]})
        except ValueError as error:
            rendered = "".join(traceback.format_exception(error))
            self.assertNotIn("a" * 24, rendered)
            self.assertNotIn("b" * 24, rendered)
            self.assertIn("invalid_capture_registration", str(error))
        else:
            self.fail("duplicate server scope accepted")

    def test_external_send_boolean_cannot_be_coerced(self):
        for value in (True, 0, "false"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.read({"entries": [entry()], "external_sent": value})


if __name__ == "__main__":
    unittest.main()
