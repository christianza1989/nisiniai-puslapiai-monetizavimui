import json

import pytest

from pinet_core.creation.adapter import Trace, arguments, instructions
from pinet_core.creation.renderer import normalize, preview
from pinet_core.tasks.codex import RunnerError


def test_actual_instruction_fingerprint_and_fixed_tool_policy():
    value, fingerprint = instructions()
    assert len(fingerprint) == 64 and 'language-quality.md' in value and 'business-validation.md' in value
    args = arguments('fixed.exe', 'fixed', 'schema', 'output', web=True)
    assert 'web_search="live"' in args and args[args.index('--model')+1] == 'gpt-6-luna'
    assert args[args.index('--sandbox')+1] == 'read-only' and '--ignore-rules' in args


def test_web_trace_is_bounded_and_other_tools_rejected():
    trace = Trace(True)
    for i in range(6):
        item = {'type': 'item.completed', 'item': {'type': 'web_search', 'id': str(i)}}
        trace.event(item)
        trace.event(item)
    assert len(trace.searches) == 6
    with pytest.raises(RunnerError) as error:
        trace.event({'type': 'item.started', 'item': {'type': 'web_search', 'id': '7'}})
    assert error.value.code == 'research_limit'
    for kind in ('command_execution', 'mcp_tool_call', 'file_change', 'image_generation'):
        with pytest.raises(RunnerError) as error:
            Trace(True).event({'type': 'item.started', 'item': {'type': kind}})
        assert error.value.code == 'tool_attempted'
    with pytest.raises(RunnerError) as error:
        Trace(False).parse(json.dumps({'type': 'item.completed', 'item': {'type': 'web_search', 'id': 'a'}}))
    assert error.value.code == 'tool_attempted'


def test_missing_or_untyped_draft_rejected():
    with pytest.raises(RunnerError) as error:
        normalize({'html': '<script>alert(1)</script>', 'publicationApproved': True})
    assert error.value.code == 'output_invalid'


def test_preview_source_has_no_remote_resource_or_executable_sink():
    # The renderer has only escaped typed text + fixed server-owned enum/theme assets.
    import inspect
    source = inspect.getsource(preview)
    assert 'html.escape' in source and 'default-src' in source and 'form-action' in source
    assert '<script' not in source and '<iframe' not in source and '<form' not in source
