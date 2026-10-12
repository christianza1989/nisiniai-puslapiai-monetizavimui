"""Current owned private page read, separate from immutable creator candidates."""
from typing import Literal

from pydantic import Field, model_validator

from ..creation.review import Digest
from .wire import CompletionView, Page, PageId, Strict


class Media(Strict):
    id: PageId
    alt: str = Field(max_length=300)
    width: int = Field(ge=1, le=8192)
    height: int = Field(ge=1, le=8192)
    bytes: int = Field(ge=1, le=12 * 1048576)
    sha256: Digest
    credit: str = Field(max_length=300)
    mime: Literal["image/webp", "image/avif"]


class Link(Strict):
    pageId: PageId
    path: str = Field(pattern=r"^/(?:[a-z0-9-]+/)*$", max_length=300)
    title: str = Field(min_length=1, max_length=1000)


class Document(Strict):
    pageId: PageId
    revisionHash: Digest
    title: str = Field(min_length=1, max_length=1000)
    description: str = Field(max_length=2200)
    intent: str = Field(max_length=1000)
    # The canonical Node V2 normalizer validates the actual native block union.
    body: list[dict] = Field(max_length=1000)
    media: list[Media] = Field(max_length=60)
    links: list[Link] = Field(max_length=200)

    @model_validator(mode="after")
    def identities(self):
        for items, key in ((self.media, "id"), (self.links, "pageId")):
            values = [getattr(item, key) for item in items]
            if len(values) != len(set(values)):
                raise ValueError("duplicate read identity")
        if self.pageId in {link.pageId for link in self.links}:
            raise ValueError("self link")
        return self


class PageView(Strict):
    observation_scope: Literal["current_private_page"] = "current_private_page"
    completion: CompletionView
    page: Page
    document: Document
    document_sha256: Digest
    permitted_actions: list[Literal["refresh", "read_media"]] = Field(min_length=2, max_length=2)

    @model_validator(mode="after")
    def binding(self):
        if (self.completion.state != "current" or self.document.pageId != self.page.page_id
                or self.document.revisionHash != self.page.revision_sha256
                or self.document.title != self.page.title
                or self.page not in self.completion.pages
                or len(self.document.media) != self.page.media_count
                or self.permitted_actions != ["refresh", "read_media"]):
            raise ValueError("current page binding mismatch")
        known = {page.page_id: page for page in self.completion.pages}
        if any(link.pageId not in known or link.path != known[link.pageId].path
               or link.title != known[link.pageId].title for link in self.document.links):
            raise ValueError("foreign link")
        return self
