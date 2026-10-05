"""Validated persisted PDF bytes; files never come from arbitrary URLs."""
from base64 import b64decode


def pdf_bytes(value):
    if value.get('content_type') != 'application/pdf' or not value['filename'].endswith('.pdf'):
        raise ValueError('invalid_pdf_attachment')
    content = b64decode(value['content_base64'], validate=True)
    if not content.startswith(b'%PDF-') or len(content) > 512000:
        raise ValueError('invalid_pdf_attachment')
    return content
