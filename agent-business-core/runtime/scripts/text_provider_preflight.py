"""Read-only provider metadata, never a paid completion or credential output."""
import asyncio
import json

import httpx

from pinet_core.config import settings


async def main():
    cfg = settings()
    report = {'provider': cfg.text_provider, 'model': cfg.text_model,
              'configured': cfg.text_provider_ready, 'inference_run': False,
              'voice_enabled': cfg.voice_enabled}
    if cfg.text_provider != 'openrouter':
        report['status'] = 'NOT_SELECTED'
        print(json.dumps(report))
        return
    key = cfg.openrouter_api_key.get_secret_value()
    report['key_present'] = bool(key)
    async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
        response = await client.get('https://openrouter.ai/api/v1/models')
        report['catalog_http_status'] = response.status_code
        if response.status_code == 200:
            found = next((x for x in response.json().get('data', []) if x.get('id') == cfg.openrouter_model), None)
            report['model_found'] = found is not None
            if found:
                report['supported_parameters'] = found.get('supported_parameters', [])
                report['catalog_pricing_usd_per_token'] = {k: found.get('pricing', {}).get(k)
                                                          for k in ['prompt', 'completion']}
        if key:
            response = await client.get('https://openrouter.ai/api/v1/key',
                                        headers={'Authorization': 'Bearer ' + key})
            report['key_http_status'] = response.status_code
            # Never print label, key hash, account balance or error body.
            report['key_valid'] = response.status_code == 200
    structured = {'response_format', 'structured_outputs'} <= set(report.get('supported_parameters', []))
    report['status'] = 'METADATA_PASS' if (cfg.text_provider_ready and report.get('key_valid')
                                           and report.get('model_found') and structured) else 'NOT_READY'
    print(json.dumps(report, ensure_ascii=False, indent=2))
    # This metadata check is not a live schema/endpoint/billing acceptance test.
    return 0 if report['status'] == 'METADATA_PASS' else 1


if __name__ == '__main__':
    try:
        raise SystemExit(asyncio.run(main()))
    except (httpx.HTTPError, ValueError, KeyError):
        print(json.dumps({'status': 'METADATA_UNAVAILABLE', 'inference_run': False}))
        raise SystemExit(1) from None
