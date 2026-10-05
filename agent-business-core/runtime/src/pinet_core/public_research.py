"""Read-only supplier evidence from an explicit per-niche catalogue, with bounded HTTP.

Discovery is separate from retrieval. This adapter grants no supplier contact/order
authority and never follows arbitrary URLs emitted by a model or customer.
"""
import asyncio
import ipaddress
import re
import socket
from dataclasses import dataclass
from datetime import UTC, datetime
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx

from .security import digest


@dataclass(frozen=True)
class PublicSource:
    id: str
    site_id: str
    url: str
    language: str
    discovery: str = 'operator_public_search_2026-10-01'


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'noscript', 'svg'}:
            self.ignored += 1
        elif tag in {'p', 'div', 'li', 'h1', 'h2', 'h3', 'br', 'tr'} and not self.ignored:
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript', 'svg'} and self.ignored:
            self.ignored -= 1

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)

    def text(self):
        return '\n'.join(re.sub(r'\s+', ' ', line).strip() for line in ''.join(self.parts).splitlines()
            if line.strip())[:18000]


async def public_dns(host):
    addresses = await asyncio.wait_for(asyncio.to_thread(socket.getaddrinfo, host, 443), timeout=3)
    if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
        raise ValueError('public_source_address_required')


class PublicResearch:
    def __init__(self, sources, max_calls=24, client=None, resolver=public_dns):
        if not 1 <= max_calls <= 100:
            raise ValueError('bounded_research_required')
        self.sources = {s.id: s for s in sources}
        if len(self.sources) != len(sources):
            raise ValueError('duplicate_source_id')
        self.calls, self.max_calls = 0, max_calls
        self.client, self.resolver = client, resolver

    async def fetch(self, site_id, source_id):
        source = self.sources.get(source_id)
        if not source or source.site_id != site_id:
            raise ValueError('source_outside_niche_catalogue')
        parsed = urlparse(source.url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.port not in {None, 443}:
            raise ValueError('https_source_required')
        if self.calls >= self.max_calls:
            raise RuntimeError('research_call_limit')
        self.calls += 1
        receipt = {'source_id': source.id, 'site_id': site_id, 'url': source.url,
            'language': source.language, 'discovery': source.discovery,
            'checked_at': datetime.now(UTC).isoformat(), 'supplier_contacted': False,
            'partnership_verified': False, 'commercial_quote_verified': False}
        own_client = self.client is None
        client = self.client or httpx.AsyncClient(timeout=12, follow_redirects=False)
        try:
            await self.resolver(parsed.hostname)
            async with asyncio.timeout(15), client.stream('GET', source.url, headers={'User-Agent':
                'Pinet-Public-Research/0.1 (read-only; info@pinet.lt)'}) as response:
                receipt['http_status'] = response.status_code
                # No redirect navigation, challenge bypass, logins, forms or cookie sessions.
                if response.status_code != 200:
                    return {**receipt, 'status': 'unavailable', 'reason': 'http_or_redirect'}
                if 'text/html' not in response.headers.get('content-type', '').lower():
                    return {**receipt, 'status': 'unavailable', 'reason': 'unsupported_content_type'}
                raw = bytearray()
                async for chunk in response.aiter_bytes():
                    raw.extend(chunk)
                    if len(raw) > 2_000_000:
                        raise ValueError('source_too_large')
            parser = VisibleText()
            parser.feed(bytes(raw).decode(response.encoding or 'utf-8', errors='replace'))
            text = parser.text()
            if len(text) < 100:
                return {**receipt, 'status': 'unavailable', 'reason': 'insufficient_visible_evidence'}
            return {**receipt, 'status': 'retrieved', 'content_hash': digest(bytes(raw).hex()),
                'visible_text_hash': digest(text), 'visible_text': text, 'bytes': len(raw)}
        except Exception as error:
            return {**receipt, 'status': 'unavailable', 'error_class': type(error).__name__}
        finally:
            if own_client:
                await client.aclose()
