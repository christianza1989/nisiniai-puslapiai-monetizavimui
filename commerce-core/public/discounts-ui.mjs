import { confirmDiscard } from './operator-workspace.mjs';
const euros = (value) => (Number.isSafeInteger(value) ? (value / 100).toFixed(2) : '');
function cents(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return NaN;
  return Math.round(Number(text) * 100);
}
const localInput = (value) =>
  value === null || value === undefined
    ? ''
    : new Date(value - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export function discountStatus(item, now = Date.now()) {
  if (!item.enabled) return 'Išjungtas';
  if (item.endsAt !== null && item.endsAt <= now) return 'Pasibaigęs';
  if (item.startsAt !== null && item.startsAt > now) return 'Suplanuotas';
  if (item.maxUses !== null && item.uses >= item.maxUses) return 'Limitas pasiektas';
  return 'Aktyvus';
}
export async function renderDiscounts(content, ctx) {
  const { node: n, table, cell, api, action, has, money, date, setDirty } = ctx;
  if (!has('catalog')) {
    content.append(
      n('p', { class: 'empty' }, 'Nuolaidų valdymui reikia prekių ir kainų redagavimo teisės.'),
    );
    return;
  }
  let items = await api('/api/operator/discounts');
  if (!content.isConnected) return;
  let current = null,
    dirty = false,
    busy = false,
    commandId = crypto.randomUUID();
  const list = n('div', { class: 'discount-list' }),
    editor = n('section', { class: 'discount-editor', hidden: '' });
  const heading = n('h2', { tabindex: '-1' }, 'Naujas nuolaidos kodas'),
    form = n('form', { class: 'discount-form' }),
    fields = n('div', { class: 'fields' }),
    controls = {};
  const error = n('p', { class: 'inline-error', role: 'alert', hidden: '' });
  const mark = (value) => {
    dirty = value;
    if (content.isConnected) setDirty?.(value);
  };
  const add = (key, label, attrs = {}, tag = 'input') => {
    const input = n(tag, { id: 'discount-' + key, name: key, ...attrs });
    controls[key] = input;
    fields.append(n('label', { for: 'discount-' + key }, n('span', {}, label), input));
    return input;
  };
  add('code', 'Nuolaidos kodas', {
    type: 'text',
    required: '',
    minlength: '3',
    maxlength: '40',
    pattern: '[A-Za-z0-9][A-Za-z0-9_-]{2,39}',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': 'discount-code-hint',
  });
  const kind = add('kind', 'Nuolaidos tipas', {}, 'select');
  kind.append(
    n('option', { value: 'percent' }, 'Procentai (%)'),
    n('option', { value: 'fixed' }, 'Suma eurais (€)'),
  );
  const value = add('value', 'Nuolaidos dydis', {
    type: 'number',
    required: '',
    min: '1',
    max: '99',
    step: '1',
    inputmode: 'decimal',
  });
  add('minimum', 'Minimali prekių suma (€)', {
    type: 'number',
    min: '0',
    step: '.01',
    inputmode: 'decimal',
  });
  add('starts', 'Pradžia (jūsų vietos laiku)', { type: 'datetime-local' });
  add('ends', 'Pabaiga (jūsų vietos laiku)', { type: 'datetime-local' });
  add('maxUses', 'Naudojimų limitas', {
    type: 'number',
    min: '1',
    max: '1000000',
    step: '1',
    placeholder: 'Neribotas',
  });
  const enabled = n('input', { type: 'checkbox', id: 'discount-enabled', name: 'enabled' });
  controls.enabled = enabled;
  fields.append(
    n('label', { class: 'check-field', for: 'discount-enabled' }, enabled, 'Kodas įjungtas'),
  );
  const unitHint = n('p', { class: 'hint' }),
    save = n('button', { type: 'submit', class: 'primary' }, 'Sukurti kodą'),
    back = n('button', { type: 'button' }, 'Grįžti į nuolaidas');
  const generate = n('button', { type: 'button' }, 'Sugeneruoti kodą');
  const updateKind = () => {
    const percent = kind.value === 'percent';
    value.min = percent ? '1' : '.01';
    value.max = percent ? '99' : '1000000';
    value.step = percent ? '1' : '.01';
    unitHint.textContent = percent
      ? 'Įrašykite nuo 1 iki 99 %. Nuolaida taikoma prekių sumai.'
      : 'Įrašykite sumą eurais, pvz., 5 arba 10. Krepšelio prekių suma turi būti didesnė už šią nuolaidą.';
  };
  kind.addEventListener('change', updateKind);
  generate.addEventListener('click', () => {
    if (busy) return;
    controls.code.value = 'MC-' + crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
    mark(true);
  });
  const mayLeave = async () =>
    !dirty ||
    (await confirmDiscard('Šio nuolaidos kodo pakeitimai dar neišsaugoti. Ar juos atmesti?'));
  const open = async (item) => {
    if (busy || !(await mayLeave()) || !content.isConnected) return;
    current = item ? { ...item } : null;
    commandId = crypto.randomUUID();
    mark(false);
    error.hidden = true;
    heading.textContent = item ? 'Redaguoti kodą ' + item.code : 'Naujas nuolaidos kodas';
    save.textContent = item ? 'Išsaugoti pakeitimus' : 'Sukurti kodą';
    controls.code.value = item?.code ?? '';
    kind.value = item?.kind ?? 'percent';
    value.value = item ? (item.kind === 'percent' ? String(item.value) : euros(item.value)) : '';
    controls.minimum.value = euros(item?.minimumSubtotal ?? 0);
    controls.starts.value = localInput(item?.startsAt);
    controls.ends.value = localInput(item?.endsAt);
    controls.maxUses.value = item?.maxUses ?? '';
    enabled.checked = item?.enabled ?? true;
    updateKind();
    list.hidden = true;
    editor.hidden = false;
    heading.focus();
    editor.scrollIntoView({ block: 'start' });
  };
  back.addEventListener('click', async () => {
    if (busy || !(await mayLeave()) || !content.isConnected) return;
    mark(false);
    editor.hidden = true;
    list.hidden = false;
    create.focus();
  });
  form.addEventListener('input', () => {
    if (!busy) {
      mark(true);
      commandId = crypto.randomUUID();
      error.hidden = true;
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    error.hidden = true;
    const payload = {
      id: current?.id ?? crypto.randomUUID(),
      commandId,
      expectedVersion: current?.version ?? 0,
      code: controls.code.value.trim().toUpperCase(),
      kind: kind.value,
      value: kind.value === 'percent' ? Number(value.value) : cents(value.value),
      enabled: enabled.checked,
      minimumSubtotal: cents(controls.minimum.value || '0'),
      startsAt: controls.starts.value ? new Date(controls.starts.value).getTime() : null,
      endsAt: controls.ends.value ? new Date(controls.ends.value).getTime() : null,
      maxUses: controls.maxUses.value ? Number(controls.maxUses.value) : null,
    };
    if (
      payload.endsAt !== null &&
      payload.startsAt !== null &&
      payload.endsAt <= payload.startsAt
    ) {
      error.textContent = 'Pabaiga turi būti vėlesnė už pradžią.';
      error.hidden = false;
      controls.ends.focus();
      return;
    }
    // Preserve the new record identity as well as the command after a lost reply.
    if (!current) current = { id: payload.id, version: 0 };
    busy = true;
    for (const input of [...Object.values(controls), generate, back, create]) input.disabled = true;
    await action(
      save,
      async () => {
        const result = await api('/api/operator/discounts', payload);
        if (!content.isConnected) return false;
        current = result.discount;
        mark(false);
        commandId = crypto.randomUUID();
        items = await api('/api/operator/discounts');
        if (!content.isConnected) return false;
        renderList();
        editor.hidden = true;
        list.hidden = false;
        create.focus();
      },
      'Nuolaidos kodas išsaugotas.',
    );
    busy = false;
    for (const input of [...Object.values(controls), generate, back, create])
      input.disabled = false;
  });
  const create = n(
    'button',
    { type: 'button', class: 'primary', onclick: () => open(null) },
    'Sukurti nuolaidos kodą',
  );
  const renderList = () => {
    list.replaceChildren(n('div', { class: 'actions' }, create));
    list.append(
      n(
        'p',
        { class: 'hint' },
        'Vienas kodas vienam užsakymui. Nuolaida taikoma prekėms, pristatymas skaičiuojamas atskirai.',
      ),
    );
    if (!items.length) {
      list.append(
        n(
          'div',
          { class: 'empty' },
          n('h2', {}, 'Nuolaidų kodų dar nėra'),
          n('p', {}, 'Sukurkite procentinę nuolaidą arba nustatykite sumą eurais.'),
        ),
      );
      return;
    }
    list.append(
      table(
        ['Kodas', 'Nuolaida', 'Būsena', 'Panaudojimai', 'Galiojimas', 'Veiksmas'],
        items.map((item) => {
          const status = discountStatus(item);
          return n(
            'tr',
            {},
            cell(n('strong', {}, item.code), 'Kodas'),
            cell(
              item.kind === 'percent' ? item.value + ' %' : money(item.value, 'EUR'),
              'Nuolaida',
            ),
            cell(
              n('span', { class: 'badge ' + (status === 'Aktyvus' ? 'success' : '') }, status),
              'Būsena',
            ),
            cell(
              item.uses + (item.maxUses === null ? ' / neribota' : ' / ' + item.maxUses),
              'Panaudojimai',
            ),
            cell(item.endsAt ? date(item.endsAt) : 'Be pabaigos datos', 'Galiojimas'),
            cell(
              n(
                'button',
                {
                  type: 'button',
                  onclick: () => open(item),
                  'aria-label': 'Redaguoti kodą ' + item.code,
                },
                'Redaguoti',
              ),
              'Veiksmas',
            ),
          );
        }),
      ),
    );
  };
  form.append(
    fields,
    n(
      'p',
      { class: 'hint', id: 'discount-code-hint' },
      'Naudokite 3–40 raidžių A–Z, skaitmenis, brūkšnelį arba pabraukimą. Didžiosios ir mažosios raidės nesiskiria.',
    ),
    generate,
    unitHint,
    n(
      'p',
      { class: 'hint' },
      'Naudojimas skaičiuojamas sukūrus užsakymą, įskaitant dar neapmokėtus. Be limito kodas galios neribotam užsakymų skaičiui. Datos neprivalomos. Pakeitimai netaikomi jau išsaugotiems užsakymams.',
    ),
    error,
    n('div', { class: 'actions' }, save, back),
  );
  editor.append(heading, form);
  renderList();
  content.append(list, editor);
}
