import test from 'node:test';
import assert from 'node:assert/strict';
import { mountCheckout, normalizeCheckoutCart } from '../public/checkout-ui.mjs';
import { selectionKey, CommerceClient } from '../public/commerce-client.mjs';

test('definite rejected coupon clears only an uncommitted attempt; ambiguous failure keeps the same key', async () => {
  for (const status of [409, 500, undefined]) {
    const values = new Map(),
      storage = {
        setItem: (k, v) => values.set(k, v),
        getItem: (k) => values.get(k) ?? null,
        removeItem: (k) => values.delete(k),
      },
      client = new CommerceClient({ storage });
    client.context = { storeId: 'fixture_coupon', canCreateTestOrder: true };
    client.key = 'commerce.sandbox.fixture_coupon';
    client.request = async () => {
      throw Object.assign(new Error('discount_limit_reached'), { status });
    };
    await assert.rejects(
      client.create({ lines: [{ sku: 'couple', quantity: 1 }], discountCode: 'SAVE10' }),
      /discount_limit_reached/,
    );
    if (status === 409) {
      assert.equal(client.attempt, undefined);
      assert.equal(values.size, 0);
    } else {
      assert.ok(client.attempt.requestKey);
      assert.equal(values.size, 1);
    }
  }
});

test('mixed finishes stay separate in the mounted sidebar; removing white preserves gold and its price', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      initialize = client.initialize,
      changes = [];
    client.initialize = async () => {
      const data = await initialize();
      data.catalog = structuredClone(data.catalog);
      const p = data.catalog.find((p) => p.sku === 'couple');
      p.available = 200;
      p.optionGroups = [
        {
          id: 'finish',
          label: 'Spalva',
          defaultValue: 'white',
          values: [
            { id: 'white', label: 'Balta', enabled: true, prices: { LT: 0 } },
            { id: 'gold', label: 'Auksinė', enabled: true, prices: { LT: 300 } },
          ],
        },
      ];
      return data;
    };
    const white = { sku: 'couple', quantity: 1, choices: { finish: 'white' } },
      gold = { sku: 'couple', quantity: 1, choices: { finish: 'gold' } };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      productsPlacement: 'summary',
      initialLines: [white, gold],
      onCartChange: (lines) => changes.push(lines),
    });
    const rows = nodes(root).filter((n) => n.attrs.class === 'checkout-item' && !n.hidden);
    assert.equal(rows.length, 2);
    assert.match(textContent(rows[0]), /Balta/);
    assert.match(textContent(rows[1]), /Auksinė/);
    assert.equal(field(root, selectionKey(white)).value, '1');
    assert.match(
      nodes(rows[1]).find((n) => n.attrs.class === 'checkout-unit-price').textContent,
      /35/,
    );
    const quantity = field(root, selectionKey(white)),
      form = nodes(root).find((n) => n.tag === 'form');
    quantity.value = '99';
    await form.fire('input', quantity);
    assert.equal(changes.at(-1)[0].quantity, 99);
    quantity.value = '100';
    await form.fire('input', quantity);
    assert.equal(
      changes.at(-1)[0]?.quantity,
      99,
      'aggregate overflow must not persist an empty cart',
    );
    await nodes(rows[0])
      .find((n) => n.attrs.class === 'checkout-remove')
      .fire('click');
    assert.deepEqual(changes.at(-1), [gold]);
  }));

// Unit DOM double only: actual native-browser acceptance belongs to the site.
class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attrs = {};
    this.events = new Map();
    this.value = '';
  }
  setAttribute(key, value) {
    this.attrs[key] = String(value);
    if (['value', 'name', 'id', 'href'].includes(key)) this[key] = String(value);
  }
  removeAttribute(key) {
    delete this.attrs[key];
  }
  getAttribute(key) {
    return this.attrs[key] ?? null;
  }
  checkValidity() {
    return !this.attrs.required || Boolean(this.value);
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node instanceof Element) node.parentElement = this;
      this.children.push(node);
      if (this.tag === 'select' && !this.value && node.tag === 'option') this.value = node.value;
    }
  }
  replaceChildren(...nodes) {
    this.children = [];
    if (this.tag === 'select') this.value = '';
    this.append(...nodes);
  }
  insertBefore(node, before) {
    node.parentElement = this;
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
  }
  addEventListener(type, callback) {
    const callbacks = this.events.get(type) || [];
    callbacks.push(callback);
    this.events.set(type, callbacks);
  }
  async fire(type, target = this, properties = {}) {
    for (const callback of this.events.get(type) || [])
      await callback({ target, preventDefault() {}, ...properties });
  }
  get options() {
    return this.children.filter((child) => child.tag === 'option');
  }
  reportValidity() {
    return true;
  }
}
const nodes = (root) => [root, ...root.children.filter((c) => c instanceof Element).flatMap(nodes)];
const textContent = (root) =>
  root.children.map((c) => (c instanceof Element ? textContent(c) : String(c))).join(' ');
const field = (root, name) => nodes(root).find((n) => n.name === name);
const button = (root, name) =>
  nodes(root).find((n) => n.tag === 'button' && n.children.includes(name));
const catalog = [
  { sku: 'couple', title: 'Couple', enabled: true, available: 10, prices: { LT: 3200 } },
  { sku: 'family', title: 'Family', enabled: true, available: 10, prices: { LT: 4800 } },
  { sku: 'disabled', enabled: false },
];
function clientFixture() {
  const order = {
    id: '00000000-0000-4000-8000-000000000001',
    payment_state: 'pending',
    stock_state: 'reserved',
    amount: 6850,
    currency: 'EUR',
    snapshot: { lines: [{ sku: 'couple', title: 'Original', quantity: 2 }] },
  };
  return {
    order,
    async initialize() {
      return {
        context: { environment: 'sandbox', canCreateTestOrder: true, paymentConnected: false },
        catalog,
        markets: [
          {
            country: 'LT',
            currency: 'EUR',
            policyVersion: 'fixture',
            delivery: [{ id: 'courier', label: 'Test', amount: 450 }],
          },
        ],
      };
    },
    async quote() {
      return { amount: 6850, currency: 'EUR', quoteHash: 'fixture' };
    },
    async create(input) {
      this.created = input;
      this.attempt = { orderId: order.id };
      return structuredClone(order);
    },
    async resume() {
      this.attempt.orderId = order.id;
      return structuredClone(order);
    },
    async receipt() {
      return { documents: [] };
    },
    newOrder() {
      this.attempt = undefined;
    },
  };
}
async function withDom(run) {
  const previous = { document: globalThis.document, location: globalThis.location };
  globalThis.document = { createElement: (tag) => new Element(tag) };
  globalThis.location = { origin: 'http://127.0.0.1:8799' };
  try {
    await run();
  } finally {
    Object.assign(globalThis, previous);
  }
}

