import importlib.util
import json
from pathlib import Path

import pytest

path = Path(__file__).resolve().parents[1] / "scripts/customer_profile_admin.py"
spec = importlib.util.spec_from_file_location("customer_profile_admin", path)
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


@pytest.mark.parametrize("content", ["[]", "null", "x" * 4097])
def test_private_request_rejects_non_object_and_oversized_before_admin(content, tmp_path):
    path = tmp_path / "request.json"
    path.write_text(content)
    with pytest.raises(ValueError):
        cli.read_request(path)


def test_private_request_exact_identity_is_not_rewritten(tmp_path):
    value = {"accepted_source_revision": "a" * 40, "execution_source_revision": "b" * 40}
    path = tmp_path / "request.json"
    path.write_text(json.dumps(value))
    assert cli.read_request(path) == value
