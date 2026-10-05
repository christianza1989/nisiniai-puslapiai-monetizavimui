from types import SimpleNamespace

import pytest

from pinet_core import pricing


def usage(**changes):
    return SimpleNamespace(**{"model": "gemini-3.8-live", "input_tokens": 0, "input_text_tokens": 0,
        "input_audio_tokens": 0, "input_image_tokens": 0, "output_tokens": 0, "output_text_tokens": 0,
        "output_audio_tokens": 0, **changes})


def test_modality_prices_and_fractional_rounding():
    value = usage()
    value.input_text_tokens, value.input_audio_tokens, value.input_image_tokens = 1000, 2000, 3000
    value.output_text_tokens, value.output_audio_tokens = 4000, 5000
    assert pricing.live_estimate(value) == 87750
    assert pricing.live_estimate(usage(input_text_tokens=1)) == 1


def test_missing_modality_is_conservatively_charged_without_free_quota_assumption():
    assert pricing.live_estimate(usage(input_tokens=1000, output_tokens=1000)) == 15000


@pytest.mark.parametrize("field,value", [("input_tokens", -1), ("output_tokens", True), ("input_audio_tokens", 1.5)])
def test_bad_usage_counts_fail_closed(field, value):
    item = usage()
    setattr(item, field, value)
    with pytest.raises(ValueError, match="invalid_usage_count"):
        pricing.live_estimate(item)


def test_unknown_model_and_expired_review_fail_closed(monkeypatch):
    item = usage()
    item.model = "unknown-model"
    with pytest.raises(ValueError, match="rate_card_review_required"):
        pricing.live_estimate(item)
    monkeypatch.setattr(pricing, "current", lambda: False)
    with pytest.raises(ValueError, match="rate_card_review_required"):
        pricing.live_estimate(usage())


def test_flash_thinking_is_output_and_total_metadata_is_conservative_fallback():
    data = SimpleNamespace(prompt_token_count=1000, candidates_token_count=1000, thoughts_token_count=1000,
                           total_token_count=3000)
    assert pricing.flash_estimate(data, "gemini-3.8-flash") == 8250
    data.total_token_count = 4000
    assert pricing.flash_estimate(data, "gemini-3.8-flash") == 12000
