import test from 'node:test';
import assert from 'node:assert/strict';
import { NodeDatabase } from '../src/node-db.mjs';
import { BuyerDeliveryQuotes } from '../src/buyer-delivery.mjs';
import { Discounts } from '../src/discounts.mjs';
import { ShipmentCommands } from '../src/shipment-commands.mjs';
import { CommerceService } from '../src/service.mjs';
import { ShippingAutomation } from '../src/shipping-automation.mjs';
import { multiparcelFixture, proveParcelSlots } from './multiparcel-fixtures.mjs';

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
