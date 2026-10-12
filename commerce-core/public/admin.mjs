import { renderBackoffice } from './backoffice-ui.mjs';
import { renderShipping } from './shipping-ui.mjs';
import { renderPrivateFiles } from './private-files-ui.mjs';
const $ = (selector) => document.querySelector(selector);
const state = {
  token: '',
  data: null,
  view: 'orders',
  order: null,
  document: null,
  stock: null,
  refundDraft: null,
};
const titles = {
  orders: 'Užsakymai',
  stock: 'Likučiai',
  documents: 'Dokumentai',
  components: 'Medžiagos',
  financials: 'Sutikrinimas',
  wholesale: 'Didmena',
};
const paymentNames = {
  pending: 'Laukia mokėjimo',
  paid: 'Apmokėta',
  failed: 'Mokėjimas nepavyko',
  partially_refunded: 'Dalis sumos grąžinta',
  refunded: 'Suma grąžinta',
};
const fulfillmentNames = {
  pending: 'Laukia komplektavimo',
  ready: 'Sukomplektuota',
  labelled: 'Siunta užregistruota',
  stock_exception: 'Trūksta prekių',
};
const kinds = {
  sale: 'Pardavimo įrašas',
  credit: 'Grąžinimo įrašas',
  packing: 'Komplektavimo lapas',
};
const errorNames = {
  file_too_large: 'Pasirinkite PDF failą iki 2 MB.',
  invalid_private_file: 'Failas turi būti PDF dokumentas iki 2 MB.',
  private_storage_missing: 'Privati failų saugykla neprijungta.',
  private_file_integrity_failed: 'Failo kontrolinė suma nesutampa. Patikrinkite saugyklą.',
  invalid_shipping_plan: 'Pasirinkite siuntėjo vietą ir patikrinkite gavėjo bei pakuotės duomenis.',
  invalid_shipping_origin:
    'Įrašykite miestą, penkių skaitmenų Lietuvos pašto kodą ir vietos patvirtinimo paaiškinimą.',
  invalid_parcel_dimensions: 'Įrašykite teigiamą svorį ir visus tris tikrus dėžės matmenis.',
  invalid_parcel_measurement: 'Įrašykite tikrus matavimus ir bent 3 simbolių jų paaiškinimą.',
  shipping_plan_not_allowed:
    'Pakuotės planui reikia apmokėto užsakymo su paskirtomis prekėmis. Atnaujinkite užsakymą.',
  shipment_customer_missing:
    'Užsakyme trūksta pristatymo adreso. Pirma išspręskite gavėjo duomenis.',
  carrier_quotes_not_connected: 'Vežėjo kainų API neprijungta. Pakuotės planas išsaugotas.',
  carrier_currency_not_supported:
    'Šis kainų adapteris palaiko EUR. Reikia atskiros valiutos tvarkymo politikos.',
  carrier_request_failed: 'Vežėjas nepriėmė užklausos. Patikrinkite bandymų prieigą.',
  carrier_transport_failed: 'Vežėjas neatsakė. Pakartokite tą pačią kainų užklausą.',
  carrier_offer_invalid: 'Vežėjo kainų duomenys neatitinka sutarties. Pasiūlymas neišsaugotas.',
  invalid_refund_command: 'Įrašykite teigiamą sumą ir bent 3 simbolių priežastį.',
  refund_budget_conflict:
    'Ši suma viršija likusią grąžintiną sumą. Atnaujinkite užsakymą ir patikrinkite jau paruoštas užduotis.',
  refund_command_conflict:
    'Ši užduotis jau išsaugota su kitais duomenimis. Atnaujinkite užsakymą prieš naują veiksmą.',
  refund_execution_busy: 'Grąžinimas jau vykdomas. Palaukite ir atnaujinkite užsakymą.',
  refund_cancel_conflict:
    'Užduotis jau vykdyta arba jos būsena pasikeitė. Patikrinkite Stripe rezultatą; šios užduoties atšaukti nebegalima.',
  refund_provider_not_connected: 'Stripe bandymų aplinka neprijungta. Paruošta užduotis išsaugota.',
  refund_execution_not_admitted: 'Šioje aplinkoje grąžinimų vykdymas dar nepatvirtintas.',
  refund_order_unpaid: 'Grąžinimą galima paruošti tik patvirtinus mokėjimą.',
  lot_state_conflict:
    'Partijos likutis arba būsena pasikeitė. Atnaujinkite sąrašą, patikrinkite kiekį ir pradėkite naują veiksmą.',
  invalid_lot_control: 'Likučio korekcijai įrašykite kitą kiekį ir bent 3 simbolių priežastį.',
  lot_not_found: 'Partija nerasta. Atnaujinkite partijų sąrašą.',
  component_stock_conflict:
    'Nepakanka tinkamų medžiagų arba likutis pasikeitė. Patikrinkite likučius, galiojimą ir karantino būseną.',
  invalid_recipe: 'Rinkinio sudėčiai pasirinkite bent vieną medžiagą ir įrašykite teigiamą kiekį.',
  financial_source_conflict:
    'Šaltinio ID jau įrašytas su kitais duomenimis. Originalas išsaugotas; patikrinkite šaltinį.',
  financial_sign_invalid:
    'Mokėjimo suma turi būti teigiama, grąžinimo, komisinio ir išmokos — neigiama.',
  reconciliation_facts_mismatch:
    'Šaltinio suma, valiuta arba mokėjimo ID nesutampa su patvirtintu įrašu.',
  transfer_facts_mismatch: 'Išmokos ir banko sumos, valiutos arba išmokos ID nesutampa.',
  wholesale_quantity_invalid: 'Kiekis neatitinka partnerio kainyno minimumo arba pakuotės kiekio.',
  invalid_price_list: 'Įrašykite kainyno žymenį ir bent vienos prekės teigiamą kainą.',
  invalid_wholesale_price:
    'Kaina turi būti teigiama, o minimalus kiekis — pakuotės kiekio kartotinis.',
  partner_state_conflict: 'Partnerio būsena jau pasikeitė. Atnaujinkite sąrašą prieš kitą veiksmą.',
  partner_not_approved: 'Partnerio prekyba nepatvirtinta arba sustabdyta. Patikrinkite jo būseną.',
  partner_price_list_mismatch:
    'Partnerio valiuta nesutampa su kainynu. Pasirinkite tinkamą rinką ir kainyną.',
  stock_unavailable:
    'Nepakanka paruoštų rinkinių. Patikrinkite likutį ir surinkite trūkstamas prekes.',
  record_conflict:
    'Šis veiksmo ID jau įrašytas su kitais duomenimis. Atnaujinkite duomenis prieš naują veiksmą.',
  operator_forbidden:
    'Prieiga nesuteikta arba žetonas nebegalioja. Patikrinkite operatoriaus teises ir prisijunkite iš naujo.',
  stock_adjustment_conflict:
    'Nepakanka laisvų prekių arba likutis pasikeitė. Patikrinkite likutį ir korekcijos kiekį.',
  stock_adjustment_id_conflict:
    'Ši korekcija jau išsaugota su kitais duomenimis. Atnaujinkite sąrašą ir pradėkite naują korekciją.',
  invalid_stock_adjustment: 'Įveskite nenulinį sveiką kiekį ir bent 3 simbolių priežastį.',
  shipping_not_connected:
    'Vežėjas dar neprijungtas. Užsakymas išsaugotas; siuntų registravimas bus aktyvuotas prijungus API.',
  shipping_not_allowed: 'Siuntą galima registruoti tik apmokėtam ir sukomplektuotam užsakymui.',
  packing_not_allowed: 'Komplektavimas dabar negalimas. Atnaujinkite užsakymo būseną.',
  document_order_unpaid: 'Dokumentą galima suformuoti tik patvirtinus mokėjimą.',
  original_document_required: 'Pirma suformuokite pradinį pardavimo įrašą, tada grąžinimo įrašą.',
  document_stock_exception: 'Komplektavimo lapui trūksta rezervuotų prekių. Patikrinkite likučius.',
  operation_failed: 'Veiksmas nepavyko. Atnaujinkite duomenis ir bandykite dar kartą.',
  network:
    'Nepavyko gauti serverio atsakymo. Atkurkite ryšį ir pakartokite tą patį veiksmą — jo identifikatorius išlaikytas.',
};
function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (key === 'class') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key === 'value') element.value = value;
    else if (key === 'disabled') element.disabled = value;
    else element.setAttribute(key, value);
  }
  for (const child of children.flat())
    if (child !== null && child !== undefined)
      element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}
