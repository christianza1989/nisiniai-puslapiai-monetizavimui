"""Natural customer prose must reach the existing guarded source reader intact."""
import pytest

from pinet_core.business_discovery import sources


@pytest.mark.asyncio
@pytest.mark.parametrize("message,expected", [
    ('„Nusižiūrėjau https://supplier.example.test/“', 'https://supplier.example.test/'),
    ('“Research https://supplier.example.test/catalogue/”', 'https://supplier.example.test/catalogue/'),
    ("'https://supplier.example.test/catalogue/'", 'https://supplier.example.test/catalogue/'),
    ('«https://supplier.example.test/catalogue/»', 'https://supplier.example.test/catalogue/'),
    ('[Supplier](https://supplier.example.test/catalogue/).', 'https://supplier.example.test/catalogue/'),
    ('`https://supplier.example.test/catalogue/`', 'https://supplier.example.test/catalogue/'),
    ('https://supplier.example.test/model%28v2%29%22%27/;',
     'https://supplier.example.test/model%28v2%29%22%27/'),
    ("Research https://supplier.example.test/owners'guide/.",
     "https://supplier.example.test/owners'guide/"),
    ("https://supplier.example.test/owners'", "https://supplier.example.test/owners'"),
])
async def test_naturally_quoted_url_reaches_guarded_reader_without_prose(monkeypatch, message, expected):
    observed = []

    def capture(url, deadline, snapshot_dir):
        observed.append(url)
        return {"url": url, "status": "observed", "text": "Public catalogue", "links": []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, "read", capture)
    result = await sources.collect(message, authorized)
    assert observed == [expected]
    assert result["pages"][0]["url"] == expected
    assert result["complete"] and result["independent_fact_verification"] == "UNVERIFIED"


@pytest.mark.asyncio
async def test_prose_extraction_keeps_unsafe_and_unread_sources_out_of_success(monkeypatch):
    observed = []

    def unavailable(url, *_):
        observed.append(url)
        raise ValueError("source_robots_disallow")

    async def authorized():
        return True

    monkeypatch.setattr(sources, "read", unavailable)
    result = await sources.collect(
        'https://user:secret@supplier.example.test/ https://supplier.example.test/?private=1 '
        '„https://supplier.example.test/catalogue/“', authorized)
    assert observed == ['https://supplier.example.test/catalogue/']
    assert result["pages"][0]["status"] == "unavailable" and not result["complete"]
    assert result["independent_fact_verification"] == "UNVERIFIED"
