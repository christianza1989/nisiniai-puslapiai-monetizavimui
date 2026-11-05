import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { BuyerDeliveryQuotes } from '../src/buyer-delivery.mjs';
import { Discounts } from '../src/discounts.mjs';
import { ShipmentCommands } from '../src/shipment-commands.mjs';
import { CommerceService } from '../src/service.mjs';
import { ShippingAutomation } from '../src/shipping-automation.mjs';
import { multiparcelFixture, proveParcelSlots } from './multiparcel-fixtures.mjs';

test('flat buyer shipping stays separate from carrier cost, binds tariff and preserves locker dispatch', async () => {
  const db = new NodeDatabase();
  db.migrate();
  try {
    const x = await multiparcelFixture(db, { quantity: 3, flatAmount: 375, freeShipping: true });
    const delivery = new BuyerDeliveryQuotes(x.s);
    for (const quantity of [1, 2, 3]) {
      const input = { ...x.input, lines: [{ sku: 'couple', quantity }] };
      const rate = await delivery.create(
        'store_a',
        'sandbox',
        { ...input, id: 'flat_' + quantity },
        x.adapter,
      );
      assert.equal(rate.amount, 375);
      assert.equal(rate.carrierAmount, undefined);
      const row = await x.s.one(
        'SELECT payload_json FROM buyer_delivery_quotes WHERE store_id=? AND id=?',
        'store_a',
        rate.id,
      );
      const privateQuote = JSON.parse(row.payload_json);
      assert.equal(privateQuote.carrierAmount, 472);
      assert.equal(privateQuote.providerServiceId, '42');
      const priced = await x.s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: rate.id });
      assert.equal(priced.delivery.amount, 375);
      assert.equal(priced.delivery.providerServiceId, '42');
      assert.equal(priced.delivery.dispatch.locker.id, 'sender');
      assert.equal(priced.amount, 3200 * quantity + 375);
      const free = await x.s.quote('store_a', 'sandbox', {
        ...input,
        deliveryQuoteId: rate.id,
        discountCode: 'FREE10',
      });
      assert.equal(free.delivery.amount, 0);
      assert.equal(free.delivery.amountBeforeDiscount, 375);
      assert.equal(free.discount.shippingAmount, 375);
    }
    const original = await x.s.getOrder('store_a', 'sandbox', x.order.id);
    assert.equal(original.snapshot.delivery.amount, 0);
    assert.equal(original.snapshot.delivery.amountBeforeDiscount, 375);
    const input = { ...x.input, lines: [{ sku: 'couple', quantity: 2 }] };
    const prior = await delivery.create(
      'store_a',
      'sandbox',
      { ...input, id: 'flat_change' },
      x.adapter,
    );
    const changed = structuredClone(x.config);
    changed.markets[0].delivery[1].customerFlatAmount = 475;
    await db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(changed), 'store_a')
      .run();
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: prior.id }),
      /delivery_quote_conflict/,
    );
    const next = await delivery.create(
      'store_a',
      'sandbox',
      { ...input, id: 'flat_new' },
      x.adapter,
    );
    assert.equal(next.amount, 475);
    const payloadRow = await x.s.one(
      'SELECT payload_json FROM buyer_delivery_quotes WHERE store_id=? AND id=?',
      'store_a',
      next.id,
    );
    const tampered = JSON.parse(payloadRow.payload_json);
    tampered.public.amount = 1;
    await assert.rejects(
      db
        .prepare('UPDATE buyer_delivery_quotes SET payload_json=? WHERE store_id=? AND id=?')
        .bind(JSON.stringify(tampered), 'store_a', next.id)
        .run(),
      /buyer_quote_immutable/,
    );
    const expiring = await delivery.create(
      'store_a',
      'sandbox',
      { ...input, id: 'flat_expiry' },
      x.adapter,
    );
    const originalNow = x.s.now;
    x.s.now = () => Date.now() + 300001;
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: expiring.id }),
      /delivery_quote_conflict/,
    );
    x.s.now = originalNow;
    delete changed.markets[0].delivery[1].customerFlatAmount;
    await db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(changed), 'store_a')
      .run();
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: next.id }),
      /delivery_quote_conflict/,
    );
    const dynamic = await delivery.create(
      'store_a',
      'sandbox',
      { ...input, id: 'flat_removed' },
      x.adapter,
    );
    assert.equal(dynamic.amount, 472);
    changed.markets[0].delivery[1].customerFlatAmount = 475;
    await db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(changed), 'store_a')
      .run();
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: dynamic.id }),
      /delivery_quote_conflict/,
    );
    assert.equal(
      (await x.s.getOrder('store_a', 'sandbox', x.order.id)).snapshot.delivery.amountBeforeDiscount,
      375,
    );
    await assert.rejects(
      delivery.create(
        'store_a',
        'sandbox',
        { ...input, id: 'flat_offline' },
        { ...x.adapter, quote: async () => [] },
      ),
      /carrier_offer_unavailable/,
    );
  } finally {
    db.close();
  }
});

