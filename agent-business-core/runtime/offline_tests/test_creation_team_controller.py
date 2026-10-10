"""No provider: shared transport retains actually observed terminal usage before later failure."""
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from pinet_core.creation.adapter import Trace, arguments
from pinet_core.tasks.codex import Answer, child_environment
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


@pytest.mark.parametrize("event,code", [
    ({"type": "error", "message": "Reconnecting... 2/5 (Incomplete response returned, reason: max_output_tokens)"},
     "provider_error"),
    ({"type": "item.completed", "item": {"type": "error", "message": "stream disconnected"}}, "provider_error"),
    ({"type": "item.completed", "item": {"type": "error", "message": "Model not supported"}}, "model_unavailable"),
    ({"type": "item.started", "item": {"type": "command_execution"}}, "tool_attempted"),
    ("{invalid}", "output_invalid"),
])
@pytest.mark.parametrize("completed_usage", [False, True])
async def test_owned_child_stops_on_terminal_error_before_later_output(monkeypatch, tmp_path, event, code, completed_usage):
    output, trace_file = tmp_path / "output.private.json", tmp_path / "trace.private.jsonl"
    prior = {"type":"turn.completed", "usage":{"input_tokens":17,"output_tokens":4}}
    encoded = (json.dumps(prior) + "\n" if completed_usage else "") + (event if isinstance(event, str) else json.dumps(event))
    script = ("import sys,time;from pathlib import Path;sys.stdin.read();"
              "print(sys.argv[1],flush=True);time.sleep(8);Path(sys.argv[2]).write_text('{}')")
    children, create = [], asyncio.create_subprocess_exec
    async def owned_child(*args, **kwargs):
        child = await create(*args, **kwargs)
        children.append(child)
        return child
    monkeypatch.setattr(asyncio, "create_subprocess_exec", owned_child)
    async def authorized():
        return True
    trace = Trace(False)
    with pytest.raises(RunnerError) as error:
        await asyncio.wait_for(execute([sys.executable, "-c", script, encoded, str(output)],
            prompt="Synthetic process error, no provider", cwd=tmp_path, env=None, output=output, seconds=6,
            still_authorized=authorized, parse_trace=trace.parse, on_event=trace.event, trace_file=trace_file), timeout=4)
    assert error.value.code == code
    assert error.value.receipt == ({"usage":{"input_tokens":17,"output_tokens":4},"web_search_count":0}
                                  if completed_usage else {})
    assert children and children[0].returncode is not None and not output.exists()
    assert trace_file.read_text("utf-8").strip() == encoded
    assert not trace.searches


@pytest.mark.parametrize("mode,role", [("completed", "critic"), ("completed", "coordinator"),
    ("completed_web", "creator"), ("incomplete", "critic"), ("http503", "critic"),
    ("truncated_stream", "critic"), ("incomplete", "creator")])
