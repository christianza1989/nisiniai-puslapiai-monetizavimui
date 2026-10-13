import { requireValue } from './validation.mjs';

// A durable lease serializes requests across isolates. Waiting a full second
// after completion also covers slow responses; no provider operation is retried.
export class ProviderPacing {
  constructor(
    db,
    {
      now = Date.now,
      sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
      maxWaitMs = 10000,
    } = {},
  ) {
    requireValue(db?.prepare, 'carrier_pacing_not_connected', 503);
    this.db = db;
    this.now = now;
    this.sleep = sleep;
    this.maxWaitMs = maxWaitMs;
  }
  async run(scope, perform) {
    requireValue(/^[a-f0-9]{64}$/.test(scope), 'carrier_pacing_scope_invalid', 503);
    const deadline = this.now() + this.maxWaitMs;
    const token = crypto.randomUUID();
    while (true) {
      const at = this.now();
      const claim = await this.db
        .prepare(
          'INSERT INTO provider_request_pacing(scope_hash,next_allowed_at,lease_token,lease_until) VALUES(?,0,?,?) ON CONFLICT(scope_hash) DO UPDATE SET lease_token=excluded.lease_token,lease_until=excluded.lease_until WHERE next_allowed_at<=? AND lease_until<=? RETURNING lease_token',
        )
        .bind(scope, token, at + 90000, at, at)
        .first();
      if (claim) break;
      requireValue(this.now() < deadline, 'carrier_pacing_busy', 503);
      await this.sleep(Math.min(100, deadline - this.now()));
    }
    try {
      return await perform();
    } finally {
      await this.db
        .prepare(
          'UPDATE provider_request_pacing SET next_allowed_at=?,lease_token=NULL,lease_until=0 WHERE scope_hash=? AND lease_token=?',
        )
        .bind(this.now() + 1000, scope, token)
        .run();
    }
  }
}
