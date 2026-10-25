import { catalogEditor } from './catalog-editor.mjs';
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
          cell(
            p.published === false ? 'Juodraštis' : p.enabled === false ? 'Neaktyvi' : 'Aktyvi',
            'Būsena',
          ),
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
  catalogEditor(
    content,
    { ...ctx, reload: () => renderCatalog(content, ctx) },
    products,
    data.markets,
  );
}
