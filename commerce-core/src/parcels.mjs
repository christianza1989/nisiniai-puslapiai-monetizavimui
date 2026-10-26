import { requireValue, integer, identifier, normalizeCart } from './validation.mjs';

// A package profile describes one already packed product. Combining products
// requires an operator's actual parcel measurements, never guessed dimensions.
export function planParcels(order, input) {
  requireValue(
    order?.snapshot?.lines && ['individual', 'measured'].includes(input?.mode),
    'invalid_parcel_plan',
  );
  const wanted = normalizeCart(
    order.snapshot.lines.map(({ sku, quantity }) => ({ sku, quantity })),
  );
  let parcels;
  if (input.mode === 'individual') {
    requireValue(wanted.reduce((sum, line) => sum + line.quantity, 0) <= 100, 'parcel_count_limit');
    parcels = order.snapshot.lines.flatMap((line) =>
      Array.from({ length: line.quantity }, () => ({
        weightGrams: line.package?.weightGrams,
        dimensionsMm: line.package?.dimensionsMm,
        lines: [{ sku: line.sku, quantity: 1 }],
      })),
    );
  } else {
    requireValue(
      Array.isArray(input.parcels) &&
        input.parcels.length > 0 &&
        input.parcels.length <= 100 &&
        typeof input.measurementNote === 'string' &&
        input.measurementNote.trim().length >= 3 &&
        input.measurementNote.trim().length <= 160 &&
        !/[\x00-\x1f\x7f]/.test(input.measurementNote),
      'invalid_parcel_measurement',
    );
    parcels = input.parcels.map((parcel) => ({ ...parcel, lines: normalizeCart(parcel.lines) }));
  }
  for (const p of parcels)
    requireValue(
      integer(p.weightGrams, 1, 1000000) &&
        Array.isArray(p.dimensionsMm) &&
        p.dimensionsMm.length === 3 &&
        p.dimensionsMm.every((v) => integer(v, 1, 10000)) &&
        p.lines.every((l) => identifier(l.sku)),
      'invalid_parcel_dimensions',
    );
  const quantities = new Map();
  for (const parcel of parcels)
    for (const line of parcel.lines)
      quantities.set(line.sku, (quantities.get(line.sku) || 0) + line.quantity);
  const coverage = normalizeCart([...quantities].map(([sku, quantity]) => ({ sku, quantity })));
  requireValue(
    JSON.stringify(coverage) === JSON.stringify(wanted),
    'parcel_contents_mismatch',
    409,
  );
  return {
    mode: input.mode,
    ...(input.mode === 'measured' ? { measurementNote: input.measurementNote.trim() } : {}),
    parcels: parcels.map((p, index) => ({
      index,
      weightGrams: p.weightGrams,
      dimensionsMm: [...p.dimensionsMm],
      lines: p.lines,
    })),
    totalWeightGrams: parcels.reduce((sum, p) => sum + p.weightGrams, 0),
  };
}

// Separate the customer delivery subsidy from actual operator parcel bookings.
// Stored order cents are assigned to physical units in stable order, then to
// the plan's exact SKU coverage. This does not change customer/order totals.
export function shipmentPart(order, plan, parcelIndex) {
  requireValue(
    parcelIndex === undefined || integer(parcelIndex, 0, plan.parcels.length - 1),
    'invalid_shipment_parcel',
  );
  if (parcelIndex === undefined) return { parcels: plan.parcels, value: plan.value };
  const units = new Map();
  for (const line of order.snapshot.lines) {
    const total = line.netLineAmount ?? line.lineAmount;
    requireValue(integer(total, 0) && integer(line.quantity, 1), 'invalid_shipment_value');
    const values = units.get(line.sku) || [];
    for (let i = 0; i < line.quantity; i++)
      values.push(Math.floor(total / line.quantity) + (i < total % line.quantity ? 1 : 0));
    units.set(line.sku, values);
  }
  const values = plan.parcels.map((parcel) =>
    parcel.lines.reduce((sum, line) => {
      const available = units.get(line.sku);
      requireValue(available?.length >= line.quantity, 'parcel_contents_mismatch', 409);
      return sum + available.splice(0, line.quantity).reduce((n, value) => n + value, 0);
    }, 0),
  );
  requireValue(
    [...units.values()].every((v) => !v.length),
    'parcel_contents_mismatch',
    409,
  );
  return {
    parcels: [plan.parcels[parcelIndex]],
    // Carrier v1 requires a positive declared value even for a fully discounted
    // parcel. One cent is a declaration floor, never a customer charge.
    value: Math.max(1, values[parcelIndex]),
    parcelIndex,
    parcelCount: plan.parcels.length,
  };
}

export function customerPricedParcel(plan) {
  return [...plan.parcels].sort(
    (a, b) =>
      b.weightGrams - a.weightGrams ||
      b.dimensionsMm.reduce((v, n) => v * n, 1) - a.dimensionsMm.reduce((v, n) => v * n, 1) ||
      a.index - b.index,
  )[0];
}
