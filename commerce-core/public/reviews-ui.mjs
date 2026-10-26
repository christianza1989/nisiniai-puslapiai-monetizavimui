export async function renderReviews(content, ctx) {
  const { node: n, api, action, has, binary } = ctx;
  if (!has('catalog')) {
    content.append(
      n('p', { class: 'empty' }, 'Atsiliepimams valdyti reikia prekių redagavimo teisės.'),
    );
    return;
  }
  const settings = await api('/api/operator/review-settings');
  if (!content.isConnected) return;
  const form = n('form', { class: 'review-settings fields' }),
    enabled = n('input', { type: 'checkbox', id: 'reviews-enabled' }),
    days = n('input', {
      type: 'number',
      min: '1',
      max: '180',
      required: '',
      id: 'reviews-days',
      value: String(settings.delayDays),
    });
  enabled.checked = settings.enabled;
  form.append(
    n('h2', {}, 'Kvietimai palikti atsiliepimą'),
    n(
      'label',
      { class: 'check-field', for: 'reviews-enabled' },
      enabled,
      'Siųsti vieną automatinį kvietimą',
    ),
    n('label', { for: 'reviews-days' }, 'Dienų po siuntos perdavimo vežėjui', days),
    n(
      'p',
      { class: 'hint' },
      'Siunčiama tik apmokėjusiems klientams, kurie pirkdami atskirai sutiko gauti kvietimą. Esami klientai automatiškai nepridedami. Laiškai siunčiami esamu parduotuvės adresu.',
    ),
  );
  const origin = n('input', {
    type: 'url',
    required: '',
    id: 'reviews-origin',
    value: settings.origin,
    placeholder: 'https://memocasting.lt',
  });
  form.append(n('label', { for: 'reviews-origin' }, 'Parduotuvės adresas', origin));
  const save = n('button', { type: 'submit', class: 'primary' }, 'Išsaugoti kvietimų nustatymus');
  form.append(
    save,
    n(
      'p',
      { class: 'hint' },
      settings.nextOrderNumber
        ? 'Kitas naujas užsakymas: ' + settings.nextOrderNumber + '. Senų numerių nekeičiame.'
        : 'Tęstinė numeracija dar nesukonfigūruota.',
    ),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.reportValidity())
      action(
        save,
        async () => {
          const s = await api('/api/operator/review-settings', {
            version: settings.version,
            enabled: enabled.checked,
            delayDays: Number(days.value),
            origin: origin.value.trim(),
          });
          Object.assign(settings, s);
        },
        'Kvietimų nustatymai išsaugoti.',
      );
  });
  content.append(form);
  const importer = n('details', { class: 'review-import' }),
    file = n('input', { type: 'file', accept: '.csv,text/csv', id: 'reviews-csv' }),
    preview = n('div', {}),
    mappingArea = n('div', { class: 'fields' });
  const importButton = n('button', { type: 'button' }, 'Patikrinti CSV'),
    confirm = n('button', { type: 'button', class: 'primary', hidden: '' }, 'Importuoti peržiūrai'),
    own = n('input', { type: 'checkbox', id: 'reviews-own' });
  importer.append(
    n('summary', {}, 'Importuoti senus Shopify atsiliepimus'),
    n(
      'p',
      { class: 'hint' },
      'UTF-8 CSV, iki 100 įrašų vienu kartu. Reikia prekės SKU, įvertinimo 1–5, autoriaus, originalios datos ir teksto. Importuoti įrašai pirmiausia laukia peržiūros. CSV žyma savaime nepatvirtina pirkimo.',
    ),
    n('label', { for: 'reviews-csv' }, 'CSV failas', file),
    mappingArea,
    importButton,
    preview,
    n(
      'label',
      { class: 'check-field', for: 'reviews-own' },
      own,
      'Tai tikri mūsų ankstesnės parduotuvės atsiliepimai ir turime teisę juos paskelbti',
    ),
    confirm,
  );
  let csv = '',
    mapping = {},
    prepared;
  const keys = [
    'product_sku',
    'rating',
    'author_name',
    'review_date',
    'review_text',
    'review_title',
    'review_id',
    'image_urls',
  ];
  file.addEventListener('change', async () => {
    csv = (await file.files?.[0]?.text()) || '';
    prepared = undefined;
    confirm.hidden = true;
    mappingArea.replaceChildren();
    mapping = {};
    const headers = csv
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/, 1)[0]
      .split(',')
      .map((h) => h.replace(/^"|"$/g, ''));
    for (const key of keys) {
      const select = n('select', { id: 'review-map-' + key });
      select.append(
        n('option', { value: '' }, 'Nenaudoti'),
        ...headers.map((h) => n('option', { value: h }, h)),
      );
      select.value = headers.includes(key) ? key : '';
      mapping[key] = select.value;
      select.addEventListener('change', () => {
        mapping[key] = select.value;
        prepared = undefined;
        confirm.hidden = true;
      });
      mappingArea.append(n('label', { for: select.id }, key, select));
    }
  });
  importButton.addEventListener('click', () =>
    action(
      importButton,
      async () => {
        prepared = await api('/api/operator/review-import/preview', { csv, mapping });
        preview.replaceChildren(
          n('h3', {}, 'Paruošta importuoti: ' + prepared.ready),
          ...prepared.items.map((i) =>
            n(
              'p',
              {},
              'Eilutė ' +
                i.row +
                ' · ' +
                i.sku +
                ' · ' +
                i.rating +
                '/5 · ' +
                i.date +
                ' · ' +
                (i.error || (i.duplicate ? 'Jau yra' : 'Tinka')),
            ),
          ),
        );
        confirm.hidden = prepared.items.some((i) => i.error) || !prepared.ready;
      },
      'CSV patikrintas. Peržiūrėkite rezultatą prieš importą.',
    ),
  );
  confirm.addEventListener('click', () =>
    action(
      confirm,
      async () => {
        if (!own.checked) throw new Error('review_import_not_confirmed');
        await api('/api/operator/review-import/confirm', {
          csv,
          mapping,
          hash: prepared.hash,
          ownStoreConfirmed: true,
        });
        confirm.hidden = true;
        await load(1);
      },
      'Atsiliepimai importuoti ir laukia peržiūros.',
    ),
  );
  content.append(importer);
  const list = n('section', { class: 'review-admin-list' });
  const trash = n('input', { type: 'checkbox', id: 'review-trash' });
  content.append(
    n(
      'label',
      { class: 'check-field', for: 'review-trash' },
      trash,
      'Rodyti pašalintus atsiliepimus (galima atkurti)',
    ),
  );
  trash.addEventListener('change', () => load(1));
  content.append(list);
  const load = async (page) => {
    const data = await api(
      '/api/operator/reviews?page=' + page + (trash.checked ? '&deleted=1' : ''),
    );
    if (!content.isConnected) return;
    list.replaceChildren(
      n('h2', {}, 'Atsiliepimai (' + data.total + ')'),
      n(
        'p',
        { class: 'hint' },
        'Publikuokite autentiškas patirtis nepriklausomai nuo žvaigždučių skaičiaus. Slėpkite tik dėl konkretaus turinio, privatumo ar autentiškumo pažeidimo. Originalaus teksto ir datos nekeičiame.',
      ),
    );
    if (!data.items.length)
      list.append(
        n(
          'p',
          { class: 'empty' },
          'Atsiliepimų dar nėra. Čia atsiras klientų pateikti ir importuoti įrašai.',
        ),
      );
    for (const r of data.items) {
      const row = n('article', { class: 'review-admin-row' }),
        reason = n('input', {
          type: 'text',
          minlength: '3',
          maxlength: '500',
          placeholder: 'Peržiūros priežastis',
          id: 'review-reason-' + r.id,
        });
      row.append(
        n('h3', {}, r.author_name + ' · ' + r.rating + '/5'),
        n(
          'p',
          { class: 'hint' },
          r.sku +
            ' · ' +
            r.review_date +
            ' · ' +
            {
              pending: 'Laukia peržiūros',
              published: 'Paskelbtas',
              hidden: 'Paslėptas',
              deleted: 'Pašalintas',
            }[r.state] +
            ' · ' +
            (r.verified ? 'Patvirtintas pirkimas' : 'Pirkimas nepatvirtintas'),
        ),
        r.title ? n('h4', {}, r.title) : '',
        n('p', { class: 'review-body' }, r.body),
      );
      for (const p of r.photos) {
        const b = n('button', { type: 'button' }, 'Peržiūrėti kliento nuotrauką');
        b.addEventListener('click', () =>
          action(
            b,
            async () => {
              const blob = await binary('/api/operator/review-photos/' + p.id),
                url = URL.createObjectURL(blob);
              const img = n('img', {
                src: url,
                alt: 'Kliento pridėta nuotrauka',
                width: '200',
                loading: 'lazy',
              });
              img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
              b.replaceWith(img);
            },
            'Nuotrauka įkelta.',
          ),
        );
        row.append(b);
        const remove = n(
          'button',
          { type: 'button' },
          p.hidden ? 'Atkurti nuotrauką' : 'Pašalinti šią nuotrauką',
        );
        remove.addEventListener('click', () =>
          action(
            remove,
            async () => {
              await api('/api/operator/review-photos/' + p.id, {
                hidden: !p.hidden,
                reason:
                  reason.value.trim() ||
                  (p.hidden ? 'Savininkas atkūrė nuotrauką' : 'Savininkas pašalino nuotrauką'),
              });
              await load(page);
            },
            p.hidden ? 'Nuotrauka atkurta.' : 'Nuotrauka pašalinta iš viešo puslapio.',
          ),
        );
        row.append(remove);
      }
      row.append(n('label', { for: reason.id }, 'Peržiūros paaiškinimas', reason));
      const controls = n('div', { class: 'actions' });
      for (const [state, label] of [
        ['published', 'Paskelbti'],
        ['hidden', 'Paslėpti'],
        ['pending', 'Grąžinti peržiūrai'],
        ['deleted', 'Pašalinti atsiliepimą'],
      ]) {
        if (state === r.state) continue;
        const b = n('button', { type: 'button' }, label);
        b.addEventListener('click', () =>
          action(
            b,
            async () => {
              if (state !== 'deleted' && reason.value.trim().length < 3) {
                reason.focus();
                throw new Error('invalid_review_moderation');
              }
              await api('/api/operator/reviews/' + r.id, {
                state,
                reason: reason.value.trim() || 'Savininkas pašalino atsiliepimą',
                version: r.version,
              });
              await load(page);
            },
            'Atsiliepimo būsena išsaugota.',
          ),
        );
        controls.append(b);
      }
      row.append(controls);
      list.append(row);
    }
    const pages = n('div', { class: 'actions' });
    for (const [p, label] of [
      [page - 1, 'Ankstesni'],
      [page + 1, 'Kiti'],
    ])
      if (p >= 1 && (p < page || data.total > page * 20)) {
        const b = n('button', { type: 'button' }, label);
        b.addEventListener('click', () => action(b, () => load(p)));
        pages.append(b);
      }
    list.append(pages);
  };
  await load(1);
}
