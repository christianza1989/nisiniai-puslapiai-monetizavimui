import { requireValue, digest } from './validation.mjs';
export class PublicAbuseGuard {
  constructor(service, salt) {
    this.s = service;
    this.salt = salt;
  }
  async allow(request, store, kind) {
    requireValue(
      typeof this.salt === 'string' && this.salt.length >= 32 && this.salt.length <= 256,
      'public_guard_not_configured',
      503,
    );
    const address = request.headers.get('cf-connecting-ip');
    requireValue(
      typeof address === 'string' && /^[a-fA-F0-9:.]{3,100}$/.test(address),
      'public_client_address_missing',
      503,
    );
    const limit = { quote: 60, delivery: 20, order: 10 }[kind];
    requireValue(limit, 'public_guard_action_invalid');
    const at = this.s.now(),
      window = Math.floor(at / 600000) * 600000;
    const hash = await digest(this.salt + '\n' + store.id + '\n' + kind + '\n' + address);
    const accepted = await this.s
      .stmt(
        'INSERT INTO public_request_limits VALUES(?,?,?,1) ON CONFLICT(store_id,scope_hash,window_start) DO UPDATE SET count=count+1 WHERE count<? RETURNING count',
        store.id,
        hash,
        window,
        limit,
      )
      .first();
    requireValue(accepted, 'public_rate_limit', 429);
    await this.s
      .stmt(
        'DELETE FROM public_request_limits WHERE store_id=? AND window_start<?',
        store.id,
        window - 3600000,
      )
      .run();
  }
}
