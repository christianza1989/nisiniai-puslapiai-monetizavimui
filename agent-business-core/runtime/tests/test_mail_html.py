from email.message import EmailMessage
from pinet_core.mail_reader import body_text, NO_TEXT


def test_html_only_reply_is_inert_text_with_paragraphs():
    message = EmailMessage()
    message.set_content('<html><head><style>SECRET</style></head><body><p>Reikia 2 įrenginių.</p>'
        '<script>fetch("https://invalid.example")</script><img src="https://invalid.example/pixel">'
        '<div>PDF &amp; Windows<br>Vienai darbo vietai.</div></body></html>', subtype='html')
    result = body_text(message)
    assert 'Reikia 2 įrenginių.' in result and 'PDF & Windows' in result
    assert '\nVienai darbo vietai.' in result
    assert 'SECRET' not in result and 'fetch' not in result and 'invalid.example' not in result


def test_plain_part_has_priority_and_attachment_is_not_a_body():
    message = EmailMessage()
    message.set_content('Tikras atsakymas')
    message.add_alternative('<p>Kitas tekstas</p>', subtype='html')
    assert body_text(message).strip() == 'Tikras atsakymas'
    empty = EmailMessage()
    empty.add_attachment(b'attachment', maintype='application', subtype='pdf', filename='a.pdf')
    assert body_text(empty) == NO_TEXT
