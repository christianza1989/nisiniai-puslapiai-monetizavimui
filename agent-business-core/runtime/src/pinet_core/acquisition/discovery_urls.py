"""Local discovery URL exclusions; never grants source, recipient or sending rights.

Provider search filters are advisory. Remaining URLs still require the explicit
public-source catalogue/read policy and primary organization/location evidence.
No provider payload, snippet, contact or inferred city is retained here.
"""
import ipaddress
import re
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlsplit, urlunsplit


def _hostname(value):
    if not isinstance(value, str) or not value or value != value.strip():
        raise ValueError('domain_policy_required')
    try:
        host = value.rstrip('.').encode('idna').decode('ascii').lower()
        ipaddress.ip_address(host)
    except UnicodeError:
        raise ValueError('domain_policy_required') from None
    except ValueError:
        pass
    else:
        raise ValueError('dns_hostname_required')
    if len(host) > 253 or '.' not in host or any(
            not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label)
            for label in host.split('.')):
        raise ValueError('domain_policy_required')
    return host


@dataclass(frozen=True)
class DiscoveryUrlReview:
    position: int
    state: Literal['excluded', 'primary_read_required']
    url: str | None
    hostname: str | None
    reasons: tuple[str, ...]
    read_allowed: bool = False
    qualified_provider: bool = False


def review_discovery_urls(urls, *, excluded_hosts, max_results=100):
    """Review bounded URL-only results under caller-owned domain policy.

    Domain exclusions cover the domain and its subdomains, independent of the
    provider. Query/credential/non-HTTPS/invalid URLs cannot become automatic
    fetch targets. Invalid policy or oversized batches fail before processing.
    A primary_read_required row is not a Prospect, geography match or intent.
    """
    if (type(max_results) is not int or not 1 <= max_results <= 100
            or not isinstance(urls, (list, tuple)) or len(urls) > max_results
            or not isinstance(excluded_hosts, (list, tuple)) or len(excluded_hosts) > 100):
        raise ValueError('bounded_discovery_policy_required')
    denied = {_hostname(host) for host in excluded_hosts}
    seen, reviews = set(), []
    for position, value in enumerate(urls, start=1):
        host, normalized, reason = None, None, None
        try:
            if (not isinstance(value, str) or not value or len(value) > 4096
                    or any(ord(char) <= 32 or ord(char) == 127 for char in value)):
                raise ValueError('invalid_url')
            parsed = urlsplit(value)
            host = _hostname(parsed.hostname)
            if any(host == domain or host.endswith('.' + domain) for domain in denied):
                reason = 'excluded_domain'
            elif parsed.scheme != 'https' or parsed.port not in (None, 443):
                reason = 'https_source_required'
            elif parsed.username is not None or parsed.password is not None:
                reason = 'credentials_forbidden'
            elif parsed.query:
                reason = 'query_requires_review'
            else:
                normalized = urlunsplit(('https', host, parsed.path or '/', '', ''))
                if normalized in seen:
                    reason = 'duplicate_source_url'
                else:
                    seen.add(normalized)
        except (ValueError, UnicodeError):
            reason = 'invalid_url'
        if reason:
            reviews.append(DiscoveryUrlReview(position, 'excluded', None, host, (reason,)))
        else:
            reviews.append(DiscoveryUrlReview(position, 'primary_read_required', normalized, host,
                                             ('primary_evidence_and_read_policy_required',)))
    return tuple(reviews)