test('pending initialization preserves the caller shell and aborted initialization cannot replace it', () =>
  withDom(async () => {
    for (const abort of [false, true]) {
      const root = new Element('div'),
        loading = new Element('p'),
        client = clientFixture(),
        data = await client.initialize(),
        controller = new AbortController();
      loading.append('Serverio krepšelio įkėlimo būsena');
      root.append(loading);
      let ready;
      client.initialize = () =>
        new Promise((resolve) => {
          ready = resolve;
        });
      const mounted = mountCheckout(root, { client, signal: controller.signal });
      assert.deepEqual(root.children, [loading]);
      if (abort) controller.abort();
      ready(data);
      await mounted;
      assert.equal(root.children.includes(loading), abort);
      if (!abort) assert.ok(textContent(root).includes('Krepšelis tuščias.'));
    }
  }));

test('empty cart updates on 0 → 1 → 0 and only permits a same-origin catalogue link', () =>
  withDom(async () => {
    for (const catalogueUrl of ['/collections/all', 'https://foreign.example/shop']) {
      const root = new Element('div');
      await mountCheckout(root, { client: clientFixture(), catalogueUrl });
      const empty = nodes(root).find(
        (n) => n.tag === 'p' && n.children.includes('Krepšelis tuščias.'),
      ).parentElement;
      assert.equal(empty.hidden, false);
      assert.equal(button(root, 'Patikrinti sumą').disabled, true);
      assert.equal(
        nodes(empty).filter((n) => n.tag === 'a').length,
        catalogueUrl.startsWith('/') ? 1 : 0,
      );
      const quantity = field(root, 'couple');
      quantity.value = '1';
      await quantity.parentElement.parentElement.fire('input', quantity);
      assert.equal(empty.hidden, true);
      assert.equal(button(root, 'Patikrinti sumą').disabled, false);
      quantity.value = '0';
      await quantity.parentElement.parentElement.fire('input', quantity);
      assert.equal(empty.hidden, false);
      assert.equal(button(root, 'Patikrinti sumą').disabled, true);
    }
  }));

test('expired pending receipts are unpaid in every UI language, while active reservations still wait for payment and original facts stay unchanged', () =>
  withDom(async () => {
    for (const [language, unpaid, waiting, pay] of [
      ['lt', 'Neapmokėtas', 'Laukia mokėjimo', 'Apmokėti'],
      ['pl', 'Nieopłacone', 'Oczekuje na płatność', 'Zapłać'],
      ['lv', 'Nav apmaksāts', 'Gaida maksājumu', 'Maksāt'],
      ['et', 'Maksmata', 'Ootab makset', 'Maksa'],
    ])
      for (const stockState of ['reserved', 'released']) {
        const client = clientFixture(),
          root = new Element('div');
        client.order.stock_state = stockState;
        client.attempt = { orderId: client.order.id };
        const original = JSON.stringify(client.order);
        await mountCheckout(root, { client, language });
        const content = textContent(root);
        assert.equal(content.includes(unpaid), stockState === 'released', language);
        assert.equal(content.includes(waiting), stockState === 'reserved', language);
        assert.equal(Boolean(button(root, pay)), stockState === 'reserved', language);
        assert.equal(JSON.stringify(client.order), original);
      }
  }));

test('saved receipt displays original delivery facts and explains expiry, disconnected payment and persistent withdrawal', () =>
  withDom(async () => {
    for (const stockState of ['reserved', 'released']) {
      const client = clientFixture(),
        root = new Element('div');
      client.order.stock_state = stockState;
      client.order.snapshot = {
        ...client.order.snapshot,
        country: 'LT',
        delivery: { label: 'Original courier label' },
        customer: {
          name: 'TEST Buyer',
          email: 'buyer@example.test',
          phone: '+37060000001',
          address: {
            line1: 'TEST Street 2',
            line2: 'Flat 3',
            postalCode: '02211',
            city: 'Vilnius',
            country: 'LT',
          },
          locker: { label: 'TEST Locker' },
        },
      };
      client.attempt = { orderId: client.order.id };
      client.receipt = async () => ({
        documents: [],
        withdrawalRequested: true,
        fulfillmentBlocked: true,
      });
      const original = JSON.stringify(client.order.snapshot);
      await mountCheckout(root, { client });
      const content = textContent(root);
      for (const value of [
        'TEST Buyer',
        'buyer@example.test',
        '+37060000001',
        'TEST Street 2',
        'Flat 3',
        '02211',
        'Vilnius',
        'LT',
        'Original courier label',
        'TEST Locker',
      ])
        assert.ok(content.includes(value), value);
      assert.ok(
        content.includes(
          stockState === 'released' ? 'Rezervacija pasibaigė' : 'Mokėjimas šiuo metu neįjungtas',
        ),
        content,
      );
      assert.ok(content.includes('Atsisakymo prašymas išsaugotas'), content);
      assert.equal(JSON.stringify(client.order.snapshot), original);
      if (stockState === 'released') assert.equal(button(root, 'Apmokėti'), undefined);
    }
  }));

test('cart projection drops unknown/inactive/invalid quantities and PII, combines duplicates without truncating overflow', () => {
  assert.deepEqual(
    normalizeCheckoutCart(
      [
        { sku: 'couple', quantity: 2, email: 'private@example.test' },
        { sku: 'couple', quantity: 3 },
        { sku: 'family', quantity: 0 },
        { sku: 'disabled', quantity: 1 },
        { sku: 'unknown', quantity: 1 },
        { sku: 'family', quantity: 1.5 },
        null,
      ],
      catalog,
    ),
    [{ sku: 'couple', quantity: 5 }],
  );
  assert.deepEqual(
    normalizeCheckoutCart(
      [
        { sku: 'couple', quantity: 100 },
        { sku: 'couple', quantity: 1 },
      ],
      catalog,
    ),
    [],
  );
  for (const quantity of [-1, 101, '2', Infinity, NaN])
    assert.deepEqual(normalizeCheckoutCart([{ sku: 'couple', quantity }], catalog), []);
  assert.deepEqual(
    normalizeCheckoutCart(new Array(101).fill({ sku: 'couple', quantity: 1 }), catalog),
    [],
  );
});

