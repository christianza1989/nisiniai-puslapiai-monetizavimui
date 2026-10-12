export async function renderCatalog(content, ctx) {
  const { node: n, table, cell, api, action, has, money } = ctx;
  const [products, data] = await Promise.all([api('/api/operator/catalog'), api('/api/markets')]);
  content.append(
    n(
      'p',
      { class: 'hint' },
      'Kainos ir pakuotės saugomos versijomis. Pakeitimas nekeičia ankstesnių užsakymų, jų kainų ar likučio. Priedas su nežinoma pakuote gali likti neaktyvus.',
    ),
  );
  content.append(
    table(
      ['Prekė', 'Likutis', 'Būsena', 'Kainos'],
      products.map((p) =>
        n(
          'tr',
          {},
          cell(p.title, 'Prekė'),
          cell(p.available, 'Likutis'),
          cell(p.enabled === false ? 'Neaktyvi' : 'Aktyvi', 'Būsena'),
          cell(
            Object.entries(p.prices)
              .map(
                ([country, amount]) =>
                  country +
                  ': ' +
                  money(amount, data.markets.find((m) => m.country === country)?.currency || 'EUR'),
              )
              .join(' · '),
            'Kainos',
          ),
        ),
      ),
    ),
  );
  if (!has('catalog')) return;
  const select = n(
    'select',
    {},
    n('option', { value: '' }, 'Nauja prekė'),
    products.map((p) => n('option', { value: p.sku }, p.title)),
  );
  const sku = n('input', { required: true, maxlength: '100', pattern: '[a-zA-Z0-9_-]+' }),
    title = n('input', { required: true, minlength: '2', maxlength: '200' }),
    enabled = n('input', { type: 'checkbox' });
  const weight = n('input', { type: 'number', min: '1', max: '100000', step: '1' }),
    dimensions = [0, 1, 2].map(() =>
      n('input', { type: 'number', min: '0.1', max: '300', step: '0.1' }),
    );
  const prices = data.markets.map((m) => ({
    m,
    input: n('input', { type: 'number', min: '.01', step: '.01' }),
  }));
  const addonFor = n('input', { maxlength: '500' });
  const submit = n('button', { type: 'submit' }, 'Išsaugoti prekės versiją');
  const form = n(
    'form',
    { class: 'stock-form' },
    n('h2', {}, 'Prekės konfigūracija'),
    n('label', {}, 'Pasirinkti prekę', select),
    n('label', {}, 'SKU žymuo', sku),
    n('label', {}, 'Prekės pavadinimas', title),
    n('label', { class: 'check-field' }, enabled, 'Aktyvi prekyba'),
    prices.map(({ m, input }) => n('label', {}, m.country + ' kaina (' + m.currency + ')', input)),
    n('label', {}, 'Supakuotas svoris (g)', weight),
    dimensions.map((d, i) => n('label', {}, ['Ilgis (cm)', 'Plotis (cm)', 'Aukštis (cm)'][i], d)),
    n('label', {}, 'Priedas šiems rinkiniams: SKU per kablelį; kitoms prekėms tuščia', addonFor),
    submit,
  );
  let selected,
    id = crypto.randomUUID();
  const required = () => {
    weight.required = enabled.checked;
    dimensions.forEach((d) => {
      d.required = enabled.checked;
    });
  };
  enabled.addEventListener('change', required);
  select.addEventListener('change', () => {
    selected = products.find((p) => p.sku === select.value);
    id = crypto.randomUUID();
    sku.value = selected?.sku || '';
    sku.readOnly = Boolean(selected);
    title.value = selected?.title || '';
    enabled.checked = selected?.enabled !== false && Boolean(selected);
    weight.value = selected?.package?.weightGrams || '';
    dimensions.forEach((d, i) => {
      d.value = selected?.package?.dimensionsMm[i] / 10 || '';
    });
    prices.forEach(({ m, input }) => {
      input.value = selected?.prices[m.country] ? selected.prices[m.country] / 100 : '';
    });
    addonFor.value = selected?.addonFor?.join(',') || '';
    required();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      submit,
      async () => {
        const definition = {
          sku: sku.value,
          title: title.value,
          enabled: enabled.checked,
          prices: Object.fromEntries(
            prices
              .filter((p) => p.input.value)
              .map(({ m, input }) => [m.country, Math.round(Number(input.value) * 100)]),
          ),
          package:
            weight.value && dimensions.every((d) => d.value)
              ? {
                  weightGrams: Number(weight.value),
                  dimensionsMm: dimensions.map((d) => Math.round(Number(d.value) * 10)),
                }
              : null,
          ...(selected?.titles
            ? { titles: { ...selected.titles, [data.markets[0].country]: title.value } }
            : {}),
          ...(addonFor.value.trim()
            ? { addonFor: addonFor.value.split(',').map((s) => s.trim()) }
            : {}),
        };
        await api('/api/operator/catalog-revisions', {
          id,
          basisHash: selected?.basisHash,
          definition,
        });
        content.replaceChildren();
        await renderCatalog(content, ctx);
      },
      'Prekės versija išsaugota.',
    );
  });
  content.append(form);
  required();
}
