import test from 'node:test';
import assert from 'node:assert/strict';
import { mountCheckout, normalizeCheckoutCart } from '../public/checkout-ui.mjs';

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
  async fire(type, target = this) {
    for (const callback of this.events.get(type) || [])
      await callback({ target, preventDefault() {} });
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
test('one-page checkout shows selected rows only; removal persists an empty cart and never invents a price', () =>
  withDom(async () => {
    const root = new Element('div'),
      client = onePageClient(),
      changes = [];
    await mountCheckout(root, {
      client,
      layout: 'one-page',
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
    assert.equal(
      nodes(root).find((n) => n.attrs.class === 'checkout-summary').children[0].children[0],
      'Užsakymo suma',
    );
    assert.equal(changes.length, 0);
    await nodes(root)
      .find((n) => n.attrs.class === 'checkout-remove')
      .fire('click');
    assert.deepEqual(changes, [[]]);
    assert.equal(nodes(root).find((n) => n.tag === 'form').hidden, true);
    assert.equal(nodes(root).find((n) => n.attrs.class === 'checkout-empty').hidden, false);
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
      initialLines: [{ sku: 'couple', quantity: 2 }],
      renderPayment: async ({ target, order }) => {
        paymentCount++;
        assert.equal(order.id, client.order.id);
        target.append('STRIPE FIXTURE');
        return () => disposeCount++;
      },
    });
    fillOnePage(root);
    const form = nodes(root).find((n) => n.tag === 'form'),
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
    abort.abort();
    assert.equal(disposeCount, 1);
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
