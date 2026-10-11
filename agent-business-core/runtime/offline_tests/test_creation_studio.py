"""Owned no-provider process bounds and studio input authority."""
import os
import sys

import pytest

from pinet_core.creation.studio import _execute, import_draft
from pinet_core.tasks.codex_transport import RunnerError


async def yes():
    return True


async def no():
    return False


async def test_fixed_owned_process_receives_json_without_shell():
    script = "import sys,json;v=json.loads(sys.stdin.buffer.read().decode('utf-8'));print(json.dumps({'value':v['message']}))"
    value = '$(secret) `not a command` and Lithuanian žodis'
    response = await _execute([sys.executable, "-c", script], {"message": value}, dict(os.environ), yes, 4)
    assert response == {"value": value}


@pytest.mark.parametrize("mode", ["timeout", "output_limit", "failure"])
async def test_owned_process_stops_on_timeout_bounds_or_specific_failure(mode):
    script = {"timeout": "import time;time.sleep(10)", "output_limit": "print('x'*1100000)",
              "failure": "import sys;print('{\"code\":\"intake_revision_conflict\"}',file=sys.stderr);sys.exit(1)"}[mode]
    with pytest.raises(RunnerError) as error:
        await _execute([sys.executable, "-c", script], {}, dict(os.environ), yes, 1 if mode == "timeout" else 4)
    assert error.value.code == {"timeout": "studio_timeout", "output_limit": "studio_output_limit",
                               "failure": "intake_revision_conflict"}[mode]


async def test_revocation_prevents_process_dispatch():
    with pytest.raises(RunnerError) as error:
        await _execute(["executable-does-not-exist"], {}, {}, no, 4)
    assert error.value.code == "authorization_revoked"


async def test_no_customer_domain_does_not_invent_a_host_or_public_site():
    with pytest.raises(RunnerError) as error:
        await import_draft({}, creation_id="irrelevant", revision=1, canonical_host=None, still_authorized=yes)
    assert error.value.code == "studio_domain_required"