test('single customer parcel tariff keeps two/three and mixed kits eligible; full cart/quote binding and free coupons remain exact', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const x = await multiparcelFixture(db, { paid: false });
  try {
    for (const quantity of [1, 2, 3]) {
      const input = { ...x.input, lines: [{ sku: 'couple', quantity }] };
      const q = await new BuyerDeliveryQuotes(x.s).create(
        'store_a',
        'sandbox',
        { ...input, id: 'quantity_' + quantity },
        x.adapter,
      );
      const priced = await x.s.quote('store_a', 'sandbox', { ...input, deliveryQuoteId: q.id });
      assert.equal(q.amount, 472);
      assert.equal(priced.amount, 3200 * quantity + 472);
      assert.equal(priced.delivery.customerCharge, 'single_parcel');
      assert.equal(x.quoteCalls.at(-1).parcels.length, 1);
      assert.equal(x.quoteCalls.at(-1).value, 3200);
      await assert.rejects(
        x.s.quote('store_a', 'sandbox', {
          ...input,
          lines: [{ sku: 'couple', quantity: quantity + 1 }],
          deliveryQuoteId: q.id,
        }),
        /delivery_quote_conflict/,
      );
    }
    const mixed = {
      ...x.input,
      lines: [
        { sku: 'couple', quantity: 2 },
        { sku: 'family', quantity: 1 },
      ],
    };
    const q = await new BuyerDeliveryQuotes(x.s).create(
      'store_a',
      'sandbox',
      { ...mixed, id: 'mixed' },
      x.adapter,
    );
    assert.equal(q.amount, 599);
    assert.equal(x.quoteCalls.at(-1).parcels[0].weightGrams, 4000);
    assert.equal(x.quoteCalls.at(-1).value, 4800);
    const d = new Discounts(x.s);
    await d.save(
      'store_a',
      'sandbox',
      {
        id: 'free',
        commandId: 'save_free',
        expectedVersion: 0,
        code: 'FREE10',
        kind: 'percent',
        value: 10,
        enabled: true,
        freeShipping: true,
      },
      'operator',
    );
    const priced = await x.s.quote('store_a', 'sandbox', {
      ...mixed,
      discountCode: 'FREE10',
      deliveryQuoteId: q.id,
    });
    assert.equal(priced.delivery.amount, 0);
    assert.equal(priced.delivery.amountBeforeDiscount, 599);
    assert.equal(priced.amount, 10080);
    const changed = structuredClone(x.config);
    delete changed.markets[0].delivery[1].customerCharge;
    await db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(changed), 'store_a')
      .run();
    await assert.rejects(
      x.s.quote('store_a', 'sandbox', { ...mixed, deliveryQuoteId: q.id }),
      /delivery_quote_conflict/,
    );
  } finally {
    db.close();
  }
});

test('three separate labels are exactly-once slots; partial/unknown results survive restart and all PDFs are collected', async () => {
  const db = new NodeDatabase();
  db.migrate();
  try {
    await proveParcelSlots(db);
  } finally {
    db.close();
  }
});

test('unsubmitted canceled parcel can be replaced; identity cannot change and additional parcels require seller review', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const x = await multiparcelFixture(db);
  try {
    await x.prepare(0, 'cancel_me');
    await x.commands.cancel('store_a', 'sandbox', 'cancel_me', 'operator');
    await x.prepare(0, 'replacement');
    await assert.rejects(
      db
        .prepare('UPDATE shipment_commands SET parcel_index=1 WHERE id=?')
        .bind('replacement')
        .run(),
      /shipment_command_immutable/,
    );
    await assert.rejects(
      db.prepare("UPDATE shipment_commands SET state='planned' WHERE id=?").bind('cancel_me').run(),
      /shipment_command_immutable/,
    );
    const cfg = structuredClone(x.config);
    cfg.automationPolicy = { autoPrepareIndividualShipments: true, maxCarrierSubsidyMinor: 500 };
    await db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(cfg), 'store_a')
      .run();
    // A manual plan wins; no extra carrier order is purchased automatically.
    assert.equal(
      (
        await new ShippingAutomation(x.s, {
          shippingReadAdapters: { store_a: x.adapter },
        }).preparePacked('store_a', 'sandbox', x.order.id)
      ).skipped,
      true,
    );
    assert.equal(x.creates(), 0);
  } finally {
    db.close();
  }
});