test('mounted cart emits only product changes, remount retains both quantities, create clears and New order stays empty', () =>
  withDom(async () => {
    let saved = [];
    const root = new Element('div'),
      client = clientFixture();
    await mountCheckout(root, {
      client,
      onCartChange: (lines) => {
        saved = lines;
      },
    });
    field(root, 'couple').value = '2';
    await field(root, 'couple').parentElement.parentElement.fire('input', field(root, 'couple'));
    field(root, 'family').value = '1';
    await field(root, 'family').parentElement.parentElement.fire('input', field(root, 'family'));
    assert.deepEqual(saved, [
      { sku: 'couple', quantity: 2 },
      { sku: 'family', quantity: 1 },
    ]);
    field(root, 'email').value = 'private@example.test';
    const before = JSON.stringify(saved);
    await field(root, 'email').parentElement.parentElement.fire('input', field(root, 'email'));
    assert.equal(JSON.stringify(saved), before);
    const reloaded = new Element('div');
    await mountCheckout(reloaded, {
      client,
      initialLines: saved,
      onCartChange: (lines) => {
        saved = lines;
      },
    });
    assert.equal(field(reloaded, 'couple').value, '2');
    assert.equal(field(reloaded, 'family').value, '1');
    field(reloaded, 'terms').checked = true;
    await button(reloaded, 'Patikrinti sumą').fire('click');
    await nodes(reloaded)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.deepEqual(saved, []);
    assert.deepEqual(client.created.lines, [
      { sku: 'couple', quantity: 2 },
      { sku: 'family', quantity: 1 },
    ]);
    assert.equal(client.order.snapshot.lines[0].title, 'Original');
    await button(reloaded, 'Naujas užsakymas').fire('click');
    assert.equal(field(reloaded, 'couple').value, '0');
    assert.equal(field(reloaded, 'family').value, '0');
  }));

test('a throwing cart callback does not hide a successfully created order or modify its original snapshot', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = clientFixture(),
      warnings = [],
      previousWarn = console.warn;
    console.warn = (message) => warnings.push(message);
    try {
      await mountCheckout(root, {
        client,
        initialLines: [{ sku: 'couple', quantity: 2 }],
        onCartChange() {
          throw Error('storage unavailable');
        },
      });
      field(root, 'terms').checked = true;
      await button(root, 'Patikrinti sumą').fire('click');
      await nodes(root)
        .find((n) => n.tag === 'form')
        .fire('submit');
      assert.ok(button(root, 'Atnaujinti būseną'));
      assert.equal(client.attempt.orderId, client.order.id);
      assert.equal(client.order.snapshot.lines[0].quantity, 2);
      assert.deepEqual(warnings, ['Commerce cart callback failed']);
    } finally {
      console.warn = previousWarn;
    }
  }));

test('a recovered lost create response clears the old cart once the same order is found', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = clientFixture(),
      calls = [];
    client.create = async function () {
      this.attempt = { requestKey: 'same_attempt' };
      throw Error('network');
    };
    await mountCheckout(root, {
      client,
      initialLines: [{ sku: 'couple', quantity: 2 }],
      onCartChange: (lines) => calls.push(lines),
    });
    field(root, 'terms').checked = true;
    await button(root, 'Patikrinti sumą').fire('click');
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.deepEqual(calls, []);
    await button(root, 'Atnaujinti būseną').fire('click');
    assert.deepEqual(calls, [[]]);
    assert.equal(client.attempt.orderId, client.order.id);
  }));

test('New order preserves goods added after an older saved order; recovery also preserves a different cart', () =>
  withDom(async () => {
    for (const pending of [false, true]) {
      const client = clientFixture(),
        root = new Element('div'),
        calls = [];
      client.attempt = pending ? { requestKey: 'older_attempt' } : { orderId: client.order.id };
      await mountCheckout(root, {
        client,
        initialLines: [{ sku: 'family', quantity: 1 }],
        onCartChange: (lines) => calls.push(lines),
      });
      assert.deepEqual(calls, []);
      await button(root, 'Naujas užsakymas').fire('click');
      assert.equal(field(root, 'family').value, '1');
      assert.equal(field(root, 'couple').value, '0');
      assert.deepEqual(calls, []);
    }
  }));

test('a quote arriving after quantity changes cannot submit an obsolete amount', () =>
  withDom(async () => {
    const client = clientFixture(),
      root = new Element('div');
    let resolveQuote;
    client.quote = () =>
      new Promise((resolve) => {
        resolveQuote = resolve;
      });
    await mountCheckout(root, { client, initialLines: [{ sku: 'couple', quantity: 1 }] });
    field(root, 'terms').checked = true;
    const quoting = button(root, 'Patikrinti sumą').fire('click');
    field(root, 'couple').value = '2';
    await field(root, 'couple').parentElement.parentElement.fire('input', field(root, 'couple'));
    resolveQuote({ amount: 3650, currency: 'EUR', quoteHash: 'obsolete' });
    await quoting;
    assert.equal(button(root, 'Sukurti užsakymą').disabled, true);
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(client.created, undefined);
  }));

test('create locks editable request fields until the server result and then clears purchased cart', () =>
  withDom(async () => {
    const client = clientFixture(),
      root = new Element('div'),
      calls = [];
    let resolveCreate;
    client.create = function (input) {
      this.created = input;
      return new Promise((resolve) => {
        resolveCreate = resolve;
      });
    };
    await mountCheckout(root, {
      client,
      initialLines: [{ sku: 'couple', quantity: 2 }],
      onCartChange: (lines) => calls.push(lines),
    });
    field(root, 'terms').checked = true;
    await button(root, 'Patikrinti sumą').fire('click');
    const submitting = nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(field(root, 'couple').disabled, true);
    assert.equal(field(root, 'email').disabled, true);
    assert.equal(field(root, 'country').disabled, true);
    assert.equal(button(root, 'Patikrinti sumą').disabled, true);
    resolveCreate(structuredClone(client.order));
    await submitting;
    assert.deepEqual(calls, [[]]);
    assert.deepEqual(client.created.lines, [{ sku: 'couple', quantity: 2 }]);
  }));

