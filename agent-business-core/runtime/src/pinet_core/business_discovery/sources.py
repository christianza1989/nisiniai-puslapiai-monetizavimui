"""Public HTTPS evidence reader: pinned public DNS, verified TLS, robots and finite bytes/time."""
import asyncio
import hashlib
import http.client
import ipaddress
import json
import re
import socket
import ssl
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from time import monotonic
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

from ..public_projects.projection import public_url

AGENT = "VerslomatikaResearch/0.1"
PAGE_BYTES = 800000
CONTEXT_BYTES = 100000


class Document(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base, self.skip, self.main, self.in_title = base, 0, 0, False
        self.words, self.title, self.links = [], [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style", "noscript"}:
            self.skip += 1
        if tag == "title":
            self.in_title = True
        if tag == "main":
            self.main += 1
        if tag == "a" and attrs.get("href"):
            try:
                value = urljoin(self.base, attrs["href"])
                if len(value) > 1024:
                    return
                public_url(value)
                if urlsplit(value).hostname == urlsplit(self.base).hostname:
                    self.links.append(value)
            except ValueError:
                pass

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self.skip:
            self.skip -= 1
        if tag == "title":
            self.in_title = False
        if tag == "main" and self.main:
            self.main -= 1

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if not self.skip and self.main and data.strip():
            self.words.append(data.strip())


def public_address(host):
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    values = {item[4][0] for item in addresses}
    if not values or any(not ipaddress.ip_address(value).is_global for value in values):
        raise ValueError("non_public_source_address")
    return sorted(values, key=lambda value: (":" in value, value))[0]


class Connection(http.client.HTTPSConnection):
    def connect(self):
        address = public_address(self.host)
        raw = socket.create_connection((address, 443), timeout=self.timeout)
        try:
            self.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise


def fetch(url, deadline):
    public_url(url)
    if len(url) > 1024:
        raise ValueError("source_url_limit")
    parts = urlsplit(url)
    if parts.hostname == "booking.com" or parts.hostname.endswith(".booking.com"):
        raise ValueError("source_automation_terms_hold")
    if monotonic() >= deadline:
        raise TimeoutError("source_deadline")
    connection = Connection(parts.hostname, timeout=min(4, max(.1, deadline - monotonic())))
    try:
        connection.request("GET", parts.path or "/", headers={"User-Agent": AGENT, "Accept-Encoding": "identity"})
        response = connection.getresponse()
        if response.status in (301, 302, 303, 307, 308):
            target = urljoin(url, response.getheader("Location") or "")
            public_url(target)
            if urlsplit(target).hostname != parts.hostname:
                raise ValueError("cross_host_redirect")
            return response.status, target, b"", ""
        if response.getheader("Content-Encoding", "identity").lower() not in ("identity", ""):
            raise ValueError("encoded_source_not_supported")
        data = response.read(PAGE_BYTES + 1)
        if len(data) > PAGE_BYTES:
            raise ValueError("source_byte_limit")
        return response.status, url, data, response.getheader("Content-Type", "")
    finally:
        connection.close()


def read(url, deadline, snapshot_dir=None):
    host = urlsplit(url).hostname
    robots_url = "https://" + host + "/robots.txt"
    status, _, data, _ = fetch(robots_url, deadline)
    if status >= 500 or status in (401, 403) or 300 <= status < 400:
        raise ValueError("source_robots_unavailable")
    if status == 200:
        robots = RobotFileParser()
        robots.parse(data.decode("utf-8", errors="replace").splitlines())
        if not robots.can_fetch(AGENT, url):
            raise ValueError("source_robots_disallow")
    for _ in range(3):
        status, actual, data, content_type = fetch(url, deadline)
        if 300 <= status < 400:
            url = actual
            continue
        if status != 200 or "html" not in content_type.lower():
            raise ValueError("source_not_readable")
        document = Document(actual)
        document.feed(data.decode("utf-8", errors="replace"))
        text = "\n".join(document.words)
        if not text:
            raise ValueError("source_body_not_observed")
        text = text[:9000]
        body_hash = hashlib.sha256(data).hexdigest()
        if snapshot_dir:
            folder = Path(snapshot_dir)
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / (body_hash[:16] + ".private.html")
            if path.exists():
                if hashlib.sha256(path.read_bytes()).hexdigest() != body_hash:
                    raise ValueError("source_snapshot_conflict")
            else:
                with path.open("xb") as output:
                    output.write(data)
        return {"url": actual, "status": "observed", "http_status": status,
            "observed_at": datetime.now(UTC).isoformat(), "title": "".join(document.title).strip()[:180],
            "body_sha256": body_hash, "text_sha256": hashlib.sha256(text.encode()).hexdigest(),
            "response_bytes": len(data), "text": text, "links": list(dict.fromkeys(document.links))}
    raise ValueError("source_redirect_limit")


async def collect(message, authorized, *, seconds=24, snapshot_dir=None):
    roots = []
    # Quotes/code delimiters in ordinary prose are not part of a supplied URL.
    # Percent-encoded punctuation stays intact; all existing public URL/DNS gates remain.
    for candidate in re.findall(r'''https://[^\s<>"'`„“”«»‹›‘’]+''', message):
        candidate = candidate.rstrip(".,;!)]")
        try:
            public_url(candidate)
            roots.append(candidate)
        except ValueError:
            continue
    deadline, queue, seen, output = monotonic() + seconds, list(dict.fromkeys(roots)), set(), []
    total = 0
    while queue and monotonic() < deadline and total < CONTEXT_BYTES:
        if not await authorized():
            raise RuntimeError("source_authority_revoked")
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            result = await asyncio.wait_for(asyncio.to_thread(read, url, deadline, snapshot_dir),
                                            timeout=max(.1, deadline - monotonic()))
        except (OSError, ValueError, TimeoutError, http.client.HTTPException) as error:
            output.append({"url": url, "status": "unavailable", "error": type(error).__name__})
            continue
        size = len(json.dumps(result, ensure_ascii=False).encode())
        if total + size > CONTEXT_BYTES:
            queue.insert(0, url)
            seen.remove(url)
            break
        seen.add(result["url"])
        total += size
        output.append(result)
        # Follow actual same-host catalogue/model links, not guessed URLs or contacts.
        for link in result["links"]:
            if link not in seen and link not in queue and urlsplit(link).path.startswith(("/product/", "/product-category/")):
                queue.append(link)
    if not await authorized():
        raise RuntimeError("source_authority_revoked")
    return {"pages": output, "remaining_urls": queue,
            "complete": not queue and all(p["status"] == "observed" for p in output),
            "independent_fact_verification": "UNVERIFIED"}
