"""No network: regression fixtures for the shared HTML inspector's text semantics."""
import json
import unittest
from rendered_site import Document, inspect_page, norm


def observation(body, expected="Žr. gidą.", only_publication=False):
    origin = "https://example.test"
    published, modified = "2026-10-16T06:00:00Z", "2026-10-16T06:01:00Z"
    graph = [
        {"@type": "Article", "headline": "Gidas", "datePublished": published,
         "dateModified": modified, "author": {"@type": "Organization", "name": "Redakcija", "url": origin + "/redakcija"},
         "image": origin + "/image.webp"},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Pradžia", "item": origin + "/"},
            {"@type": "ListItem", "position": 2, "name": "Gidai", "item": origin + "/gidai"},
            {"@type": "ListItem", "position": 3, "name": "Gidas", "item": origin + "/gidai/gidas"}]}]
    html = f'''<html lang="lt"><head><title>Gidas</title><meta name="description" content="Aprašas">
    <link rel="canonical" href="{origin}/gidai/gidas"><meta property="og:title" content="Gidas">
    <meta property="og:description" content="Aprašas"><meta property="og:url" content="{origin}/gidai/gidas">
    <meta property="og:image" content="{origin}/image.webp"></head><body><main><h1>Gidas</h1>
    <a href="/redakcija">Redakcija</a><time datetime="{published}">2026-10-16</time>
    {'' if only_publication else f'<time datetime="{modified}">2026-10-16</time>'}
    <nav data-niche-breadcrumbs><a href="/">Pradžia</a><a href="/gidai">Gidai</a><span>Gidas</span></nav>
    <img src="/image.webp" alt="Iliustracija">{body}</main>
    <script type="application/ld+json">{json.dumps({"@graph": graph})}</script></body></html>'''
    return {"status": 200, "contentType": "text/html", "html": html, "expected": {
        "locale": "lt-LT", "title": "Gidas", "description": "Aprašas", "url": origin + "/gidai/gidas",
        "origin": origin, "type": "guide", "contentVersion": 1, "articleIndexUrl": origin + "/gidai",
        "publicUrls": [origin + "/", origin + "/gidai", origin + "/gidai/gidas", origin + "/redakcija"],
        "mediaUrls": [origin + "/image.webp"], "bodyTexts": [expected]}}


class RenderedTextTests(unittest.TestCase):
    def test_inline_link_punctuation_passes_actual_inspector(self):
        self.assertEqual(inspect_page(observation('<p>Žr. <a href="/gidai">gidą</a>.</p>')), [])

    def test_inline_word_fragments_are_not_split(self):
        self.assertEqual(norm(Document('<p>pa<strong>ti</strong>krinta</p>').root.text()), 'patikrinta')

    def test_inline_whitespace_is_preserved_not_invented(self):
        self.assertEqual(norm(Document('<p>Žr. <em>„gidą“</em>, tada tęskite.</p>').root.text()), 'Žr. „gidą“, tada tęskite.')

    def test_block_boundaries_remain_separate(self):
        self.assertEqual(norm(Document('<section><h2>Pirma</h2><p>Antra</p><ul><li>Trečia</li><li>Ketvirta</li></ul></section>').root.text()), 'Pirma Antra Trečia Ketvirta')

    def test_breaks_and_table_cells_separate_text(self):
        self.assertEqual(norm(Document('<p>a<br>b</p><table><tr><td>c</td><td>d</td></tr></table>').root.text()), 'a b c d')

    def test_hidden_sources_do_not_satisfy_body_check(self):
        hidden = '<script>Žr. gidą.</script><style>Žr. gidą.</style><template><p>Žr. gidą.</p></template><p hidden>Žr. gidą.</p><span aria-hidden="true">Žr. gidą.</span>'
        self.assertIn('APPROVED_BODY_RENDERED', inspect_page(observation(hidden)))

    def test_real_missing_or_changed_word_still_fails(self):
        self.assertIn('APPROVED_BODY_RENDERED', inspect_page(observation('<p>Žr. kitą tekstą.</p>')))

    def test_entities_and_unicode_punctuation_are_preserved(self):
        self.assertEqual(norm(Document('<p>„a&amp;b“&nbsp;– <a href="/">c</a>!</p>').root.text()), '„a&b“ – c!')

    def test_same_calendar_day_still_requires_both_date_instants(self):
        self.assertIn('VISIBLE_SCHEMA_DATE', inspect_page(observation('<p>Žr. gidą.</p>', only_publication=True)))


if __name__ == '__main__':
    unittest.main()
