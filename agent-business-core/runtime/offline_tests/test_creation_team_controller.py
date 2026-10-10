"""No provider: shared transport retains actually observed terminal usage before later failure."""
import sys

import pytest

from pinet_core.creation.adapter import Trace
from pinet_core.tasks.codex_transport import RunnerError, execute


@pytest.mark.parametrize("mode", ["nonzero", "invalid_output", "timeout_after_usage"])
async def test_failed_owned_process_preserves_terminal_usage(tmp_path, mode):
    output = tmp_path / "output.private.json"
    script = ("import sys,json,time;sys.stdin.read();"
              "print(json.dumps({'type':'turn.completed','usage':{'input_tokens':17,'output_tokens':4}}),flush=True);")
    script += {"nonzero": "sys.exit(1)", "invalid_output": "sys.exit(0)",
               "timeout_after_usage": "time.sleep(10)"}[mode]
    async def authorized():
        return True
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", script], prompt="Synthetic no-provider process test", cwd=tmp_path,
            env=None, output=output, seconds=2, still_authorized=authorized, parse_trace=Trace(False).parse)
    assert error.value.code == {"nonzero": "provider_error", "invalid_output": "output_invalid",
                               "timeout_after_usage": "run_timeout"}[mode]
    assert error.value.receipt["usage"] == {"input_tokens": 17, "output_tokens": 4}
