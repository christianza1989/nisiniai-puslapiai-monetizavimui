import json

import pytest
from pydantic import BaseModel

from pinet_core.codex_lab import CodexLab


class Output(BaseModel):
    text: str


@pytest.mark.asyncio
async def test_model_preference_is_explicit_without_loading_user_tools(monkeypatch):
    seen = []

    class Process:
        returncode = 0

        async def communicate(self, prompt):
            return b'{"type":"turn.completed","usage":{"input_tokens":1}}', b""

    async def launch(*args, **kwargs):
        from pathlib import Path

        seen.extend(args)
        Path(args[args.index("--output-last-message") + 1]).write_text(json.dumps({"text": "Fixture"}))
        return Process()

    monkeypatch.setattr("pinet_core.codex_lab.asyncio.create_subprocess_exec", launch)
    monkeypatch.setattr("pinet_core.codex_lab.Path.is_file", lambda self: True)
    monkeypatch.setattr("pinet_core.codex_lab.shutil.which", lambda name: "fixture-node")
    result = await CodexLab(model="configured-model").ask(Output, "Fixture only", {})
    assert result.text == "Fixture"
    assert seen[seen.index("--model") + 1] == "configured-model"
    assert "--ignore-user-config" in seen
    assert "--sandbox" in seen and "read-only" in seen
    assert "shell_tool" in seen and "plugins" in seen
