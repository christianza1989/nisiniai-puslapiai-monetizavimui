export function renderReturns(content, detail, ctx) {
  const { node: n, table, cell, api, action, has, reload, date } = ctx,
    order = detail.order;
  content.append(
    n('h2', {}, 'Fizinių grąžinimų priėmimas'),
    n(
      'p',
      { class: 'hint' },
      'Pinigų grąžinimas ir prekės priėmimas yra atskiri įrašai. Į parduodamą likutį grąžinami tik fiziškai gauti ir patikrinti rinkiniai.',
    ),
  );
  if (!detail.returnReceipts?.length)
    content.append(n('p', { class: 'empty' }, 'Priimtų grąžinimų dar nėra.'));
  else
    for (const r of detail.returnReceipts) {
      content.append(
        n('h3', {}, 'Priimta ' + date(r.created_at)),
        n('p', {}, r.reason),
        table(
          ['Prekė', 'Kiekis', 'Paskirtis'],
          r.lines.map((l) =>
            n(
              'tr',
              {},
              cell(l.sku, 'Prekė'),
              cell(l.quantity, 'Kiekis'),
              cell(
                {
                  resalable: 'Grąžinta į parduodamą likutį',
                  quarantine: 'Karantinas',
                  disposed: 'Nurašyta',
                }[l.disposition],
                'Paskirtis',
              ),
            ),
          ),
        ),
      );
    }
  if (!has('stock')) return;
  if (
    order.payment_state === 'refunded' &&
    ['pending', 'ready', 'stock_exception'].includes(order.fulfillment_state)
  ) {
    const checked = n('input', { type: 'checkbox', required: true }),
      reason = n('input', { required: true, minlength: '3', maxlength: '200' }),
      submit = n('button', { type: 'submit' }, 'Atšaukti neišsiųstą užsakymą'),
      id = crypto.randomUUID();
    const form = n(
      'form',
      { class: 'stock-form' },
      n('h3', {}, 'Neišsiųsto užsakymo likutis'),
      n(
        'label',
        { class: 'check-field' },
        checked,
        'Patikrinau, kad siunta neužsakyta ir prekės tebėra sandėlyje. Galiojimo bei karantino ribos išlieka.',
      ),
      n('label', {}, 'Atšaukimo paaiškinimas', reason),
      submit,
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      action(
        submit,
        async () => {
          await api('/api/operator/orders/' + order.id + '/cancel-unshipped', {
            id,
            qualityChecked: checked.checked,
            reason: reason.value,
          });
          await reload();
        },
        'Neišsiųstas užsakymas atšauktas. Likutis sutikrintas pagal jo ankstesnę būseną.',
      );
    });
    content.append(form);
  }
  if (order.fulfillment_state !== 'labelled') return;
  const quantityInputs = order.snapshot.lines.map((l) => ({
    l,
    lot: n(
      'select',
      {},
      n('option', { value: '' }, 'Nepriskirta partija / ankstesnis nepartinis likutis'),
      (detail.stockQuality?.allocations || [])
        .filter(
          (a) =>
            a.sku === l.sku && a.generation === order.stock_generation && a.state === 'allocated',
        )
        .map((a) => n('option', { value: a.lot_id }, a.lot_id)),
    ),
    input: n('input', { type: 'number', value: '0', min: '0', max: l.quantity, step: '1' }),
  }));
  const disposition = n(
    'select',
    {},
    n('option', { value: 'quarantine' }, 'Karantinas'),
    n('option', { value: 'resalable' }, 'Patikrinta ir tinkama parduoti'),
    n('option', { value: 'disposed' }, 'Nurašyti'),
  );
  const expiry = n('input', { type: 'checkbox' }),
    reason = n('input', { required: true, minlength: '3', maxlength: '200' }),
    submit = n('button', { type: 'submit' }, 'Užregistruoti gautas prekes'),
    id = crypto.randomUUID();
  const form = n(
    'form',
    { class: 'stock-form' },
    quantityInputs.flatMap(({ l, input, lot }) => [
      n('label', {}, l.title + ' gautas kiekis', input),
      n('label', {}, l.title + ' faktinė grąžinto rinkinio partija', lot),
    ]),
    n('label', {}, 'Prekių paskirtis', disposition),
    n(
      'label',
      { class: 'check-field' },
      expiry,
      'Fiziškai patikrinau būklę, komplektaciją ir galiojimą',
    ),
    n('label', {}, 'Priėmimo paaiškinimas', reason),
    submit,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      submit,
      async () => {
        await api('/api/operator/orders/' + order.id + '/return-receipts', {
          id,
          reason: reason.value,
          lines: quantityInputs
            .filter((q) => Number(q.input.value) > 0)
            .map(({ l, input, lot }) => ({
              sku: l.sku,
              quantity: Number(input.value),
              disposition: disposition.value,
              expiryChecked: expiry.checked,
              ...(lot.value ? { finishedLotId: lot.value } : {}),
            })),
        });
        await reload();
      },
      'Fizinis grąžinimas išsaugotas.',
    );
  });
  content.append(form);
}
