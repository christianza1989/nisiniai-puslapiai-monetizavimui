"""Conservative model-token estimate, never an invoice or LiveKit cost.

Primary source checked 2026-09-30: https://ai.google.dev/gemini-api/docs/pricing
Micro-USD per token = published USD per million tokens. No free quota/cache
discount is assumed. Unknown modality tokens use the highest relevant rate.
The review expires to prevent a silently stale price card.
"""
from datetime import UTC, date, datetime
from decimal import ROUND_CEILING, Decimal

CARD_VERSION = "google-standard-2026-09-30"
REVIEW_UNTIL = date(2026, 10, 30)


def current():
    return datetime.now(UTC).date() <= REVIEW_UNTIL


def count(value):
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise ValueError("invalid_usage_count")
    return value


def live_estimate(usage):
    if not current() or usage.model != "gemini-3.8-live":
        raise ValueError("rate_card_review_required")
    fields = ["input_tokens", "input_text_tokens", "input_audio_tokens", "input_image_tokens",
              "output_tokens", "output_text_tokens", "output_audio_tokens"]
    values = {key: count(getattr(usage, key)) for key in fields}
    unclassified_in = max(0, values["input_tokens"] - sum(values[key] for key in [
        "input_text_tokens", "input_audio_tokens", "input_image_tokens"]))
    unclassified_out = max(0, values["output_tokens"] - values["output_text_tokens"] - values["output_audio_tokens"])
    amount = (Decimal("0.75") * values["input_text_tokens"] + 3 * values["input_audio_tokens"]
              + values["input_image_tokens"] + 3 * unclassified_in
              + Decimal("4.50") * values["output_text_tokens"] + 12 * values["output_audio_tokens"] + 12 * unclassified_out)
    return int(amount.to_integral_value(rounding=ROUND_CEILING))


def flash_estimate(metadata, model):
    if not current() or model != "gemini-3.8-flash" or metadata is None:
        raise ValueError("rate_card_or_usage_unavailable")
    prompt = count(metadata.prompt_token_count or 0)
    # Hidden thinking is charged as output. total_token_count provides a
    # conservative fallback when a metadata field is missing.
    response = count(metadata.candidates_token_count or 0) + count(metadata.thoughts_token_count or 0)
    response = max(response, count(metadata.total_token_count or 0) - prompt)
    amount = Decimal("0.75") * prompt + Decimal("3.75") * response
    return int(amount.to_integral_value(rounding=ROUND_CEILING))
