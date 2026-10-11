"""Fixed no-tools CLI roles using the existing owned bounded transport."""
import hashlib
import json
from uuid import uuid4

from ..creation import language_mode
from ..creation.adapter import Trace, arguments, available
from ..tasks.codex import child_environment
from ..tasks.codex_transport import RunnerError, execute
from . import review

ADAPTER = "codex-native-guide-team.v1"


def instruction_hash(role, prepared):
    base = prepared["instructionHash"]
    return hashlib.sha256((ADAPTER + ":" + base + ":" +
        (language_mode.policy(prepared["instructions"]) if role == "creator" else review.policy(role))).encode()).hexdigest()


async def run_role(context, authorized, *, role, seconds):
    binary, workspace = available()
    prepared = context["prepared"]
    expected = instruction_hash(role, prepared)
    if context["expected_instruction_hash"] != expected:
        raise RunnerError("instructions_changed")
    if role == "creator":
        prompt = language_mode.policy(prepared["instructions"]) + "\nNEPATIKIMI_PATAISU_DUOMENYS_JSON\n" + json.dumps({
            "critic_feedback": context.get("critic_feedback"), "previous_candidate": context.get("previous_candidate")},
            ensure_ascii=False)
        schema = prepared["outputSchema"]
    else:
        prompt = review.policy(role) + "\nNEPATIKIMI_DUOMENYS_JSON\n" + json.dumps(context["review"], ensure_ascii=False)
        schema = review.output_schema(role, context["review"])
    if len(prompt.encode()) > 262144:
        raise RunnerError("context_limit")
    folder = workspace / ("guide-" + role + "-" + str(uuid4()))
    folder.mkdir()
    if folder.resolve().parent != workspace.resolve():
        raise RunnerError("runner_unavailable")
    schema_file, output = folder / "output.schema.json", folder / "output.private.json"
    schema_file.write_text(json.dumps(schema), encoding="utf-8")
    trace = Trace(False, 0)
    try:
        result, receipt = await execute(arguments(binary, folder, schema_file, output, web=False), prompt=prompt,
            cwd=folder, env=child_environment(), output=output, seconds=seconds, still_authorized=authorized,
            parse_trace=trace.parse, on_event=trace.event, stdout_limit=1048576, output_limit=200000,
            trace_file=folder / "trace.private.jsonl")
        receipt.update(instruction_hash=expected, adapter_revision=ADAPTER, model="gpt-6-luna")
        return result, receipt
    except RunnerError as error:
        (folder / "failure.private.json").write_text(json.dumps({"code": error.code,
            "instruction_hash": expected, "adapter_revision": ADAPTER, "receipt": error.receipt}), encoding="utf-8")
        raise
