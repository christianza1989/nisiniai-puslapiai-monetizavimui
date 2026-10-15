"""Natural customer prose must reach the existing guarded source reader intact."""
import pytest

from pinet_core.business_discovery import sources


@pytest.mark.parametrize('path', ['terms-and-conditions/', 'Gew%C3%A4hrleistung/', 'agb/',
                                  'pirkimo-s%C4%85lygos/', 'garantijos/', 'delivery/', 'business-partners/'])
@pytest.mark.asyncio
async def test_commercial_selection_is_host_independent_and_keeps_actual_spelling(monkeypatch, path):
    root = 'https://another.example.test/'
    doc = root + path
    observed = []

    def capture(url, *_):
        observed.append(url)
        return {'url': url, 'status': 'observed', 'text': 'Public claim.', 'links': [doc] if url == root else []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, 'read', capture)
    result = await sources.collect(root, authorized)
    assert observed == [root, doc]
    assert result['pages'][0]['links'] == [doc]


@pytest.mark.asyncio
async def test_failed_commercial_read_is_unavailable_without_losing_catalogue(monkeypatch):
    root = 'https://supplier.example.test/'
    terms, product = root + 'terms/', root + 'product/one/'
    observed = []

    def capture(url, *_):
        observed.append(url)
        if url == terms:
            raise ValueError('source_robots_disallow')
        return {'url': url, 'status': 'observed', 'text': 'Public claim.', 'links': [product, terms] if url == root else []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, 'read', capture)
    result = await sources.collect(root, authorized)
    assert observed == [root, terms, product]
    assert result['pages'][1] == {'url': terms, 'status': 'unavailable', 'error': 'ValueError'}
    assert not result['complete'] and not result['remaining_urls']


@pytest.mark.asyncio
async def test_discovered_terms_precede_products_and_remain_unread_when_their_body_exceeds_budget(monkeypatch):
    root = 'https://supplier.example.test/'
    terms, product = root + 'terms/', root + 'product/one/'
    observed = []

    def capture(url, *_):
        observed.append(url)
        return {'url': url, 'status': 'observed', 'text': 'x' * (500 if url == terms else 10),
                'links': [product, terms] if url == root else []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, 'read', capture)
    monkeypatch.setattr(sources, 'CONTEXT_BYTES', 350)
    result = await sources.collect(root, authorized)
    assert observed == [root, terms] and result['remaining_urls'] == [terms, product]
    assert len(result['pages']) == 1 and not result['complete']


@pytest.mark.asyncio
async def test_actual_commercial_documents_precede_catalogue_fanout_without_guessed_urls(monkeypatch):
    root = 'https://supplier.example.test/'
    product = root + 'product/first/'
    terms = root + 'sales-terms/'
    partner = root + 'business-partners/'
    observed = []

    def capture(url, *_):
        observed.append(url)
        return {'url': url, 'status': 'observed', 'text': 'Public claim.',
                'links': [product, root + 'cart/', root + 'terms.png', partner, terms] if url == root else []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, 'read', capture)
    result = await sources.collect(root, authorized)
    assert observed == [root, terms, partner, product]
    assert result['complete'] and result['independent_fact_verification'] == 'UNVERIFIED'
    assert result['pages'][0]['links'][-1] == terms  # Original DOM evidence stays intact.


@pytest.mark.asyncio
async def test_commercial_documents_stay_in_unread_queue_at_the_existing_byte_limit(monkeypatch):
    root, terms = 'https://supplier.example.test/', 'https://supplier.example.test/warranty/'

    def capture(url, *_):
        return {'url': url, 'status': 'observed', 'text': 'x' * sources.CONTEXT_BYTES,
                'links': [terms] if url == root else []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, 'read', capture)
    result = await sources.collect(root + ' ' + terms, authorized)
    assert not result['pages'] and result['remaining_urls'] == [root, terms]
    assert not result['complete']


@pytest.mark.asyncio
async def test_only_safe_actual_same_host_commercial_links_are_enqueued(monkeypatch):
    root = 'https://supplier.example.test/'
    terms = root + 'pirkimo-s%C4%85lygos/'
    observed = []

    def capture(url, *_):
        observed.append(url)
        return {'url': url, 'status': 'observed', 'text': 'Public claim.', 'links': [
            'https://elsewhere.example.test/terms/', 'https://user:secret@supplier.example.test/terms/',
            root + 'warranty/?private=1', root + 'checkout/terms/', terms] if url == root else []}

    async def authorized():
        return True

    monkeypatch.setattr(sources, 'read', capture)
    result = await sources.collect(root, authorized)
    assert observed == [root, terms]
    assert result['complete']


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
