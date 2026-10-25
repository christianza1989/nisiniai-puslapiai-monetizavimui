// Browser module: money, availability and payment truth always come from the API.
// Credentials stay in tab storage; never append them to URLs or analytics.
export class CommerceClient {
  constructor({
    fetchImpl = (...args) => fetch(...args),
    storage = sessionStorage,
    now = () => Date.now(),
  } = {}) {
    this.fetch = fetchImpl;
    this.storage = storage;
    this.now = now;
    this.busy = false;
  }
  async request(path, { body, headers = {}, method = body === undefined ? 'GET' : 'POST' } = {}) {
    let response;
    try {
      response = await this.fetch(path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        // Include carrier pacing + provider time and the storefront relay margin.
        signal: AbortSignal.timeout(path === '/api/delivery-quotes' ? 35000 : 20000),
      });
    } catch {
      throw new Error('network');
    }
    const value = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(value.error || 'operation_failed');
      error.status = response.status;
      throw error;
    }
    return value;
  }
  async initialize() {
    this.context = await this.request('/api/storefront-context');
    if (!['sandbox', 'production'].includes(this.context.environment) || !this.context.storeId)
      throw new Error('invalid_storefront_context');
    this.key = 'commerce.' + this.context.environment + '.' + this.context.storeId;
    try {
      const saved = JSON.parse(this.storage.getItem(this.key) || 'null');
      if (
        saved &&
        saved.version === 1 &&
        saved.storeId === this.context.storeId &&
        saved.until > this.now() &&
        (saved.recovery === true
          ? /^r1_[a-f0-9-]{36}_[a-z0-9]{8,11}_[a-f0-9]{64}$/.test(saved.token)
          : /^[a-zA-Z0-9_-]{32,128}$/.test(saved.token)) &&
        /^[a-zA-Z0-9_-]{16,100}$/.test(saved.requestKey)
      )
        this.attempt = saved;
      else this.storage.removeItem(this.key);
    } catch {
      this.storage.removeItem(this.key);
    }
    [this.catalog, this.marketData] = await Promise.all([
      this.request('/api/catalog'),
      this.request('/api/markets'),
    ]);
    return {
      context: this.context,
      catalog: this.catalog,
      markets: this.marketData.markets,
      pending: Boolean(this.attempt),
    };
  }
  quote(input) {
    return this.request('/api/quote', { body: input });
  }
  deliveryQuote(input) {
    return this.request('/api/delivery-quotes', { body: { ...input, id: crypto.randomUUID() } });
  }
  persist() {
    // If tab storage is unavailable, stop before a mutation; a lost response
    // must remain retryable with exactly the same key and access credential.
    this.storage.setItem(this.key, JSON.stringify(this.attempt));
    if (this.storage.getItem(this.key) !== JSON.stringify(this.attempt))
      throw new Error('checkout_storage_unavailable');
  }
  async create(input) {
    if (this.busy) throw new Error('checkout_busy');
    if (!this.context || !(this.context.productionReady || this.context.canCreateTestOrder))
      throw new Error('checkout_not_admitted');
    const serialized = JSON.stringify(input);
    const fingerprint = [
      ...new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized)),
      ),
    ]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (this.busy) throw new Error('checkout_busy');
    if (this.attempt && this.attempt.fingerprint !== fingerprint)
      throw new Error('checkout_attempt_exists');
    this.attempt ||= {
      version: 1,
      storeId: this.context.storeId,
      until: this.now() + 3600000,
      requestKey: crypto.randomUUID(),
      token: crypto.randomUUID() + crypto.randomUUID(),
      input: serialized,
      fingerprint,
    };
    this.persist();
    this.busy = true;
    try {
      const result = await this.request('/api/orders', {
        body: input,
        headers: {
          'idempotency-key': this.attempt.requestKey,
          'order-access-token': this.attempt.token,
        },
      });
      if (result.order?.store_id !== this.context.storeId) throw new Error('invalid_order_context');
      this.attempt.orderId = result.order.id;
      // PII is needed only until the order-create response is recovered.
      delete this.attempt.input;
      this.attempt.until = this.now() + 30 * 86400000;
      this.persist();
      return result.order;
    } catch (error) {
      if (
        !this.attempt?.orderId &&
        ([400, 403, 422].includes(error.status) ||
          (error.status === 409 &&
            [
              'stock_unavailable',
              'product_unavailable',
              'quote_price_changed',
              'delivery_quote_conflict',
            ].includes(error.message)))
      ) {
        this.storage.removeItem(this.key);
        this.attempt = undefined;
      }
      throw error;
    } finally {
      this.busy = false;
    }
  }
  async resume() {
    if (!this.attempt) return null;
    if (this.attempt.recovery) {
      const result = await this.openRecovery(this.attempt.token);
      return result.order;
    }
    if (!this.attempt.orderId) return this.create(JSON.parse(this.attempt.input));
    return this.request('/api/orders/' + this.attempt.orderId, {
      headers: { authorization: 'Bearer ' + this.attempt.token },
    });
  }
  async openRecovery(token) {
    if (typeof token !== 'string' || !/^r1_[a-f0-9-]{36}_[a-z0-9]{8,11}_[a-f0-9]{64}$/.test(token))
      throw new Error('payment_recovery_forbidden');
    const result = await this.request('/api/payment-recovery', { body: { token } });
    if (
      !['open', 'restore', 'completed', 'processing', 'unavailable'].includes(result.state) ||
      (result.order && result.order.store_id !== this.context.storeId)
    )
      throw new Error('invalid_order_context');
    this.recoveryState = result.state;
    if (result.order && result.state !== 'restore') {
      this.attempt = {
        version: 1,
        recovery: true,
        storeId: this.context.storeId,
        token,
        requestKey: crypto.randomUUID(),
        orderId: result.order.id,
        until: result.order.created_at + 30 * 86400000,
      };
      this.persist();
    } else this.newOrder();
    return result;
  }
  async checkout() {
    const result = await this.checkoutDetails();
    if (result.uiMode !== 'hosted') throw new Error('checkout_mode_conflict');
    return result.url;
  }
  async checkoutDetails({ uiMode = 'hosted' } = {}) {
    if (!['hosted', 'embedded'].includes(uiMode)) throw new Error('checkout_mode_invalid');
    if (this.busy) throw new Error('checkout_busy');
    if (!this.attempt?.orderId) throw new Error('order_required');
    if (
      !this.context?.paymentConnected ||
      !(this.context.productionReady || this.context.canCreateTestOrder)
    )
      throw new Error('stripe_not_connected');
    this.busy = true;
    try {
      const result = await this.request('/api/orders/' + this.attempt.orderId + '/checkout', {
        body: { uiMode },
        headers: { authorization: 'Bearer ' + this.attempt.token },
      });
      if (!result || typeof result !== 'object' || Array.isArray(result))
        throw new Error('checkout_details_invalid');
      const actualMode =
        result.uiMode === undefined
          ? typeof result.url === 'string'
            ? 'hosted'
            : null
          : result.uiMode;
      if (actualMode === 'embedded') {
        const mode =
          this.context.environment === 'production'
            ? 'live'
            : this.context.environment === 'sandbox'
              ? 'test'
              : null;
        if (
          !mode ||
          (this.context.paymentEnvironment && this.context.paymentEnvironment !== mode) ||
          typeof result.publishableKey !== 'string' ||
          !new RegExp('^pk_' + mode + '_[A-Za-z0-9]{8,240}$').test(result.publishableKey) ||
          typeof result.clientSecret !== 'string' ||
          result.clientSecret.trim().length === 0 ||
          result.clientSecret.length > 16384
        )
          throw new Error('checkout_details_invalid');
        return {
          uiMode: 'embedded',
          clientSecret: result.clientSecret,
          publishableKey: result.publishableKey,
        };
      }
      if (actualMode !== 'hosted') throw new Error('checkout_details_invalid');
      const url = new URL(result.url);
      if (
        !(url.protocol === 'https:' && url.hostname === 'checkout.stripe.com') &&
        !(
          this.context.environment === 'sandbox' &&
          this.context.fixtureCheckout === true &&
          url.origin === location.origin &&
          url.pathname.startsWith('/qa/checkout/')
        )
      )
        throw new Error('checkout_url_invalid');
      return { uiMode: 'hosted', url: url.href };
    } finally {
      this.busy = false;
    }
  }
  withdrawal() {
    if (this.attempt?.recovery) throw new Error('payment_recovery_forbidden');
    if (!this.attempt?.orderId) throw new Error('order_required');
    return this.request('/api/orders/' + this.attempt.orderId + '/withdrawal', {
      body: {},
      headers: { authorization: 'Bearer ' + this.attempt.token },
    });
  }
  receipt() {
    if (!this.attempt?.orderId) throw new Error('order_required');
    return this.request('/api/orders/' + this.attempt.orderId + '/receipt', {
      headers: { authorization: 'Bearer ' + this.attempt.token },
    });
  }
  async document(id) {
    if (this.attempt?.recovery) throw new Error('payment_recovery_forbidden');
    if (!this.attempt?.orderId || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new Error('order_required');
    let response;
    try {
      response = await this.fetch('/api/orders/' + this.attempt.orderId + '/documents/' + id, {
        cache: 'no-store',
        headers: { authorization: 'Bearer ' + this.attempt.token },
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new Error('network');
    }
    if (!response.ok) throw new Error('document_export_failed');
    return response.blob();
  }
  newOrder() {
    if (this.busy) throw new Error('checkout_busy');
    this.storage.removeItem(this.key);
    this.attempt = undefined;
    this.recoveryState = undefined;
  }
}

// Shared selection identity used by storefront adapters and checkout. Money remains server-authoritative.
export function normalizedChoices(value) {
  if (value === undefined) return {};
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length > 8 ||
    !Object.entries(value).every(
      ([k, v]) =>
        /^[a-zA-Z0-9_-]{1,100}$/.test(k) &&
        typeof v === 'string' &&
        /^[a-zA-Z0-9_-]{1,100}$/.test(v) &&
        !['__proto__', 'prototype', 'constructor'].includes(k),
    )
  )
    throw Error('invalid_product_choices');
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}
export const selectionKey = (line) =>
  line.sku + ':' + JSON.stringify(normalizedChoices(line.choices));
export function resolveCatalogSelection(product, country, choices) {
  const selected = normalizedChoices(choices),
    groups = (product.optionGroups ?? []).filter((g) =>
      g.values.some((v) => v.id === g.defaultValue && Number.isSafeInteger(v.prices[country])),
    );
  if (Object.keys(selected).some((id) => !groups.some((g) => g.id === id)))
    throw Error('product_option_unavailable');
  let amount = product.prices?.[country],
    image = product.content?.images?.[0],
    labels = [];
  for (const g of groups) {
    const v = g.values.find((v) => v.id === (selected[g.id] ?? g.defaultValue));
    if (!v?.enabled || !Number.isSafeInteger(v.prices[country]))
      throw Error('product_option_unavailable');
    amount += v.prices[country];
    labels.push(g.label + ': ' + v.label);
    if (v.imageId) image = product.content?.images?.find((m) => m.id === v.imageId) ?? image;
  }
  const complete = Object.fromEntries(groups.map((g) => [g.id, selected[g.id] ?? g.defaultValue]));
  const combinations = (product.content?.images ?? [])
    .filter(
      (m) =>
        Object.keys(m.choices ?? {}).length &&
        Object.entries(m.choices).every(([id, v]) => complete[id] === v),
    )
    .sort((a, b) => Object.keys(b.choices).length - Object.keys(a.choices).length);
  return { amount, image: combinations[0] ?? image, labels };
}
