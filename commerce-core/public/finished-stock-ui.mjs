export function usesOnlySimpleStock(catalog) {
  const active = catalog.filter((p) => p.enabled !== false || p.stockMode === 'lots');
  return active.length > 0 && active.every((p) => p.stockMode === 'simple');
}
export async function renderFinishedStock(content, ctx, refresh) {
  const { node: n, table, cell, api, action, has, date, catalog } = ctx;
  const data = await api('/api/operator/finished-stock');
  const receiptCatalog = catalog.filter((p) => p.stockMode !== 'simple');
  if (
    usesOnlySimpleStock(catalog) &&
    !data.lots.length &&
    !data.controls.length &&
    !data.holds.some((h) => h.held === 1)
  )
    return;
  content.append(
    n('h2', {}, 'Paruoštų rinkinių partijos'),
    n(
      'p',
      { class: 'hint' },
      'Partijos galiojimas ir komponentų karantinas tikrinami rezervuojant, komplektuojant ir registruojant siuntą. Faktinis laisvas kiekis ir parduodamas kiekis gali skirtis.',
    ),
  );
  content.append(
    data.lots.length
      ? table(
          ['Partija / SKU', 'Laisva', 'Galima parduoti', 'Galiojimas', 'Būsena'],
          data.lots.map((l) =>
            n(
              'tr',
              {},
              cell(l.id + ' / ' + l.sku, 'Partija / SKU'),
              cell(l.available, 'Laisva'),
              cell(l.sellable, 'Galima parduoti'),
              cell(
                l.expires_at === null ? 'Terminas neįrašytas' : date(l.expires_at),
                'Galiojimas',
              ),
              cell(
                l.held
                  ? 'Laukia sutikrinimo'
                  : l.blocked
                    ? 'Karantinas'
                    : l.expired
                      ? 'Terminas pasibaigęs'
                      : 'Įrašyta',
                'Būsena',
              ),
            ),
          ),
        )
      : n('p', { class: 'empty' }, 'Paruoštų rinkinių partijų dar nėra.'),
  );
  const holds = data.holds.filter((h) => h.held === 1);
  content.append(
    n(
      'p',
      { class: 'hint' },
      'Fizinis laisvas likutis: ' +
        data.inventory.map((i) => i.sku + ' – ' + i.available).join('; ') +
        '.',
    ),
  );
  if (holds.length)
    content.append(
      n(
        'p',
        { role: 'status' },
        'Sutikrinimo laukia: ' +
          holds.map((h) => h.sku).join(', ') +
          '. Ankstesnių surinkimų kilmė nėra numanoma.',
      ),
    );
  if (!has('stock')) return;
  const wrap = (label, input) => n('label', {}, label, input);
  if (receiptCatalog.length) {
    const receiveId = crypto.randomUUID(),
      sku = n(
        'select',
        {},
        receiptCatalog.map((p) => n('option', { value: p.sku }, p.title)),
      ),
      mode = n(
        'select',
        {},
        n('option', { value: 'receive' }, 'Naujos fiziškai gautos prekės'),
        n('option', { value: 'adopt' }, 'Esamo laisvo likučio kilmės įrašymas'),
      ),
      quantity = n('input', { type: 'number', min: '1', max: '100000', step: '1', required: true }),
      expected = n('input', { type: 'number', min: '0', max: '100000', step: '1', required: true }),
      supplier = n('input', { minlength: '3', maxlength: '200', required: true }),
      expiry = n('input', { type: 'datetime-local' }),
      noExpiry = n('input', { type: 'checkbox' }),
      quarantine = n('input', { type: 'checkbox' }),
      checked = n('input', { type: 'checkbox', required: true }),
      reason = n('input', { minlength: '3', maxlength: '200', required: true }),
      submit = n('button', { type: 'submit' }, 'Įrašyti rinkinių partiją');
    content.append(
      n(
        'form',
        {
          class: 'stock-form',
          onsubmit: (event) => {
            event.preventDefault();
            action(
              submit,
              async () => {
                if (!expiry.value && !noExpiry.checked)
                  throw Error('finished_expiry_confirmation_required');
                await api('/api/operator/finished-lots', {
                  id: receiveId,
                  sku: sku.value,
                  mode: mode.value,
                  quantity: Number(quantity.value),
                  expectedAvailable: Number(expected.value),
                  supplierRef: supplier.value,
                  expiresAt: expiry.value ? new Date(expiry.value).getTime() : null,
                  quarantined: quarantine.checked,
                  qualityChecked: checked.checked,
                  reason: reason.value,
                });
                await refresh();
              },
              'Partijos kilmė išsaugota.',
            );
          },
        },
        n('h3', {}, 'Fiziškai patikrintas rinkinių likutis'),
        wrap('Prekė', sku),
        wrap('Įrašymo būdas', mode),
        wrap('Šios partijos vienetai', quantity),
        wrap('Peržiūrėtas bendras fizinis laisvas prekės likutis', expected),
        wrap('Gamintojo / tiekėjo partijos žymuo', supplier),
        wrap('Gamintojo nurodytas galiojimo laikas', expiry),
        n(
          'label',
          { class: 'check-field' },
          noExpiry,
          'Patvirtinu, kad galiojimo terminas nenurodytas',
        ),
        n('label', { class: 'check-field' }, quarantine, 'Laikyti karantine'),
        n(
          'label',
          { class: 'check-field' },
          checked,
          'Fiziškai patikrinau kiekį, kilmę ir galiojimo duomenis',
        ),
        wrap('Įrašo paaiškinimas', reason),
        submit,
      ),
    );
  }
  if (data.lots.length) {
    const id = crypto.randomUUID(),
      select = n(
        'select',
        {},
        data.lots.map((l) => n('option', { value: l.id }, l.id + ' / ' + l.sku)),
      ),
      kind = n(
        'select',
        {},
        n('option', { value: 'quarantine' }, 'Karantinas'),
        n('option', { value: 'release' }, 'Karantino panaikinimas'),
        n('option', { value: 'adjust' }, 'Fizinio likučio sutikrinimas'),
      ),
      count = n('input', { type: 'number', min: '0', max: '100000', step: '1' }),
      quality = n('input', { type: 'checkbox' }),
      note = n('input', { minlength: '3', maxlength: '200', required: true }),
      button = n('button', { type: 'submit' }, 'Išsaugoti partijos pakeitimą');
    const selected = () => data.lots.find((l) => l.id === select.value);
    const update = () => {
      count.value = selected().available;
      count.disabled = kind.value !== 'adjust';
      quality.required = kind.value === 'release';
    };
    select.addEventListener('change', update);
    kind.addEventListener('change', update);
    update();
    content.append(
      n(
        'form',
        {
          class: 'stock-form',
          onsubmit: (event) => {
            event.preventDefault();
            action(
              button,
              async () => {
                const lot = selected();
                await api('/api/operator/finished-controls', {
                  id,
                  sku: lot.sku,
                  lotId: lot.id,
                  kind: kind.value,
                  delta: kind.value === 'adjust' ? Number(count.value) - lot.available : 0,
                  expectedAvailable: lot.available,
                  expectedVersion: lot.control_version,
                  qualityChecked: quality.checked,
                  reason: note.value,
                });
                await refresh();
              },
              'Partijos pakeitimas išsaugotas.',
            );
          },
        },
        n('h3', {}, 'Partijos kontrolė'),
        wrap('Partija', select),
        wrap('Veiksmas', kind),
        wrap('Faktiškai suskaičiuotas laisvas partijos kiekis', count),
        n('label', { class: 'check-field' }, quality, 'Patikrinau partijos tinkamumą'),
        wrap('Pakeitimo paaiškinimas', note),
        button,
      ),
    );
  }
  for (const hold of holds) {
    const id = crypto.randomUUID(),
      quantity = n('input', { type: 'number', min: '0', max: '100000', step: '1', required: true }),
      checked = n('input', { type: 'checkbox', required: true }),
      reason = n('input', { minlength: '3', maxlength: '200', required: true }),
      button = n('button', { type: 'submit' }, 'Užbaigti kilmės sutikrinimą');
    content.append(
      n(
        'form',
        {
          class: 'stock-form',
          onsubmit: (event) => {
            event.preventDefault();
            action(
              button,
              async () => {
                await api('/api/operator/finished-controls', {
                  id,
                  sku: hold.sku,
                  kind: 'reconcile',
                  expectedAvailable: Number(quantity.value),
                  qualityChecked: checked.checked,
                  reason: reason.value,
                });
                await refresh();
              },
              'Kilmės sutikrinimas išsaugotas.',
            );
          },
        },
        n('h3', {}, 'Ankstesnis likutis: ' + hold.sku),
        wrap('Peržiūrėtas fizinis laisvas kiekis', quantity),
        n(
          'label',
          { class: 'check-field' },
          checked,
          'Visas laisvas likutis priskirtas tikroms partijoms',
        ),
        wrap('Sutikrinimo paaiškinimas', reason),
        button,
      ),
    );
  }
  if (data.controls.length)
    content.append(
      n('h3', {}, 'Partijų kontrolės istorija'),
      table(
        ['Laikas', 'Prekė / partija', 'Veiksmas', 'Paaiškinimas'],
        data.controls.map((c) =>
          n(
            'tr',
            {},
            cell(date(c.created_at), 'Laikas'),
            cell(c.sku + ' / ' + (c.lot_id || 'Kilmė'), 'Prekė / partija'),
            cell(
              {
                adjust: 'Fizinio kiekio sutikrinimas',
                quarantine: 'Karantinas',
                release: 'Karantino panaikinimas',
                reconcile: 'Kilmės sutikrinimas',
              }[c.kind] || c.kind,
              'Veiksmas',
            ),
            cell(c.reason, 'Paaiškinimas'),
          ),
        ),
      ),
    );
}
