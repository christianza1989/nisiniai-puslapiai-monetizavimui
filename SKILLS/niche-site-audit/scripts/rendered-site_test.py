import copy
import json
import unittest
from rendered_site import inspect_page, inspect_robots


def fixture(host='beauty.example', name='Beauty editorial', kind='Organization', hub='guides', profile='authors/editorial', locale='en-GB'):
    origin = 'https://' + host
    p = dict(type='guide', title='Choice & care', description='A useful decision.', locale=locale,
             origin=origin, url=origin + '/guide', articleIndexUrl=origin + '/' + hub,
             publicUrls=[origin + '/', origin + '/' + hub, origin + '/' + profile, origin + '/guide'],
             authors=[dict(name=name, kind=kind, url=origin + '/' + profile)],
             contentVersion=2, datePublished='2026-10-06T07:00:00Z', dateModified=None,
             mediaUrls=[origin + '/image.webp'], bodyTexts=['A specific useful answer.'], hiddenUrls=[origin + '/tomorrow'])
    graph = [dict(**{'@type': 'Article'}, headline=p['title'], datePublished=p['datePublished'],
                  author=dict(**{'@type': kind}, name=name, url=origin + '/' + profile), image=p['mediaUrls']),
             dict(**{'@type': 'BreadcrumbList'}, itemListElement=[dict(position=i + 1, name=n, item=u) for i, (n, u) in enumerate([
                 ('Home', origin + '/'), ('Guides', origin + '/' + hub), (p['title'], p['url'])])])]
    def html(graph=graph):
        return f'''<!doctype html><html lang="{locale}"><head><title>Choice &amp; care</title>
        <meta content="A useful decision." name="description"><link href="{p['url']}" rel="canonical">
        <meta content="Choice &amp; care" property="og:title"><meta property="og:description" content="A useful decision.">
        <meta property="og:url" content="{p['url']}"><meta property="og:image" content="{origin}/image.webp"><script type="application/ld+json">{json.dumps({'@graph': graph})}</script></head>
        <body><nav data-niche-breadcrumbs><a href="/">Home</a><a href="/{hub}">Guides</a><span>Choice &amp; care</span></nav>
        <h1>Choice &amp; care</h1><a href="/{profile}">{name}</a><time datetime="2026-10-06T09:00:00+02:00">6 October</time>
        <p>A specific useful answer.</p><img src="/image.webp" width="600" height="400" alt="Relevant subject"></body></html>'''
    return dict(expected=p, status=200, contentType='text/html; charset=utf-8', html=html()), graph, html


