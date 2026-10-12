import { CommerceClient } from './commerce-client.mjs';
const translations = {
  lt: [
    'Užsakymas',
    'Prekė',
    'Kiekis',
    'Šalis',
    'Pristatymas',
    'Vardas ir pavardė',
    'El. paštas',
    'Telefonas, su šalies kodu',
    'Adresas',
    'Miestas',
    'Pašto kodas',
    'Paštomatas',
    'Patvirtinu pirkimo sąlygas',
    'Patikrinti sumą',
    'Sukurti užsakymą',
    'Apmokėti',
    'Atnaujinti būseną',
    'Pranešti apie atsisakymą',
    'Naujas užsakymas',
    'Bandomoji aplinka',
    'Prekyba dar ruošiama',
    'Suma',
    'Laukia mokėjimo',
    'Apmokėta',
    'Dalis sumos grąžinta',
    'Suma grąžinta',
    'Mokėjimas nepavyko',
    'Užsakymas išsaugotas',
    'Atsisakymo prašymas išsaugotas',
    'Veiksmas nepavyko. Patikrinkite duomenis ir pakartokite.',
    'Ryšys nutrūko. Pakartokite tą patį veiksmą.',
    'Pristatymo būdų šiai šaliai dar nėra.',
    'Pasirinkite pristatymą ir patikrinkite sumą.',
    'Dokumentai',
    'Siuntos būsena',
  ],
  pl: [
    'Zamówienie',
    'Produkt',
    'Ilość',
    'Kraj',
    'Dostawa',
    'Imię i nazwisko',
    'E-mail',
    'Telefon z kodem kraju',
    'Adres',
    'Miasto',
    'Kod pocztowy',
    'Paczkomat',
    'Akceptuję warunki zakupu',
    'Sprawdź kwotę',
    'Złóż zamówienie',
    'Zapłać',
    'Odśwież status',
    'Zgłoś odstąpienie',
    'Nowe zamówienie',
    'Środowisko testowe',
    'Sprzedaż jest przygotowywana',
    'Kwota',
    'Oczekuje na płatność',
    'Opłacone',
    'Częściowy zwrot',
    'Zwrócono kwotę',
    'Płatność nie powiodła się',
    'Zamówienie zapisane',
    'Zgłoszenie odstąpienia zapisane',
    'Operacja nie powiodła się. Sprawdź dane i spróbuj ponownie.',
    'Połączenie przerwane. Powtórz tę samą operację.',
    'Brak dostępnych sposobów dostawy do tego kraju.',
    'Wybierz dostawę i sprawdź kwotę.',
    'Dokumenty',
    'Status przesyłki',
  ],
  lv: [
    'Pasūtījums',
    'Prece',
    'Daudzums',
    'Valsts',
    'Piegāde',
    'Vārds un uzvārds',
    'E-pasts',
    'Tālrunis ar valsts kodu',
    'Adrese',
    'Pilsēta',
    'Pasta indekss',
    'Pakomāts',
    'Piekrītu pirkuma noteikumiem',
    'Pārbaudīt summu',
    'Veikt pasūtījumu',
    'Maksāt',
    'Atjaunināt statusu',
    'Paziņot par atteikumu',
    'Jauns pasūtījums',
    'Testa vide',
    'Tirdzniecība tiek sagatavota',
    'Summa',
    'Gaida maksājumu',
    'Apmaksāts',
    'Daļēja atmaksa',
    'Summa atmaksāta',
    'Maksājums neizdevās',
    'Pasūtījums saglabāts',
    'Atteikuma pieteikums saglabāts',
    'Darbība neizdevās. Pārbaudiet datus un mēģiniet vēlreiz.',
    'Savienojums pārtrūka. Atkārtojiet to pašu darbību.',
    'Šai valstij vēl nav piegādes veidu.',
    'Izvēlieties piegādi un pārbaudiet summu.',
    'Dokumenti',
    'Sūtījuma statuss',
  ],
  et: [
    'Tellimus',
    'Toode',
    'Kogus',
    'Riik',
    'Tarne',
    'Ees- ja perekonnanimi',
    'E-post',
    'Telefon koos riigikoodiga',
    'Aadress',
    'Linn',
    'Postiindeks',
    'Pakiautomaat',
    'Nõustun ostutingimustega',
    'Kontrolli summat',
    'Esita tellimus',
    'Maksa',
    'Värskenda olekut',
    'Teata taganemisest',
    'Uus tellimus',
    'Testkeskkond',
    'Müük on ettevalmistamisel',
    'Summa',
    'Ootab makset',
    'Makstud',
    'Osaline tagasimakse',
    'Summa tagastatud',
    'Makse ebaõnnestus',
    'Tellimus salvestatud',
    'Taganemisteade salvestatud',
    'Toiming ebaõnnestus. Kontrollige andmeid ja proovige uuesti.',
    'Ühendus katkes. Korrake sama toimingut.',
    'Selle riigi jaoks pole veel tarneviise.',
    'Valige tarne ja kontrollige summat.',
    'Dokumendid',
    'Saadetise olek',
  ],
};
const element = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'disabled') el.disabled = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter((c) => c !== undefined && c !== null));
  return el;
};
export function resolveTermsLink(termsUrl, context, origin) {
  try {
    const value = typeof termsUrl === 'function' ? termsUrl(context) : termsUrl;
    if (typeof value !== 'string' || !value.trim() || value.length > 2000) return null;
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
/**
 * @param {HTMLElement} root
 * @param {{language?:string,country?:string,client?:CommerceClient,termsUrl?:string|((context:{country:string,language:string,policyVersion:string})=>string|null),initialLines?:Array<{sku:string,quantity:number}>,headingLevel?:number,title?:string,productTitle?:(product:any,language:string)=>string}} options
 */
export async function mountCheckout(
  root,
  {
    language = 'lt',
    country = 'LT',
    client = new CommerceClient(),
    termsUrl = '/pirkimo-taisykles',
    initialLines = [],
    headingLevel = 1,
    title,
    productTitle = (product, language) =>
      product.titles?.[{ lt: 'LT', pl: 'PL', lv: 'LV', et: 'EE' }[language]] || product.title,
  } = {},
) {
  const t = translations[language] || translations.lt;
  const status = element('p', { role: 'status', 'aria-live': 'polite' });
  const content = element('div');
  root.replaceChildren(
    ...(Number.isInteger(headingLevel) && headingLevel >= 1 && headingLevel <= 6
      ? [element('h' + headingLevel, {}, title || t[0])]
      : []),
    status,
    content,
  );
  const money = (amount, currency) =>
    new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount / 100);
  const run = async (button, task) => {
    button.disabled = true;
    root.setAttribute('aria-busy', 'true');
    status.setAttribute('role', 'status');
    status.textContent = '…';
    try {
      await task();
    } catch (error) {
      status.textContent = [
        'quote_price_changed',
        'delivery_quote_conflict',
        'terms_acceptance_required',
      ].includes(error.message)
        ? t[32]
        : error.message === 'network'
          ? t[30]
          : t[29];
      status.setAttribute('role', 'alert');
    } finally {
      button.disabled = false;
      root.setAttribute('aria-busy', 'false');
    }
  };
  const { context, catalog, markets } = await client.initialize();
  if (context.environment === 'sandbox' || !context.productionReady)
    root.insertBefore(element('p', {}, context.environment === 'sandbox' ? t[19] : t[20]), status);
  const orderView = async (order) => {
    content.replaceChildren();
    const states = {
      pending: t[22],
      paid: t[23],
      partially_refunded: t[24],
      refunded: t[25],
      failed: t[26],
    };
    content.append(
      element('p', {}, t[27] + ': ' + order.id.slice(0, 8).toUpperCase()),
      element('p', {}, states[order.payment_state] || order.payment_state),
      element('p', {}, t[21] + ': ' + money(order.amount, order.currency)),
    );
    for (const line of order.snapshot.lines)
      content.append(element('p', {}, productTitle({ ...line }, language) + ' × ' + line.quantity));
    const buttons = element('div', { class: 'actions' });
    const add = (label, task) => {
      const b = element('button', { type: 'button' }, label);
      b.addEventListener('click', () => run(b, task));
      buttons.append(b);
      return b;
    };
    if (order.payment_state === 'pending' && order.stock_state === 'reserved') {
      const pay = add(t[15], async () => {
        location.assign(await client.checkout());
      });
      pay.disabled = !context.paymentConnected;
    }
    add(t[16], async () => {
      await orderView(await client.resume());
      status.textContent = '';
    });
    add(t[17], async () => {
      await client.withdrawal();
      status.textContent = t[28];
    });
    add(t[18], async () => {
      client.newOrder();
      formView();
      status.textContent = '';
    });
    content.append(buttons);
    const receipt = await client.receipt();
    if (receipt.documents?.length) {
      content.append(element('h2', {}, t[33]));
      for (const doc of receipt.documents.filter((d) => ['sale', 'credit'].includes(d.kind))) {
        const download = element('button', { type: 'button' }, doc.number + '.pdf');
        download.addEventListener('click', () =>
          run(download, async () => {
            const blob = await client.document(doc.id),
              url = URL.createObjectURL(blob);
            element('a', { href: url, download: doc.number + '.pdf' }).click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = '';
          }),
        );
        content.append(element('p', {}, download));
      }
    }
    if (receipt.shipment)
      content.append(
        element('p', {}, t[34] + ': ' + (receipt.shipment.tracking || receipt.shipment.state)),
      );
    for (const event of receipt.tracking || [])
      content.append(
        element(
          'p',
          {},
          [event.providerDate, event.text, event.location].filter(Boolean).join(' · '),
        ),
      );
  };
  const formView = () => {
    content.replaceChildren();
    status.textContent = '';
    const form = element('form', { class: 'checkout-form' }),
      fields = {};
    const field = (name, label, attrs = {}, tag = 'input') => {
      const input = element(tag, { name, id: 'checkout-' + name, ...attrs });
      fields[name] = input;
      form.append(element('label', { for: 'checkout-' + name }, label, input));
      return input;
    };
    const productInputs = catalog
      .filter((p) => p.enabled !== false)
      .map((p) => {
        const q = field(p.sku, productTitle(p, language), {
          type: 'number',
          min: '0',
          max: Math.min(100, p.available),
          value: String(
            initialLines.find(
              (l) =>
                l.sku === p.sku &&
                Number.isInteger(l.quantity) &&
                l.quantity >= 0 &&
                l.quantity <= 100,
            )?.quantity || 0,
          ),
          inputmode: 'numeric',
        });
        return { p, q };
      });
    const marketSelect = field('country', t[3], {}, 'select');
    for (const m of markets)
      marketSelect.append(element('option', { value: m.country }, m.country));
    if (markets.some((m) => m.country === country)) marketSelect.value = country;
    const delivery = field('delivery', t[4], { required: true }, 'select');
    const locker = field('locker', t[11], {}, 'select');
    field('name', t[5], { required: true, minlength: '2', maxlength: '120', autocomplete: 'name' });
    field('email', t[6], {
      required: true,
      type: 'email',
      maxlength: '254',
      autocomplete: 'email',
    });
    field('phone', t[7], {
      required: true,
      type: 'tel',
      pattern: '\\+[1-9][0-9]{6,14}',
      autocomplete: 'tel',
    });
    field('line1', t[8], {
      required: true,
      minlength: '2',
      maxlength: '150',
      autocomplete: 'street-address',
    });
    field('city', t[9], { required: true, maxlength: '100', autocomplete: 'address-level2' });
    field('postalCode', t[10], { required: true, maxlength: '20', autocomplete: 'postal-code' });
    const terms = field('terms', t[12], { type: 'checkbox', required: true });
    const termsLink = element('a', {}, t[12]);
    form.append(termsLink);
    const quoteButton = element('button', { type: 'button' }, t[13]),
      submit = element('button', { type: 'submit', disabled: true }, t[14]);
    const summary = element('p', { role: 'status' });
    let quoted,
      termsAvailable = false;
    const selected = () => markets.find((m) => m.country === marketSelect.value);
    const refreshTerms = () => {
      const market = selected();
      const href =
        market &&
        resolveTermsLink(
          termsUrl,
          { country: market.country, language, policyVersion: market.policyVersion },
          location.origin,
        );
      termsAvailable = Boolean(href);
      terms.checked = false;
      terms.disabled = !termsAvailable;
      termsLink.hidden = !termsAvailable;
      if (href) termsLink.setAttribute('href', href);
      else termsLink.removeAttribute('href');
      submit.disabled = true;
    };
    const refreshLockers = () => {
      locker.replaceChildren();
      const method = selected()?.delivery.find((d) => d.id === delivery.value);
      for (const l of method?.lockers || [])
        locker.append(element('option', { value: l.id }, l.label));
      locker.parentElement.hidden = method?.kind !== 'locker';
      locker.required = method?.kind === 'locker';
    };
    const refresh = () => {
      delivery.replaceChildren();
      for (const d of selected()?.delivery || [])
        delivery.append(
          element(
            'option',
            { value: d.id },
            d.label +
              ' · ' +
              (d.pricing === 'carrier'
                ? {
                    lt: 'Kaina pagal adresą',
                    pl: 'Cena według adresu',
                    lv: 'Cena pēc adreses',
                    et: 'Hind aadressi järgi',
                  }[language] || 'Price by address'
                : money(d.amount, selected().currency)),
          ),
        );
      fields.postalCode.pattern =
        { LT: '(LT-)?[0-9]{5}', PL: '[0-9]{2}-[0-9]{3}', LV: '(LV-)?[0-9]{4}', EE: '[0-9]{5}' }[
          marketSelect.value
        ] || '.+';
      refreshLockers();
      refreshTerms();
      if (!delivery.options.length) summary.textContent = t[31];
    };
    const input = () => ({
      country: marketSelect.value,
      currency: selected().currency,
      deliveryId: delivery.value,
      lines: productInputs
        .filter(({ q }) => Number(q.value) > 0)
        .map(({ p, q }) => ({ sku: p.sku, quantity: Number(q.value) })),
    });
    const canOrder = context.productionReady || context.canCreateTestOrder;
    let deliveryQuoteId;
    const customerInput = () => ({
      name: fields.name.value,
      email: fields.email.value,
      phone: fields.phone.value,
      address: {
        country: marketSelect.value,
        line1: fields.line1.value,
        city: fields.city.value,
        postalCode: fields.postalCode.value,
      },
      ...(locker.required ? { lockerId: locker.value } : {}),
    });
    form.addEventListener('input', (event) => {
      if (event.target === terms) {
        submit.disabled = !(canOrder && quoted && termsAvailable && terms.checked);
        return;
      }
      quoted = undefined;
      deliveryQuoteId = undefined;
      submit.disabled = true;
    });
    marketSelect.addEventListener('change', refresh);
    delivery.addEventListener('change', refreshLockers);
    quoteButton.addEventListener('click', () =>
      run(quoteButton, async () => {
        const customer = customerInput(),
          method = selected().delivery.find((d) => d.id === delivery.value);
        if (method?.pricing === 'carrier')
          deliveryQuoteId = (await client.deliveryQuote({ ...input(), customer })).id;
        quoted = await client.quote({
          ...input(),
          customer,
          ...(deliveryQuoteId ? { deliveryQuoteId } : {}),
        });
        summary.textContent = t[21] + ': ' + money(quoted.amount, quoted.currency);
        submit.disabled = !canOrder || !termsAvailable || !terms.checked;
        status.textContent = '';
      }),
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!quoted || !termsAvailable || !terms.checked || !form.reportValidity()) return;
      await run(submit, async () => {
        const customer = {
          name: fields.name.value,
          email: fields.email.value,
          phone: fields.phone.value,
          address: {
            country: marketSelect.value,
            line1: fields.line1.value,
            city: fields.city.value,
            postalCode: fields.postalCode.value,
          },
          ...(locker.required ? { lockerId: locker.value } : {}),
        };
        let order;
        try {
          order = await client.create({
            ...input(),
            customer,
            quoteHash: quoted.quoteHash,
            ...(deliveryQuoteId ? { deliveryQuoteId } : {}),
            acceptedPolicyVersion: selected().policyVersion,
          });
        } catch (error) {
          if (client.attempt) {
            content.replaceChildren();
            const retry = element('button', { type: 'button' }, t[16]);
            retry.addEventListener('click', () =>
              run(retry, async () => {
                await orderView(await client.resume());
                status.textContent = '';
              }),
            );
            content.append(retry);
          } else {
            quoted = undefined;
            deliveryQuoteId = undefined;
            submit.disabled = true;
          }
          throw error;
        }
        await orderView(order);
        status.textContent = t[27];
      });
      submit.disabled = !(canOrder && quoted && termsAvailable && terms.checked);
    });
    form.append(summary, element('div', { class: 'actions' }, quoteButton, submit));
    content.append(form);
    refresh();
  };
  if (client.attempt) {
    try {
      await orderView(await client.resume());
    } catch {
      if (!client.attempt) {
        formView();
        status.textContent = t[29];
        return client;
      }
      status.textContent = t[30];
      const retry = element('button', { type: 'button' }, t[16]);
      retry.addEventListener('click', () =>
        run(retry, async () => {
          await orderView(await client.resume());
          status.textContent = '';
        }),
      );
      content.append(retry);
    }
  } else formView();
  return client;
}