def test_installed_cli_makes_one_loopback_request_without_internal_retry(tmp_path, mode, role):
    """Opt-in pinned CLI integration; empty auth home and synthetic loopback SSE only."""
    executable = os.environ.get("PINET_TEST_CODEX_EXECUTABLE")
    expected_sha = os.environ.get("PINET_TEST_CODEX_SHA256")
    if not executable or not expected_sha:
        pytest.skip("Pinned CLI path/hash required for local no-provider integration")
    binary = Path(executable)
    assert binary.is_absolute() and binary.is_file()
    assert hashlib.sha256(binary.read_bytes()).hexdigest() == expected_sha
    catalogue = os.environ.get("PINET_TEST_CODEX_MODEL_CATALOG_JSON")
    if not catalogue:
        pytest.skip("Explicit nonsensitive model catalogue required for the empty-home Sol probe")
    model_catalogue = Path(catalogue)
    assert model_catalogue.is_absolute() and model_catalogue.is_file()
    advertised = {item["slug"]: item for item in json.loads(model_catalogue.read_bytes())["models"]}
    assert all(advertised[model]["support_verbosity"] is True for model in ("gpt-6-luna", "gpt-6.1-sol"))
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            requests.append(body)
            assert self.path == "/v1/responses" and not self.headers.get("Authorization")
            if mode == "http503":
                payload = b'{"error":{"message":"synthetic local failure","type":"server_error"}}'
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
            else:
                text = '{"answer":"Vietinis sintetinis atsakymas.","limitations":[]}'
                item = {"id": "msg_local", "type": "message", "role": "assistant", "status": "completed",
                        "content": [{"type": "output_text", "text": text, "annotations": []}]}
                response = {"id": "resp_local", "object": "response", "created_at": 1,
                            "model": body["model"], "status": "in_progress", "output": []}
                events = [
                    {"type": "response.created", "response": response},
                    {"type": "response.output_item.added", "output_index": 0,
                     "item": {**item, "status": "in_progress", "content": []}},
                    {"type": "response.content_part.added", "item_id": item["id"],
                     "output_index": 0, "content_index": 0,
                     "part": {"type": "output_text", "text": "", "annotations": []}},
                    {"type": "response.output_text.delta", "item_id": item["id"],
                     "output_index": 0, "content_index": 0, "delta": text},
                    {"type": "response.output_text.done", "item_id": item["id"],
                     "output_index": 0, "content_index": 0, "text": text},
                    {"type": "response.content_part.done", "item_id": item["id"],
                     "output_index": 0, "content_index": 0, "part": item["content"][0]},
                    {"type": "response.output_item.done", "output_index": 0, "item": item},
                ]
                if mode != "truncated_stream":
                    status = "incomplete" if mode == "incomplete" else "completed"
                    final = {**response, "status": status, "output": [item],
                             "usage": {"input_tokens": 8, "output_tokens": 4, "total_tokens": 12,
                                       "input_tokens_details": {"cached_tokens": 0},
                                       "output_tokens_details": {"reasoning_tokens": 0}}}
                    if mode == "incomplete":
                        final["incomplete_details"] = {"reason": "max_output_tokens"}
                    events.append({"type": "response." + status, "response": final})
                payload = "".join("data: " + json.dumps(event) + "\n\n" for event in events).encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        schema, output, home = tmp_path / "schema.json", tmp_path / "output.json", tmp_path / "empty-home"
        home.mkdir()
        schema.write_text(json.dumps(Answer.model_json_schema()), encoding="utf-8")
        args = arguments(binary, tmp_path, schema, output, web=mode == "completed_web", role=role)
        args += ["-c", "model_catalog_json=" + json.dumps(str(model_catalogue))]
        # Only this test directs the process to a local unauthenticated fake server.
        args += ["-c", f'model_providers.pinet-bounded-openai.base_url="http://127.0.0.1:{server.server_port}/v1"',
                 "-c", "model_providers.pinet-bounded-openai.requires_openai_auth=false"]
        env = child_environment()
        env["CODEX_HOME"] = str(home)
        result = subprocess.run(args, input="Return a short synthetic answer in the required JSON.",
                                text=True, encoding="utf-8", errors="replace", capture_output=True,
                                cwd=tmp_path, env=env, timeout=15)
        (tmp_path / "cli.stdout.txt").write_bytes(result.stdout.encode("utf-8"))
        (tmp_path / "cli.stderr.txt").write_bytes(result.stderr.encode("utf-8"))
        (tmp_path / "request.private.json").write_text(json.dumps(requests), encoding="utf-8")
        events = [json.loads(line) for line in result.stdout.splitlines()]
        assert len(requests) == 1 and requests[0]["model"] == ("gpt-6-luna" if role == "creator" else "gpt-6.1-sol")
        assert requests[0]["reasoning"]["effort"] == ("medium" if role == "creator" else "low")
        assert requests[0]["text"]["verbosity"] == ("low" if role == "creator" else "medium")
        assert "max_output_tokens" not in requests[0]
        tools = [tool["type"] for tool in requests[0].get("tools", [])]
        # gpt-6-luna uses Responses Lite: tools are declared in input messages,
        # rather than the classic API's top-level hosted tools array.
        input_text = json.dumps(requests[0]["input"])
        web_available = "declare const tools: { web__run(args:" in input_text
        assert ("web_search" in tools or web_available) == (mode == "completed_web")
        if mode.startswith("completed"):
            assert result.returncode == 0 and output.is_file()
            assert Trace(mode == "completed_web").parse(result.stdout)["usage"]["input_tokens"] == 8
        else:
            assert result.returncode != 0 and not output.is_file()
            assert "turn.completed" not in [event.get("type") for event in events]
            assert not any("usage" in event for event in events)
            with pytest.raises(RunnerError, match="provider_error"):
                Trace(False).parse(result.stdout)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
