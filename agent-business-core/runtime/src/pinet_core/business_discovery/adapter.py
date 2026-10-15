"""Planning roles reuse the existing fixed Codex transport, models and private trace policy."""
import hashlib
import json
import os
from pathlib import Path
from time import monotonic
from uuid import uuid4

from ..config import settings
from ..creation import adapter as shared
from ..tasks.codex import child_environment
from ..tasks.codex_transport import RunnerError, execute
from . import deadlines, source_projection
from .wire import PlanReview, Reply

ROOT = shared.ROOT
POLICY_FILE = Path(__file__).with_name("instructions.md")
REFERENCES = (
    "SKILLS/niche-site-builder/references/business-validation.md",
    "SKILLS/niche-business-tools/SKILL.md",
    "SKILLS/niche-client-acquisition/SKILL.md",
)


def capabilities():
    cfg = settings()
    return {
        "codex_web_search": {"available": cfg.creation_web_search_enabled, "cost": "model usage; cost not measured"},
        "primary_source_reader": {"available": True, "coverage": "public HTTPS, verified TLS/pinned public DNS/robots; captured source is not fact or license verification"},
        "domain_catalogue": {"available": True, "coverage": "stored classification/rank; availability unknown"},
        "treg": {"available": False, "coverage": "no admitted discovery runtime connector; catalogue and alternatives must be assessed", "cost": "unknown; no paid budget"},
        "shared_site_core": {"available": True, "coverage": "shared builder/content/media/editorial/SEO-GEO adapters; full-flow readiness must be proven"},
        "mail": {"available": False, "coverage": "owner-held live mail"},
        "voice": {"available": False, "coverage": "owner-held live voice"},
        "social": {"available": False, "coverage": "owner-held live channels"},
    }


def instructions(role):
    if role not in {"creator", "critic", "coordinator"}:
        raise RunnerError("review_invalid")
    parts = [POLICY_FILE.read_text("utf-8")]
    parts.append(source_projection.DIRECTIVE)
    parts.append("Your specific team role is " + role + ".")
    for relative in REFERENCES:
        parts.append("\n\nCANONICAL_REFERENCE " + relative + "\n" + (ROOT / relative).read_text("utf-8-sig"))
    if role != "creator":
        parts.append("Review this exact proposed plan independently. Judge coverage, economic assumptions, acquisition feasibility, source contradictions and honest readiness. Return concrete required_changes or approve; never approve unobserved execution. The coordinator also checks the critic findings. Do not demand held live activation or language-only fixes before a local plan.")
    schema = Reply if role == "creator" else PlanReview
    profile = shared.pipeline_profile(role)
    from ..creation import execution_profiles as profiles
    timing = deadlines.policy(profiles.selected())
    if timing is not None:
        profile = {**profile, "timing_policy": timing}
    material = "\n".join(parts)
    pin = hashlib.sha256(json.dumps({"role": role, "instructions": material, "schema": schema.model_json_schema(),
                                     "execution": profile, "source_projection": source_projection.contract()}, sort_keys=True).encode()).hexdigest()
    return material, pin


def fingerprint():
    return hashlib.sha256(json.dumps({r: instructions(r)[1] for r in
                                      ("creator", "critic", "coordinator")}, sort_keys=True).encode()).hexdigest()


def available():
    binary, workspace = shared.available()
    longest = workspace / ("discovery-coordinator-" + "0" * 36) / "failure.private.json"
    if os.name == "nt" and len(str(longest).encode("utf-16-le")) // 2 >= 260:
        raise RunnerError("runner_unavailable")
    fingerprint()
    return binary, workspace


def check_tools(reply, supplied_capabilities):
    if not reply.plan:
        return
    for item in reply.plan.tools:
        actual = supplied_capabilities.get(item.capability_key)
        if item.access == "available" and (not actual or not actual["available"]):
            raise RunnerError("tool_access_unverified")