function onePageClient() {
  const client = clientFixture(),
    initialize = client.initialize;
  client.initialize = async () => {
    const data = await initialize();
    data.context.paymentConnected = true;
    return data;
  };
  client.quote = async (input) => ({
    amount:
      input.lines.reduce(
        (sum, l) => sum + catalog.find((p) => p.sku === l.sku).prices.LT * l.quantity,
        0,
      ) + 450,
    currency: 'EUR',
    quoteHash: 'verified',
    delivery: { amount: 450 },
    lines: input.lines.map((l) => ({
      ...l,
      unitAmount: catalog.find((p) => p.sku === l.sku).prices.LT,
    })),
  });
  return client;
}
function fillOnePage(root) {
  for (const [name, value] of Object.entries({
    name: 'TEST Buyer',
    email: 'buyer@example.test',
    phone: '+37060000001',
    line1: 'TEST Street 2',
    city: 'Vilnius',
    postalCode: '02211',
  }))
    field(root, name).value = value;
  field(root, 'terms').checked = true;
}

const couponFixture = (input) => {
  const lines = input.lines.map((l) => ({
      ...l,
      unitAmount: 3200,
      lineAmount: 3200 * l.quantity,
      discountAmount: 320 * l.quantity,
      netLineAmount: 2880 * l.quantity,
    })),
    subtotal = lines.reduce((n, l) => n + l.lineAmount, 0),
    discount = { code: 'SAVE10', amount: subtotal / 10 };
  return { currency: 'EUR', subtotal, amount: subtotal - discount.amount, lines, discount };
};
test('coupon exhausted after preview returns to an editable cart with no stale reduction or new order', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      abort = new AbortController();
    client.discountPreview = async (input) => couponFixture(input);
    client.quote = async (input) => {
      const q = couponFixture(input);
      return { ...q, amount: q.amount + 450, quoteHash: 'current', delivery: { amount: 450 } };
    };
    client.create = async () => {
      throw Object.assign(new Error('discount_limit_reached'), { status: 409 });
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      signal: abort.signal,
    });
    const code = field(root, 'discountCode');
    code.value = 'SAVE10';
    await code.fire('input');
    await button(root, 'Pritaikyti').fire('click');
    fillOnePage(root);
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(code.disabled, false);
    assert.equal(nodes(root).find((n) => n.className === 'checkout-discount-total').hidden, true);
    assert.equal(button(root, 'Tęsti į apmokėjimą').disabled, true);
    await button(root, 'Pašalinti kodą').fire('click');
    assert.equal(code.value, '');
    assert.equal(button(root, 'Tęsti į apmokėjimą').disabled, false);
    abort.abort();
  }));
test('one-page coupon applies before contact data, reaches order input and locks with the original payment amount', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient();
    let previews = 0,
      quotes = 0;
    client.discountPreview = async (input) => {
      previews++;
      assert.equal(input.customer, undefined);
      assert.equal(input.code, 'SAVE10');
      return couponFixture(input);
    };
    client.quote = async (input) => {
      quotes++;
      assert.equal(input.discountCode, 'SAVE10');
      const q = couponFixture(input);
      return {
        ...q,
        amount: q.amount + 450,
        quoteHash: 'discount-verified',
        delivery: { amount: 450 },
      };
    };
    client.create = async (input) => {
      client.created = input;
      client.attempt = { orderId: client.order.id };
      return {
        ...client.order,
        amount: 3330,
        snapshot: { ...couponFixture(input), delivery: { amount: 450 } },
      };
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      productsPlacement: 'summary',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      renderPayment: async () => {},
    });
    const code = field(root, 'discountCode');
    code.value = 'save10';
    await code.fire('input');
    await button(root, 'Pritaikyti').fire('click');
    assert.equal(previews, 1);
    assert.equal(quotes, 0);
    assert.equal(code.value, 'SAVE10');
    assert.equal(client.created, undefined);
    const row = nodes(root).find((n) => n.className === 'checkout-discount-total');
    assert.equal(row.hidden, false);
    assert.match(row.children[1].textContent, /3,20/);
    fillOnePage(root);
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(client.created.discountCode, 'SAVE10');
    assert.equal(client.created.quoteHash, 'discount-verified');
    assert.equal(code.disabled, true);
    assert.equal(button(root, 'Pašalinti kodą').hidden, true);
    assert.equal(quotes, 1);
  }));
test('removing a coupon clears its discount and late apply responses cannot reinstate an edited code', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient();
    let release;
    client.discountPreview = (input) =>
      new Promise((resolve) => {
        release = () => resolve(couponFixture(input));
      });
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
    });
    const code = field(root, 'discountCode');
    code.value = 'SAVE10';
    await code.fire('input');
    const pending = button(root, 'Pritaikyti').fire('click');
    code.value = 'OTHER';
    await code.fire('input');
    release();
    await pending;
    assert.equal(code.value, 'OTHER');
    assert.equal(nodes(root).find((n) => n.className === 'checkout-discount-total').hidden, true);
    client.discountPreview = async (input) => couponFixture(input);
    code.value = 'SAVE10';
    await code.fire('input');
    await button(root, 'Pritaikyti').fire('click');
    assert.equal(nodes(root).find((n) => n.className === 'checkout-discount-total').hidden, false);
    await button(root, 'Pašalinti kodą').fire('click');
    assert.equal(code.value, '');
    assert.equal(nodes(root).find((n) => n.className === 'checkout-discount-total').hidden, true);
    fillOnePage(root);
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(client.created.discountCode, undefined);
  }));

test('free delivery coupon immediately displays zero shipping and removing it restores delivery pricing', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient();
    const free = (input) => {
      const p = couponFixture(input);
      p.discount.freeShipping = true;
      return p;
    };
    client.discountPreview = async (input) => free(input);
    client.quote = async (input) => {
      const p = free(input);
      return {
        ...p,
        quoteHash: 'free_quote',
        delivery: { amount: 0, amountBeforeDiscount: 450 },
        discount: { ...p.discount, shippingAmount: 450 },
      };
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
    });
    const code = field(root, 'discountCode');
    code.value = 'SAVE10';
    await code.fire('input');
    await button(root, 'Pritaikyti').fire('click');
    const totals = nodes(root).find((n) => n.attrs.class === 'checkout-totals');
    assert.equal(totals.children[2].children[1].textContent, '0,00 €');
    assert.equal(totals.children[3].children[1].textContent, '28,80 €');
    assert.match(
      nodes(root).find((n) => n.attrs.id === 'checkout-discount-note').textContent,
      /Nemokamas pristatymas/,
    );
    await button(root, 'Pašalinti kodą').fire('click');
    assert.equal(totals.children[2].children[1].textContent, 'Pagal pristatymo duomenis');
    assert.match(totals.children[3].children[1].textContent, /pristatymas/);
  }));
