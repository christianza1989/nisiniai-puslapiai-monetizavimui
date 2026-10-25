import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { requireValue } from './validation.mjs';
import { PrivateFiles, hashBytes } from './private-storage.mjs';
export const DOCUMENT_FONT_SHA256 =
  'b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5';
export async function documentPdf(document, fontBytes) {
  requireValue(
    fontBytes instanceof Uint8Array && (await hashBytes(fontBytes)) === DOCUMENT_FONT_SHA256,
    'document_font_invalid',
    503,
  );
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true, customName: 'CommerceNotoSans' });
  const fontFace = fontkit.create(fontBytes);
  const safe = (value) =>
    [...String(value ?? '')]
      .map((c) =>
        /[\x00-\x1f\x7f]/.test(c)
          ? ' '
          : fontFace.hasGlyphForCodePoint(c.codePointAt(0))
            ? c
            : '[U+' + c.codePointAt(0).toString(16).toUpperCase() + ']',
      )
      .join('');
  const p = document.payload,
    number = document.series + '-' + document.year + '-' + String(document.number).padStart(6, '0');
  const at = new Date(document.created_at);
  pdf.setCreationDate(at);
  pdf.setModificationDate(at);
  pdf.setProducer('Commerce core');
  pdf.setCreator('Commerce core');
  pdf.setTitle(number);
  pdf.setAuthor(p.legal.name);
  let page,
    y,
    pageIndex = 0;
  const addPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 790;
    pageIndex++;
    page.drawText(number + ' / ' + pageIndex, {
      x: 48,
      y: 28,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  };
  const text = (value, size = 12, after = 8) => {
    const words = safe(value).split(/\s+/),
      lines = [];
    let line = '';
    for (let word of words) {
      if (font.widthOfTextAtSize((line ? line + ' ' : '') + word, size) <= 495) {
        line += (line ? ' ' : '') + word;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      while (font.widthOfTextAtSize(word, size) > 495) {
        let length = 1;
        while (
          length < word.length &&
          font.widthOfTextAtSize(word.slice(0, length + 1), size) <= 495
        )
          length++;
        lines.push(word.slice(0, length));
        word = word.slice(length);
      }
      line = word;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      if (y < 70 + size * 1.5) addPage();
      page.drawText(l, { x: 48, y, size, font, color: rgb(0.08, 0.12, 0.1) });
      y -= size * 1.5;
    }
    y -= after;
  };
  const money = (amount) =>
    new Intl.NumberFormat('lt-LT', { style: 'currency', currency: p.currency }).format(
      amount / 100,
    );
  addPage();
  if (p.internalTestDocument) text('BANDOMASIS DOKUMENTAS - neskirtas apskaitai', 13, 16);
  text(
    {
      sale: 'Sąskaita faktūra',
      credit: 'Kreditinė sąskaita faktūra',
      packing: 'Komplektavimo lapas',
    }[document.kind],
    20,
    12,
  );
  text(number, 14);
  text(
    'Išrašymo data: ' +
      new Intl.DateTimeFormat('lt-LT', {
        timeZone: p.timeZone || 'Europe/Vilnius',
        dateStyle: 'medium',
      }).format(at),
  );
  text('Užsakymas: ' + p.orderId, 10, 20);
  text('Pardavėjas: ' + p.legal.name, 13);
  if (p.legal.companyCode) text('Įmonės kodas: ' + p.legal.companyCode);
  const address = (a) =>
    [a?.line1, a?.line2, a?.postalCode, a?.city, a?.country].filter(Boolean).join(', ');
  if (p.legal.address) text(address(p.legal.address));
  if (p.legal.email) text(p.legal.email);
  if (p.legal.vatRegistered === false)
    text('Pardavėjas nėra PVM mokėtojas. PVM neskaičiuojamas.', 11, 20);
  const customer = p.snapshot.customer;
  if (customer) {
    text('Pirkėjas: ' + customer.name, 13);
    if (customer.companyCode) text('Įmonės kodas: ' + customer.companyCode);
    text(address(customer.address), 12, 20);
  }
  if (document.kind === 'credit') {
    text(
      'Koreguojama sąskaita: ' +
        p.originalDocument.series +
        '-' +
        p.originalDocument.year +
        '-' +
        String(p.originalDocument.number).padStart(6, '0'),
    );
    text('Mokėjimo sumos korekcija pagal patvirtintą grąžinimą.');
    text('Grąžinimo šaltinis: ' + p.refund.provider_id, 10);
    text('Korekcijos suma: -' + money(p.amount), 15, 20);
  } else {
    text('Prekės', 14, 12);
    for (const l of p.snapshot.lines) {
      text(l.title, 12, 2);
      text(
        'SKU: ' +
          l.sku +
          ' | Kiekis: ' +
          l.quantity +
          (document.kind === 'packing'
            ? ''
            : ' | Vnt.: ' + money(l.unitAmount) + ' | Suma: ' + money(l.lineAmount)),
        11,
        12,
      );
    }
    if (document.kind === 'sale') {
      if (p.snapshot.discount)
        text('Nuolaida (' + p.snapshot.discount.code + '): -' + money(p.snapshot.discount.amount));
      text('Pristatymas: ' + p.snapshot.delivery.label + ' - ' + money(p.snapshot.delivery.amount));
      text('Iš viso: ' + money(p.amount), 15, 20);
    }
    if (customer?.locker) text('Paštomatas: ' + customer.locker.label);
  }
  return pdf.save({ useObjectStreams: false });
}
export class DocumentFiles {
  constructor(service, storage, loadFont) {
    this.s = service;
    this.files = new PrivateFiles(service, storage);
    this.loadFont = loadFont;
  }
  async ensure(store, environment, document, actor) {
    const id = 'doc_' + document.id;
    const prior = await this.s.one(
      'SELECT id,source_id,kind FROM private_files WHERE store_id=? AND id=?',
      store,
      id,
    );
    if (prior) {
      requireValue(
        prior.source_id === document.id && prior.kind === document.kind + '_document',
        'document_file_conflict',
        409,
      );
      return (await this.files.get(store, environment, id)).file;
    }
    requireValue(this.loadFont, 'document_font_missing', 503);
    const bytes = await documentPdf(document, await this.loadFont());
    try {
      return (
        await this.files.put(
          store,
          environment,
          document.order_id,
          {
            id,
            bytes,
            filename: document.series + '-' + document.year + '-' + document.number + '.pdf',
            kind: document.kind + '_document',
            sourceId: document.id,
          },
          actor,
        )
      ).file;
    } catch (error) {
      if (error.code !== 'private_file_conflict') throw error;
      const concurrent = await this.files.get(store, environment, id);
      requireValue(
        concurrent.file.source_id === document.id &&
          concurrent.file.kind === document.kind + '_document',
        'document_file_conflict',
        409,
      );
      return concurrent.file;
    }
  }
}
