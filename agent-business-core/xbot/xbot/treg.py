"""One official X transport through Treg. No arbitrary proxy URL or write failover."""
import json
import re
import time
from dataclasses import dataclass
from decimal import Decimal

import httpx


@dataclass
class Receipt:
    status: int
    body: dict
    call_id: str | None
    charged_micro: int | None
    uncertain: bool = False
    retry_after: str | None = None

    @property
    def ok(self):
        return 200 <= self.status < 300 and not self.body.get("errors")


class Treg:
    def __init__(self, token, client=None):
        self.token = token
        self.client = client
        self.prices = {}

    async def audit(self, call_id):
        if not self.token or not re.fullmatch(r"[a-zA-Z0-9_-]{1,120}", call_id):
            raise ValueError("invalid_call_receipt_reference")
        owned = self.client is None
        client = self.client or httpx.AsyncClient(timeout=15, follow_redirects=False)
        try:
            values = []
            for suffix in ("", "/result"):
                r = await client.get(f"https://treg.to/calls/{call_id}{suffix}", headers={"X-Treg-Token": self.token})
                r.raise_for_status()
                values.append(r.json())
            return {"ledger": values[0], "result": values[1]}
        except (httpx.HTTPError, ValueError):
            raise ValueError("receipt_audit_unavailable") from None
        finally:
            if owned:
                await client.aclose()

    async def price(self, operation, payload):
        """Fresh public catalogue check before spending; floors are not a promise of provider prices."""
        endpoints = {"research": "x.x.search-posts-recent", "mentions": "x.x.get-users-mentions",
                     "metrics": "x.x.get-posts-analytics", "post": "x.x.post.create",
                     "thread": "x.x.post.create", "reply": "x.x.post.reply",
                     "dm": "x.x.create-direct-messages-by-participant-id",
                     "media_upload": "x.x.media-upload", "media_alt": "x.x.create-media-metadata",
                     "identity": "x.x.get-users-by-id"}
        endpoint = endpoints[operation]
        cached = self.prices.get(endpoint)
        if not cached or time.time() - cached[0] > 300:
            owned = self.client is None
            client = self.client or httpx.AsyncClient(timeout=15, follow_redirects=False)
            try:
                response = await client.get(f"https://treg.to/catalog/endpoints/{endpoint}")
                response.raise_for_status()
                cost = response.json()["endpoint"]["cost"]
                if cost.get("currency") != "USD" or cost.get("type") not in {"per_call", "per_result"}:
                    raise ValueError("unsupported_price_contract")
                unit = int(Decimal(str(cost["usd"])) * 1_000_000)
                if unit <= 0 or cost.get("per", 1) != 1:
                    raise ValueError("invalid_catalogue_price")
                self.prices[endpoint] = (time.time(), unit, cost["type"])
            except (httpx.HTTPError, ValueError, KeyError):
                raise ValueError("live_price_check_unavailable") from None
            finally:
                if owned:
                    await client.aclose()
        _, unit, kind = self.prices[endpoint]
        resources = 10 if operation == "research" else 5 if operation == "mentions" else 1
        return max(self.estimate(operation, payload), unit * (resources if kind == "per_result" else 1))

    async def _request(self, method, path, *, site, key, body=None, query=None):
        if not self.token:
            return Receipt(0, {"reason": "treg_token_missing"}, None, 0)
        if not re.fullmatch(r"[a-z][a-z0-9-]{1,63}", site):
            raise ValueError("invalid_site_tag")
        headers = {"X-Treg-Token": self.token, "Idempotency-Key": key,
                   "X-Treg-Meta": f"site={site}, channel=x"}
        owned = self.client is None
        client = self.client or httpx.AsyncClient(timeout=30, follow_redirects=False)
        try:
            response = await client.request(method, "https://treg.to" + path, headers=headers,
                                            json=body, params=query)
            try:
                value = response.json()
                if not isinstance(value, dict):
                    value = {"data": value}
                raw = json.dumps(value)
                if self.token in raw:
                    value = json.loads(raw.replace(self.token, "[REDACTED]"))
            except (ValueError, json.JSONDecodeError):
                value = {"reason": "provider_non_json_response"}
            cost = response.headers.get("x-treg-cost-micro")
            actual = int(cost) if cost and cost.isdigit() else None
            return Receipt(response.status_code, value, response.headers.get("x-treg-call-id"), actual,
                           response.status_code in {409, 410} or response.status_code >= 500,
                           response.headers.get("retry-after"))
        except httpx.HTTPError:
            return Receipt(0, {"reason": "transport_outcome_unknown"}, None, None, True)
        finally:
            if owned:
                await client.aclose()

    async def call(self, operation, profile, payload, key):
        actor = profile.get("actor_id", "")
        query, body = None, None
        if operation == "identity":
            method, path = "GET", "/call/https://api.x.com/2/users/me"
        elif operation == "research":
            method, path = "GET", "/call/x.x.search-posts-recent"
            query = {"query": payload["query"], "max_results": 10,
                     "tweet.fields": "created_at,author_id,public_metrics,conversation_id"}
            if payload.get("next_token"):
                query["next_token"] = payload["next_token"]
        elif operation == "mentions":
            method, path = "GET", f"/call/https://api.x.com/2/users/{actor}/mentions"
            query = {"max_results": 5, "tweet.fields": "created_at,author_id,conversation_id"}
            if payload.get("since_id"):
                query["since_id"] = payload["since_id"]
            if payload.get("pagination_token"):
                query["pagination_token"] = payload["pagination_token"]
        elif operation == "metrics":
            if not re.fullmatch(r"\d+", payload.get("post_id", "")):
                raise ValueError("invalid_post_id")
            method, path = "GET", f"/call/https://api.x.com/2/tweets/{payload['post_id']}"
            query = {"tweet.fields": "author_id,public_metrics,created_at"}
        elif operation in {"post", "thread", "reply"}:
            method, path = "POST", "/call/https://api.x.com/2/tweets"
            body = {"text": payload["text"]}
            if payload.get("parent_id"):
                if not re.fullmatch(r"\d+", payload["parent_id"]):
                    raise ValueError("invalid_parent_id")
                body["reply"] = {"in_reply_to_tweet_id": payload["parent_id"]}
            if payload.get("media_ids"):
                body["media"] = {"media_ids": payload["media_ids"]}
        elif operation == "dm":
            target = payload.get("recipient_id", "")
            if not re.fullmatch(r"\d+", target):
                raise ValueError("invalid_dm_recipient")
            method, path = "POST", f"/call/https://api.x.com/2/dm_conversations/with/{target}/messages"
            body = {"text": payload["text"]}
        elif operation == "media_upload":
            method, path = "POST", "/call/https://api.x.com/2/media/upload"
            body = {k: payload[k] for k in ("media", "media_category")}
        elif operation == "media_alt":
            method, path = "POST", "/call/https://api.x.com/2/media/metadata"
            body = {"id": payload["media_id"], "metadata": {"alt_text": {"text": payload["alt"]}}}
        else:
            raise ValueError("unsupported_x_operation")
        return await self._request(method, path, site=profile["site_id"], key=key, body=body, query=query)

    @staticmethod
    def estimate(operation, payload):
        # Conservative resource bounds; settled cost is always from the actual Treg response.
        if operation == "identity":
            return 10_000
        if operation == "research":
            return 50_000
        if operation == "mentions":
            return 25_000
        if operation == "metrics":
            return 5_000
        if operation == "media_alt":
            return 5_000
        if operation == "media_upload":
            return 15_000
        return 200_000 if operation in {"post", "thread", "reply"} else 15_000