test('quantity changes refresh the server coupon preview without an address or payment request', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      abort = new AbortController();
    let calls = 0;
    client.discountPreview = async (input) => {
      calls++;
      return couponFixture(input);
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      signal: abort.signal,
    });
    const code = field(root, 'discountCode');
    code.value = 'SAVE10';
    await code.fire('input');
    await button(root, 'Pritaikyti').fire('click');
    field(root, 'couple').value = '2';
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('input', field(root, 'couple'));
    await pause(350);
    assert.equal(calls, 2);
    assert.match(
      nodes(root).find((n) => n.className === 'checkout-discount-total').children[1].textContent,
      /6,40/,
    );
    assert.equal(client.created, undefined);
    abort.abort();
  }));
test('informed recovery restores expired basket for fresh quote and unchecked terms, without auto payment or create', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      initialize = client.initialize;
    let quotes = 0,
      payments = 0,
      creates = 0;
    client.initialize = async () => {
      const value = await initialize();
      value.context.paymentRecovery = {
        noticeVersion: 'recovery_v1',
        reminderAfterHours: 12,
        reservationHours: 24,
      };
      return value;
    };
    client.openRecovery = async () => ({
      state: 'restore',
      order: {
        ...client.order,
        snapshot: {
          country: 'LT',
          lines: [{ sku: 'couple', quantity: 2, unitAmount: 1 }],
          customer: {
            name: 'Original Buyer',
            email: 'original@example.test',
            phone: '+37060000001',
            address: { line1: 'Original Street 2', city: 'Vilnius', postalCode: '02211' },
          },
          delivery: { id: 'courier', amount: 1 },
        },
      },
    });
    const quote = client.quote;
    client.quote = async (input) => {
      quotes++;
      return quote(input);
    };
    client.create = async () => {
      creates++;
      throw Error('no automatic create');
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      recoveryToken: 'fixture',
      renderPayment: async () => {
        payments++;
      },
    });
    assert.equal(field(root, 'name').value, 'Original Buyer');
    assert.equal(field(root, 'couple').value, '2');
    assert.notEqual(field(root, 'email').disabled, true);
    assert.equal(field(root, 'terms').checked, false);
    assert.equal(payments, 0);
    assert.equal(creates, 0);
    assert(textContent(root).includes('po 12 val.'));
    assert(textContent(root).includes('per 24 val.'));
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(creates, 0);
    await pause(700);
    assert(quotes > 0);
  }));
function carrierClient() {
  const client = onePageClient(),
    initialize = client.initialize;
  client.initialize = async () => {
    const data = await initialize();
    data.markets[0].delivery[0].pricing = 'carrier';
    return data;
  };
  return client;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test('auto carrier quote and submit share one pending request and create once', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = carrierClient();
    let calls = 0,
      creates = 0;
    const releases = [];
    client.deliveryQuote = async () => {
      calls++;
      await new Promise((resolve) => {
        releases.push(resolve);
      });
      return { id: 'shared' };
    };
    const create = client.create;
    client.create = async (input) => {
      creates++;
      return create.call(client, input);
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      renderPayment: async () => {},
    });
    fillOnePage(root);
    const form = nodes(root).find((n) => n.tag === 'form');
    await form.fire('input', field(root, 'postalCode'));
    await pause(700);
    assert.equal(calls, 1);
    const submitting = form.fire('submit');
    const actualCalls = calls;
    for (const release of releases) release();
    await submitting;
    assert.equal(actualCalls, 1);
    assert.equal(creates, 1);
    assert.equal(client.created.deliveryQuoteId, 'shared');
  }));
test('failed carrier quote shows service feedback and explicit submit can retry', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = carrierClient();
    let calls = 0;
    client.deliveryQuote = async () => {
      if (++calls === 1) throw Error('commerce_connection_failed');
      return { id: 'retried' };
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      renderPayment: async () => {},
    });
    fillOnePage(root);
    const form = nodes(root).find((n) => n.tag === 'form');
    await form.fire('submit');
    const feedback = nodes(root).find((n) => n.attrs.role === 'alert');
    assert.equal(
      feedback?.textContent,
      'Pristatymo kainos paslauga laikinai nepasiekiama. Bandykite dar kartą.',
    );
    assert.equal(client.created, undefined);
    await form.fire('submit');
    assert.equal(calls, 2);
    assert.equal(client.created.deliveryQuoteId, 'retried');
  }));
test('changed address cannot reuse an older pending carrier quote or clear a newer one', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = carrierClient(),
      pending = [];
    client.deliveryQuote = (input) => new Promise((resolve) => pending.push({ input, resolve }));
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      renderPayment: async () => {},
    });
    fillOnePage(root);
    const form = nodes(root).find((n) => n.tag === 'form');
    await form.fire('input', field(root, 'postalCode'));
    await pause(700);
    field(root, 'postalCode').value = '01100';
    await form.fire('input', field(root, 'postalCode'));
    await pause(700);
    assert.equal(pending.length, 2);
    pending[0].resolve({ id: 'stale' });
    await pause(0);
    assert.equal(client.created, undefined);
    const submitting = form.fire('submit'),
      actualCalls = pending.length;
    for (const p of pending.slice(1)) p.resolve({ id: 'current' });
    await submitting;
    assert.equal(actualCalls, 2);
    assert.equal(client.created.deliveryQuoteId, 'current');
    assert.equal(client.created.customer.address.postalCode, '01100');
  }));
test('one-page checkout shows selected rows only; removal persists an empty cart and never invents a price', () =>
  withDom(async () => {
    for (const productsPlacement of ['details', 'summary']) {
      const root = new Element('div'),
        client = onePageClient(),
        changes = [];
      await mountCheckout(root, {
        client,
        layout: 'one-page',
        productsPlacement,
        initialLines: [{ sku: 'couple', quantity: 1 }],
        catalogueUrl: '/catalogue',
        productImage: (p) =>
          p.sku === 'couple' ? '/couple.webp' : 'https://foreign.example/image.webp',
        onCartChange: (lines) => changes.push(lines),
      });
      const items = nodes(root).filter((n) => n.attrs.class === 'checkout-item');
      assert.equal(items[0].hidden, false);
      assert.equal(items[1].hidden, true);
      assert.equal(nodes(root).filter((n) => n.tag === 'img').length, 1);
      const products = nodes(root).find((n) => n.attrs.class === 'checkout-products');
      const summary = nodes(root).find((n) => n.attrs.class === 'checkout-summary');
      assert.equal(
        products.parentElement.attrs.class,
        productsPlacement === 'summary' ? 'checkout-summary' : 'checkout-details',
      );
      assert.equal(nodes(root).filter((n) => n.attrs.class === 'checkout-products').length, 1);
      assert.equal(
        summary.children[productsPlacement === 'summary' ? 1 : 0].children[0],
        'Užsakymo suma',
      );
      assert.equal(changes.length, 0);
      await nodes(root)
        .find((n) => n.attrs.class === 'checkout-remove')
        .fire('click');
      assert.deepEqual(changes, [[]]);
      assert.equal(nodes(root).find((n) => n.tag === 'form').hidden, true);
      assert.equal(nodes(root).find((n) => n.attrs.class === 'checkout-empty').hidden, false);
    }
  }));