class RenderedSiteTests(unittest.TestCase):
    def test_inline_punctuation_preserves_the_real_visible_approved_text(self):
        o, _, _ = fixture()
        sentence = 'Modelis ZV1253N, jo priedai. „Klaro“ kodas ABC-1.'
        o['expected']['bodyTexts'] = [sentence]
        paragraph = '<p>Modelis <a href="/guides">ZV1253N</a>, jo <em>priedai</em>. „<span>Klaro</span>“ kodas <a href="/guides">ABC</a><!-- -->-1.</p>'
        o['html'] = o['html'].replace('<p>A specific useful answer.</p>', paragraph)
        self.assertNotIn('APPROVED_BODY_RENDERED', inspect_page(o))
        for mutation in [paragraph.replace('priedai', 'taisykles'), paragraph.replace('<em>', '<em hidden>'), paragraph.replace('<p>', '<p hidden>')]:
            changed = copy.deepcopy(o)
            changed['html'] = changed['html'].replace(paragraph, mutation)
            self.assertIn('APPROVED_BODY_RENDERED', inspect_page(changed))

    def test_block_and_line_breaks_cannot_fabricate_adjacent_words(self):
        for paragraph in ['<p>Alpha</p><p>Beta</p>', '<p>Alpha<br>Beta</p>']:
            o, _, _ = fixture()
            o['html'] = o['html'].replace('<p>A specific useful answer.</p>', paragraph)
            o['expected']['bodyTexts'] = ['Alpha Beta']
            self.assertNotIn('APPROVED_BODY_RENDERED', inspect_page(o))
            o['expected']['bodyTexts'] = ['AlphaBeta']
            self.assertIn('APPROVED_BODY_RENDERED', inspect_page(o))

    def test_training_block_does_not_block_search_agents(self):
        text = 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n'
        urls = ['https://beauty.example/guide']
        self.assertTrue(all(not blocked for blocked in inspect_robots(dict(text=text, urls=urls)).values()))
        text += '\nUser-agent: OAI-SearchBot\nDisallow: /\n'
        self.assertEqual(inspect_robots(dict(text=text, urls=urls))['OAI-SearchBot'], urls)

    def test_schema_hidden_url_check_is_exact(self):
        o, g, html = fixture()
        g[0]['mainEntityOfPage'] = o['expected']['origin'] + '/tomorrow-longer'
        o['html'] = html(g)
        self.assertNotIn('HIDDEN_URL_IN_SCHEMA', inspect_page(o))
        g[0]['mainEntityOfPage'] = o['expected']['origin'] + '/tomorrow#answer'
        o['html'] = html(g)
        self.assertIn('HIDDEN_URL_IN_SCHEMA', inspect_page(o))

    def test_two_niches_and_truthful_author_kinds(self):
        for args in [(), ('equipment.example', 'Jonas', 'Person', 'atsakymai', 'komanda/jonas', 'lt-LT')]:
            o, _, _ = fixture(*args)
            self.assertEqual(inspect_page(o), [])

    def test_historical_missing_author_dates_and_hub_are_detected(self):
        o, g, html = fixture()
        del g[0]['author']
        del g[0]['datePublished']
        g[1]['itemListElement'].pop(1)
        o['html'] = html(g)
        errors = inspect_page(o)
        for error in ['ARTICLE_AUTHOR', 'ARTICLE_PUBLICATION_DATE', 'BREADCRUMB_HUB']:
            self.assertIn(error, errors)

    def test_jsonld_references_resolve_actual_organization(self):
        o, g, html = fixture()
        author = g[0]['author']
        author['@id'] = o['expected']['origin'] + '/#publisher'
        g.append(author)
        g[0]['author'] = {'@id': author['@id']}
        o['html'] = html(g)
        self.assertEqual(inspect_page(o), [])

    def test_duplicate_metadata_malformed_schema_hidden_byline_and_body_loss(self):
        o, _, _ = fixture()
        mutations = [
            ('</head>', '<meta name="description" content="wrong"></head>', 'ONE_MATCHING_DESCRIPTION'),
            ('</head>', '<link rel="canonical" href="https://other.example/"></head>', 'ONE_EXACT_CANONICAL'),
            ('{"@graph":', 'invalid {"@graph":', 'JSONLD_PARSE'),
            ('<a href="/authors/editorial">', '<a hidden href="/authors/editorial">', 'VISIBLE_LINKED_BYLINE'),
            ('<p>A specific useful answer.</p>', '<p>Truncated content.</p>', 'APPROVED_BODY_RENDERED'),
            ('<nav data-niche-breadcrumbs>', '<nav hidden data-niche-breadcrumbs>', 'VISIBLE_MATCHING_BREADCRUMB'),
            ('datetime="2026-10-06T09:00:00+02:00"', 'datetime="2026-10-07T09:00:00+02:00"', 'VISIBLE_SCHEMA_DATE'),
            ('<img src=', '<img hidden src=', 'VISIBLE_ARTICLE_IMAGE'),
            ('</body>', '<a href="/tomorrow">Future page</a></body>', 'HIDDEN_LINK_IN_HTML'),
            ('</head>', '<meta name="robots" content="noindex,follow"></head>', 'PUBLIC_INDEX_DIRECTIVE'),
        ]
        for before, after, expected in mutations:
            with self.subTest(expected=expected):
                changed = copy.deepcopy(o)
                changed['html'] = changed['html'].replace(before, after)
                self.assertIn(expected, inspect_page(changed))

    def test_approved_identity_and_dates_cannot_be_replaced(self):
        o, g, html = fixture()
        g[0]['author']['name'] = 'Invented expert'
        g[0]['author']['url'] = o['expected']['origin'] + '/tomorrow'
        g[0]['datePublished'] = '2026-10-07T07:00:00Z'
        g[0]['dateModified'] = '2026-10-07T07:00:00Z'
        o['html'] = html(g)
        errors = inspect_page(o)
        for error in ['APPROVED_AUTHOR_IDENTITY', 'ELIGIBLE_AUTHOR_PROFILE', 'APPROVED_PUBLICATION_DATE', 'APPROVED_MODIFICATION_DATE']:
            self.assertIn(error, errors)

    def test_error_response_does_not_pass_as_an_article(self):
        o, _, _ = fixture()
        o['status'] = 404
        self.assertEqual(inspect_page(o), ['HTTP_200'])

    def test_legacy_homepage_fallback_is_not_an_editorial_profile(self):
        o, g, html = fixture()
        o['expected']['contentVersion'] = 1
        o['expected']['authors'] = []
        g[0]['author']['url'] = o['expected']['origin'] + '/'
        o['html'] = html(g)
        self.assertIn('ELIGIBLE_AUTHOR_PROFILE', inspect_page(o))


if __name__ == '__main__':
    unittest.main()
