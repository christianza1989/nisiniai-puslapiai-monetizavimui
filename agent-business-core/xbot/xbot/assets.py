"""Private social asset intake. Website responsive optimization remains MEDIA_CORE."""

import hashlib
import io
import os

from PIL import Image

from .store import Conflict


def import_asset(store, config, site, blob, source, rights_verified, alt):
    store.profile(site)
    if (
        rights_verified is not True
        or not isinstance(source, str)
        or not 5 <= len(source) <= 600
        or not 5 <= len(alt) <= 900
    ):
        raise Conflict("asset_rights_source_and_alt_required")
    if not 0 < len(blob) <= 4_000_000:
        raise Conflict("media_size_limit")
    try:
        with Image.open(io.BytesIO(blob)) as img:
            if (
                img.format not in {"PNG", "JPEG"}
                or img.width * img.height > 20_000_000
                or getattr(img, "n_frames", 1) != 1
            ):
                raise Conflict("static_png_or_jpeg_required")
            fmt, width, height = img.format, img.width, img.height
            img.verify()
    except (OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise Conflict("invalid_image_bytes") from None
    sha = hashlib.sha256(blob).hexdigest()
    asset_id = f"asset-{sha}.{'png' if fmt == 'PNG' else 'jpg'}"
    root = config.data / "assets" / site
    root.mkdir(parents=True, exist_ok=True)
    path = root / asset_id
    # Content addressed; atomically install once and never overwrite another site's original.
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            raise Conflict("asset_content_conflict")
    else:
        with os.fdopen(fd, "wb") as stream:
            stream.write(blob)
    value = {
        "asset_id": asset_id,
        "sha256": sha,
        "source": source,
        "rights_verified": True,
        "alt": alt,
        "width": width,
        "height": height,
        "mime": "image/png" if fmt == "PNG" else "image/jpeg",
    }
    store.record(site, "asset", asset_id, value)
    return value


def asset_path(config, site, asset_id):
    root = (config.data / "assets" / site).resolve()
    path = (root / asset_id).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise Conflict("asset_not_found")
    return path