async def run_role(context, authorized, *, role, seconds):
    from ..creation import execution_profiles as profiles
    started = monotonic()
    name = profiles.selected()
    profile = shared.pipeline_profile(role, execution_profile=name)
    model = profile["model"]
    binary, workspace = available()
    policy, pin = instructions(role)
    if pin != context["expected_instruction_hash"]:
        raise RunnerError("instructions_changed")
    schema_model = Reply if role == "creator" else PlanReview
    model_context, projection_receipt = source_projection.model_context(context)
    prompt = policy + "\n\nUNTRUSTED_CUSTOMER_AND_SOURCE_CONTEXT_JSON\n" + json.dumps(model_context, ensure_ascii=False)
    if len(prompt.encode()) > 262144:
        raise RunnerError("context_limit")
    folder = workspace / ("discovery-" + role + "-" + str(uuid4()))
    folder.mkdir()
    schema, output = folder / "output.schema.json", folder / "output.private.json"
    output_schema = schema_model.model_json_schema()
    if role != "creator":
        output_schema["properties"]["candidate_sha256"] = {"type": "string", "enum": [context["candidate_sha256"]]}
    schema.write_text(json.dumps(output_schema), encoding="utf-8")
    inputs = {"role": role, "model": model, "reasoning_effort": profile["reasoning_effort"],
              "instruction_hash": pin, "prompt_bytes": len(prompt.encode()),
              "context_bytes": len(json.dumps(model_context, ensure_ascii=False).encode()), **projection_receipt,
              "output_schema_sha256": hashlib.sha256(json.dumps(output_schema, sort_keys=True).encode()).hexdigest()}
    (folder / "input.private.json").write_text(json.dumps(inputs), encoding="utf-8")
    permitted = context.get("permitted_web_actions", 0)
    web = role == "creator" and settings().creation_web_search_enabled and (permitted is None or permitted > 0)
    trace = shared.Trace(web, permitted)
    receipt = dict(inputs)
    try:
        remaining_seconds = deadlines.role_seconds(name, role, seconds) - (monotonic() - started)
        if remaining_seconds <= 0:
            raise RunnerError("run_timeout")
        argv = shared.arguments(binary, folder, schema, output, web=web, role=role, execution_profile=name)
        result, receipt = await execute(argv, prompt=prompt, cwd=folder, env=child_environment(),
            output=output, seconds=remaining_seconds,
            still_authorized=authorized, parse_trace=trace.parse, on_event=trace.event,
            stdout_limit=1048576, output_limit=262144, trace_file=folder / "trace.private.jsonl",
            partial_receipt=trace.partial_receipt, stderr_file=folder / "stderr.private.log",
            observation_file=folder / "execution.private.json")
        value = schema_model.model_validate(result)
        receipt.update(inputs)
        if role == "creator":
            check_tools(value, context["capabilities"])
        elif value.candidate_sha256 != context["candidate_sha256"]:
            raise RunnerError("review_candidate_mismatch")
        receipt.update(instruction_hash=pin, model=model, reasoning_effort=profile["reasoning_effort"],
                       adapter_revision="codex-business-discovery.v1",
                       output_schema_sha256=hashlib.sha256(json.dumps(output_schema, sort_keys=True).encode()).hexdigest())
        return value.model_dump(mode="json"), receipt
    except (RunnerError, ValueError) as error:
        code = error.code if isinstance(error, RunnerError) else "output_invalid"
        receipt = {**inputs, **receipt, **(getattr(error, "receipt", None) or {}), "instruction_hash": pin,
                   "model": model, "reasoning_effort": profile["reasoning_effort"], "adapter_revision": "codex-business-discovery.v1"}
        (folder / "failure.private.json").write_text(json.dumps(
            {"code": code, "receipt": receipt}, ensure_ascii=False, default=str), encoding="utf-8")
        raise RunnerError(code, receipt) from None
