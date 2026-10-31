"""One-time migration of owner HTML into native Core v2 blocks.

Text and link targets go into reviewed blocks. Typography, blank paragraphs
and original tag choices are a separate layout map, never a content fallback.
"""
import json
import re
import sys
import hashlib
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = {"tag": "root", "children": []}
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "children": []}
        self.stack[-1]["children"].append(node)
        if tag not in {"img", "br", "hr", "input", "meta", "link"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]["tag"] == tag:
                self.stack = self.stack[:i]
                return

    def handle_data(self, data):
        self.stack[-1]["children"].append(data)


def convert(entry, paths, images):
    tree = Tree(entry["html"])
    blocks, styles = [], []
    gaps = 0

    def target(href):
        url = urlparse(urljoin("https://signaturepads.lt/", href))
        if url.netloc == "signaturepads.lt":
            path = url.path.rstrip("/") + "/" if url.path != "/" else "/"
            if path not in paths or url.query or url.fragment:
                raise ValueError("Unmapped internal link: " + href)
            return {"kind": "page", "pageId": paths[path]}
        if url.scheme != "https":
            raise ValueError("Unverified external link: " + href)
        return {"kind": "external", "url": url.geturl()}

    def inline(node):
        leaves = []

        def walk(n, marks=(), link=None):
            if isinstance(n, str):
                text = re.sub(r"\s+", " ", n)
                if text:
                    leaves.append([text, marks, link])
                return
            tag = n["tag"]
            if tag == "br":
                leaves.append(["\n", marks, link])
                return
            if tag == "img":
                raise ValueError("Inline image needs an explicit block")
            if tag in {"strong", "b"}:
                marks = (*marks, "strong")
            if tag in {"em", "i"}:
                marks = (*marks, "em")
            if tag == "a" and n["attrs"].get("href"):
                link = target(n["attrs"]["href"])
            for child in n["children"]:
                walk(child, marks, link)

        walk(node)
        while leaves and not leaves[0][0].strip():
            leaves.pop(0)
        while leaves and not leaves[-1][0].strip():
            leaves.pop()
        if leaves:
            leaves[0][0] = leaves[0][0].lstrip()
            leaves[-1][0] = leaves[-1][0].rstrip()
        content, typography, offset = [], [], 0
        for text, marks, link in leaves:
            if not text:
                continue
            length = len(text.encode("utf-16-le")) // 2
            typography.extend({"from": offset, "to": offset + length, "tag": mark} for mark in marks)
            value = {"type": "link", "text": text, "target": link} if link else {"type": "text", "text": text}
            if content and content[-1].get("target") == value.get("target") and content[-1]["type"] == value["type"]:
                content[-1]["text"] += text
            else:
                content.append(value)
            offset += length
        return content, typography

    def emit(node):
        nonlocal gaps
        if isinstance(node, str):
            if node.strip():
                emit({"tag": "p", "attrs": {}, "children": [node]})
            return
        tag = node["tag"]
        if tag == "img":
            src = urlparse(urljoin("https://signaturepads.lt", node["attrs"]["src"])).path
            if src not in images:
                raise ValueError("Unmapped image: " + src)
            block, style = {"type": "image", "assetId": images[src]}, {"tag": "img"}
        elif tag in {"ul", "ol"}:
            rows = [inline(n) for n in node["children"] if isinstance(n, dict) and n["tag"] == "li"]
            rows = [r for r in rows if r[0]]
            if not rows:
                return
            block = {"type": "richList", "ordered": tag == "ol", "items": [r[0] for r in rows]}
            style = {"tag": tag, "rows": [r[1] for r in rows]}
        elif tag in {"p", "h1", "h2", "h3"}:
            content, marks = inline(node)
            if not content:
                gaps += 1
                return
            block = {"type": "richParagraph", "content": content} if tag == "p" else {
                "type": "richHeading", "level": 3 if tag == "h3" else 2, "content": content}
            style = {"tag": tag, "marks": marks}
        elif tag in {"root", "div", "section", "article"}:
            for child in node["children"]:
                emit(child)
            return
        else:
            raise ValueError("Unsupported top-level tag: " + tag)
        style["gapBefore"] = gaps
        gaps = 0
        blocks.append(block)
        styles.append(style)

    emit(tree.root)
    def plain(n):
        if isinstance(n, str):
            return n
        if n["tag"] in {"img", "hr"}:
            return ""
        value = "".join(plain(c) for c in n["children"])
        return " " + value + " " if n["tag"] in {"p", "h1", "h2", "h3", "ul", "ol", "li", "br"} else value

    def block_text(b):
        if "content" in b:
            return "".join(n["text"] for n in b["content"])
        if b["type"] == "richList":
            return " ".join("".join(n["text"] for n in row) for row in b["items"])
        return b.get("text", "")

    normalize = lambda text: re.sub(r"\s+", " ", text).strip()
    source_text = normalize(plain(tree.root))
    native_text = normalize(" ".join(block_text(b) for b in blocks))
    if source_text != native_text:
        raise ValueError("Visible text changed during conversion: " + entry["key"])
    sha = hashlib.sha256(source_text.encode("utf-8")).hexdigest()
    return {"blocks": blocks, "styles": styles, "textEquivalence": {"status": "PASS", "sha256": sha, "characters": len(source_text)}}


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8-sig") as handle:
        data = json.load(handle)
    result = {entry["key"]: convert(entry, data["paths"], data["images"]) for entry in data["entries"]}
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
