export function renderShipping(content, detail, ctx) {
  const { node, table, cell, api, action, has, money, date, reload, integrations } = ctx;
  const o = detail.order,
    data = detail.shippingPreparation;
  content.append(
    node('h2', {}, 'Siuntos paruošimas'),
    node(
      'p',
      { class: 'hint' },
      'Pakuotės planas ir vežėjo kainos padeda paruošti siuntą. Jie nekeičia pirkėjo sumokėtos sumos.',
    ),
  );
  if (!data.plans.length) content.append(node('p', { class: 'empty' }, 'Pakuotės planų dar nėra.'));
  for (const plan of data.plans) {
    const p = plan.payload;
    content.append(
      node('h3', {}, 'Pakuotės planas · ' + date(plan.created_at)),
      node(
        'p',
        {},
        `${p.origin.city}, ${p.origin.postalCode} → ${p.recipient.city}, ${p.recipient.postalCode}, ${p.recipient.country}`,
      ),
      node(
        'ul',
        {},
        p.parcels.map((parcel) =>
          node(
            'li',
            {},
            `${parcel.weightGrams / 1000} kg · ${parcel.dimensionsMm.map((d) => d / 10).join(' × ')} cm · ${parcel.lines.map((l) => l.quantity + ' × ' + (o.snapshot.lines.find((s) => s.sku === l.sku)?.title || l.sku)).join(', ')}`,
          ),
        ),
      ),
    );
    if (p.measurementNote) content.append(node('p', { class: 'hint' }, p.measurementNote));
    const quoteId = crypto.randomUUID();
    const quote = node(
      'button',
      {
        type: 'button',
        disabled:
          !has('ship') ||
          !integrations.shippingQuotes ||
          o.payment_state !== 'paid' ||
          !['pending', 'ready'].includes(o.fulfillment_state),
      },
      'Gauti siuntimo kainas',
    );
    quote.addEventListener('click', () =>
      action(
        quote,
        async () => {
          await api('/api/operator/shipping-plans/' + plan.id + '/quotes', { id: quoteId });
          await reload();
        },
        'Siuntimo kainų pasiūlymai išsaugoti.',
      ),
    );
    content.append(node('div', { class: 'actions' }, quote));
    for (const q of data.quotes.filter((q) => q.plan_id === plan.id)) {
      content.append(
        node(
          'p',
          { class: 'hint' },
          'Kainos gautos ' +
            date(q.created_at) +
            '. Pasiūlymo galiojimo laikas nepatvirtintas. Prieš registruodami siuntą patikrinkite kainą.',
        ),
      );
      if (!q.payload.offers.length)
        content.append(node('p', { class: 'empty' }, 'Šiai pakuotei vežėjas pasiūlymų nepateikė.'));
      else
        content.append(
          table(
            ['Paslauga', 'Vežėjo kaina', 'Pristatymo informacija'],
            q.payload.offers.map((offer) =>
              node(
                'tr',
                {},
                cell(offer.name, 'Paslauga'),
                cell(money(offer.amount, offer.currency), 'Vežėjo kaina', 'money'),
                cell(offer.deliveryText || 'Nenurodyta', 'Pristatymo informacija'),
              ),
            ),
          ),
        );
    }
  }
  if (!integrations.shippingQuotes)
    content.append(
      node('p', { class: 'hint' }, 'Kainų užklausoms dar reikia vežėjo API bandymų prieigos.'),
    );
  content.append(
    node(
      'p',
      { class: 'hint' },
      'Automatinis Siųsk pigiau siuntų registravimas bus įjungtas patvirtinus kainos ir pakartotinių užklausų tvarką.',
    ),
  );
  if (
    !has('ship') ||
    o.payment_state !== 'paid' ||
    o.stock_state !== 'allocated' ||
    !['pending', 'ready'].includes(o.fulfillment_state) ||
    !o.snapshot.customer
  )
    return;
  const city = node('input', {
    id: 'shipping-city',
    required: true,
    maxlength: '100',
    autocomplete: 'address-level2',
  });
  const postal = node('input', {
    id: 'shipping-postal',
    required: true,
    maxlength: '5',
    inputmode: 'numeric',
    pattern: '[0-9]{5}',
    autocomplete: 'postal-code',
  });
  const explanation = node('input', {
    id: 'shipping-origin-reason',
    required: true,
    minlength: '3',
    maxlength: '200',
  });
  const company = node('input', { id: 'shipping-company', type: 'checkbox', checked: '' });
  const saveOrigin = node('button', { type: 'submit' }, 'Išsaugoti siuntėjo vietą');
  const originId = crypto.randomUUID();
  const originForm = node(
    'form',
    { class: 'stock-form' },
    node('h3', {}, 'Siuntėjo vieta kainai apskaičiuoti'),
    node(
      'p',
      { class: 'hint' },
      'Šalis: Lietuva. Šie duomenys naudojami kainai; siuntos registravimui dar reikės viso siuntėjo adreso ir kontaktų.',
    ),
    node(
      'div',
      { class: 'fields' },
      node('label', { for: 'shipping-city' }, 'Miestas', city),
      node('label', { for: 'shipping-postal' }, 'Pašto kodas', postal),
    ),
    node(
      'label',
      { for: 'shipping-company', class: 'check-field' },
      company,
      'Siuntėjas yra įmonė',
    ),
    node(
      'label',
      { for: 'shipping-origin-reason' },
      'Vietos patvirtinimo paaiškinimas',
      explanation,
    ),
    saveOrigin,
  );
  originForm.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      saveOrigin,
      async () => {
        await api('/api/operator/shipping-origins', {
          id: originId,
          country: 'LT',
          city: city.value,
          postalCode: postal.value,
          isCompany: company.checked,
          reason: explanation.value,
        });
        await reload();
      },
      'Siuntėjo vieta išsaugota.',
    );
  });
  content.append(originForm);
  if (!data.origins.length) return;
  const location = node(
    'select',
    { id: 'shipping-origin', required: true },
    data.origins.map((r) =>
      node(
        'option',
        { value: r.id },
        `${r.payload.city}, ${r.payload.postalCode} · ${r.payload.reason}`,
      ),
    ),
  );
  const mode = node(
    'select',
    { id: 'shipping-mode' },
    node('option', { value: 'individual' }, 'Kiekvienas rinkinys savo pakuotėje'),
    node('option', { value: 'measured' }, 'Visi rinkiniai vienoje išmatuotoje dėžėje'),
  );
  const weight = node('input', {
    id: 'shipping-weight',
    type: 'number',
    required: true,
    min: '0.001',
    max: '1000',
    step: '0.001',
  });
  const dimensions = ['Ilgis', 'Plotis', 'Aukštis'].map((name, i) => ({
    name,
    input: node('input', {
      id: 'shipping-dimension-' + i,
      type: 'number',
      required: true,
      min: '0.1',
      max: '1000',
      step: '0.1',
    }),
  }));
  const note = node('textarea', {
    id: 'shipping-measurement',
    required: true,
    minlength: '3',
    maxlength: '160',
    rows: '3',
  });
  const measured = node(
    'div',
    { hidden: '' },
    node(
      'p',
      { class: 'hint' },
      'Pasverkite galutinę supakuotą dėžę ir išmatuokite jos išorę. Prekių matmenys nesumuojami.',
    ),
    node(
      'div',
      { class: 'fields' },
      node('label', { for: 'shipping-weight' }, 'Svoris (kg)', weight),
      dimensions.map(({ name, input }, i) =>
        node('label', { for: 'shipping-dimension-' + i }, name + ' (cm)', input),
      ),
    ),
    node('label', { for: 'shipping-measurement' }, 'Matavimų paaiškinimas', note),
  );
  const updateMode = () => {
    measured.hidden = mode.value !== 'measured';
    [weight, ...dimensions.map((d) => d.input), note].forEach(
      (input) => (input.disabled = measured.hidden),
    );
  };
  mode.addEventListener('change', updateMode);
  updateMode();
  const prepare = node('button', { type: 'submit' }, 'Išsaugoti pakuotės planą'),
    planId = crypto.randomUUID();
  const recipientCompany = node('input', { id: 'shipping-recipient-company', type: 'checkbox' });
  const form = node(
    'form',
    { class: 'stock-form' },
    node('h3', {}, 'Naujas pakuotės planas'),
    node('label', { for: 'shipping-origin' }, 'Siuntėjo vieta', location),
    node('label', { for: 'shipping-mode' }, 'Pakavimas', mode),
    node(
      'label',
      { for: 'shipping-recipient-company', class: 'check-field' },
      recipientCompany,
      'Gavėjas yra įmonė',
    ),
    measured,
    prepare,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      prepare,
      async () => {
        const body = {
          id: planId,
          originId: location.value,
          mode: mode.value,
          recipientIsCompany: recipientCompany.checked,
        };
        if (mode.value === 'measured')
          Object.assign(body, {
            measurementNote: note.value,
            parcels: [
              {
                weightGrams: Math.round(Number(weight.value) * 1000),
                dimensionsMm: dimensions.map((d) => Math.round(Number(d.input.value) * 10)),
                lines: o.snapshot.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
              },
            ],
          });
        await api('/api/operator/orders/' + o.id + '/shipping-plans', body);
        await reload();
      },
      'Pakuotės planas išsaugotas.',
    );
  });
  content.append(form);
}
