from base64 import b64encode

import pytest
from test_invoicing import fixture

from pinet_core import attachments, invoice_pdf, invoicing, jobs


def test_pdf_bytes_are_stable_and_mime_attachment_preserves_them(monkeypatch):
    snapshot, _ = invoicing.render(fixture())
    pdf = invoice_pdf.render(snapshot)
    assert pdf.startswith(b'%PDF-') and pdf == invoice_pdf.render(snapshot)
    sent = []

    class Transport:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def login(self, *args):
            pass

        def send_message(self, mail):
            sent.append(mail)

    monkeypatch.setattr(jobs.smtplib, 'SMTP_SSL', Transport)
    entry = {'filename': 'saskaita.pdf', 'content_type': 'application/pdf',
        'content_base64': b64encode(pdf).decode('ascii')}
    jobs.smtp_send('owner@example.org', {'subject': 'Išankstinė sąskaita', 'body': 'Sveiki, prisegame sąskaitą.',
        'synthetic': True, 'attachments': [entry]}, '<fixture@example.org>')
    attachment = next(sent[0].iter_attachments())
    assert attachment.get_content_type() == 'application/pdf'
    assert attachment.get_payload(decode=True) == pdf
    assert attachment.get_filename() == 'saskaita.pdf'
    assert attachments.pdf_bytes(entry) == pdf
    entry['content_base64'] = b64encode(b'<html>Not PDF</html>').decode('ascii')
    with pytest.raises(ValueError, match='invalid_pdf_attachment'):
        attachments.pdf_bytes(entry)
