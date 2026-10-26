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
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export function reviewMessage(payload, policy) {
  requireValue(
    email(payload.recipient) &&
      email(policy.from) &&
      typeof payload.orderNumber === 'string' &&
      /^[a-zA-Z0-9]{1,40}$/.test(payload.orderNumber) &&
      /^https:\/\/[a-z0-9.-]+\/atsiliepimas#token=rv1_[a-f0-9]{64}$/.test(
        payload.reviewUrl || '',
      ) &&
      payload.stopUrl === payload.reviewUrl.replace('#token=', '#stop='),
    'notification_message_invalid',
  );
  const id = 'commerce-' + payload.eventId.replaceAll('_', '-');
  requireValue(/^[a-zA-Z0-9-]{1,220}$/.test(id), 'notification_message_invalid');
  const invitation = payload.kind === 'ReviewInvitation';
  const title = invitation ? 'Kaip pavyko sukurti savo prisiminimą?' : 'Jūsų atsiliepimo nuoroda';
  const body = invitation
    ? 'Dėkojame, kad pasirinkote „Memory Casting“. Pasidalykite savo patirtimi: kas patiko ir ką galėtume patobulinti? Jei norite, pridėkite savo sukurtos skulptūros nuotraukų. Vertiname kiekvieną sąžiningą įvertinimą.'
    : 'Gavome jūsų prašymą palikti atsiliepimą. Ši privati nuoroda jau susieta su jūsų pirkiniu. Jei nuorodos neprašėte, laišką galite ignoruoti.';
  return {
    schemaVersion: 1,
    environment: payload.environment,
    storeId: payload.storeId,
    id,
    messageId: `<${id}@${policy.from.split('@')[1]}>`,
    from: policy.from,
    to: payload.recipient,
    replyTo: policy.from,
    subject: invitation
      ? 'Kaip jums sekėsi? Pasidalykite „Memory Casting“ patirtimi'
      : 'Jūsų „Memory Casting“ atsiliepimo nuoroda',
    text: [
      title,
      body,
      'Užsakymas: ' + payload.orderNumber,
      'Palikti atsiliepimą: ' + payload.reviewUrl,
      'Nuoroda galioja 90 dienų. Atsiliepimas bus peržiūrėtas prieš paskelbiant.',
      'Atsisakyti kvietimų: ' + payload.stopUrl,
      'Pagalba: ' + policy.from,
    ].join('\n\n'),
    html: `<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#f8f6f3;color:#292625;font:16px/1.6 Arial,sans-serif"><div style="max-width:560px;margin:24px auto;background:#fff;padding:32px 24px"><p style="font-size:22px">Memory Casting</p><h1 style="font-size:26px;line-height:1.3">${title}</h1><p>${body}</p><p>Užsakymas <strong>${escapeHtml(payload.orderNumber)}</strong></p><p style="margin:28px 0"><a href="${escapeHtml(payload.reviewUrl)}" style="display:inline-block;padding:14px 22px;background:#292625;color:#fff;text-decoration:none;border-radius:6px">Palikti atsiliepimą</a></p><p>Nuoroda galioja 90 dienų. Atsiliepimą peržiūrėsime prieš paskelbdami. Nuotraukas pridėti neprivaloma.</p><p>Klausimų? Atsakykite į šį laišką.</p><p style="font-size:13px;border-top:1px solid #e5ddd8;padding-top:20px"><a href="${escapeHtml(payload.stopUrl)}">Atsisakyti kvietimų palikti atsiliepimą</a>. Tai nepakeis užsakymo pranešimų.</p></div></body></html>`,
  };
}
export function paymentReminderMessage(payload, policy) {
  requireValue(
    payload.language === 'lt' &&
      email(payload.recipient) &&
      email(policy.from) &&
      /^https:\/\/[a-z0-9.-]+\/cart#resume=r1_[a-f0-9-]{36}_[a-z0-9]{8,11}_[a-f0-9]{64}$/.test(
        payload.resumeUrl || '',
      ),
    'notification_message_invalid',
  );
  const id = 'commerce-' + payload.eventId.replaceAll('_', '-');
  requireValue(/^[a-zA-Z0-9-]{1,220}$/.test(id), 'notification_message_invalid');
  const heading = 'Jūsų krepšelyje liko neapmokėtų prekių';
  const body =
    'Pradėjote užsakymą „Memory Casting“ parduotuvėje, tačiau apmokėjimas dar nebaigtas. Jei norite tęsti, grįžkite prie savo užsakymo paspaudę mygtuką.';
  const footer =
    'Jeigu pirkimo nebeplanuojate, nieko daryti nereikia. Daugiau priminimų dėl šio krepšelio nesiųsime.';
  const help = 'Jei reikia pagalbos, atsakykite į šį laišką.';
  return {
    schemaVersion: 1,
    environment: payload.environment,
    storeId: payload.storeId,
    id,
    messageId: `<${id}@${policy.from.split('@')[1]}>`,
    from: policy.from,
    to: payload.recipient,
    replyTo: policy.from,
    subject: 'Jūsų nebaigtas „Memory Casting“ užsakymas',
    text: [heading, body, 'Tęsti apmokėjimą: ' + payload.resumeUrl, footer, help].join('\n\n'),
    html: `<!doctype html><html lang="lt"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:#f8f6f3;color:#292625;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff"><tr><td style="padding:32px 24px;font-size:16px;line-height:1.6"><p style="margin:0 0 28px;font-size:20px">Memory Casting</p><h1 style="font-size:25px;line-height:1.3;margin:0 0 20px">${heading}</h1><p>${body}</p><p style="margin:28px 0"><a href="${escapeHtml(payload.resumeUrl)}" style="display:inline-block;padding:14px 22px;background:#292625;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">Tęsti apmokėjimą</a></p><p>${footer}</p><p>${help}</p><p style="border-top:1px solid #e5ddd8;padding-top:20px;margin-bottom:0"><a style="color:#292625" href="mailto:${escapeHtml(policy.from)}">${escapeHtml(policy.from)}</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}
export function notificationMessage(payload, policy) {
  if (['ReviewInvitation', 'ReviewAccess'].includes(payload.kind))
    return reviewMessage(payload, policy);
  if (payload.kind === 'PaymentReminder') return paymentReminderMessage(payload, policy);
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
      t.reference + ': ' + (payload.orderNumber || payload.orderId),
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
  constructor(service, adapters = {}, { reminderCheck, reviewCheck } = {}) {
    this.s = service;
    this.adapters = adapters;
    this.reminderCheck = reminderCheck;
    this.reviewCheck = reviewCheck;
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
    if (row.kind === 'ReviewInvitation' && row.first_attempt_at === null) {
      requireValue(
        typeof this.reviewCheck === 'function',
        'notification_review_guard_missing',
        503,
      );
      if (!(await this.reviewCheck(store, env, row.order_id))) {
        await this.s
          .stmt(
            "UPDATE customer_notifications SET state='review' WHERE store_id=? AND event_id=? AND first_attempt_at IS NULL AND state='prepared'",
            store,
            eventId,
          )
          .run();
        return { state: 'review', suppressed: true };
      }
    }
    if (row.kind === 'PaymentReminder' && row.first_attempt_at === null) {
      requireValue(
        typeof this.reminderCheck === 'function',
        'notification_reminder_guard_missing',
        503,
      );
      if (!(await this.reminderCheck(store, env, row.order_id))) {
        await this.s
          .stmt(
            "UPDATE customer_notifications SET state='review' WHERE store_id=? AND event_id=? AND state='prepared' AND first_attempt_at IS NULL",
            store,
            eventId,
          )
          .run();
        return { state: 'review', suppressed: true };
      }
    }
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
      command.transport_ref === adapter.accountRef,
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
    requireValue(message.from === adapter.sender, 'notification_transport_changed', 409);
    const claimed = await this.s
      .stmt(
        "UPDATE customer_notifications SET state='sending',first_attempt_at=? WHERE store_id=? AND event_id=? AND first_attempt_at IS NULL AND state='prepared'" +
          (row.kind === 'PaymentReminder'
            ? " AND EXISTS(SELECT 1 FROM orders o WHERE o.store_id=customer_notifications.store_id AND o.id=customer_notifications.order_id AND o.payment_state='pending' AND o.stock_state='reserved' AND o.expires_at>?) AND NOT EXISTS(SELECT 1 FROM withdrawals w WHERE w.store_id=customer_notifications.store_id AND w.order_id=customer_notifications.order_id)"
            : row.kind === 'ReviewInvitation'
              ? ' AND EXISTS(SELECT 1 FROM review_settings rs WHERE rs.store_id=customer_notifications.store_id AND rs.enabled=1) AND NOT EXISTS(SELECT 1 FROM review_optouts ro WHERE ro.store_id=customer_notifications.store_id AND ro.order_id=customer_notifications.order_id) AND NOT EXISTS(SELECT 1 FROM product_reviews pr WHERE pr.store_id=customer_notifications.store_id AND pr.order_id=customer_notifications.order_id)'
              : ''),
        this.s.now(),
        store,
        eventId,
        ...(row.kind === 'PaymentReminder' ? [this.s.now()] : []),
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
