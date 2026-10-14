"""One explicit text provider for chat, analysis, reviewed mail and replies.

Reservations and server-side tool validation remain in callers. No retry or
cross-model fallback: an ambiguous failure must not spend again. OpenRouter
usage.cost is provider-reported USD, not an independently verified invoice.
Official API/structured-output/usage/routing docs checked 2026-10-10.
"""
import asyncio
import json
from dataclasses import dataclass
from decimal import ROUND_CEILING, Decimal, InvalidOperation

import httpx
from google import genai
from google.genai import types

from . import pricing
from .config import settings

OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'


class ProviderError(RuntimeError):
    """Safe diagnostics: never propagate provider body, headers or credentials."""
    def __init__(self, code, reason):
        self.code = code
        self.message = reason
        super().__init__(reason)


@dataclass(frozen=True)
class Generated:
    text: str
    amount_microusd: int
    finish_reason: str


def openrouter_cost(usage):
    value = usage.get('cost') if isinstance(usage, dict) else None
    if value is None or isinstance(value, bool) or not isinstance(value, (int, float, str, Decimal)):
        raise ProviderError(502, 'openrouter_cost_unavailable')
    try:
        amount = Decimal(str(value))
    except InvalidOperation:
        raise ProviderError(502, 'openrouter_cost_invalid') from None
    if not amount.is_finite() or amount < 0:
        raise ProviderError(502, 'openrouter_cost_invalid')
    return int((amount * 1000000).to_integral_value(rounding=ROUND_CEILING))


async def generate_json(schema, instruction, data, *, max_output_tokens, timeout):
    cfg = settings()
    if cfg.text_provider not in {'gemini', 'openrouter'}:
        raise ProviderError(503, 'text_provider_unknown')
    if cfg.text_provider == 'openrouter':
        if not cfg.text_provider_ready:
            raise ProviderError(503, 'openrouter_not_configured')
        body = {
            'model': cfg.openrouter_model, 'stream': False, 'max_tokens': max_output_tokens,
            'messages': [{'role': 'system', 'content': instruction},
                         {'role': 'user', 'content': json.dumps(data, ensure_ascii=False)}],
            'response_format': {'type': 'json_schema', 'json_schema': {
                'name': 'pinet_response', 'strict': True, 'schema': schema}},
            'provider': {'require_parameters': True, 'allow_fallbacks': False, 'data_collection': 'deny',
                         'max_price': {'prompt': cfg.openrouter_max_prompt_price,
                                       'completion': cfg.openrouter_max_completion_price}},
        }
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            response = await asyncio.wait_for(client.post(OPENROUTER_URL, json=body,
                headers={'Authorization': 'Bearer ' + cfg.openrouter_api_key.get_secret_value(),
                         'X-OpenRouter-Title': 'Pinet business core'}), timeout=timeout)
        if response.status_code != 200:
            raise ProviderError(response.status_code, 'openrouter_request_rejected')
        try:
            result = response.json()
        except ValueError:
            raise ProviderError(502, 'openrouter_response_invalid') from None
        if not isinstance(result, dict) or result.get('error'):
            raise ProviderError(502, 'openrouter_response_error')
        amount = openrouter_cost(result.get('usage'))
        # Return incomplete/invalid text with its cost so callers account for it
        # before validation. It cannot execute a tool or produce reviewed mail.
        choices = result.get('choices')
        first = choices[0] if isinstance(choices, list) and choices and isinstance(choices[0], dict) else {}
        message = first.get('message') if isinstance(first.get('message'), dict) else {}
        content = message.get('content')
        reason = str(first.get('finish_reason', ''))
        if reason != 'stop' or not isinstance(content, str):
            content = ''
        return Generated(content, amount, reason)
    async with genai.Client(api_key=cfg.google_api_key).aio as client:
        result = await asyncio.wait_for(client.models.generate_content(
            model=cfg.analysis_model, contents=json.dumps(data, ensure_ascii=False),
            config=types.GenerateContentConfig(system_instruction=instruction,
                response_mime_type='application/json', response_json_schema=schema,
                thinking_config=types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW),
                max_output_tokens=max_output_tokens)), timeout)
    amount = pricing.flash_estimate(result.usage_metadata, cfg.analysis_model)
    candidates = getattr(result, 'candidates', None) or []
    reason = str(getattr(candidates[0], 'finish_reason', '')) if candidates else ''
    return Generated(result.text, amount, reason)