const money = (amount, currency) =>
  new Intl.NumberFormat('lt-LT', { style: 'currency', currency }).format(amount / 100);
const date = (value) =>
  new Intl.DateTimeFormat('lt-LT', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
const has = (grant) => state.data?.permissions.includes(grant);
function status(message = '', kind = '') {
  $('#status').textContent = message;
  $('#status').className = 'status ' + kind;
  $('#status').setAttribute('role', kind === 'error' ? 'alert' : 'status');
}
async function api(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: 'Bearer ' + state.token, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('network');
  }
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'operation_failed');
  return value;
}
async function binary(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { ...options.headers, authorization: 'Bearer ' + state.token },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('network');
  }
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new Error(value.error || 'operation_failed');
  }
  return options.method === 'POST' ? response.json() : response.blob();
}
async function action(button, task, message) {
  button.disabled = true;
  $('#content').setAttribute('aria-busy', 'true');
  status('Išsaugoma…', 'busy');
  try {
    await task();
    status(message);
  } catch (error) {
    status(
      errorNames[error.message] ||
        'Veiksmas nepavyko. Patikrinkite duomenis ir bandykite dar kartą.',
      'error',
    );
  } finally {
    button.disabled = false;
    $('#content').setAttribute('aria-busy', 'false');
  }
}
async function reload() {
  state.data = await api('/api/operator/overview');
  if (state.order) state.order = await api('/api/operator/orders/' + state.order.order.id);
  $('#store-name').textContent = state.data.legalName;
  const c = state.data.counts;
  $('#summary').textContent =
    `Iš viso: ${c.total} · Laukia mokėjimo: ${c.pending} · Vykdomi: ${c.to_pack} · Trūksta prekių: ${c.exceptions}`;
  await render();
}
function badge(order) {
  return node(
    'span',
    {
      class:
        'badge ' +
        (order.payment_state === 'paid'
          ? 'success'
          : order.payment_state === 'pending'
            ? 'warning'
            : ''),
    },
    paymentNames[order.payment_state] || order.payment_state,
  );
}
function cell(value, label, extra = '') {
  return node('td', { ...(label ? { 'data-label': label } : {}), class: extra }, value);
}
function table(headers, rows, extra = '') {
  return node(
    'table',
    { class: 'table ' + extra },
    node(
      'thead',
      {},
      node(
        'tr',
        {},
        headers.map((h) => node('th', { scope: 'col' }, h)),
      ),
    ),
    node('tbody', {}, rows),
  );
}
function orderLabel(order) {
  return order.id.slice(0, 8).toUpperCase();
}
function render() {
  $('#view-title').textContent = titles[state.view];
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  const content = $('#content');
  content.replaceChildren();
  if (state.view === 'orders') renderOrders(content);
  if (state.view === 'stock') renderStock(content);
  if (state.view === 'documents') renderDocuments(content);
  if (['components', 'financials', 'wholesale'].includes(state.view)) {
    const panel = node('div');
    content.append(panel);
    return renderBackoffice(panel, state.view, {
      node,
      table,
      cell,
      api,
      action,
      has,
      money,
      date,
      reload,
      focusView: () => $('#view-title').focus(),
      catalog: state.data.catalog,
    }).catch((error) => {
      if (!panel.isConnected) return;
      panel.replaceChildren(node('p', { class: 'empty' }, 'Duomenų įkelti nepavyko.'));
      status(errorNames[error.message] || 'Nepavyko gauti duomenų. Atnaujinkite puslapį.', 'error');
    });
  }
}
function renderOrders(content) {
  if (state.order) {
    renderOrder(content, state.order);
    return;
  }
  const orders = state.data.orders;
  content.append(
    node('p', { class: 'hint' }, `Užsakymai: ${orders.length} iš ${state.data.counts.total}.`),
  );
  if (!orders.length) {
    content.append(
      node(
        'p',
        { class: 'empty' },
        'Užsakymų dar nėra. Kai pirkėjas sukurs užsakymą, čia matysite jo mokėjimą ir vykdymo būseną. Vietinius testinius įrašus galite sukurti komanda npm run demo:seed.',
      ),
    );
    return;
  }
  content.append(
    table(
      ['Užsakymas', 'Pirkėjas', 'Mokėjimas', 'Vykdymas', 'Suma'],
      orders.map((o) =>
        node(
          'tr',
          {},
          cell(
            node(
              'div',
              {},
              node(
                'button',
                { type: 'button', class: 'link', onclick: () => openOrder(o.id) },
                orderLabel(o),
              ),
              node('span', { class: 'secondary' }, date(o.created_at)),
            ),
            null,
          ),
          cell(o.snapshot.customer?.name || 'Kontaktai nepateikti', 'Pirkėjas'),
          cell(badge(o), 'Mokėjimas'),
          cell(fulfillmentNames[o.fulfillment_state] || o.fulfillment_state, 'Vykdymas'),
          cell(money(o.amount, o.currency), 'Suma', 'money'),
        ),
      ),
    ),
  );
  renderOlderOrders(content);
}
function renderOlderOrders(content) {
  if (!state.data.nextOrderCursor) return;
  const button = node(
    'button',
    { type: 'button', onclick: () => loadOlder(button) },
    'Įkelti senesnius užsakymus',
  );
  content.append(node('div', { class: 'actions' }, button));
}
function renderRefundExceptions(content) {
  if (state.data.pendingRefundEvents)
    content.append(
      node(
        'p',
        { class: 'notice' },
        `${state.data.pendingRefundEvents} grąžinimo įvykių laukia atitinkamo mokėjimo duomenų.`,
      ),
    );
  const rows = state.data.refundExceptions;
  if (!rows.length) return;
  const reasons = {
    provider_refund_failed: 'Tiekėjas pranešė, kad grąžinimas nepavyko',
    provider_refund_canceled: 'Tiekėjas atšaukė grąžinimą',
    provider_facts_conflict: 'Tiekėjo įvykiai prieštarauja vienas kitam',
    refund_currency_mismatch: 'Nesutampa valiuta',
    refund_invalid: 'Suma nesutampa su mokėjimu',
    refund_conflict: 'Nesutampa grąžinimo šaltinis',
  };
  content.append(
    node('h2', {}, 'Grąžinimų išimtys'),
    node(
      'p',
      { class: 'hint' },
      'Šiems įvykiams reikia apskaitos peržiūros. Išsaugoti mokėjimo ir grąžinimo įrašai nepakeičiami automatiškai.',
    ),
    table(
      ['Grąžinimas', 'Priežastis', 'Gauta'],
      rows.map((r) =>
        node(
          'tr',
          {},
          cell(r.provider_id),
          cell(reasons[r.reason] || r.reason, 'Priežastis'),
          cell(date(r.created_at), 'Gauta'),
        ),
      ),
    ),
  );
}
async function loadOlder(button) {
  await action(
    button,
    async () => {
      const page = await api(
        '/api/operator/orders?' + new URLSearchParams(state.data.nextOrderCursor),
      );
      state.data.orders.push(...page.orders);
      state.data.nextOrderCursor = page.nextCursor;
      render();
    },
    'Senesni užsakymai įkelti.',
  );
}
async function openOrder(id) {
  status('Įkeliamas užsakymas…', 'busy');
  try {
    state.order = await api('/api/operator/orders/' + id);
    if (state.refundDraft?.orderId !== id) state.refundDraft = null;
    state.view = 'orders';
    render();
    status();
    $('#order-heading')?.focus();
  } catch (error) {
    status(errorNames[error.message] || 'Užsakymo nepavyko įkelti. Atnaujinkite sąrašą.', 'error');
  }
}
function renderOrder(content, detail) {
  const o = detail.order,
    c = o.snapshot.customer;
  content.append(
    node(
      'button',
      {
        type: 'button',
        id: 'back',
        onclick: () => {
          state.order = null;
          render();
        },
      },
      'Grįžti į užsakymus',
    ),
  );
  content.append(
    node(
      'div',
      { class: 'detail-head' },
      node('h2', { id: 'order-heading', tabindex: '-1' }, 'Užsakymas ' + orderLabel(o)),
      badge(o),
    ),
  );
  const pairs = [
    ['Sukurta', date(o.created_at)],
    ['Vykdymas', fulfillmentNames[o.fulfillment_state] || o.fulfillment_state],
    ['Pristatymas', o.snapshot.delivery.label],
    ['Suma', money(o.amount, o.currency)],
    ['Pirkėjas', c?.name || 'Kontaktai nepateikti'],
  ];
  if (c)
    pairs.push(
      ['El. paštas', c.email],
      ['Telefonas', c.phone],
      [
        'Adresas',
        `${c.address.line1}${c.address.line2 ? ', ' + c.address.line2 : ''}, ${c.address.postalCode} ${c.address.city}, ${c.address.country}`,
      ],
    );
  if (c?.locker) pairs.push(['Paštomatas', c.locker.label]);
  if (o.refunded_amount) pairs.push(['Grąžinta suma', money(o.refunded_amount, o.currency)]);
  content.append(
    node(
      'dl',
      {},
      pairs.flatMap(([k, v]) => [node('dt', {}, k), node('dd', {}, v)]),
    ),
  );
  content.append(
    node('h3', {}, 'Prekės'),
    table(
      ['Prekė', 'Kiekis', 'Suma'],
      o.snapshot.lines.map((l) =>
        node(
          'tr',
          {},
          cell(l.title),
          cell(l.quantity),
          cell(money(l.lineAmount, o.currency), null, 'money'),
        ),
      ),
      'line-items',
    ),
  );
  const actions = node('div', { class: 'actions' });
  const pack = node(
    'button',
    {
      type: 'button',
      disabled: !(
        has('pack') &&
        o.payment_state === 'paid' &&
        o.stock_state === 'allocated' &&
        o.fulfillment_state === 'pending'
      ),
    },
    o.fulfillment_state === 'ready' ? 'Sukomplektuota' : 'Patvirtinti komplektavimą',
  );
  pack.addEventListener('click', () =>
    action(
      pack,
      async () => {
        await api('/api/operator/orders/' + o.id + '/pack', {});
        await reload();
        await openOrder(o.id);
      },
      'Komplektavimas patvirtintas.',
    ),
  );
  actions.append(pack);
  const ship = node(
    'button',
    {
      type: 'button',
      disabled: !(
        has('ship') &&
        state.data.integrations.shipping &&
        o.fulfillment_state === 'ready' &&
        o.payment_state === 'paid'
      ),
    },
    'Registruoti siuntą',
  );
  ship.addEventListener('click', () =>
    action(
      ship,
      async () => {
        await api('/api/operator/orders/' + o.id + '/ship', {});
        await reload();
        await openOrder(o.id);
      },
      'Siunta užregistruota.',
    ),
  );
  actions.append(ship);
  content.append(actions);
  if (!state.data.integrations.shipping)
    content.append(
      node('p', { class: 'hint' }, 'Siuntų registravimas bus aktyvus prijungus vežėjo API.'),
    );
  content.append(node('h2', {}, 'Užsakymo dokumentai'));
  const docActions = node('div', { class: 'actions' });
  for (const kind of ['sale', 'packing']) {
    const b = node(
      'button',
      {
        type: 'button',
        disabled:
          !has('document') || !['paid', 'partially_refunded', 'refunded'].includes(o.payment_state),
      },
      kind === 'sale' ? 'Suformuoti pardavimo įrašą' : 'Suformuoti komplektavimo lapą',
    );
    b.addEventListener('click', () =>
      action(
        b,
        async () => {
          const r = await api('/api/operator/orders/' + o.id + '/documents', { kind });
          state.document = r.document;
          await reload();
          await openOrder(o.id);
        },
        'Testinis dokumentas išsaugotas.',
      ),
    );
    docActions.append(b);
  }
  for (const refund of detail.refunds) {
    const b = node(
      'button',
      { type: 'button', disabled: !has('document') },
      'Grąžinimo įrašas: ' + money(refund.amount, o.currency),
    );
    b.addEventListener('click', () =>
      action(
        b,
        async () => {
          await api('/api/operator/orders/' + o.id + '/documents', {
            kind: 'credit',
            refundId: refund.provider_id,
          });
          await reload();
          await openOrder(o.id);
        },
        'Testinis grąžinimo įrašas išsaugotas.',
      ),
    );
    docActions.append(b);
  }
  content.append(docActions);
  if (!detail.documents.length)
    content.append(node('p', { class: 'empty' }, 'Šiam užsakymui dar nesuformuota dokumentų.'));
  else content.append(documentTable(detail.documents));
  if (detail.shippingPreparation)
    renderShipping(content, detail, {
      node,
      table,
      cell,
      api,
      action,
      has,
      money,
      date,
      reload,
      integrations: state.data.integrations,
    });
  renderRefunds(content, detail);
  renderPrivateFiles(content, detail, { node, table, cell, action, has, binary, reload, date });
}
function renderRefunds(content, detail) {
  const o = detail.order,
    commands = detail.refundCommands || [];
  const held = commands
    .filter((c) => !c.accounted && c.state !== 'failed')
    .reduce((sum, c) => sum + c.amount, 0);
  const remaining = Math.max(0, o.amount - o.refunded_amount - held);
  const names = {
    planned: 'Paruošta',
    submitting: 'Vykdoma',
    unknown: 'Atsakymas negautas',
    pending: 'Laukia Stripe',
    succeeded: 'Grąžinta',
    failed: 'Nepavyko',
    review: 'Reikia patikros',
  };
  const reviews = {
    provider_response_unknown: 'Stripe atsakymas negautas. Pakartojimas naudos tą pačią užduotį.',
    provider_result_unknown:
      'Rezultatas nepatvirtintas. Naujas grąžinimas nesiunčiamas; patikrinkite jį Stripe paskyroje.',
    provider_search_incomplete:
      'Stripe paieška neužbaigta. Patikrinkite rezultatą prieš kitą veiksmą.',
    provider_facts_mismatch:
      'Stripe mokėjimo, sumos arba valiutos duomenys nesutampa su užduotimi.',
    provider_facts_conflict:
      'Gauti prieštaringi Stripe grąžinimo duomenys. Reikia operatoriaus patikros.',
    refund_confirmation_pending:
      'Stripe rezultatas išsaugotas. Pakartokite patikrą vietiniam įrašui užbaigti.',
    refund_budget_changed: 'Likusi grąžintina suma pasikeitė. Patikrinkite kitus grąžinimus.',
  };
  content.append(
    node('h2', {}, 'Pinigų grąžinimas'),
    node(
      'p',
      { class: 'hint' },
      `Galima paruošti: ${money(remaining, o.currency)}. Jau paruoštų užduočių sumos rezervuotos.`,
    ),
  );
  if (!commands.length)
    content.append(node('p', { class: 'empty' }, 'Grąžinimo užduočių dar nėra.'));
  else
    content.append(
      table(
        ['Suma', 'Priežastis', 'Būsena', 'Veiksmas'],
        commands.map((c) => {
          const run = node(
            'button',
            {
              type: 'button',
              disabled:
                !has('refund') ||
                !state.data.integrations.refunds ||
                ['succeeded', 'failed'].includes(c.state),
            },
            c.review_reason === 'canceled_before_submission'
              ? 'Atšaukta prieš vykdymą'
              : c.state === 'succeeded'
                ? 'Grąžinta'
                : c.state === 'failed'
                  ? 'Grąžinimas nepavyko'
                  : c.state === 'planned'
                    ? 'Vykdyti bandomąjį grąžinimą'
                    : ['unknown', 'submitting'].includes(c.state)
                      ? 'Pakartoti tą pačią užduotį'
                      : 'Patikrinti Stripe rezultatą',
          );
          run.addEventListener('click', () =>
            action(
              run,
              async () => {
                await api('/api/operator/refund-commands/' + c.id + '/execute', {});
                await reload();
                await openOrder(o.id);
              },
              'Grąžinimo būsena atnaujinta. Patikrinkite rezultatą lentelėje.',
            ),
          );
          const actions = node('div', { class: 'actions' }, run);
          if (c.state === 'planned' && !c.first_attempt_at) {
            const cancel = node(
              'button',
              { type: 'button', disabled: !has('refund') },
              'Atšaukti užduotį',
            );
            cancel.addEventListener('click', () =>
              action(
                cancel,
                async () => {
                  await api('/api/operator/refund-commands/' + c.id + '/cancel', {});
                  await reload();
                },
                'Užduotis atšaukta. Stripe veiksmas neatliktas.',
              ),
            );
            actions.append(cancel);
          }
          return node(
            'tr',
            {},
            cell(money(c.amount, o.currency), 'Suma', 'money'),
            cell(c.reason, 'Priežastis'),
            cell(
              node(
                'div',
                {},
                c.review_reason === 'canceled_before_submission'
                  ? 'Atšaukta'
                  : names[c.state] || c.state,
                reviews[c.review_reason]
                  ? node('p', { class: 'hint' }, reviews[c.review_reason])
                  : null,
              ),
              'Būsena',
            ),
            cell(actions, 'Veiksmas'),
          );
        }),
      ),
    );
  if (!state.data.testOnly || state.data.environment !== 'sandbox') return;
  content.append(
    node(
      'p',
      { class: 'hint' },
      state.data.integrations.refunds
        ? 'Vykdomi tik bandomieji Stripe grąžinimai. Pinigai nepervedami.'
        : 'Stripe bandymų aplinka neprijungta. Galite paruošti užduotį; vykdymas bus aktyvus prijungus ją.',
    ),
  );
  if (!has('refund') || !['paid', 'partially_refunded'].includes(o.payment_state) || remaining < 1)
    return;
  const draft =
    state.refundDraft || (state.refundDraft = { id: crypto.randomUUID(), orderId: o.id });
  const amount = node('input', {
    id: 'refund-amount',
    name: 'amount',
    type: 'number',
    min: '0.01',
    step: '0.01',
    max: remaining / 100,
    required: 'required',
    value: draft.amount || '',
  });
  const reason = node('input', {
    id: 'refund-reason',
    name: 'reason',
    type: 'text',
    minlength: '3',
    maxlength: '160',
    required: 'required',
    value: draft.reason || '',
  });
  amount.addEventListener('input', () => {
    draft.amount = amount.value;
  });
  reason.addEventListener('input', () => {
    draft.reason = reason.value;
  });
  const submit = node('button', { type: 'submit' }, 'Paruošti grąžinimo užduotį');
  const form = node(
    'form',
    { class: 'stock-form' },
    node('h3', {}, 'Nauja grąžinimo užduotis'),
    node(
      'div',
      { class: 'fields' },
      node('label', { for: 'refund-amount' }, 'Suma (' + o.currency + ')', amount),
      node('label', { for: 'refund-reason' }, 'Priežastis', reason),
    ),
    node('div', { class: 'actions' }, submit),
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      submit,
      async () => {
        const cents = Math.round(Number(amount.value) * 100);
        if (!Number.isSafeInteger(cents) || cents < 1) throw new Error('invalid_refund_command');
        await api('/api/operator/orders/' + o.id + '/refund-commands', {
          id: draft.id,
          amount: cents,
          reason: reason.value,
        });
        state.refundDraft = null;
        await reload();
        await openOrder(o.id);
      },
      'Grąžinimo užduotis paruošta. Stripe veiksmas dar neatliktas.',
    );
  });
  content.append(form);
}
function renderStock(content) {
  const rows = state.data.catalog;
  content.append(
    node(
      'p',
      { class: 'hint' },
      'Laisvas likutis neapima rezervuotų ir apmokėtų prekių. Korekcijai nurodykite kiekio pokytį bei priežastį.',
    ),
  );
  content.append(
    table(
      ['Prekė', 'SKU', 'Laisvas likutis', 'Veiksmas'],
      rows.map((p) =>
        node(
          'tr',
          {},
          cell(p.title),
          cell(p.sku, 'SKU'),
          cell(p.available, 'Laisvas likutis'),
          cell(
            node(
              'button',
              {
                type: 'button',
                disabled: !has('stock'),
                'data-stock-sku': p.sku,
                onclick: () => {
                  status();
                  state.stock = {
                    id: crypto.randomUUID(),
                    sku: p.sku,
                    expectedAvailable: p.available,
                  };
                  render();
                  $('#delta').focus();
                },
              },
              'Koreguoti',
            ),
          ),
        ),
      ),
    ),
  );
  if (state.stock) {
    const draft = state.stock,
      p = rows.find((r) => r.sku === draft.sku);
    const form = node(
      'form',
      { class: 'stock-form' },
      node('h2', {}, 'Korekcija: ' + p.title),
      node('p', { class: 'hint' }, `Peržiūrėtas laisvas likutis: ${draft.expectedAvailable}.`),
      node(
        'div',
        { class: 'fields' },
        node(
          'div',
          {},
          node('label', { for: 'delta' }, 'Kiekio pokytis'),
          node('input', {
            id: 'delta',
            name: 'delta',
            type: 'number',
            step: '1',
            min: '-100000',
            max: '100000',
            required: '',
            value: draft.delta ?? '',
          }),
        ),
        node(
          'div',
          {},
          node('label', { for: 'reason' }, 'Priežastis'),
          node('input', {
            id: 'reason',
            name: 'reason',
            minlength: '3',
            maxlength: '200',
            required: '',
            value: draft.reason ?? '',
          }),
        ),
      ),
      node(
        'p',
        { class: 'hint' },
        'Teigiamas kiekis padidina likutį, neigiamas — sumažina. Pavyzdžiui, 5 arba −2.',
      ),
      node(
        'div',
        { class: 'actions' },
        node('button', { type: 'submit', class: 'primary' }, 'Išsaugoti korekciją'),
        node(
          'button',
          {
            type: 'button',
            onclick: () => {
              state.stock = null;
              render();
              status();
              document.querySelector('[data-stock-sku="' + draft.sku + '"]')?.focus();
            },
          },
          'Atšaukti',
        ),
      ),
    );
    form.addEventListener('input', () => {
      draft.delta = form.elements.delta.value;
      draft.reason = form.elements.reason.value;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('[type=submit]');
      action(
        button,
        async () => {
          await api('/api/operator/stock-adjustments', {
            ...draft,
            delta: Number(form.elements.delta.value),
            reason: form.elements.reason.value,
          });
          state.stock = null;
          await reload();
        },
        'Likučio korekcija išsaugota.',
      );
    });
    content.append(form);
  }
  content.append(node('h2', {}, 'Korekcijų istorija'));
  if (!state.data.adjustments.length)
    content.append(node('p', { class: 'empty' }, 'Likučių korekcijų dar nėra.'));
  else
    content.append(
      table(
        ['Laikas', 'SKU', 'Pokytis', 'Priežastis'],
        state.data.adjustments.map((a) =>
          node(
            'tr',
            {},
            cell(date(a.created_at)),
            cell(a.sku, 'SKU'),
            cell((a.delta > 0 ? '+' : '') + a.delta, 'Pokytis'),
            cell(a.reason, 'Priežastis'),
          ),
        ),
      ),
    );
}
function documentTable(documents) {
  return table(
    ['Numeris', 'Tipas', 'Užsakymas', 'Data'],
    documents.map((d) =>
      node(
        'tr',
        {},
        cell(
          node(
            'button',
            { type: 'button', class: 'link', onclick: () => openDocument(d.id) },
            d.numberLabel,
          ),
        ),
        cell(kinds[d.kind], 'Tipas'),
        cell(d.order_id.slice(0, 8).toUpperCase(), 'Užsakymas'),
        cell(date(d.created_at), 'Data'),
      ),
    ),
  );
}
async function openDocument(id) {
  try {
    state.document = await api('/api/operator/documents/' + id);
    state.view = 'documents';
    render();
    status();
    $('#document-heading')?.focus();
  } catch (error) {
    status(errorNames[error.message] || 'Dokumento nepavyko įkelti. Bandykite dar kartą.', 'error');
  }
}
function renderDocuments(content) {
  if (!state.document) {
    renderRefundExceptions(content);
    content.append(
      node(
        'p',
        { class: 'hint' },
        'Testinių dokumentų numeracija išsaugoma serveryje. Vienam šaltiniui pakartojus veiksmą grąžinamas tas pats dokumentas.',
      ),
    );
    if (!state.data.documents.length)
      content.append(
        node(
          'p',
          { class: 'empty' },
          'Dokumentų dar nėra. Atidarykite apmokėtą užsakymą ir suformuokite testinį pardavimo įrašą.',
        ),
      );
    else content.append(documentTable(state.data.documents));
    return;
  }
  const d = state.document,
    p = d.payload;
  content.append(
    node(
      'button',
      {
        type: 'button',
        id: 'back',
        onclick: () => {
          state.document = null;
          render();
        },
      },
      'Grįžti į dokumentus',
    ),
  );
  const article = node(
    'article',
    { class: 'document' },
    node('h2', { id: 'document-heading', tabindex: '-1' }, d.numberLabel),
    node('p', {}, (p.internalTestDocument ? 'TESTINIS VIDAUS DOKUMENTAS · ' : '') + kinds[d.kind]),
    node(
      'dl',
      {},
      node('dt', {}, 'Pardavėjas'),
      node('dd', {}, p.legal.name),
      node('dt', {}, 'Data'),
      node('dd', {}, date(d.created_at)),
      node('dt', {}, 'Užsakymas'),
      node('dd', {}, p.orderId),
      node('dt', {}, 'Pirkėjas'),
      node('dd', {}, p.snapshot.customer?.name || 'Kontaktai nepateikti'),
      node('dt', {}, 'Suma'),
      node('dd', {}, money(p.amount, p.currency)),
    ),
  );
  if (p.originalDocument)
    article.append(
      node(
        'p',
        {},
        'Pradinis dokumentas: ' +
          p.originalDocument.series +
          '-' +
          p.originalDocument.year +
          '-' +
          String(p.originalDocument.number).padStart(6, '0'),
      ),
    );
  article.append(
    table(
      ['Prekė', 'Kiekis', 'Suma'],
      (d.kind === 'credit'
        ? [{ title: 'Patvirtintas pinigų grąžinimas', quantity: 1, lineAmount: p.amount }]
        : p.snapshot.lines
      ).map((l) =>
        node(
          'tr',
          {},
          cell(l.title),
          cell(l.quantity),
          cell(money(l.lineAmount, p.currency), null, 'money'),
        ),
      ),
      'line-items',
    ),
  );
  article.append(
    node(
      'p',
      { class: 'hint' },
      p.internalTestDocument
        ? 'Šis dokumentas skirtas modulio patikrinimui.'
        : 'Dokumentas išduotas pagal patvirtintą pardavėjo rekvizitų ir numeracijos politiką.',
    ),
  );
  content.append(
    article,
    node(
      'div',
      { class: 'actions' },
      node('button', { type: 'button', onclick: () => window.print() }, 'Spausdinti'),
    ),
  );
  const download = node('button', { type: 'button' }, 'Atsisiųsti PDF');
  download.addEventListener('click', () =>
    action(
      download,
      async () => {
        const blob = await binary('/api/operator/documents/' + d.id + '/pdf'),
          url = URL.createObjectURL(blob);
        node('a', { href: url, download: d.numberLabel + '.pdf' }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      'Dokumentas paruoštas atsisiųsti.',
    ),
  );
  content.lastElementChild.append(download);
}
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const b = event.submitter;
  b.disabled = true;
  state.token = $('#token').value.trim();
  status('Tikrinama prieiga…', 'busy');
  try {
    await reload();
    $('#token').value = '';
    $('#login').hidden = true;
    $('#workspace').hidden = false;
    status();
    $('#view-title').setAttribute('tabindex', '-1');
    $('#view-title').focus();
  } catch (error) {
    state.token = '';
    status(
      errorNames[error.message] || 'Prisijungti nepavyko. Patikrinkite žetoną ir serverio ryšį.',
      'error',
    );
  } finally {
    b.disabled = false;
  }
});
document.querySelectorAll('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    state.view = b.dataset.view;
    state.order = null;
    state.document = null;
    state.stock = null;
    render();
    status();
  }),
);
$('#refresh').addEventListener('click', () =>
  action(
    $('#refresh'),
    async () => {
      await reload();
      if (state.order) await openOrder(state.order.order.id);
    },
    'Duomenys atnaujinti.',
  ),
);
$('#logout').addEventListener('click', () => {
  state.token = '';
  state.data = null;
  state.order = null;
  state.document = null;
  state.stock = null;
  $('#content').replaceChildren();
  $('#workspace').hidden = true;
  $('#login').hidden = false;
  $('#token').focus();
  status();
});
