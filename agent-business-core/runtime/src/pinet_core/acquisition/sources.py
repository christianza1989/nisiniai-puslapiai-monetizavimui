"""Reuse core bounded public retrieval; discovery is an explicit provider boundary."""
from ..public_research import PublicResearch, PublicSource


async def retrieve(site_id, sources, max_calls=10, client=None, resolver=None):
    # Import no SMTP/CRM; identifiers and read rights come from caller policy, not LLM URLs.
    selected = []
    for source in sources:
        if source['site_id'] != site_id or source.get('read_allowed') is not True:
            raise ValueError('source_policy_required')
        selected.append(PublicSource(source['id'], site_id, source['url'], source['language'],
                                     discovery='acquisition_explicit_source_catalogue'))
    kwargs = {'client': client}
    if resolver is not None:
        kwargs['resolver'] = resolver
    adapter = PublicResearch(selected, max_calls=max_calls, **kwargs)
    receipts = []
    for source in selected:
        receipts.append(await adapter.fetch(site_id, source.id))
    return receipts
