"""One professional PDF renderer used by the core and the local export command."""
from html import escape
from io import BytesIO
from pathlib import Path
from threading import Lock

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

FONT_LOCK = Lock()


def fonts():
    pairs = [(Path('C:/Windows/Fonts/arial.ttf'), Path('C:/Windows/Fonts/arialbd.ttf')),
        (Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
         Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))]
    with FONT_LOCK:
        if 'PinetRegular' in pdfmetrics.getRegisteredFontNames():
            return
        for regular, bold in pairs:
            if regular.is_file() and bold.is_file():
                pdfmetrics.registerFont(TTFont('PinetRegular', str(regular)))
                pdfmetrics.registerFont(TTFont('PinetBold', str(bold)))
                return
        raise ValueError('lithuanian_pdf_fonts_unavailable')


def render(value):
    if value['issued'] or value['payment_requested'] or value['document_type'] != 'invoice_draft':
        raise ValueError('proforma_snapshot_required')
    fonts()
    green, ink, pale = colors.HexColor('#385343'), colors.HexColor('#233129'), colors.HexColor('#edf1ec')
    normal = ParagraphStyle('body', fontName='PinetRegular', fontSize=10, leading=15, textColor=ink)
    small = ParagraphStyle('small', parent=normal, fontSize=8, leading=12)
    title = ParagraphStyle('title', parent=normal, fontName='PinetBold', fontSize=24, leading=30, textColor=green)
    bold = ParagraphStyle('bold', parent=normal, fontName='PinetBold')
    right = ParagraphStyle('right', parent=normal, alignment=TA_RIGHT)

    def p(text, style=normal):
        text = str(text).replace('\u2013', '-').replace('\u2014', '-').replace('\u2011', '-')
        return Paragraph(escape(text).replace('\n', '<br/>'), style)

    seller, buyer = value['issuer'], value['buyer']
    reference = 'PF-' + value['date'].replace('-', '') + '-' + value['hash'][:8].upper()

    def party(who):
        fields = [who['name'], 'Įmonės kodas: ' + who.get('registration_code', '')
            if who['kind'] == 'business' else '', who.get('address', ''), who.get('phone', '')]
        if who.get('vat_id'):
            fields.append('PVM kodas: ' + who['vat_id'])
        return '\n'.join(field for field in fields if field)

    elements = [p('IŠANKSTINĖ SĄSKAITA', title), Spacer(1, 5*mm), p(reference, bold),
        Spacer(1, 3*mm), p('Data: ' + value['date'] + '   |   Valiuta: EUR', small), Spacer(1, 10*mm)]
    parties = Table([[p('PARDAVĖJAS', bold), p('PIRKĖJAS', bold)],
        [p(party(seller)), p(party(buyer))]], colWidths=[84*mm, 84*mm])
    parties.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
    elements += [parties, Spacer(1, 9*mm)]
    rows = [[p('Prekė / paslauga', bold), p('Kiekis', bold), p('Vnt. kaina', bold), p('Suma', bold)]]
    for line in value['lines']:
        rows.append([p(line['description']), p(str(line['quantity']) + ' ' + line['unit']),
            p(line['unit_net'], right), p(line['net'], right)])
    table = Table(rows, colWidths=[82*mm, 23*mm, 30*mm, 33*mm], repeatRows=1)
    table.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), pale), ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12), ('TOPPADDING', (0,0), (-1,-1), 12),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#d7ddd5'))]))
    elements += [table, Spacer(1, 8*mm)]
    tax_display = 'Neskaičiuojamas' if value['tax_treatment'] == 'not_registered' else (
        value['tax'] + ' EUR' if value['tax'] is not None else 'Tikslinama')
    totals = Table([[p('Prekių / paslaugų suma', right), p(value['net'] + ' EUR', right)],
        [p('PVM', right), p(tax_display, right)], [p('Iš viso', bold),
        p(value['gross'] + ' EUR' if value['gross'] is not None else 'Tikslinama', right)]],
        colWidths=[122*mm, 46*mm])
    totals.setStyle(TableStyle([('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8), ('BACKGROUND', (0,-1), (-1,-1), pale)]))
    elements += [totals, Spacer(1, 10*mm)]
    if value['tax_treatment'] == 'not_registered':
        elements += [p('PVM neskaičiuojamas. Pardavėjas nėra PVM mokėtojas.', small), Spacer(1, 4*mm)]
    elements += [p('Ačiū, kad kreipėtės. Dėl pristatymo ir kitų užsakymo detalių susisieksime el. paštu.', small)]
    output = BytesIO()
    document = SimpleDocTemplate(output, pagesize=(210*mm, 297*mm), rightMargin=21*mm,
        leftMargin=21*mm, topMargin=22*mm, bottomMargin=22*mm,
        title='Išankstinė sąskaita ' + reference, author=seller['name'], invariant=1)

    def footer(canvas, doc):
        canvas.setFont('PinetRegular', 8)
        canvas.setFillColor(green)
        canvas.drawString(21*mm, 15*mm, seller['name'] + ' | ' + reference)
        canvas.drawRightString(189*mm, 15*mm, str(doc.page))

    document.build(elements, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