test('one-page submit quotes once, locks fields before quote, creates once and mounts payment in place', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      abort = new AbortController();
    let quoteCount = 0,
      createCount = 0,
      paymentCount = 0,
      disposeCount = 0,
      resolveQuote;
    const quote = client.quote,
      create = client.create;
    client.quote = async (input) => {
      quoteCount++;
      await new Promise((resolve) => {
        resolveQuote = resolve;
      });
      return quote(input);
    };
    client.create = async (input) => {
      createCount++;
      return create.call(client, input);
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      signal: abort.signal,
      productsPlacement: 'summary',
      initialLines: [{ sku: 'couple', quantity: 2 }],
      renderPayment: async ({ target, order }) => {
        paymentCount++;
        assert.equal(order.id, client.order.id);
        assert.equal(
          nodes(root).find((n) => n.tag === 'form'),
          originalForm,
        );
        assert.equal(field(root, 'email').value, 'buyer@example.test');
        assert.equal(field(root, 'email').disabled, true);
        assert.equal(target.parentElement.attrs.class, 'checkout-details');
        target.append('STRIPE FIXTURE');
        return () => disposeCount++;
      },
    });
    fillOnePage(root);
    const form = nodes(root).find((n) => n.tag === 'form'),
      originalForm = form,
      submitting = form.fire('submit');
    assert.equal(field(root, 'email').disabled, true);
    assert.equal(field(root, 'country').disabled, true);
    assert.equal(field(root, 'couple').disabled, true);
    await form.fire('submit');
    assert.equal(quoteCount, 1);
    resolveQuote();
    await submitting;
    assert.equal(createCount, 1);
    assert.equal(paymentCount, 1);
    assert.equal(client.created.acceptedPolicyVersion, 'fixture');
    assert.deepEqual(client.created.lines, [{ sku: 'couple', quantity: 2 }]);
    assert.ok(textContent(root).includes('STRIPE FIXTURE'));
    assert.equal(nodes(root).filter((n) => n.tag === 'form').length, 1);
    assert.equal(field(root, 'terms').checked, true);
    assert.equal(field(root, 'couple').disabled, true);
    await form.fire('submit');
    assert.equal(createCount, 1);
    await nodes(root)
      .find((n) => n.attrs['aria-label'] === 'Padidinti kiekį: Couple')
      .fire('click');
    await nodes(root)
      .find((n) => n.attrs.class === 'checkout-remove')
      .fire('click');
    assert.equal(field(root, 'couple').value, '2');
    assert.equal(nodes(root).find((n) => n.attrs.class === 'checkout-item').hidden, false);
    abort.abort();
    assert.equal(disposeCount, 1);
  }));
test('saved unpaid order resumes payment inside its filled form using original amount without another quote or create', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      changes = [];
    client.attempt = { orderId: client.order.id };
    client.order.snapshot = {
      country: 'LT',
      policyVersion: 'fixture',
      customer: {
        name: 'Original Buyer',
        email: 'original@example.test',
        phone: '+37060000001',
        address: {
          country: 'LT',
          line1: 'Original Street 2',
          city: 'Vilnius',
          postalCode: '02211',
        },
      },
      lines: [{ sku: 'couple', title: 'Original', quantity: 2, unitAmount: 3200 }],
      delivery: { id: 'courier', amount: 450, label: 'Original delivery' },
    };
    let mounts = 0,
      complete;
    client.quote = async () => {
      throw Error('must not reprice saved order');
    };
    client.create = async () => {
      throw Error('must not create again');
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      productsPlacement: 'summary',
      onCartChange: (lines) => changes.push(lines),
      renderPayment: async (options) => {
        mounts++;
        complete = options.onComplete;
        options.target.append('EXISTING PAYMENT');
      },
    });
    const form = nodes(root).find((n) => n.tag === 'form');
    assert.ok(form);
    assert.equal(field(root, 'name').value, 'Original Buyer');
    assert.equal(field(root, 'email').disabled, true);
    assert.equal(field(root, 'couple').value, '2');
    assert.ok(nodes(root).some((n) => n.textContent === '68,50 €'));
    assert.ok(textContent(root).includes('EXISTING PAYMENT'));
    assert.equal(mounts, 1);
    await form.fire('submit');
    assert.deepEqual(changes, []);
    await complete();
    assert.equal(
      nodes(root).find((n) => n.tag === 'form'),
      form,
    );
    client.order.payment_state = 'paid';
    await complete();
    assert.equal(
      nodes(root).find((n) => n.tag === 'form'),
      undefined,
    );
    assert.ok(textContent(root).includes('Apmokėta'));
  }));
test('inline payment mount failure retries the same order and late mounting after abort disposes it', () =>
  withDom(async () => {
    for (const late of [false, true]) {
      const root = new Element('div'),
        client = onePageClient(),
        abort = new AbortController();
      let calls = 0,
        release,
        disposed = 0;
      await mountCheckout(root, {
        client,
        layout: 'one-page',
        signal: abort.signal,
        initialLines: [{ sku: 'couple', quantity: 1 }],
        renderPayment: async ({ target }) => {
          calls++;
          if (late)
            await new Promise((resolve) => {
              release = resolve;
            });
          else if (calls === 1) throw Error('transient iframe error');
          target.replaceChildren('SAME ORDER PAYMENT');
          return () => disposed++;
        },
      });
      fillOnePage(root);
      const form = nodes(root).find((n) => n.tag === 'form'),
        submitting = form.fire('submit');
      if (late) {
        await pause(0);
        abort.abort();
        release();
        await submitting;
        assert.equal(disposed, 1);
      } else {
        await submitting;
        const created = client.created;
        assert.equal(
          nodes(root).find((n) => n.tag === 'form'),
          form,
        );
        await button(root, 'Apmokėti').fire('click');
        assert.equal(calls, 2);
        assert.equal(client.created, created);
        assert.ok(textContent(root).includes('SAME ORDER PAYMENT'));
        await form.fire('submit');
        assert.equal(calls, 2);
        abort.abort();
        assert.equal(disposed, 1);
      }
    }
  }));

