import { catalogEditor } from './catalog-editor.mjs';
export async function renderCatalog(content, ctx) {
  const { node: n, table, cell, api, action, has, money } = ctx;
  const [products, data] = await Promise.all([api('/api/operator/catalog'), api('/api/markets')]);
  if (!content.isConnected) return;
  const list = n('div', { class: 'catalog-list' }),
    editorArea = n('section', { class: 'catalog-editor', hidden: '' });
  let editor;
  const open = async (sku) => {
    if (!editor) return;
    list.hidden = true;
    editorArea.hidden = false;
    await editor.open(sku);
    heading.focus();
    editorArea.scrollIntoView({ block: 'start' });
  };
  const heading = n('h2', { tabindex: '-1' }, 'Redaguoti prekę');
  const close = n(
    'button',
    {
      type: 'button',
      onclick: async () => {
        if (!(await editor.close())) return;
        editorArea.hidden = true;
        list.hidden = false;
        heading.textContent = 'Redaguoti prekę';
      },
    },
    'Grįžti į prekes',
  );
  editorArea.append(close, heading);
  if (has('catalog'))
    list.append(
      n(
        'div',
        { class: 'actions' },
        n(
          'button',
          {
            type: 'button',
            class: 'primary',
            onclick: () => {
              heading.textContent = 'Nauja prekė';
              open('');
            },
          },
          'Pridėti prekę',
        ),
      ),
    );
  content.append(list, editorArea);
  list.append(
    n(
      'p',
      { class: 'hint' },
      'Kainos ir pakuotės saugomos versijomis. Pakeitimas nekeičia ankstesnių užsakymų, jų kainų ar likučio. Priedas su nežinoma pakuote gali likti neaktyvus.',
    ),
  );
  list.append(
    table(
      ['Prekė', 'Likutis', 'Būsena', 'Kainos', ...(has('catalog') ? ['Veiksmas'] : [])],
      products.map((p) =>
        n(
          'tr',
          {},
          cell(
            n(
              'div',
              {},
              n('span', { class: 'catalog-product-name' }, p.title),
              n('span', { class: 'secondary' }, p.sku),
            ),
            'Prekė',
          ),
          cell(p.available, 'Likutis'),
          cell(
            n(
              'span',
              { class: 'badge ' + (p.published !== false && p.enabled !== false ? 'success' : '') },
              p.published === false ? 'Juodraštis' : p.enabled === false ? 'Neaktyvi' : 'Aktyvi',
            ),
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
          ...(has('catalog')
            ? [
                cell(
                  n(
                    'button',
                    {
                      type: 'button',
                      onclick: () => {
                        heading.textContent = p.title;
                        open(p.sku);
                      },
                    },
                    'Redaguoti',
                  ),
                  'Veiksmas',
                ),
              ]
            : []),
        ),
      ),
    ),
  );
  if (!has('catalog')) return;
  const formRoot = n('div');
  editorArea.append(formRoot);
  editor = catalogEditor(
    formRoot,
    {
      ...ctx,
      onProductOpen: (title) => {
        heading.textContent = title;
      },
      reload: () => {
        content.replaceChildren();
        return renderCatalog(content, ctx);
      },
    },
    products,
    data.markets,
  );
}
