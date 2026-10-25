import Stripe from 'stripe';
import { requireValue } from './validation.mjs';

// Local operator tool only; this module is not imported by the public Worker.
export function stripeTestConnectionHandler({
  origin,
  accountRef,
  save,
  clientFactory = (key) => new Stripe(key, { maxNetworkRetries: 0 }),
}) {
  const address = new URL(origin);
  requireValue(
    address.protocol === 'http:' &&
      address.hostname === '127.0.0.1' &&
      /^acct_[A-Za-z0-9]+$/.test(accountRef),
    'stripe_connection_origin_invalid',
  );
  const nonce = crypto.randomUUID();
  let busy = false,
    connected = false;
  const headers = {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy':
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'",
  };
  return async (request) => {
    const url = new URL(request.url);
    if (url.origin !== origin || request.headers.get('host') !== address.host)
      return new Response('Forbidden', { status: 403, headers });
    if (request.method === 'GET' && url.pathname === '/')
      return new Response(
        `<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Stripe TEST prijungimas</title><style>body{font:18px/1.6 system-ui;max-width:660px;margin:48px auto;padding:20px}input,button{font:inherit;padding:12px;width:100%;box-sizing:border-box}button{margin-top:16px}small{display:block}code{overflow-wrap:anywhere}</style><h1>Stripe TEST prijungimas</h1><p>Prijungiama tik testinė paskyra <code>${accountRef}</code>. Raktas bus saugomas privačiame vietiniame faile, už Git ir svetainės paketo ribų.</p><form><label for="key">Ribotas testinis API raktas (rk_test_…)</label><input id="key" type="password" required autocomplete="off" spellcheck="false"><button>Patikrinti ir išsaugoti</button></form><p role="status" aria-live="polite"></p><script>document.querySelector('form').onsubmit=async(e)=>{e.preventDefault();const b=document.querySelector('button'),k=document.querySelector('input'),s=document.querySelector('[role=status]');b.disabled=true;try{const r=await fetch('/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nonce:'${nonce}',key:k.value})});const j=await r.json();s.textContent=j.ok?'Testinė paskyra patikrinta. Raktas išsaugotas; toliau prijungsime webhook.':'Nepavyko patikrinti rakto. Patikrinkite paskyrą ir teises.';if(j.ok){k.value='';k.disabled=true}else b.disabled=false}catch{s.textContent='Ryšio klaida';b.disabled=false}};</script></html>`,
        { headers: { ...headers, 'content-type': 'text/html; charset=utf-8' } },
      );
    if (request.method !== 'POST' || url.pathname !== '/connect')
      return new Response('Not found', { status: 404, headers });
    if (
      request.headers.get('origin') !== origin ||
      request.headers.get('content-type') !== 'application/json'
    )
      return new Response('Forbidden', { status: 403, headers });
    let claimed = false;
    try {
      const raw = await request.text();
      requireValue(raw.length <= 4096 && !busy && !connected, 'stripe_connection_not_allowed');
      const input = JSON.parse(raw);
      requireValue(
        input.nonce === nonce && /^rk_test_[A-Za-z0-9]{16,256}$/.test(input.key),
        'stripe_connection_key_invalid',
      );
      busy = true;
      claimed = true;
      const client = clientFactory(input.key);
      const account = await client.accounts.retrieveCurrent();
      requireValue(account.id === accountRef, 'stripe_account_not_verified');
      await save({
        secretKey: input.key,
        accountRef,
        connectionState: 'api_verified_webhook_pending',
      });
      connected = true;
      return Response.json(
        { ok: true, accountRef, environment: 'test', webhookConnected: false },
        { headers },
      );
    } catch {
      return Response.json({ ok: false }, { status: 400, headers });
    } finally {
      if (claimed) busy = false;
    }
  };
}
