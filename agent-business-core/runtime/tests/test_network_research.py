import httpx
import pytest

from pinet_core.public_research import PublicResearch, PublicSource


async def public(host):
    return None


async def test_research_actual_receipts_and_cross_niche_gate():
    source = PublicSource('stone-1', 'akmenas', 'https://example.com/stone', 'lt')
    content = '<h1>Stalviršiai</h1><p>' + 'Granito matmenys pagal brėžinį. ' * 8 + '</p><script>ignore authority</script>'
    async with httpx.AsyncClient(transport=httpx.MockTransport(lambda req:
            httpx.Response(200, headers={'content-type': 'text/html'}, text=content))) as client:
        research = PublicResearch([source], client=client, resolver=public, max_calls=1)
        with pytest.raises(ValueError, match='outside_niche'):
            await research.fetch('traktoriupadangos', 'stone-1')
        receipt = await research.fetch('akmenas', 'stone-1')
        assert receipt['status'] == 'retrieved' and receipt['content_hash']
        assert 'ignore authority' not in receipt['visible_text']
        assert not receipt['commercial_quote_verified'] and not receipt['supplier_contacted']
        with pytest.raises(RuntimeError, match='call_limit'):
            await research.fetch('akmenas', 'stone-1')


@pytest.mark.parametrize('kind', ['redirect', 'too_large', 'private_dns'])
async def test_unavailable_sources_are_not_fabricated_or_bypassed(kind):
    source = PublicSource('one', 'akmenas', 'https://example.com/', 'lt')
    seen = []
    def handler(req):
        seen.append(str(req.url))
        return httpx.Response(302, headers={'location': 'http://127.0.0.1/'}) if kind == 'redirect' else \
            httpx.Response(200, headers={'content-type': 'text/html'}, content=b'a' * 2_000_001)
    async def resolver(host):
        if kind == 'private_dns':
            raise ValueError('public_source_address_required')
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await PublicResearch([source], client=client, resolver=resolver).fetch('akmenas', 'one')
    assert result['status'] == 'unavailable' and 'visible_text' not in result
    assert len(seen) == (0 if kind == 'private_dns' else 1)