test('multiple individual parcels prepare a manual plan without automatically buying extra labels', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const x = await multiparcelFixture(db, { planned: false });
  try {
    const config = structuredClone(x.config);
    config.automationPolicy = { autoPrepareIndividualShipments: true, maxCarrierSubsidyMinor: 0 };
    await db
      .prepare('UPDATE stores SET config_json=? WHERE id=?')
      .bind(JSON.stringify(config), 'store_a')
      .run();
    const result = await new ShippingAutomation(x.s, {
      shippingReadAdapters: { store_a: x.adapter },
    }).preparePacked('store_a', 'sandbox', x.order.id);
    assert.equal(result.manualParcels, true);
    assert.equal((await x.s.rows('SELECT * FROM shipment_commands')).length, 0);
    assert.equal(x.creates(), 0);
    assert.equal(x.quoteCalls.length, 1);
  } finally {
    db.close();
  }
});

test('seller can combine all kits in one measured box and register one label without repricing the buyer', async () => {
  const db = new NodeDatabase();
  db.migrate();
  const x = await multiparcelFixture(db);
  try {
    await x.ops.prepare(
      'store_a',
      'sandbox',
      x.order.id,
      {
        id: 'combined',
        originId: 'origin',
        recipientIsCompany: false,
        mode: 'measured',
        measurementNote: 'TEST actual packed parcel',
        parcels: [
          {
            weightGrams: 6000,
            dimensionsMm: [300, 300, 300],
            lines: [{ sku: 'couple', quantity: 3 }],
          },
        ],
      },
      'operator',
    );
    await x.ops.quote(
      'store_a',
      'sandbox',
      'combined',
      { id: 'combined_quote' },
      x.adapter,
      'operator',
    );
    await x.commands.prepare(
      'store_a',
      'sandbox',
      x.order.id,
      {
        id: 'combined_command',
        planId: 'combined',
        quoteId: 'combined_quote',
        serviceId: '42',
        maxCost: 599,
      },
      'operator',
    );
    await x.commands.execute('store_a', 'sandbox', 'combined_command', x.adapter, 'operator');
    assert.equal(x.creates(), 1);
    assert.equal(
      (await x.s.getOrder('store_a', 'sandbox', x.order.id)).fulfillment_state,
      'labelled',
    );
    assert.equal((await x.s.getOrder('store_a', 'sandbox', x.order.id)).amount, 10072);
  } finally {
    db.close();
  }
});

for (const quantity of [1, 3])
  test(
    'free customer delivery prepares a manual carrier-cost plan without a zero-budget failure: ' +
      quantity,
    async () => {
      const db = new NodeDatabase();
      db.migrate();
      const x = await multiparcelFixture(db, { quantity, planned: false, freeShipping: true });
      try {
        const config = structuredClone(x.config);
        config.automationPolicy = {
          autoPrepareIndividualShipments: true,
          maxCarrierSubsidyMinor: 0,
        };
        await db
          .prepare('UPDATE stores SET config_json=? WHERE id=?')
          .bind(JSON.stringify(config), 'store_a')
          .run();
        assert.equal(
          (await x.s.getOrder('store_a', 'sandbox', x.order.id)).snapshot.delivery.amount,
          0,
        );
        const result = await new ShippingAutomation(x.s, {
          shippingReadAdapters: { store_a: x.adapter },
        }).preparePacked('store_a', 'sandbox', x.order.id);
        assert.equal(result.manualBudget, true);
        assert.equal(result.manualParcels, quantity > 1);
        assert.equal((await x.s.rows('SELECT * FROM shipment_commands')).length, 0);
        assert.equal(x.creates(), 0);
        assert.equal(x.quoteCalls.length, 1);
      } finally {
        db.close();
      }
    },
  );
