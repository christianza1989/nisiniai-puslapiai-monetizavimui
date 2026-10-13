"""HTML structure checks, not computed browser visibility or factual review.

Receives actual HTTP observations and shared-core projected expectations on stdin.
Uses Python's HTML parser so attribute order, escaped text and JSON-LD graphs
do not depend on one site's template. No network, writes or third-party modules.
"""
import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser


class Element:
    BLOCK_TAGS = frozenset((
        'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt',
        'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
        'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
    ))

    def __init__(self, tag, attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    def nodes(self, tag=None):
        for child in self.children:
            if isinstance(child, Element):
                if tag is None or child.tag == tag:
                    yield child
                yield from child.nodes(tag)

    def hidden(self):
        return (self.tag in ('script', 'style', 'template', 'head')
                or 'hidden' in self.attrs or self.attrs.get('aria-hidden') == 'true'
                or bool(re.search(r'display\s*:\s*none|visibility\s*:\s*hidden', self.attrs.get('style', ''), re.I)))

    def text(self, visible=True):
        if visible and self.hidden():
            return ''
        # Inline markup must not invent spaces before punctuation or inside codes.
        # Block boundaries and explicit line breaks still separate visible words.
        if self.tag == 'br':
            return '\n'
        value = ''.join(c.text(visible) if isinstance(c, Element) else c for c in self.children)
        return '\n' + value + '\n' if self.tag in self.BLOCK_TAGS else value


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Element('document')
        self.stack = [self.root]
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        e = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(e)
        if tag not in ('area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'):
            self.stack.append(e)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def norm(s):
    return ' '.join(str(s).split())


def visible(e):
    return not e.hidden() and (e.parent is None or visible(e.parent))


def types(e):
    t = e.get('@type', [])
    return t if isinstance(t, list) else [t]


def array(v):
    return v if isinstance(v, list) else [v] if v is not None else []


def instant(s):
    try:
        d = datetime.fromisoformat(s.replace('Z', '+00:00'))
        return d.timestamp() if d.tzinfo else None
    except (ValueError, AttributeError, TypeError):
        return None


def schema_urls(value):
    if isinstance(value, dict):
        return set().union(*(schema_urls(v) for v in value.values())) if value else set()
    if isinstance(value, list):
        return set().union(*(schema_urls(v) for v in value)) if value else set()
    return {value.split('#')[0]} if isinstance(value, str) and value.startswith(('https://', 'http://')) else set()


def inspect_robots(payload):
    parser = RobotFileParser()
    parser.parse(payload['text'].splitlines())
    bots = ['Googlebot', 'bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']
    return {bot: [url for url in payload['urls'] if not parser.can_fetch(bot, url)] for bot in bots}


def inspect_page(observation):
    p, errors = observation['expected'], []
    def check(condition, code):
        if not condition:
            errors.append(code)
    check(observation.get('status') == 200, 'HTTP_200')
    if observation.get('status') != 200:
        return errors
    check('text/html' in observation.get('contentType', ''), 'HTML_CONTENT_TYPE')
    doc = Document(observation['html']).root
    heads = list(doc.nodes('head'))
    head = heads[0] if len(heads) == 1 else Element('missing')
    check(len(heads) == 1, 'ONE_HEAD')
    html = list(doc.nodes('html'))
    check(len(html) == 1 and html[0].attrs.get('lang', '').lower() in (p['locale'].lower(), p['locale'].split('-')[0].lower()), 'LANGUAGE')
    titles = list(head.nodes('title'))
    check(len(titles) == 1 and norm(p['title']) in norm(titles[0].text(False)), 'ONE_MATCHING_TITLE')
    descriptions = [e for e in head.nodes('meta') if e.attrs.get('name', '').lower() == 'description']
    check(len(descriptions) == 1 and norm(descriptions[0].attrs.get('content', '')) == norm(p['description']), 'ONE_MATCHING_DESCRIPTION')
    canonicals = [e for e in head.nodes('link') if 'canonical' in e.attrs.get('rel', '').lower().split()]
    check(len(canonicals) == 1 and canonicals[0].attrs.get('href') == p['url'], 'ONE_EXACT_CANONICAL')
    for property_name, value in [('og:title', p['title']), ('og:description', p['description']), ('og:url', p['url'])]:
        entries = [e for e in head.nodes('meta') if e.attrs.get('property') == property_name]
        check(len(entries) == 1 and norm(entries[0].attrs.get('content', '')) == norm(value), 'MATCHING_' + property_name.upper())
    if not p.get('allowNoindex'):
        check(not any(re.search(r'\bnoindex\b', e.attrs.get('content', ''), re.I) for e in head.nodes('meta') if e.attrs.get('name', '').lower() in ('robots', 'googlebot')), 'PUBLIC_INDEX_DIRECTIVE')
    h1s = [e for e in doc.nodes('h1') if visible(e) and norm(e.text())]
    check(len(h1s) == 1, 'ONE_VISIBLE_H1')
    entities = []
    for e in doc.nodes('script'):
        if e.attrs.get('type', '').lower() == 'application/ld+json':
            try:
                for value in array(json.loads(e.text(False))):
                    if isinstance(value, dict):
                        entities.extend(array(value.get('@graph', value)))
                    else:
                        check(False, 'JSONLD_OBJECT')
            except (ValueError, TypeError):
                check(False, 'JSONLD_PARSE')
    entities = [e for e in entities if isinstance(e, dict)]
    check(bool(entities), 'JSONLD_PRESENT')
    by_id = {e['@id']: e for e in entities if '@id' in e}
    def resolve(e):
        return by_id.get(e.get('@id'), e) if isinstance(e, dict) else by_id.get(e, {})
    def url(e):
        return e if isinstance(e, str) else e.get('url', e.get('@id', '')) if isinstance(e, dict) else ''
    links = [e for e in doc.nodes('a') if visible(e)]
    check(not any(urljoin(p['url'], e.attrs.get('href', '')).split('#')[0] in p.get('hiddenUrls', []) for e in links), 'HIDDEN_LINK_IN_HTML')
    check(not any(u in schema_urls(entities) for u in p.get('hiddenUrls', [])), 'HIDDEN_URL_IN_SCHEMA')
    if p['type'] == 'home':
        check(any('WebSite' in types(e) for e in entities), 'WEBSITE_SCHEMA')
        check(any('Organization' in types(e) for e in entities), 'ORGANIZATION_SCHEMA')
    if p.get('isArticleIndex'):
        check(any('CollectionPage' in types(e) for e in entities), 'COLLECTION_SCHEMA')
    if p['type'] not in ('article', 'guide'):
        return errors
    articles = [e for e in entities if set(types(e)) & {'Article', 'BlogPosting', 'NewsArticle'}]
    check(len(articles) == 1, 'ONE_ARTICLE_SCHEMA')
    if len(articles) != 1:
        return errors
    article = articles[0]
    check(norm(article.get('headline', '')) == norm(p['title']), 'ARTICLE_HEADLINE')
    published = article.get('datePublished')
    check(instant(published) is not None, 'ARTICLE_PUBLICATION_DATE')
    if p.get('datePublished'):
        check(instant(published) == instant(p['datePublished']), 'APPROVED_PUBLICATION_DATE')
    modified = article.get('dateModified')
    if p.get('contentVersion') == 2:
        check(modified == p.get('dateModified'), 'APPROVED_MODIFICATION_DATE')
    if modified:
        check(instant(modified) is not None and instant(published) is not None and instant(modified) >= instant(published), 'DATE_ORDER')
    times = [e for e in doc.nodes('time') if visible(e) and norm(e.text())]
    for date in [published] + ([modified] if modified else []):
        check(instant(date) is not None and any(instant(e.attrs.get('datetime')) == instant(date) for e in times), 'VISIBLE_SCHEMA_DATE')
    authors = [resolve(a) for a in array(article.get('author'))]
    check(bool(authors), 'ARTICLE_AUTHOR')
    actual_authors = []
    for a in authors:
        name, profile = a.get('name', ''), url(a)
        actual_authors.append((name, profile, 'Organization' if 'Organization' in types(a) else 'Person'))
        check(bool(set(types(a)) & {'Person', 'Organization'}) and bool(name), 'AUTHOR_IDENTITY')
        check(profile in p['publicUrls'] and profile != p['origin'] + '/', 'ELIGIBLE_AUTHOR_PROFILE')
        check(any(urljoin(p['url'], e.attrs.get('href', '')) == profile and norm(name) in norm(e.text()) for e in links), 'VISIBLE_LINKED_BYLINE')
    for a in p.get('authors', []):
        check((a['name'], a['url'], a['kind']) in actual_authors, 'APPROVED_AUTHOR_IDENTITY')
    crumb_lists = [e for e in entities if 'BreadcrumbList' in types(e)]
    check(len(crumb_lists) == 1, 'ONE_BREADCRUMB_SCHEMA')
    if len(crumb_lists) == 1:
        items = crumb_lists[0].get('itemListElement', [])
        crumb_urls = [url(i.get('item')) for i in items]
        check(len(items) >= 2 and [i.get('position') for i in items] == list(range(1, len(items) + 1)), 'BREADCRUMB_POSITIONS')
        check(bool(crumb_urls) and crumb_urls[0] == p['origin'] + '/' and crumb_urls[-1] == p['url'], 'BREADCRUMB_ENDPOINTS')
        check(p['articleIndexUrl'] in crumb_urls[1:-1], 'BREADCRUMB_HUB')
        containers = [e for e in doc.nodes() if 'data-niche-breadcrumbs' in e.attrs or re.search(r'breadcrumb|crumb|duonos', e.attrs.get('aria-label', '') + ' ' + e.attrs.get('class', ''), re.I)]
        check(any(visible(e) and all(norm(i.get('name', '')) in norm(e.text()) for i in items)
                  and all(u in [urljoin(p['url'], a.attrs.get('href', '')) for a in e.nodes('a')] for u in crumb_urls[:-1])
                  for e in containers), 'VISIBLE_MATCHING_BREADCRUMB')
    images = [url(i) for i in array(article.get('image'))]
    check(bool(images) and all(i in p['mediaUrls'] for i in images), 'ARTICLE_APPROVED_IMAGE')
    social_images = [e.attrs.get('content') for e in head.nodes('meta') if e.attrs.get('property') == 'og:image']
    check(bool(social_images) and all(i in p['mediaUrls'] for i in social_images), 'APPROVED_SOCIAL_IMAGE')
    check(any(visible(e) and urljoin(p['url'], e.attrs.get('src', '')) in p['mediaUrls'] and e.attrs.get('alt', '').strip() for e in doc.nodes('img')), 'VISIBLE_ARTICLE_IMAGE')
    body = norm(doc.text())
    for text in p.get('bodyTexts', []):
        check(norm(text) in body, 'APPROVED_BODY_RENDERED')
    return sorted(set(errors))


if __name__ == '__main__':
    observations = json.load(sys.stdin)
    result = inspect_robots(observations) if isinstance(observations, dict) and observations.get('mode') == 'robots' else [{'url': o['expected']['url'], 'errors': inspect_page(o)} for o in observations]
    json.dump(result, sys.stdout, ensure_ascii=False)
