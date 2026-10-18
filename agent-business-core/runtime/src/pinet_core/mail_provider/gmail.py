"""Bounded Gmail REST primitives, with no retries or mailbox-wide discovery."""
import base64
import hashlib
import json
import re
from dataclasses import dataclass
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from email.utils import format_datetime, getaddresses

import httpx
from pydantic import EmailStr, TypeAdapter

from ..conversation_mail import valid_message_id
from ..offers import email_html

API = "https://gmail.googleapis.com/gmail/v1/users/me"
ADDRESS = TypeAdapter(EmailStr)
ID = re.compile(r"^[a-zA-Z0-9_-]{1,128}$")


class GmailError(Exception):
    def __init__(self, code, *, outcome="not_performed"):
        self.code, self.outcome = code, outcome
        super().__init__(code)  # Never include token, response, body or request URL.


@dataclass(frozen=True)
class Accepted:
    message_id: str
    thread_id: str
    delivery_confirmed: bool = False


def identifier(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise GmailError("gmail_identity_invalid")
    return value


def raw_message(payload, message_id, created_at):
    """Serialize the canonical reviewed payload without guessing recipient/alias."""
    if not valid_message_id(message_id) or created_at.tzinfo is None:
        raise GmailError("gmail_message_identity_invalid")
    try:
        sender, recipient = (str(ADDRESS.validate_python(payload[key])) for key in ("sender", "recipient"))
        subject, body = payload["subject"], payload["body"]
        if (not isinstance(subject, str) or not 1 <= len(subject) <= 256
                or any(ord(c) < 32 for c in subject) or not isinstance(body, str) or not 1 <= len(body) <= 16000
                or payload.get("attachments")):
            raise ValueError("unsupported_payload")
        message = EmailMessage(policy=policy.SMTP)
        for key, value in {"From": sender, "To": recipient, "Subject": subject,
                           "Message-ID": message_id, "Date": format_datetime(created_at)}.items():
            message[key] = value
        parent, refs = payload.get("in_reply_to"), payload.get("references", [])
        if parent is not None:
            if not valid_message_id(parent) or not isinstance(refs, list) or not 1 <= len(refs) <= 20 or parent not in refs:
                raise ValueError("invalid_parent")
            if any(not valid_message_id(ref) for ref in refs):
                raise ValueError("invalid_references")
            message["In-Reply-To"], message["References"] = parent, " ".join(refs)
        elif refs:
            raise ValueError("references_without_parent")
        message.set_content(body)
        message.add_alternative(email_html(body, payload.get("sender_name", "")), subtype="html")
        raw = message.as_bytes()
        if len(raw) > 65536:
            raise ValueError("message_too_large")
        return raw
    except (KeyError, TypeError, ValueError):
        raise GmailError("gmail_payload_invalid") from None


def sent_identity(raw, expected_raw):
    """Gmail may replace RFC Message-ID. Verify the accepted message before aliasing.

    This is authenticated exact-receipt content observation, not a subject-only
    thread guess, and never changes the original canonical Message-ID/payload.
    """
    try:
        if any(not isinstance(value, bytes) or not 1 <= len(value) <= 65536 for value in (raw, expected_raw)):
            raise ValueError("bounded_message_required")
        observed, expected = (BytesParser(policy=policy.default).parsebytes(value) for value in (raw, expected_raw))
        ids = observed.get_all("Message-ID", [])
        if observed.defects or len(ids) != 1 or not valid_message_id(str(ids[0])):
            raise ValueError("unique_message_id_required")
        for name in ("From", "To"):
            actual, original = observed.get_all(name, []), expected.get_all(name, [])
            addresses = [address.casefold() for _, address in getaddresses(actual)]
            if len(actual) != 1 or len(addresses) != 1 or addresses != [address.casefold() for _, address in getaddresses(original)]:
                raise ValueError("exact_participants_required")
        if observed.get_all("Subject", []) != expected.get_all("Subject", []):
            raise ValueError("exact_subject_required")
        actual, original = observed.get_body(preferencelist=("plain",)), expected.get_body(preferencelist=("plain",))
        if actual is None or original is None or any(p.get_content_disposition() == "attachment" for p in observed.walk()):
            raise ValueError("reviewed_plain_message_required")
        actual, original = actual.get_content(), original.get_content()
        if (not isinstance(actual, str) or not isinstance(original, str)
                or actual.replace("\r\n", "\n") != original.replace("\r\n", "\n")):
            raise ValueError("exact_body_required")
        return {"message_id": str(ids[0]), "raw_sha256": hashlib.sha256(raw).hexdigest()}
    except (ValueError, TypeError, KeyError, AttributeError):
        raise GmailError("gmail_sent_identity_unverified") from None


class GmailClient:
    def __init__(self, access_token, *, transport=None):
        if not isinstance(access_token, str) or not 1 <= len(access_token) <= 8192 or any(c.isspace() for c in access_token):
            raise GmailError("gmail_credential_invalid")
        self._client = httpx.AsyncClient(timeout=20, trust_env=False, follow_redirects=False,
            headers={"Authorization": "Bearer " + access_token}, transport=transport)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *unused):
        await self._client.aclose()

    async def _request(self, method, path, *, params=None, data=None, sending=False):
        try:
            async with self._client.stream(method, API + path, params=params, json=data) as response:
                if not 200 <= response.status_code < 300:
                    unknown = sending and (response.status_code >= 500 or response.status_code == 408)
                    raise GmailError("gmail_http_" + str(response.status_code),
                                     outcome="unknown" if unknown else "rejected" if sending else "not_performed")
                content = bytearray()
                async for chunk in response.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > 262144:
                        raise ValueError("bounded_response_required")
                result = json.loads(content)
                if not isinstance(result, dict):
                    raise ValueError("object_required")
                return result
        except GmailError:
            raise
        except (httpx.HTTPError, ValueError, TypeError):
            raise GmailError("gmail_response_unavailable", outcome="unknown" if sending else "not_performed") from None

    async def profile(self):
        value = await self._request("GET", "/profile")
        try:
            return str(ADDRESS.validate_python(value["emailAddress"])).casefold()
        except (KeyError, ValueError, TypeError):
            raise GmailError("gmail_profile_invalid") from None

    async def send(self, raw, *, thread_id=None):
        if not isinstance(raw, bytes) or not 1 <= len(raw) <= 65536:
            raise GmailError("gmail_payload_invalid")
        data = {"raw": base64.urlsafe_b64encode(raw).decode("ascii")}
        if thread_id is not None:
            data["threadId"] = identifier(thread_id)
        result = await self._request("POST", "/messages/send", data=data, sending=True)
        try:
            return Accepted(identifier(result["id"]), identifier(result["threadId"]))
        except (KeyError, GmailError):
            raise GmailError("gmail_acceptance_unavailable", outcome="unknown") from None

    async def find_message(self, message_id):
        if not valid_message_id(message_id):
            raise GmailError("gmail_message_identity_invalid")
        value = await self._request("GET", "/messages", params={"q": "rfc822msgid:" + message_id,
            "maxResults": 2, "includeSpamTrash": "false"})
        rows = value.get("messages", [])
        if not isinstance(rows, list) or len(rows) > 1 or value.get("nextPageToken"):
            raise GmailError("gmail_message_identity_ambiguous")
        try:
            return {"id": identifier(rows[0]["id"]), "thread_id": identifier(rows[0]["threadId"])} if rows else None
        except (KeyError, TypeError):
            raise GmailError("gmail_message_identity_invalid") from None

    async def thread_ids(self, thread_id):
        value = await self._request("GET", "/threads/" + identifier(thread_id), params={"format": "minimal"})
        rows = value.get("messages")
        if value.get("id") != thread_id or not isinstance(rows, list) or not 1 <= len(rows) <= 30:
            raise GmailError("gmail_thread_unavailable")
        try:
            ids = [identifier(row["id"]) for row in rows if row["threadId"] == thread_id]
            if len(ids) != len(rows) or len(set(ids)) != len(ids):
                raise ValueError("invalid_thread")
            return ids
        except (KeyError, TypeError, ValueError):
            raise GmailError("gmail_thread_unavailable") from None

    async def raw(self, message_id):
        value = await self._request("GET", "/messages/" + identifier(message_id), params={"format": "raw"})
        try:
            encoded = value["raw"]
            if value.get("id") != message_id or not isinstance(encoded, str) or len(encoded) > 87384:
                raise ValueError("invalid_raw")
            raw = base64.b64decode(encoded + "=" * (-len(encoded) % 4), altchars=b"-_", validate=True)
            if not 1 <= len(raw) <= 65536:
                raise ValueError("bounded_raw_required")
            return raw
        except (KeyError, TypeError, ValueError):
            raise GmailError("gmail_message_unavailable") from None