test('summary payment keeps one form and mounts after goods, totals and consent in actual DOM order', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient();
    let target,
      mounts = 0;
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      productsPlacement: 'summary',
      paymentPlacement: 'summary',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      renderPayment: async (options) => {
        target = options.target;
        mounts++;
        target.append('RIGHT PAYMENT');
      },
    });
    fillOnePage(root);
    const form = nodes(root).find((n) => n.tag === 'form');
    await form.fire('submit');
    const summary = nodes(root).find((n) => n.attrs.class === 'checkout-summary');
    assert.equal(target.parentElement, summary);
    for (const className of ['checkout-products', 'checkout-totals', 'checkout-consent'])
      assert.ok(
        summary.children.findIndex((n) => n.attrs?.class === className) <
          summary.children.indexOf(target),
      );
    assert.equal(
      nodes(root).filter((n) => n.attrs.class === 'checkout-payment checkout-payment-inline')
        .length,
      1,
    );
    assert.equal(
      nodes(root).find((n) => n.tag === 'form'),
      form,
    );
    assert.equal(field(root, 'email').value, 'buyer@example.test');
    await form.fire('submit');
    assert.equal(mounts, 1);
    assert.equal(field(root, 'email').disabled, true);
  }));

test('one-page checkout cannot create while production is closed or terms/customer are incomplete', () =>
  withDom(async () => {
    for (const closed of [false, true]) {
      const root = new Element('div'),
        client = onePageClient(),
        initialize = client.initialize;
      if (closed)
        client.initialize = async () => {
          const d = await initialize();
          d.context = { environment: 'production', paymentConnected: true, productionReady: false };
          return d;
        };
      await mountCheckout(root, {
        client,
        layout: 'one-page',
        initialLines: [{ sku: 'couple', quantity: 1 }],
      });
      const form = nodes(root).find((n) => n.tag === 'form');
      await form.fire('submit');
      assert.equal(client.created, undefined);
      fillOnePage(root);
      field(root, 'terms').checked = false;
      await form.fire('submit');
      assert.equal(client.created, undefined);
      if (closed) {
        field(root, 'terms').checked = true;
        await form.fire('submit');
        assert.equal(client.created, undefined);
        assert.equal(button(root, 'Tęsti į apmokėjimą').disabled, true);
      }
    }
  }));
test('one-page checkout rejects inconsistent server amounts and recovers a lost create without another order', () =>
  withDom(async () => {
    for (const lost of [false, true]) {
      const root = new Element('div'),
        client = onePageClient(),
        changes = [];
      let payments = 0;
      if (!lost)
        client.quote = async () => ({
          amount: 1,
          currency: 'EUR',
          quoteHash: 'bad',
          lines: [{ sku: 'couple', quantity: 1, unitAmount: 3200 }],
          delivery: { amount: 450 },
        });
      else
        client.create = async function () {
          this.attempt = { requestKey: 'same-attempt' };
          throw Error('network');
        };
      await mountCheckout(root, {
        client,
        layout: 'one-page',
        initialLines: [{ sku: 'couple', quantity: 1 }],
        onCartChange: (lines) => changes.push(lines),
        renderPayment: async () => {
          payments++;
        },
      });
      fillOnePage(root);
      await nodes(root)
        .find((n) => n.tag === 'form')
        .fire('submit');
      assert.deepEqual(changes, []);
      assert.equal(payments, 0);
      if (lost) {
        await button(root, 'Atnaujinti būseną').fire('click');
        assert.equal(client.attempt.orderId, client.order.id);
        assert.deepEqual(changes, [[]]);
        assert.equal(payments, 1);
      } else assert.equal(client.created, undefined);
    }
  }));
test('one-page country choices exclude closed markets and fall back to the admitted market', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      initialize = client.initialize;
    client.initialize = async () => {
      const data = await initialize();
      const lt = data.markets.find((m) => m.country === 'LT');
      data.markets = [
        { ...lt, country: 'PL', checkoutEnabled: false },
        { ...lt, checkoutEnabled: true },
        { ...lt, country: 'EE', checkoutEnabled: false },
      ];
      return data;
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      country: 'PL',
      initialLines: [{ sku: 'couple', quantity: 1 }],
    });
    const country = field(root, 'country');
    assert.deepEqual(
      country.children.map((option) => option.attrs.value),
      ['LT'],
    );
    assert.equal(country.value, 'LT');
  }));

