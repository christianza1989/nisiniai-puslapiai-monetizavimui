"""Immutable metadata over the existing admitted High pipeline, not a registry.

Shape validation supports retained history. Only current() grants eligibility for
the separate native authority path; this module never executes a provider.
"""
import hashlib
import json
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ..creation import adapter as canonical
from ..creation import execution_profiles as profiles
from ..creation.service import digest
from ..tasks.codex_transport import RunnerError

Hash = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Kind = Literal["customer_text", "customer_quality"]


class Frozen(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class RoleProfile(Frozen):
    model: Literal["gpt-6.1-sol"]
    reasoning_effort: Literal["high"]
    verbosity: None
    model_catalogue_sha256: Hash


class Pin(Frozen):
    version: Literal["customer-agent-execution.v1"] = "customer-agent-execution.v1"
    name: Literal["local_sol61_high_v1"]
    text: RoleProfile
    quality: RoleProfile

    def fingerprint(self):
        return digest(self.model_dump(mode="json"))


def retained(value):
    """Read a retained pin as data, without requiring today's runtime profile."""
    try:
        raw = value.model_dump_json() if isinstance(value, Pin) else json.dumps(value)
        return Pin.model_validate_json(raw)
    except (ValidationError, TypeError, ValueError):
        raise ValueError("execution_profile_conflict") from None


def capture_high():
    if profiles.selected() != profiles.SOL_HIGH:
        raise RunnerError("runner_unavailable")
    try:
        return retained({"name": profiles.SOL_HIGH,
            "text": canonical.pipeline_profile("creator", execution_profile=profiles.SOL_HIGH),
            "quality": canonical.pipeline_profile("critic", execution_profile=profiles.SOL_HIGH)})
    except ValueError:
        raise RunnerError("runner_unavailable") from None


def current(pin):
    try:
        if not isinstance(pin, Pin) or retained(pin) != capture_high():
            raise ValueError()
    except (ValueError, RunnerError):
        raise RunnerError("instructions_changed") from None
    return retained(pin)


def role(pin, kind: Kind):
    value = retained(pin)
    if kind not in {"customer_text", "customer_quality"}:
        raise ValueError("execution_profile_conflict")
    return (value.text if kind == "customer_text" else value.quality).model_dump(mode="json")


def binding_pin(binding):
    """Both native binding copies must carry the same pin, including absence."""
    value = binding.get("execution_profile")
    task = binding.get("task_calibration")
    nested = task.get("execution_profile") if isinstance(task, dict) else None
    if value is None and nested is None:
        return None
    if value is None or nested is None or retained(value) != retained(nested):
        raise ValueError("execution_profile_conflict")
    return retained(value)


def text_model(binding):
    pin = binding_pin(binding)
    return role(pin, "customer_text")["model"] if pin else "gpt-6-luna"


def call_fields(binding, kind: Kind):
    pin = binding_pin(binding)
    if pin is None:
        return {}
    current(pin)
    return retained_fields(binding, kind)


def retained_fields(binding, kind: Kind):
    pin = binding_pin(binding)
    return ({"execution_profile_sha256": pin.fingerprint(), "reasoning_effort": role(pin, kind)["reasoning_effort"]}
            if pin is not None else {})


def reservation_matches(binding, payload, kind: Kind):
    pin = binding_pin(binding)
    model = role(pin, kind)["model"] if pin is not None else (
        "gpt-6-luna" if kind == "customer_text" else "gpt-6.1-sol")
    fields = retained_fields(binding, kind)
    return payload.get("model") == model and all(payload.get(key) == fields.get(key)
        for key in ("execution_profile_sha256", "reasoning_effort"))


class Capture(Frozen):
    """Server-observed dispatch arguments; kept separately from token usage."""
    model: str = Field(min_length=1, max_length=100)
    reasoning_effort: str = Field(min_length=1, max_length=20)
    execution_profile_sha256: Hash
    argv_sha256: Hash


def captured(argv, pin, kind: Kind):
    """Validate the actual canonical argument list immediately before execute."""
    expected = role(pin, kind)
    args = [str(a) for a in argv]
    effort = [a for a in args if a.startswith("model_reasoning_effort=")]
    model, reasoning = "unknown", "unknown"
    try:
        model = args[args.index("--model") + 1]
        reasoning = json.loads(effort[0].split("=", 1)[1]) if len(effort) == 1 else "unknown"
    except (ValueError, IndexError):
        pass
    capture = Capture(model=model if isinstance(model, str) and 1 <= len(model) <= 100 else "invalid",
        reasoning_effort=reasoning if isinstance(reasoning, str) and 1 <= len(reasoning) <= 20 else "invalid",
        execution_profile_sha256=retained(pin).fingerprint(), argv_sha256=hashlib.sha256(
            json.dumps(args, ensure_ascii=False).encode()).hexdigest()).model_dump(mode="json")
    try:
        current(pin)
        web = [a for a in args if a.startswith("web_search=")]
        if (args.count("--model") != 1 or model != expected["model"]
                or effort != ['model_reasoning_effort="high"'] or web != ['web_search="disabled"']):
            raise ValueError()
        return capture
    except (ValueError, RunnerError):
        raise RunnerError("instructions_changed", {"_execution": capture}) from None


def decorate(usage, capture):
    if capture is None:
        return usage
    return {**(usage or {}), "_execution": capture}


def observation(usage):
    """Sanitize observed metadata even after authority loss; never consult config."""
    try:
        return Capture.model_validate_json(json.dumps(usage["_execution"])).model_dump(mode="json")
    except (KeyError, TypeError, ValueError, ValidationError):
        return None


def verified(usage, binding, kind: Kind):
    pin = binding_pin(binding)
    capture = observation(usage)
    if pin is None:
        return capture is None
    expected = role(pin, kind)
    return bool(capture and capture["execution_profile_sha256"] == pin.fingerprint()
        and capture["model"] == expected["model"] and capture["reasoning_effort"] == expected["reasoning_effort"])
