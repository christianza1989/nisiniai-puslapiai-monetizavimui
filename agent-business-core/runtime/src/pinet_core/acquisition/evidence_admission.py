"""Pinned original discovery receipts and exact excerpts, no fetching or effects."""

from datetime import datetime, timedelta
from pathlib import Path

from pydantic import ValidationError

from ..security import digest
from ..tasks.codex import RunnerError
from . import native_calibration
from .discovery import DiscoveryPlan
from .discovery_urls import review_discovery_urls
from .native_calibration import sealed_private_json


def packet(value):
    try:
        directory = Path(value.evidence.directory)
        # Reject foreign/UNC/traversal paths lexically before any filesystem IO.
        if (
            not directory.is_absolute()
            or ".." in directory.parts
            or not directory.is_relative_to(native_calibration.ROOT)
        ):
            raise RunnerError("research_private_directory_required")
        pinned = {}
        for key, filename in (
            ("plan", "plan.private.json"),
            ("receipt", "receipt.safe.json"),
            ("packet", "evidence.private.json"),
        ):
            pinned[key] = sealed_private_json(
                directory / filename,
                getattr(value.evidence, key + "_sha256"),
                changed="research_evidence_changed",
            )
        plan = DiscoveryPlan.model_validate(pinned["plan"])
        receipt, material = pinned["receipt"], pinned["packet"]
        if (
            not isinstance(receipt, dict)
            or not isinstance(material, dict)
            or not isinstance(material.get("sources"), list)
            or not isinstance(material.get("search_rows"), list)
            or any(not isinstance(row, dict) for row in material["sources"] + material["search_rows"])
        ):
            raise ValueError()
        if (
            receipt["state"] != "EVIDENCE_READY"
            or plan.site_id != value.campaign.site_id
            or receipt["site_id"] != plan.site_id
            or receipt["campaign_id"] != plan.campaign_id
            or plan.campaign_id != value.campaign.campaign_id
            or receipt["run_id"] != str(plan.run_id)
            or receipt["source_revision"] != plan.execution_source_revision
            or receipt["external_sent"] is not False
            or receipt["qualified_prospects"] != 0
            or receipt["contactable_prospects"] != 0
            or receipt["crm_imported"] != 0
        ):
            raise ValueError()
        for excerpt in value.prospect.evidence:
            review = review_discovery_urls([excerpt.url], excluded_hosts=plan.excluded_hosts)[0]
            queries = {q.id: q for q in plan.queries}
            if (
                review.state != "primary_read_required"
                or review.url != excerpt.url
                or not any(
                    row.get("url") == excerpt.url
                    and row.get("query_id") in queries
                    and queries[row["query_id"]].country == value.prospect.requested_country
                    for row in material["search_rows"]
                )
            ):
                raise ValueError()
            found = [source for source in material["sources"] if source.get("source_id") == excerpt.source_id]
            if len(found) != 1:
                raise ValueError()
            source = found[0]
            text = source["visible_text"]
            if not isinstance(text, str):
                raise ValueError()
            if (
                source["status"] != "retrieved"
                or source["site_id"] != plan.site_id
                or source["url"] != excerpt.url
                or source["visible_text_hash"] != excerpt.visible_text_sha256
                or digest(text) != excerpt.visible_text_sha256
                or datetime.fromisoformat(source["checked_at"]) != excerpt.checked_at
                or not plan.approved_at <= excerpt.checked_at < plan.expires_at
                or text[excerpt.start : excerpt.end] != excerpt.text
                or excerpt.end > len(text)
            ):
                raise ValueError()
        return plan
    except RunnerError:
        raise
    except (OSError, ValueError, KeyError, TypeError, ValidationError):
        raise RunnerError("research_evidence_invalid") from None


def time_current(value, now):
    if (
        not value.campaign.enabled
        or value.campaign.paused
        or not value.evidence.approved_at <= now < value.evidence.expires_at
        or value.campaign.expires_at <= now
        or any(f.expires_at <= now for f in value.campaign.facts)
        or any(
            not e.checked_at <= value.evidence.approved_at <= now < e.expires_at
            or now - e.checked_at > timedelta(days=1)
            for e in value.prospect.evidence
        )
    ):
        raise RunnerError("research_evidence_not_current")


def deadline(value, until):
    return min(
        until,
        value.evidence.expires_at,
        value.campaign.expires_at,
        *(f.expires_at for f in value.campaign.facts),
        *(e.expires_at for e in value.prospect.evidence),
        *(e.checked_at + timedelta(days=1) for e in value.prospect.evidence),
    )
