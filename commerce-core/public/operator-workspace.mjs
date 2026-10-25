// Read-only projection of the loaded operator list. Never inferred revenue or
// a provider mutation; global totals continue to come from the private API.
export const orderFilters = [
  ['all', 'Visi'],
  ['active', 'Laukia mokėjimo'],
  ['paid', 'Apmokėti'],
  ['fulfillment', 'Paruošti siuntimui'],
  ['expired', 'Rezervacija baigėsi'],
  ['refunds', 'Grąžinimai'],
];
export function orderMatches(order, filter = 'all', query = '', now = Date.now()) {
  const paid = ['paid', 'partially_refunded'].includes(order.payment_state);
  const expired =
    order.payment_state === 'pending' &&
    order.fulfillment_state !== 'canceled' &&
    order.expires_at <= now;
  const matches =
    filter === 'all' ||
    (filter === 'active' &&
      order.payment_state === 'pending' &&
      order.stock_state === 'reserved' &&
      order.expires_at > now) ||
    (filter === 'paid' && paid) ||
    (filter === 'expired' && expired) ||
    (filter === 'refunds' && ['partially_refunded', 'refunded'].includes(order.payment_state)) ||
    (filter === 'fulfillment' &&
      order.payment_state === 'paid' &&
      ['pending', 'ready', 'labelled'].includes(order.fulfillment_state) &&
      order.stock_state === 'allocated');
  const needle = String(query).trim().toLocaleLowerCase('lt');
  const text = [
    order.id,
    order.snapshot?.customer?.name,
    order.snapshot?.customer?.email,
    ...(order.snapshot?.lines || []).map((l) => l.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('lt');
  return matches && (!needle || text.includes(needle));
}
export const viewDescriptions = {
  orders: 'Stebėkite apmokėjimą ir ruoškite užsakymus išsiųsti.',
  stock: 'Paruoštų prekių kiekiai, rezervacijos ir korekcijų istorija.',
  catalog: 'Valdykite aprašymus, kainas, nuotraukas ir pirkėjo pasirinkimus.',
  documents: 'Sąskaitos, grąžinimo ir komplektavimo dokumentai vienoje vietoje.',
  components: 'Medžiagų apskaita ir rinkinių surinkimas.',
  financials: 'Sutikrinkite mokėjimų, komisinių ir banko duomenis.',
  wholesale: 'Partneriai, jų kainynai ir didmenos užsakymai.',
  automation: 'Dokumentų, pašto ir kitų automatinių užduočių būsenos.',
};

// A discard decision abandons unsaved input, never a stored draft or record.
export function confirmDiscard(message) {
  const before = document.activeElement,
    dialog = document.createElement('dialog');
  dialog.className = 'discard-dialog';
  dialog.setAttribute('aria-labelledby', 'discard-title');
  const title = document.createElement('h2');
  title.id = 'discard-title';
  title.textContent = 'Neišsaugoti pakeitimai';
  const text = document.createElement('p');
  text.textContent = message;
  const actions = document.createElement('div');
  actions.className = 'actions';
  const stay = document.createElement('button');
  stay.type = 'button';
  stay.textContent = 'Tęsti redagavimą';
  const leave = document.createElement('button');
  leave.type = 'button';
  leave.textContent = 'Atmesti ir tęsti';
  leave.className = 'primary';
  actions.append(stay, leave);
  dialog.append(title, text, actions);
  document.body.append(dialog);
  return new Promise((resolve) => {
    let answer = false;
    stay.addEventListener('click', () => dialog.close());
    leave.addEventListener('click', () => {
      answer = true;
      dialog.close();
    });
    dialog.addEventListener(
      'close',
      () => {
        dialog.remove();
        before?.focus();
        resolve(answer);
      },
      { once: true },
    );
    dialog.showModal();
    stay.focus();
  });
}
