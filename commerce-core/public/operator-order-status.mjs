export function reservationExpired(order, now = Date.now()) {
  return (
    order.payment_state === 'pending' &&
    order.stock_state === 'released' &&
    Number.isFinite(order.expires_at) &&
    order.expires_at <= now
  );
}
export function paymentLabel(order, names, now = Date.now()) {
  return reservationExpired(order, now)
    ? 'Neapmokėta – rezervacija baigėsi'
    : names[order.payment_state] || order.payment_state;
}
export function fulfillmentLabel(order, names) {
  return order.payment_state === 'pending' && order.fulfillment_state === 'pending'
    ? 'Laukiama apmokėjimo'
    : names[order.fulfillment_state] || order.fulfillment_state;
}
export function refundableAmount(order, held = 0) {
  return ['paid', 'partially_refunded'].includes(order.payment_state) && order.payment_id
    ? Math.max(0, order.amount - order.refunded_amount - held)
    : 0;
}
