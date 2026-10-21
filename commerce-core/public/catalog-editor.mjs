export function catalogEditor(root, ctx, products, markets) {
  const { node: n, api, binary, action, money } = ctx;
  const select = n(
    'select',
    {},
    n('option', { value: '' }, 'Nauja prekė'),
    products.map((p) => n('option', { value: p.sku }, p.title)),
  );
  const area = n('div', {}),
    status = n('p', { role: 'status', class: 'hint' });
  root.append(n('label', {}, 'Redaguojama prekė', select), status, area);
  let dirty = false,
    current = '',
    ticket = 0;
  select.onchange = async () => {
    if (dirty && !confirm('Yra neišsaugotų pakeitimų. Atverti kitą prekę?')) {
      select.value = current;
      return;
    }
    current = select.value;
    dirty = false;
    const version = ++ticket;
    status.textContent = 'Įkeliama…';
    area.replaceChildren();
    try {
      const published = products.find((p) => p.sku === current),
        draft = published ? await api('/api/operator/catalog-drafts/' + current) : null;
      if (version === ticket) draw(published, draft);
    } catch {
      status.textContent = 'Nepavyko įkelti. Pasirinkite prekę iš naujo.';
    }
  };
  const field = (label, value = '', attrs = {}) => {
    const input = n(attrs.rows ? 'textarea' : 'input', attrs);
    input.value = value;
    return { input, element: n('label', {}, label, input) };
  };
  const group = (label, ...children) => n('fieldset', {}, n('legend', {}, label), ...children);
  function draw(published, draft) {
    const p = structuredClone(
      draft?.definition ??
        published ?? { sku: '', title: '', enabled: false, prices: {}, package: null },
    );
    p.content ??= {
      summary: '',
      description: '',
      contents: '',
      seoTitle: '',
      seoDescription: '',
      images: [],
    };
    p.optionGroups ??= [];
    let hash = draft?.draftHash,
      basis = draft ? draft.basisHash : published?.basisHash,
      id = crypto.randomUUID();
    const form = n('form', { class: 'catalog-form' }),
      images = n('div', {}),
      options = n('div', {});
    const sku = field('SKU', p.sku, { required: true, pattern: '[a-zA-Z0-9_-]+', maxlength: 100 });
    sku.input.readOnly = Boolean(published);
    const title = field('Pavadinimas', p.title, { required: true, minlength: 2, maxlength: 200 });
    const active = n('input', { type: 'checkbox' });
    active.checked = p.enabled;
    const prices = markets.map((m) => ({
      m,
      ...field(
        m.country + ' kaina (' + m.currency + ')',
        p.prices[m.country] === undefined ? '' : p.prices[m.country] / 100,
        { type: 'number', min: 0.01, step: 0.01 },
      ),
    }));
    const copy = [
      ['summary', 'Trumpas aprašymas', 600, 3],
      ['description', 'Išsamus aprašymas', 16000, 8],
      ['contents', 'Komplektacija (po vieną eilutėje)', 5000, 5],
      ['seoTitle', 'Google antraštė', 160, 1],
      ['seoDescription', 'Google aprašymas', 320, 3],
    ].map(([key, label, max, rows]) => ({
      key,
      ...field(label, p.content[key] ?? '', { maxlength: max, rows }),
    }));
    const weight = field('Supakuotas svoris (g)', p.package?.weightGrams ?? '', {
      type: 'number',
      min: 1,
      max: 100000,
      step: 1,
    });
    const dims = [0, 1, 2].map((i) =>
      field(
        ['Ilgis (cm)', 'Plotis (cm)', 'Aukštis (cm)'][i],
        p.package?.dimensionsMm[i] / 10 || '',
        { type: 'number', min: 0.1, max: 300, step: 0.1 },
      ),
    );
    const addon = field(
      'Atskiras priedas rinkiniams (SKU per kablelį)',
      p.addonFor?.join(',') ?? '',
      { maxlength: 500 },
    );
    const upload = n('input', {
        type: 'file',
        accept: 'image/png,image/jpeg,image/webp',
        multiple: true,
      }),
      uploadBtn = n('button', { type: 'button', class: 'secondary' }, 'Įkelti nuotraukas');
    const add = n('button', { type: 'button', class: 'secondary' }, 'Pridėti grupę'),
      colors = n('button', { type: 'button', class: 'secondary' }, 'Dažų spalvos'),
      base = n('button', { type: 'button', class: 'secondary' }, 'Medinis padėklas');
    const save = n('button', { type: 'submit' }, 'Išsaugoti juodraštį'),
      preview = n('button', { type: 'button', class: 'secondary' }, 'Peržiūrėti'),
      publish = n('button', { type: 'button' }, 'Paskelbti');
    form.append(
      group(
        'Prekė',
        n('div', { class: 'fields' }, sku.element, title.element, ...prices.map((f) => f.element)),
        n('label', { class: 'check-field' }, active, 'Aktyvi prekyba'),
      ),
      group('Aprašymai', ...copy.slice(0, 3).map((f) => f.element)),
      group(
        'Nuotraukos',
        n(
          'p',
          { class: 'hint' },
          'Pirmoji — pagrindinė. Kiekvienai parašykite alt tekstą. Skaidrumas išsaugomas.',
        ),
        images,
        n('label', {}, 'PNG, JPEG arba WebP failai', upload),
        uploadBtn,
      ),
      group('Pasirinkimai', options, n('div', { class: 'actions' }, add, colors, base)),
      group(
        'Pristatymas',
        n('div', { class: 'fields' }, weight.element, ...dims.map((f) => f.element)),
        addon.element,
      ),
      group('Paieškos sistemos', ...copy.slice(3).map((f) => f.element)),
      n('div', { class: 'actions catalog-save' }, save, preview, publish),
    );
    area.append(form);
    if (draft && draft.basisHash !== (published?.basisHash ?? null)) {
      const reset = n(
        'button',
        { type: 'button', class: 'secondary' },
        'Atkurti paskelbtą versiją',
      );
      reset.onclick = () => {
        area.replaceChildren();
        draw(published, { ...draft, definition: published, basisHash: published.basisHash });
        dirty = true;
      };
      area.prepend(
        n(
          'p',
          { class: 'hint' },
          'Po šio juodraščio prekė jau pakeista. Atkurkite paskelbtą versiją ir iš naujo įveskite savo pakeitimus.',
        ),
        reset,
      );
    }
    const mark = () => {
      dirty = true;
      id = crypto.randomUUID();
      status.textContent = 'Yra neišsaugotų pakeitimų.';
    };
    form.oninput = mark;
    form.onchange = mark;
    status.textContent = draft
      ? 'Atvertas išsaugotas juodraštis. Jis dar nepaskelbtas.'
      : 'Atverta paskelbta prekė. Pakeitimus pirmiausia išsaugokite kaip juodraštį.';
    function collect() {
      return {
        ...p,
        sku: sku.input.value,
        title: title.input.value,
        enabled: active.checked,
        prices: Object.fromEntries(
          prices
            .filter((f) => f.input.value !== '')
            .map((f) => [f.m.country, Math.round(Number(f.input.value) * 100)]),
        ),
        package:
          weight.input.value && dims.every((f) => f.input.value)
            ? {
                weightGrams: Number(weight.input.value),
                dimensionsMm: dims.map((f) => Math.round(Number(f.input.value) * 10)),
              }
            : null,
        addonFor: addon.input.value.trim()
          ? addon.input.value.split(',').map((s) => s.trim())
          : undefined,
        ...(p.titles ? { titles: { ...p.titles, [markets[0].country]: title.input.value } } : {}),
        content: { ...p.content, ...Object.fromEntries(copy.map((f) => [f.key, f.input.value])) },
      };
    }
    async function setImage(img, m) {
      const ticket = crypto.randomUUID();
      img.dataset.imageTicket = ticket;
      if (m.src.startsWith('/prekyba/catalog-media/')) {
        try {
          const blob = await binary('/api/operator/catalog-media/' + m.id),
            url = URL.createObjectURL(blob);
          if (img.dataset.imageTicket !== ticket) {
            URL.revokeObjectURL(url);
            return;
          }
          img.onload = () => URL.revokeObjectURL(url);
          img.src = url;
        } catch {
          img.alt = 'Nepavyko įkelti peržiūros';
        }
      } else img.src = 'https://memocasting.lt' + m.src;
    }
    function drawImages() {
      images.replaceChildren();
      p.content.images.forEach((m, i) => {
        const img = n('img', { alt: m.alt, width: 150, height: 140 });
        setImage(img, m);
        const alt = field('Alt tekstas', m.alt, { required: true, minlength: 3, maxlength: 300 });
        alt.input.oninput = () => {
          m.alt = alt.input.value;
        };
        const bindings = p.optionGroups.map((g) => {
          const input = n(
            'select',
            {},
            n('option', { value: '' }, 'Visiems pasirinkimams'),
            g.values.map((v) => n('option', { value: v.id }, v.label)),
          );
          input.value = m.choices?.[g.id] ?? '';
          input.onchange = () => {
            m.choices ??= {};
            if (input.value) m.choices[g.id] = input.value;
            else delete m.choices[g.id];
          };
          return n('label', {}, g.label + ' šioje nuotraukoje', input);
        });
        const up = n(
            'button',
            { type: 'button', class: 'secondary', disabled: i === 0 },
            'Aukštyn',
          ),
          down = n(
            'button',
            { type: 'button', class: 'secondary', disabled: i === p.content.images.length - 1 },
            'Žemyn',
          ),
          remove = n('button', { type: 'button', class: 'secondary' }, 'Pašalinti');
        up.onclick = () => {
          p.content.images.splice(i - 1, 0, ...p.content.images.splice(i, 1));
          mark();
          drawImages();
        };
        down.onclick = () => {
          p.content.images.splice(i + 1, 0, ...p.content.images.splice(i, 1));
          mark();
          drawImages();
        };
        remove.onclick = () => {
          p.content.images.splice(i, 1);
          for (const g of p.optionGroups)
            for (const v of g.values) if (v.imageId === m.id) delete v.imageId;
          mark();
          drawImages();
          drawOptions();
        };
        images.append(
          n(
            'div',
            { class: 'catalog-media-row' },
            img,
            n(
              'div',
              {},
              n('strong', {}, i === 0 ? 'Pagrindinė nuotrauka' : 'Nuotrauka ' + (i + 1)),
              alt.element,
              ...bindings,
              n('div', { class: 'actions' }, up, down, remove),
            ),
          ),
        );
      });
    }
    uploadBtn.onclick = () =>
      action(
        uploadBtn,
        async () => {
          if (!upload.files?.length) throw Error('invalid_catalog_image');
          if (p.content.images.length + upload.files.length > 24)
            throw Error('invalid_product_images');
          for (const file of upload.files) {
            if (
              !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
              file.size > 25 * 1024 * 1024
            )
              throw Error('invalid_catalog_image');
            const bitmap = await createImageBitmap(file);
            try {
              const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height)),
                canvas = document.createElement('canvas');
              canvas.width = Math.max(1, Math.round(bitmap.width * scale));
              canvas.height = Math.max(1, Math.round(bitmap.height * scale));
              canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              const blob = await new Promise((resolve) =>
                canvas.toBlob(resolve, 'image/webp', 0.9),
              );
              if (!blob || blob.size > 2 * 1024 * 1024) throw Error('file_too_large');
              const m = await binary('/api/operator/catalog-media', {
                method: 'POST',
                headers: { 'content-type': 'image/webp' },
                body: blob,
              });
              if (!p.content.images.some((i) => i.id === m.id))
                p.content.images.push({
                  ...m,
                  alt: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
                });
            } finally {
              bitmap.close();
            }
          }
          upload.value = '';
          mark();
          drawImages();
          drawOptions();
        },
        'Nuotraukos įkeltos. Patikrinkite alt tekstus ir išsaugokite juodraštį.',
      );
    function drawOptions() {
      options.replaceChildren();
      for (const g of p.optionGroups) {
        const gi = field('Grupės žymuo', g.id, {
            required: true,
            pattern: '[a-zA-Z0-9_-]+',
            maxlength: 100,
          }),
          gl = field('Pavadinimas', g.label, { required: true, maxlength: 100 });
        gi.input.oninput = () => {
          g.id = gi.input.value;
        };
        gl.input.oninput = () => {
          g.label = gl.input.value;
        };
        const def = n(
          'select',
          {},
          g.values.map((v) => n('option', { value: v.id }, v.label)),
        );
        def.value = g.defaultValue;
        def.onchange = () => {
          g.defaultValue = def.value;
        };
        const values = n('div', {});
        for (const v of g.values) {
          const vi = field('Pasirinkimo žymuo', v.id, {
              required: true,
              pattern: '[a-zA-Z0-9_-]+',
              maxlength: 100,
            }),
            vl = field('Pavadinimas', v.label, { required: true, maxlength: 100 });
          vi.input.oninput = () => {
            if (g.defaultValue === v.id) g.defaultValue = vi.input.value;
            v.id = vi.input.value;
          };
          vl.input.oninput = () => {
            v.label = vl.input.value;
          };
          const enabled = n('input', { type: 'checkbox' });
          enabled.checked = v.enabled;
          enabled.onchange = () => {
            v.enabled = enabled.checked;
          };
          const pf = markets.map((m) => {
            const f = field(
              m.country + ' priemoka (' + m.currency + ')',
              v.prices[m.country] === undefined ? '' : v.prices[m.country] / 100,
              { type: 'number', min: 0, step: 0.01 },
            );
            f.input.oninput = () => {
              if (f.input.value === '') delete v.prices[m.country];
              else v.prices[m.country] = Math.round(Number(f.input.value) * 100);
            };
            return f.element;
          });
          const image = n(
            'select',
            {},
            n('option', { value: '' }, 'Pagrindinė nuotrauka'),
            p.content.images.map((m, i) => n('option', { value: m.id }, i + 1 + '. ' + m.alt)),
          );
          image.value = v.imageId ?? '';
          image.onchange = () => {
            if (image.value) v.imageId = image.value;
            else delete v.imageId;
          };
          const extra = field('Papildomas svoris (g)', v.extraWeightGrams ?? 0, {
            type: 'number',
            min: 0,
            max: 100000,
            step: 1,
          });
          extra.input.oninput = () => {
            v.extraWeightGrams = Number(extra.input.value);
          };
          const pw = field('Viso derinio svoris (g)', v.package?.weightGrams ?? '', {
              type: 'number',
              min: 1,
              max: 100000,
              step: 1,
            }),
            pd = [0, 1, 2].map((i) =>
              field(
                ['Derinio ilgis (cm)', 'Derinio plotis (cm)', 'Derinio aukštis (cm)'][i],
                v.package?.dimensionsMm[i] / 10 || '',
                { type: 'number', min: 0.1, max: 300, step: 0.1 },
              ),
            );
          const pack = () => {
            if (pw.input.value && pd.every((f) => f.input.value))
              v.package = {
                weightGrams: Number(pw.input.value),
                dimensionsMm: pd.map((f) => Math.round(Number(f.input.value) * 10)),
              };
            else delete v.package;
          };
          pw.input.oninput = pack;
          pd.forEach((f) => {
            f.input.oninput = pack;
          });
          const remove = n(
            'button',
            { type: 'button', class: 'secondary' },
            'Pašalinti pasirinkimą',
          );
          remove.onclick = () => {
            g.values = g.values.filter((x) => x !== v);
            if (g.defaultValue === v.id) g.defaultValue = g.values[0]?.id;
            mark();
            drawOptions();
          };
          values.append(
            n(
              'div',
              { class: 'catalog-option-value' },
              n(
                'div',
                { class: 'fields' },
                vi.element,
                vl.element,
                ...pf,
                n('label', {}, 'Nuotrauka', image),
              ),
              n('label', { class: 'check-field' }, enabled, 'Galima pasirinkti'),
              n(
                'details',
                {},
                n('summary', {}, 'Fizinio priedo pakuotė'),
                n(
                  'p',
                  { class: 'hint' },
                  'Papildomam svoriui reikia viso supakuoto derinio matmenų. Be jų palikite pasirinkimą neaktyvų.',
                ),
                n(
                  'div',
                  { class: 'fields' },
                  extra.element,
                  pw.element,
                  ...pd.map((f) => f.element),
                ),
              ),
              remove,
            ),
          );
        }
        const addValue = n('button', { type: 'button', class: 'secondary' }, 'Pridėti pasirinkimą'),
          remove = n('button', { type: 'button', class: 'secondary' }, 'Pašalinti grupę');
        addValue.onclick = () => {
          g.values.push({
            id: 'option_' + crypto.randomUUID().slice(0, 8),
            label: 'Naujas pasirinkimas',
            enabled: false,
            prices: { LT: 0 },
          });
          mark();
          drawOptions();
        };
        remove.onclick = () => {
          p.optionGroups = p.optionGroups.filter((x) => x !== g);
          for (const m of p.content.images) if (m.choices) delete m.choices[g.id];
          mark();
          drawImages();
          drawOptions();
        };
        options.append(
          group(
            g.label,
            n(
              'div',
              { class: 'fields' },
              gi.element,
              gl.element,
              n('label', {}, 'Numatytas pasirinkimas', def),
            ),
            values,
            n('div', { class: 'actions' }, addValue, remove),
          ),
        );
      }
    }
    add.onclick = () => {
      p.optionGroups.push({
        id: 'group_' + crypto.randomUUID().slice(0, 8),
        label: 'Nauja grupė',
        defaultValue: 'default',
        values: [{ id: 'default', label: 'Bazinis', enabled: true, prices: { LT: 0 } }],
      });
      mark();
      drawOptions();
    };
    colors.onclick = () => {
      if (p.optionGroups.some((g) => g.id === 'finish')) return;
      p.optionGroups.push({
        id: 'finish',
        label: 'Dažų spalva',
        defaultValue: 'white',
        values: [
          ['white', 'Balta', '#f7f5f1'],
          ['gold', 'Auksinė', '#cba34d'],
          ['graphite', 'Grafito', '#44464a'],
          ['bronze', 'Bronzinė', '#a57546'],
          ['antique_bronze', 'Antikinė bronza', '#6d5b3d'],
          ['copper', 'Vario', '#b66c48'],
        ].map(([id, label, color], i) => ({
          id,
          label,
          color,
          enabled: i === 0,
          prices: { LT: i === 0 ? 0 : 300 },
        })),
      });
      mark();
      drawOptions();
    };
    base.onclick = () => {
      if (p.optionGroups.some((g) => g.id === 'base')) return;
      p.optionGroups.push({
        id: 'base',
        label: 'Padėklas',
        defaultValue: 'none',
        values: [
          { id: 'none', label: 'Be padėklo', enabled: true, prices: { LT: 0 } },
          {
            id: 'wood',
            label: 'Medinis padėklas',
            enabled: Boolean(collect().package),
            prices: { LT: 1200 },
            extraWeightGrams: 300,
            ...(collect().package
              ? {
                  package: {
                    weightGrams: collect().package.weightGrams + 300,
                    dimensionsMm: collect().package.dimensionsMm.map(
                      (n, i) => n + (i === 2 ? 50 : 0),
                    ),
                  },
                }
              : {}),
          },
        ],
      });
      mark();
      drawOptions();
    };
    async function saveDraft() {
      if (!form.reportValidity()) return null;
      form.inert = true;
      try {
        const definition = collect(),
          saved = await api('/api/operator/catalog-drafts', {
            definition,
            basisHash: basis,
            draftHash: hash,
          });
        hash = saved.draftHash;
        dirty = false;
        status.textContent = 'Juodraštis išsaugotas. Dar nepaskelbtas.';
        return definition;
      } finally {
        form.inert = false;
      }
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      action(save, saveDraft, 'Juodraštis išsaugotas.');
    };
    publish.onclick = () =>
      action(
        publish,
        async () => {
          const definition = await saveDraft();
          if (!definition) return;
          await api('/api/operator/catalog-revisions', {
            id,
            basisHash: basis,
            draftHash: hash,
            definition,
          });
          dirty = false;
          root.replaceChildren();
          await ctx.reload();
        },
        'Pakeitimai paskelbti.',
      );
    preview.onclick = () => {
      if (!form.reportValidity()) return;
      const m = collect(),
        dialog = n('dialog', { class: 'catalog-preview' }),
        close = n('button', { type: 'button' }, 'Uždaryti'),
        image = n('img', { width: 560, height: 420, alt: '' }),
        amount = n('strong', {}),
        chosen = {};

      const update = () => {
        let total = m.prices[markets[0].country] ?? 0,
          pic = m.content.images[0];
        for (const g of m.optionGroups) {
          const v = g.values.find((v) => v.id === (chosen[g.id] ?? g.defaultValue));
          if (v) {
            total += v.prices[markets[0].country] ?? 0;
            if (v.imageId) pic = m.content.images.find((i) => i.id === v.imageId);
          }
        }
        amount.textContent = money(total, markets[0].currency);
        image.hidden = !pic;
        if (pic) {
          image.alt = pic.alt;
          setImage(image, pic);
        }
      };
      const controls = m.optionGroups.map((g) => {
        const input = n(
          'select',
          {},
          g.values.map((v) =>
            n('option', { value: v.id }, v.label + (v.enabled ? '' : ' (neaktyvus)')),
          ),
        );
        input.value = g.defaultValue;
        input.onchange = () => {
          chosen[g.id] = input.value;
          update();
        };
        return n('label', {}, g.label, input);
      });
      dialog.append(
        close,
        n('p', { class: 'hint' }, 'Juodraščio peržiūra — pirkėjams nerodoma.'),
        image,
        n('h2', {}, m.title),
        amount,
        n('p', {}, m.content.summary),
        ...controls,
        n('div', { class: 'catalog-copy' }, m.content.description),
        n('h3', {}, 'Komplektacija'),
        n('div', { class: 'catalog-copy' }, m.content.contents),
      );
      close.onclick = () => dialog.close();
      dialog.onclose = () => dialog.remove();
      area.append(dialog);
      update();
      dialog.showModal();
    };
    drawImages();
    drawOptions();
  }
  select.value = products[0]?.sku ?? '';
  select.dispatchEvent(new Event('change'));
}
