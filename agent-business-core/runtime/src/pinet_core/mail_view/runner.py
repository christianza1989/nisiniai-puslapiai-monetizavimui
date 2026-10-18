"""One bounded display call over the shared CLI transport; caller owns authority/budget."""
import asyncio
import json
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from pydantic import ValidationError

from ..file_hash import sha256_file
from ..tasks.codex import arguments, check_trace_event, child_environment, parse_trace
from ..tasks.codex_transport import RunnerError, execute
from .translations import (
    POLICY,
    POLICY_SHA,
    Record,
    TranslatedText,
    observed_usage,
    source_digest,
    validate_text,
)


async def translate_once(original, *, business_id, environment, binary, binary_sha256,
                         private_directory, still_authorized, seconds=120):
    binary = Path(binary)
    if not binary.is_absolute() or sha256_file(binary) != binary_sha256 or not await still_authorized():
        raise RunnerError("translation_runner_unavailable")
    if type(seconds) not in {int, float} or not 0 < seconds <= 120:
        raise RunnerError("translation_deadline_invalid")
    with tempfile.TemporaryDirectory(prefix="mail-display-", dir=private_directory) as temporary:
        directory = Path(temporary)
        schema, output = directory / "schema.json", directory / "result.private.json"
        schema.write_text(json.dumps(TranslatedText.model_json_schema()), encoding="utf-8")
        args = arguments(binary, directory, schema, output)
        args[args.index("--model") + 1] = "gpt-6.1-sol"
        args[args.index('model_reasoning_effort="medium"')] = 'model_reasoning_effort="high"'
        result, usage = await execute(args,
            prompt=POLICY + "\nUNTRUSTED_EMAIL_JSON:\n" + json.dumps({"subject": original["subject"], "body": original["body"]}, ensure_ascii=False),
            cwd=directory, env=child_environment(), output=output, seconds=seconds,
            still_authorized=still_authorized, parse_trace=parse_trace, on_event=check_trace_event,
            output_limit=180000)
        known = observed_usage(usage)
        try:
            translated = TranslatedText.model_validate(result)
            validate_text(original, translated)
        except (ValidationError, ValueError, TypeError, KeyError):
            raise RunnerError("mail_translation_invalid", known) from None
        try:
            admitted = await still_authorized()
        except asyncio.CancelledError as error:
            error.receipt = known or {}
            raise
        except Exception:
            raise RunnerError("mail_authority_changed", known) from None
        if not admitted:
            raise RunnerError("mail_authority_changed", known)
        try:
            return Record(version="mail-display-translation.v1", business_id=business_id, environment=environment,
                mail_id=original["mail_id"], source_sha256=source_digest(business_id, environment, original),
                target_language="lt", translated_at=datetime.now(UTC), model="gpt-6.1-sol", reasoning_effort="high",
                instruction_sha256=POLICY_SHA, text=translated, usage=known)
        except (ValidationError, ValueError, TypeError, KeyError):
            raise RunnerError("mail_translation_invalid", known) from None
