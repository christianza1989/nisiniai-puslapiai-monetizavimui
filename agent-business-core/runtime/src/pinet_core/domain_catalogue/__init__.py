"""Read-only historical domain inventory. No registrar, ownership or purchase authority."""

from .service import CatalogueError, DomainCatalogue

__all__ = ["CatalogueError", "DomainCatalogue"]
