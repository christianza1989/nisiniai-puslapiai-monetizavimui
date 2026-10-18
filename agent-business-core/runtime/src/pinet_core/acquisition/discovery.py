"""Finite live discovery evidence, using canonical URL policy and public reader.

Private operator entrypoint only. Evidence is never a verified Prospect or send
permission. No CRM, model, calibration, scheduler or transport is implemented here.
"""

import asyncio
import json
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID, uuid5

from pydantic import AwareDatetime, Field, model_validator

from ..contracts import Strict
from .discovery_urls import review_discovery_urls
from .engine import fingerprint
from .sources import retrieve


class DiscoveryQuery(Strict):
    id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    text: str = Field(min_length=3, max_length=400)
    country: str = Field(pattern=r"^[A-Z]{2}$")
    language: str = Field(pattern=r"^[a-z]{2}$")


class DiscoveryPlan(Strict):
    site_id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    campaign_id: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    run_id: UUID
    execution_source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    treg_organization: str = Field(pattern=r"^[a-z0-9-]{2,64}$")
    approved_at: AwareDatetime
    expires_at: AwareDatetime
    queries: list[DiscoveryQuery] = Field(min_length=1, max_length=10)
    excluded_hosts: list[str] = Field(max_length=100)
    maximum_query_cost_micro: int = Field(ge=1, le=10000)
    maximum_primary_reads: int = Field(ge=0, le=20)

    @model_validator(mode="after")
    def finite_unique(self):
        if (
            not self.approved_at < self.expires_at <= self.approved_at + timedelta(days=1)
            or len({q.id for q in self.queries}) != len(self.queries)
            or len({(q.text, q.country, q.language) for q in self.queries}) != len(self.queries)
        ):
            raise ValueError("finite_unique_discovery_required")
        review_discovery_urls([], excluded_hosts=self.excluded_hosts)
        return self


def current(plan, now=None):
    now = now or datetime.now(UTC)
    if not plan.approved_at <= now < plan.expires_at:
        raise ValueError("discovery_plan_not_current")


def save(path, value):
    with Path(path).open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


async def discover(plan, directory, search, *, reader=retrieve):
    """One exclusive batch. An ambiguous attempt is retained and never replayed.

    search must return {call_id,status,cost_micro,results:[{url,title,snippet}]}.
    The explicit operator plan admits finite public reads from locally reviewed
    discovery URLs. Neither a search filter nor its text can grant contact rights.
    """
    plan = DiscoveryPlan.model_validate(plan)
    current(plan)
    directory = Path(directory)
    if any(p.is_symlink() for p in (directory, *directory.parents)):
        raise ValueError("private_discovery_directory_required")
    directory.mkdir(parents=True, exist_ok=False)
    save(directory / "plan.private.json", plan.model_dump(mode="json"))
    calls, rows, cost, sources, receipts, attempted = [], [], 0, [], [], 0
    try:
        async with asyncio.timeout(900):
            for query in plan.queries:
                current(plan)
                request_id = str(uuid5(plan.run_id, query.id))
                save(
                    directory / (query.id + ".intent.private.json"),
                    {
                        "query": query.model_dump(),
                        "request_id": request_id,
                        "maximum_cost_micro": plan.maximum_query_cost_micro,
                        "admitted_at": datetime.now(UTC).isoformat(),
                    },
                )
                attempted += 1
                result = await search(query, request_id, plan.maximum_query_cost_micro)
                save(directory / (query.id + ".result.private.json"), result)
                calls.append(result)
                amount = result.get("cost_micro")
                if type(amount) is int and amount >= 0:
                    cost += amount  # Preserve known charges even above the admission ceiling.
                if type(amount) is not int or not 0 <= amount <= plan.maximum_query_cost_micro:
                    raise ValueError("discovery_charge_unknown_or_above_ceiling")
                if result.get("status") != 200:
                    raise ValueError("discovery_provider_failed_no_retry")
                found = result.get("results")
                if not isinstance(found, list) or len(found) > 10:
                    raise ValueError("bounded_discovery_rows_required")
                for row in found:
                    if (
                        not isinstance(row, dict)
                        or not isinstance(row.get("url"), str)
                        or any(
                            not isinstance(row.get(k), str) or len(row[k]) > 4000
                            for k in ("title", "snippet")
                        )
                    ):
                        raise ValueError("discovery_row_invalid")
                    rows.append(
                        {
                            **row,
                            "query_id": query.id,
                            "requested_country": query.country,
                            "language": query.language,
                            "provider_call_id": result.get("call_id"),
                        }
                    )
            reviews = review_discovery_urls(
                [row["url"] for row in rows], excluded_hosts=plan.excluded_hosts, max_results=100
            )
            save(directory / "url-review.private.json", [asdict(review) for review in reviews])
            seen = set()
            for row, review in zip(rows, reviews, strict=True):
                if (
                    review.state != "primary_read_required"
                    or review.hostname in seen
                    or len(sources) >= plan.maximum_primary_reads
                ):
                    continue
                seen.add(review.hostname)
                sources.append(
                    {
                        "id": "discovery-" + fingerprint(review.url)[:24],
                        "site_id": plan.site_id,
                        "url": review.url,
                        "language": row["language"],
                        "read_allowed": True,
                    }
                )
            current(plan)
            save(directory / "primary-read-policy.private.json", sources)
            if sources:
                receipts = await reader(plan.site_id, sources, max_calls=plan.maximum_primary_reads)
            save(directory / "primary-receipts.private.json", receipts)
            save(
                directory / "evidence.private.json",
                {
                    "search_rows": rows,
                    "sources": receipts,
                    "verified_country": None,
                    "qualified_prospects": [],
                    "contactable_prospects": [],
                    "warning": "Untrusted public evidence; verify the organization, market, fit, contact provenance and permission separately.",
                },
            )
    except BaseException as error:
        save(
            directory / "stopped.safe.json",
            {
                "state": "STOPPED_NO_RETRY",
                "error_class": type(error).__name__,
                "code": str(error) if isinstance(error, ValueError) else "discovery_incomplete",
                "query_attempts": attempted,
                "completed_calls": len(calls),
                "unreconciled_queries": attempted - len(calls),
                "known_cost_micro": cost,
                "external_sent": False,
            },
        )
        raise
    result = {
        "state": "EVIDENCE_READY",
        "site_id": plan.site_id,
        "campaign_id": plan.campaign_id,
        "run_id": str(plan.run_id),
        "source_revision": plan.execution_source_revision,
        "search_calls": len(calls),
        "search_rows": len(rows),
        "cost_micro": cost,
        "primary_reads": len(receipts),
        "retrieved": sum(r.get("status") == "retrieved" for r in receipts),
        "qualified_prospects": 0,
        "contactable_prospects": 0,
        "crm_imported": 0,
        "external_sent": False,
    }
    save(directory / "receipt.safe.json", result)
    return result
