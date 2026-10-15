"""Header-first IMAP matching with synthetic messages and no network/DB."""
from email import policy
from email.parser import BytesParser

import pytest

from pinet_core import mail_reader
from pinet_core.conversation_mail import valid_message_id


def known():
    return {"<original@operator.example>": {"id": "outbound-1", "site": "synthetic", "case_id": "case-1",
        "recipient": "client@client.example", "sender": "operator@operator.example"}}


def letter(**changes):
    headers = {"Message-ID": "<reply@client.example>", "In-Reply-To": "<original@operator.example>",
        "References": "<original@operator.example>", "From": "Client <client@client.example>",
        "To": "Operator <operator@operator.example>", "Subject": "Re: Jūsų užklausa",
        "Content-Type": "text/plain; charset=utf-8"}
    headers.update(changes)
    return ("\r\n".join(f"{key}: {value}" for key, value in headers.items() if value is not None)
        + "\r\n\r\nPrašau patikslinti pasiūlymą.").encode()


def parsed(raw):
    return BytesParser(policy=policy.default).parsebytes(raw)


def test_exact_header_match_keeps_original_scope():
    result = mail_reader.match_headers(parsed(letter()), known())
    assert result["original"] == known()["<original@operator.example>"]
    assert result["references"] == ["<original@operator.example>"]
    assert result["sender"] == "client@client.example"
    assert result["recipient"] == "operator@operator.example"


@pytest.mark.parametrize("changes", [
    {"From": "attacker@client.example"}, {"To": "other@operator.example"},
    {"From": "client@client.example, attacker@client.example"},
    {"From": "client@client.example (bad"}, {"Message-ID": "not-a-message-id"},
    {"Message-ID": "<one@client.example> <two@client.example>"},
    {"In-Reply-To": "<unknown@operator.example>", "References": None},
    {"In-Reply-To": "<original@operator.example> spoof"},
    {"References": "prefix<original@operator.example>suffix"},
    {"In-Reply-To": "<Original@operator.example>", "References": None},
    {"References": " ".join(f"<ref{i}@operator.example>" for i in range(21))},
    {"Subject": "a" * 201}, {"Subject": None},
])
def test_unknown_spoofed_or_malformed_headers_never_match(changes):
    assert mail_reader.match_headers(parsed(letter(**changes)), known()) is None


@pytest.mark.parametrize("header", ["From", "To", "Subject", "Message-ID", "In-Reply-To", "References"])
def test_duplicate_authority_headers_rejected(header):
    value = parsed(letter())
    duplicate = letter().split(b"\r\n\r\n", 1)[0] + (f"\r\n{header}: {value[header]}\r\n\r\n").encode()
    assert mail_reader.match_headers(parsed(duplicate), known()) is None


def test_cross_case_and_cross_business_reference_ambiguity_rejected():
    for other in ({"case_id": "case-2"}, {"site": "foreign"}, {"conversation_id": "foreign-conversation"}):
        index = known()
        index["<other@operator.example>"] = {**next(iter(index.values())), **other}
        assert mail_reader.match_headers(parsed(letter(References=
            "<original@operator.example> <other@operator.example>")), index) is None


def test_cross_scope_message_id_collision_never_overwrites_a_winner():
    index = known()
    mail_reader.add_known(index, "<original@operator.example>", {**next(iter(index.values())), "site": "foreign"})
    assert index["<original@operator.example>"] is None
    assert mail_reader.match_headers(parsed(letter()), index) is None
    mail_reader.add_known(index, "<original@operator.example>", next(iter(known().values())))
    assert index["<original@operator.example>"] is None


def test_explicit_unknown_parent_never_falls_back_to_known_history():
    assert mail_reader.match_headers(parsed(letter(**{"In-Reply-To": "<unknown@operator.example>"})), known()) is None


def test_no_parent_multiple_known_messages_same_case_never_selects_last():
    index = known()
    index["<historical@operator.example>"] = {**next(iter(index.values())), "id": "historical-outbound"}
    raw = letter(**{"In-Reply-To": None,
        "References": "<historical@operator.example> <original@operator.example>"})
    assert mail_reader.match_headers(parsed(raw), index) is None


def test_exact_parent_selects_only_that_message_with_same_case_history():
    index = known()
    index["<historical@operator.example>"] = {**next(iter(index.values())), "id": "historical-outbound",
        "recipient": "previous-contact@client.example"}
    raw = letter(References="<historical@operator.example> <original@operator.example>")
    assert mail_reader.match_headers(parsed(raw), index)["original"]["id"] == "outbound-1"


def test_no_parent_one_known_identity_is_unambiguous():
    raw = letter(**{"In-Reply-To": None, "References": "<unknown@operator.example> <original@operator.example>"})
    assert mail_reader.match_headers(parsed(raw), known())["original"]["id"] == "outbound-1"


@pytest.mark.parametrize("value", ["plain", "<no-at>", "<a@b>\r\nX: injected", "<a b@c>", "<ą@c>", "<" + "a"*251 + "@b>"])
def test_message_id_is_one_bounded_ascii_identity(value):
    assert not valid_message_id(value)


class FakeIMAP:
    def __init__(self, raw, *, size=None, body=None):
        self.raw, self.body = raw, body or raw
        self.size = len(raw) if size is None else size
        self.requests = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def login(self, *args):
        return "OK", []

    def select(self, name, readonly):
        assert name == "INBOX" and readonly is True

    def uid(self, command, *args):
        self.requests.append((command, args))
        if command == "search":
            return "OK", [b"1"]
        header = "HEADER.FIELDS" in args[1]
        data = self.raw.split(b"\r\n\r\n", 1)[0] + b"\r\n\r\n" if header else self.body
        return "OK", [(f"1 (RFC822.SIZE {self.size})".encode(), data)]


@pytest.mark.parametrize("changes,size,body", [
    ({"From": "attacker@client.example"}, None, None), ({}, 65537, None),
    ({}, None, letter(**{"Message-ID": "<changed@client.example>"})),
    ({}, None, b"a" * 65537),
], ids=["sender", "declared-size", "header-mismatch", "actual-size"])
def test_imap_unmatched_or_oversize_never_imported(monkeypatch, changes, size, body):
    imap = FakeIMAP(letter(**changes), size=size, body=body)
    monkeypatch.setattr(mail_reader.imaplib, "IMAP4_SSL", lambda *args, **kwargs: imap)
    assert mail_reader.fetch_replies(known()) == []
    if changes or size:
        assert not any("BODY.PEEK[]" in str(request) for request in imap.requests)


def test_valid_imap_reply_plain_body_and_readonly_header_first(monkeypatch):
    imap = FakeIMAP(letter())
    monkeypatch.setattr(mail_reader.imaplib, "IMAP4_SSL", lambda *args, **kwargs: imap)
    replies = mail_reader.fetch_replies(known())
    assert len(replies) == 1 and replies[0]["body"] == "Prašau patikslinti pasiūlymą."
    assert len(imap.requests) == 3
    assert "HEADER.FIELDS" in imap.requests[1][1][1]
    assert imap.requests[2][1][1] == "(BODY.PEEK[])"