test('one-page locker search uses terminal address, restores courier address and falls back for two parcels', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      initialize = client.initialize;
    client.initialize = async () => {
      const data = await initialize();
      data.markets = structuredClone(data.markets);
      data.markets[0].delivery.push({
        id: 'omniva',
        label: 'Omniva paštomatas',
        kind: 'locker',
        maxParcels: 1,
        amount: 472,
        lockers: [
          {
            id: 'vilnius',
            label: 'Vilnius NORFA',
            address: 'Salininkų g. 129A',
            city: 'Vilnius',
            postalCode: '77759',
          },
          {
            id: 'kaunas',
            label: 'Kaunas RIMI',
            address: 'Testinė g. 1',
            city: 'Kaunas',
            postalCode: '99911',
          },
        ],
      });
      return data;
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
    });
    const delivery = field(root, 'delivery'),
      locker = field(root, 'locker'),
      search = field(root, 'lockerSearch'),
      form = nodes(root).find((n) => n.tag === 'form');
    field(root, 'line1').value = 'Home g. 5';
    field(root, 'city').value = 'Vilnius';
    field(root, 'postalCode').value = '01111';
    delivery.value = 'omniva';
    await delivery.fire('change');
    assert.equal(search.parentElement.parentElement.hidden, false);
    search.value = 'kaun';
    await search.fire('input');
    let options = nodes(root).filter((n) => n.attrs.role === 'option');
    assert.equal(options.length, 1);
    assert.ok(textContent(options[0]).includes('Kaunas RIMI'));
    assert.equal(search.attrs['aria-expanded'], 'true');
    assert.equal(locker.value, '');
    await options[0].fire('click');
    assert.equal(locker.value, 'kaunas');
    assert.equal(search.value, 'Kaunas RIMI');
    assert.equal(search.attrs['aria-expanded'], 'false');
    assert.equal(field(root, 'line1').value, 'Testinė g. 1');
    assert.equal(field(root, 'city').value, 'Kaunas');
    assert.equal(field(root, 'line1').parentElement.hidden, true);
    // A changed query must invalidate the old selection and address immediately.
    search.value = 'salinink';
    await search.fire('input');
    assert.equal(locker.value, '');
    assert.equal(field(root, 'line1').value, '');
    options = nodes(root).filter((n) => n.attrs.role === 'option');
    assert.equal(options.length, 1);
    assert.ok(textContent(options[0]).includes('Vilnius NORFA'));
    await search.fire('keydown', search, { key: 'ArrowDown' });
    assert.equal(options[0].attrs['aria-selected'], 'true');
    await search.fire('keydown', search, { key: 'Enter' });
    assert.equal(locker.value, 'vilnius');
    assert.equal(field(root, 'line1').value, 'Salininkų g. 129A');
    search.value = 'visai nerandamas';
    await search.fire('input');
    assert.equal(nodes(root).filter((n) => n.attrs.role === 'option').length, 0);
    assert.equal(locker.value, '');
    assert.equal(search.attrs['aria-expanded'], 'false');
    assert.ok(
      nodes(root)
        .find((n) => n.attrs.id === 'checkout-locker-status')
        .textContent.includes('nerasta'),
    );
    search.value = 'vilnius salininku';
    await search.fire('input');
    assert.equal(nodes(root).filter((n) => n.attrs.role === 'option').length, 1);
    await search.fire('keydown', search, { key: 'Escape' });
    assert.equal(search.attrs['aria-expanded'], 'false');
    assert.equal(locker.value, '');
    delivery.value = 'courier';
    await delivery.fire('change');
    assert.equal(field(root, 'line1').value, 'Home g. 5');
    assert.equal(field(root, 'city').value, 'Vilnius');
    delivery.value = 'omniva';
    await delivery.fire('change');
    const quantity = field(root, 'couple');
    quantity.value = '2';
    await form.fire('input', quantity);
    assert.equal(delivery.value, 'courier');
    assert.equal(delivery.options.find((o) => o.value === 'omniva').disabled, true);
  }));

test('restored locker label stays visible and saved-order result handlers cannot change delivery', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      initialize = client.initialize;
    client.initialize = async () => {
      const data = await initialize();
      data.markets = structuredClone(data.markets);
      data.markets[0].delivery.push({
        id: 'omniva',
        kind: 'locker',
        label: 'Omniva',
        amount: 472,
        lockers: [
          {
            id: 'salininkai',
            label: 'Vilniaus Salininkų NORFA',
            address: 'Salininkų g. 129A',
            city: 'Vilnius',
            postalCode: '02211',
          },
        ],
      });
      return data;
    };
    client.attempt = { orderId: client.order.id };
    client.order.amount = 3672;
    client.order.snapshot = {
      country: 'LT',
      policyVersion: 'fixture',
      customer: {
        name: 'TEST Buyer',
        email: 'buyer@example.test',
        phone: '+37060000001',
        lockerId: 'salininkai',
        address: {
          country: 'LT',
          line1: 'Salininkų g. 129A',
          city: 'Vilnius',
          postalCode: '02211',
        },
      },
      lines: [{ sku: 'couple', title: 'Couple', quantity: 1, unitAmount: 3200 }],
      delivery: { id: 'omniva', amount: 472, label: 'Omniva' },
    };
    client.quote = async () => {
      throw Error('saved order must not reprice');
    };
    client.create = async () => {
      throw Error('saved order must not recreate');
    };
    await mountCheckout(root, { client, layout: 'one-page', renderPayment: async () => {} });
    const search = field(root, 'lockerSearch'),
      locker = field(root, 'locker');
    assert.equal(search.value, 'Vilniaus Salininkų NORFA');
    assert.equal(locker.value, 'salininkai');
    assert.equal(search.disabled, true);
    assert.equal(search.attrs['aria-expanded'], 'false');
    await search.fire('focus');
    await search.fire('keydown', search, { key: 'ArrowDown' });
    await search.fire('keydown', search, { key: 'Enter' });
    assert.equal(locker.value, 'salininkai');
    assert.equal(nodes(root).filter((n) => n.attrs.role === 'option').length, 0);
  }));

test('missing exact terms link explains the block and does not permit order creation', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient();
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 1 }],
      termsUrl: () => null,
    });
    fillOnePage(root);
    assert.equal(field(root, 'terms').disabled, true);
    const notice = nodes(root).find(
      (n) => n.tag === 'p' && n.children.some((v) => String(v).startsWith('Nepavyko patvirtinti')),
    );
    assert.equal(notice.hidden, false);
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('submit');
    assert.equal(client.created, undefined);
  }));

test('single customer delivery fee retains Omniva selection and trusted terminal for two then three kits', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      initialize = client.initialize;
    client.initialize = async () => {
      const data = await initialize();
      data.markets = structuredClone(data.markets);
      data.markets[0].delivery.push({
        id: 'omniva',
        label: 'Omniva paštomatas',
        kind: 'locker',
        maxParcels: 1,
        customerCharge: 'single_parcel',
        amount: 472,
        lockers: [
          {
            id: 'salininkai',
            label: 'Vilnius NORFA',
            address: 'Salininkų g. 129A',
            city: 'Vilnius',
            postalCode: '77759',
          },
        ],
      });
      return data;
    };
    await mountCheckout(root, {
      client,
      layout: 'one-page',
      initialLines: [{ sku: 'couple', quantity: 2 }],
    });
    const delivery = field(root, 'delivery');
    assert.equal(delivery.options.find((o) => o.value === 'omniva').disabled, false);
    delivery.value = 'omniva';
    await delivery.fire('change');
    const search = field(root, 'lockerSearch');
    search.value = 'salinink';
    await search.fire('input');
    await nodes(root)
      .find((n) => n.attrs.role === 'option')
      .fire('click');
    assert.equal(field(root, 'locker').value, 'salininkai');
    const quantity = field(root, 'couple');
    quantity.value = '3';
    await nodes(root)
      .find((n) => n.tag === 'form')
      .fire('input', quantity);
    assert.equal(delivery.value, 'omniva');
    assert.equal(delivery.options.find((o) => o.value === 'omniva').disabled, false);
    assert.equal(field(root, 'locker').value, 'salininkai');
  }));
