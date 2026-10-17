// Served only by the explicit local foundation fixture harness.
import { CommerceClient } from './commerce-client.mjs';
const client = new CommerceClient(),
  status = document.querySelector('#fixture-status'),
  pay = document.querySelector('#fixture-pay');
try {
  const { context } = await client.initialize(),
    order = await client.resume();
  if (
    !context.fixtureCheckout ||
    context.environment !== 'sandbox' ||
    order.id !== location.pathname.split('/').at(-1)
  )
    throw new Error('fixture_context_invalid');
  status.textContent = 'Užsakymas ' + order.id.slice(0, 8).toUpperCase();
  pay.disabled = false;
  pay.addEventListener('click', async () => {
    pay.disabled = true;
    try {
      await client.request(location.pathname + '/pay', {
        body: {},
        headers: { authorization: 'Bearer ' + client.attempt.token },
      });
      location.assign('/commerce');
    } catch {
      status.textContent = 'Bandymas nepavyko. Pakartokite tą patį veiksmą.';
      pay.disabled = false;
    }
  });
} catch {
  status.textContent = 'Vietinio bandymo užsakymas nerastas.';
}
