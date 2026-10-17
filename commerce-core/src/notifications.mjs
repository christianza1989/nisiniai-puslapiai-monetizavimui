import { requireValue, identifier, canonical, digest } from './validation.mjs';
import { requireOperation } from './admission.mjs';
const copy = {
  lt: {
    OrderPlaced: 'Užsakymas išsaugotas',
    PaymentConfirmed: 'Mokėjimas patvirtintas',
    RefundConfirmed: 'Pinigų grąžinimas patvirtintas',
    ShipmentRegistered: 'Siunta užregistruota',
    WithdrawalRequested: 'Atsisakymo prašymas gautas',
    reference: 'Užsakymo numeris',
    amount: 'Užsakymo suma',
    help: 'Jei reikia pagalbos, atsakykite į šį laišką.',
  },
  pl: {
    OrderPlaced: 'Zamówienie zapisane',
    PaymentConfirmed: 'Płatność potwierdzona',
    RefundConfirmed: 'Zwrot pieniędzy potwierdzony',
    ShipmentRegistered: 'Przesyłka zarejestrowana',
    WithdrawalRequested: 'Otrzymaliśmy zgłoszenie odstąpienia',
    reference: 'Numer zamówienia',
    amount: 'Kwota zamówienia',
    help: 'Jeśli potrzebujesz pomocy, odpowiedz na tę wiadomość.',
  },
  lv: {
    OrderPlaced: 'Pasūtījums saglabāts',
    PaymentConfirmed: 'Maksājums apstiprināts',
    RefundConfirmed: 'Atmaksa apstiprināta',
    ShipmentRegistered: 'Sūtījums reģistrēts',
    WithdrawalRequested: 'Atteikuma pieteikums saņemts',
    reference: 'Pasūtījuma numurs',
    amount: 'Pasūtījuma summa',
    help: 'Ja nepieciešama palīdzība, atbildiet uz šo e-pastu.',
  },
  et: {
    OrderPlaced: 'Tellimus salvestatud',
    PaymentConfirmed: 'Makse kinnitatud',
    RefundConfirmed: 'Tagasimakse kinnitatud',
    ShipmentRegistered: 'Saadetis registreeritud',
    WithdrawalRequested: 'Taganemisteade on kätte saadud',
    reference: 'Tellimuse number',
    amount: 'Tellimuse summa',
    help: 'Kui vajate abi, vastake sellele e-kirjale.',
  },
};
const email = (x) =>
  typeof x === 'string' && /^[^\s<>\r\n@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(x);
export function notificationMessage(payload, policy) {
  const t = copy[payload.language] || copy.lt;
  requireValue(
    t[payload.kind] &&
      email(payload.recipient) &&
      email(policy.from) &&
      (!payload.replyTo || email(payload.replyTo)),
    'notification_message_invalid',
  );
  const id = 'commerce-' + payload.eventId.replaceAll('_', '-');
  requireValue(/^[a-zA-Z0-9-]{1,220}$/.test(id), 'notification_message_invalid');
  const amount = new Intl.NumberFormat(payload.language, {
    style: 'currency',
    currency: payload.currency,
  }).format(payload.amount / 100);
  return {
    schemaVersion: 1,
    environment: payload.environment,
    storeId: payload.storeId,
    id,
    messageId: '<' + id + '@' + policy.from.split('@')[1] + '>',
    from: policy.from,
    to: payload.recipient,
    replyTo: payload.replyTo || policy.from,
    subject: '[' + payload.legalName.replace(/[\r\n]/g, ' ') + '] ' + t[payload.kind],
    text: [
      t[payload.kind],
      t.reference + ': ' + payload.orderId,
      t.amount + ': ' + amount,
      t.help,
    ].join('\n\n'),
  };
}
// Reuses the core's authenticated mail service. No SMTP account/provider is created here.
export class CoreMailBindingAdapter {
  constructor({ binding, environment, accountRef, sender }) {
    this.binding = binding;
    this.environment = environment;
    this.accountRef = accountRef;
    this.sender = sender;
  }
  async call(message, method) {
    const response = await this.binding.fetch(
      new Request('https://core-mail.internal/commerce/messages/' + message.id, {
        method,
        signal: AbortSignal.timeout(15000),
        headers: { 'content-type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(message) } : {}),
      }),
    );
    requireValue(response.ok, 'notification_transport_unavailable', 502);
    const fact = await response.json();
    requireValue(
      fact.id === message.id &&
        fact.environment === message.environment &&
        fact.storeId === message.storeId &&
        fact.from === message.from &&
        fact.to === message.to &&
        ['accepted', 'unknown', 'rejected'].includes(fact.status),
      'notification_transport_response_invalid',
      502,
    );
    return fact;
  }
  send(message) {
    return this.call(message, 'POST');
  }
  find(message) {
    return this.call(message, 'GET');
  }
}
export class CustomerNotifications {
  constructor(service, adapters = {}) {
    this.s = service;
    this.adapters = adapters;
  }
  async preview(store, env, eventId) {
    const config = await this.s.store(store, env);
    const row = await this.s.one(
      'SELECT * FROM customer_notifications WHERE store_id=? AND event_id=?',
      store,
      eventId,
    );
    requireValue(row, 'notification_not_found', 404);
    const saved = await this.s.one(
      'SELECT message_json FROM notification_commands WHERE store_id=? AND event_id=?',
      store,
      eventId,
    );
    return {
      state: row.state,
      message: saved
        ? JSON.parse(saved.message_json)
        : notificationMessage(JSON.parse(row.payload_json), {
            from: config.notificationPolicy?.from || 'info@pinet.lt',
          }),
    };
  }
  async execute(store, env, eventId, actor) {
    const config = await this.s.store(store, env);
    requireOperation(config, env);
    const policy = config.notificationPolicy,
      adapter = this.adapters[store];
    requireValue(
      identifier(actor) &&
        typeof eventId === 'string' &&
        /^[a-zA-Z0-9_-]{1,200}$/.test(eventId) &&
        policy?.approved === true &&
        identifier(policy.transportRef) &&
        email(policy.from) &&
        typeof adapter?.send === 'function' &&
        adapter?.accountRef === policy.transportRef &&
        adapter.environment === env &&
        adapter.sender === policy.from,
      'notification_not_admitted',
      403,
    );
    const row = await this.s.one(
      'SELECT * FROM customer_notifications WHERE store_id=? AND event_id=?',
      store,
      eventId,
    );
    requireValue(row, 'notification_not_found', 404);
    if (row.state === 'accepted') return { state: 'accepted', replayed: true };
    let command = await this.s.one(
      'SELECT * FROM notification_commands WHERE store_id=? AND event_id=?',
      store,
      eventId,
    );
    if (!command) {
      const message = notificationMessage(JSON.parse(row.payload_json), policy);
      await this.s
        .stmt(
          'INSERT OR IGNORE INTO notification_commands VALUES(?,?,?,?,?,?)',
          store,
          eventId,
          policy.transportRef,
          JSON.stringify(message),
          await digest(canonical(message)),
          this.s.now(),
        )
        .run();
      command = await this.s.one(
        'SELECT * FROM notification_commands WHERE store_id=? AND event_id=?',
        store,
        eventId,
      );
    }
    const message = JSON.parse(command.message_json);
    requireValue(
      command.transport_ref === adapter.accountRef && message.from === adapter.sender,
      'notification_transport_changed',
      409,
    );
    if (row.first_attempt_at !== null) {
      if (!adapter.find) return { state: row.state, requiresReview: true };
      let fact;
      try {
        fact = await adapter.find(message);
      } catch {
        return { state: row.state, requiresReview: true };
      }
      if (fact?.status === 'accepted') {
        await this.finish(store, eventId, fact, actor);
        return { state: 'accepted', recovered: true };
      }
      return { state: row.state, requiresReview: true }; // Never repeat a non-idempotent SMTP send.
    }
    const claimed = await this.s
      .stmt(
        "UPDATE customer_notifications SET state='sending',first_attempt_at=? WHERE store_id=? AND event_id=? AND first_attempt_at IS NULL AND state='prepared'",
        this.s.now(),
        store,
        eventId,
      )
      .run();
    if (!claimed.meta?.changes) return { state: 'sending', replayed: true };
    try {
      const fact = await adapter.send(message);
      requireValue(fact?.status === 'accepted', 'notification_acceptance_unknown', 502);
      await this.finish(store, eventId, fact, actor);
      return { state: 'accepted', replayed: false };
    } catch {
      await this.s
        .stmt(
          "UPDATE customer_notifications SET state='unknown' WHERE store_id=? AND event_id=? AND state='sending'",
          store,
          eventId,
        )
        .run();
      return { state: 'unknown', requiresReview: true };
    }
  }
  async finish(store, eventId, fact, actor) {
    requireValue(
      typeof fact.reference === 'string' &&
        fact.reference.length > 0 &&
        fact.reference.length <= 200 &&
        !/[\r\n]/.test(fact.reference),
      'notification_acceptance_invalid',
      502,
    );
    await this.s.db.batch([
      this.s.stmt(
        "UPDATE customer_notifications SET state='accepted',transport_ref=? WHERE store_id=? AND event_id=?",
        fact.reference,
        store,
        eventId,
      ),
      ...this.s.event(store, 'NotificationAccepted', eventId, { actorRef: actor }),
    ]);
  }
}
