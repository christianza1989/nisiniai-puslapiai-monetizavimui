import { CommerceService } from './service.mjs';
import { CoreMailBindingAdapter } from './notifications.mjs';
import { PublicAbuseGuard } from './public-guard.mjs';
import { createHandler } from './http.mjs';
import { StripeCheckoutAdapter } from './stripe-adapter.mjs';
import { SendparcelAdapter, SENDPARCEL_PRODUCTION } from './sendparcel-adapter.mjs';
import { SendparcelBookingAdapter } from './sendparcel-booking.mjs';
import { coreOperatorAuthorize } from './identity.mjs';
import { AccessOperatorSessions, composeOperatorAuthorize } from './access-identity.mjs';
import { R2PrivateStorage, limitedBytes } from './private-storage.mjs';
import { requireValue } from './validation.mjs';
import { ProviderPacing } from './provider-pacing.mjs';
const parse = (raw, fallback) => {
  if (raw === undefined) return fallback;
  requireValue(
    typeof raw === 'string' && raw.length <= 65536,
    'runtime_configuration_invalid',
    503,
  );
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('runtime_configuration_invalid');
  }
};
export function runtimeOptions(env) {
  const environment = env.COMMERCE_ENV;
  requireValue(
    ['sandbox', 'production'].includes(environment) &&
      (environment !== 'production' || env.COMMERCE_RUNTIME_ADMISSION === 'approved'),
    'runtime_not_admitted',
    503,
  );
  const connections = parse(env.COMMERCE_CONNECTIONS, {});
  const operatorSessions = new AccessOperatorSessions({
    configuration: env.COMMERCE_ACCESS,
    db: env.COMMERCE_DB,
  });
  requireValue(
    connections &&
      typeof connections === 'object' &&
      !Array.isArray(connections) &&
      Object.keys(connections).length <= 100,
    'runtime_configuration_invalid',
    503,
  );
  const paymentAdapters = {},
    shippingAdapters = {},
    shippingReadAdapters = {},
    notificationAdapters = {};
  for (const [storeId, connection] of Object.entries(connections)) {
    requireValue(
      /^[a-zA-Z0-9_-]{1,100}$/.test(storeId) && connection && typeof connection === 'object',
      'runtime_configuration_invalid',
      503,
    );
    if (connection.stripe)
      paymentAdapters[storeId] = new StripeCheckoutAdapter({
        apiKey: connection.stripe.apiKey,
        accountRef: connection.stripe.accountRef,
        webhookSecret: connection.stripe.webhookSecret,
        environment,
      });
    if (connection.mail && env.COMMERCE_MAIL)
      notificationAdapters[storeId] = new CoreMailBindingAdapter({
        binding: env.COMMERCE_MAIL,
        environment,
        accountRef: connection.mail.transportRef,
        sender: connection.mail.sender,
      });
    if (connection.sendparcel) {
      const carrierOptions = {
        accountRef: connection.sendparcel.accountRef,
        apiPassword: connection.sendparcel.apiPassword,
        rateLimiter: new ProviderPacing(env.COMMERCE_DB),
        labelFileNames: connection.sendparcel.labelFileNames,
        environment,
        ...(environment === 'production'
          ? {
              baseUrl: SENDPARCEL_PRODUCTION,
              productionReadAdmission: connection.sendparcel.productionReadAdmission === true,
            }
          : {}),
      };
      shippingReadAdapters[storeId] = new SendparcelAdapter(carrierOptions);
      if (connection.sendparcel.bookingAdmission?.approved === true)
        shippingAdapters[storeId] = new SendparcelBookingAdapter({
          ...carrierOptions,
          bookingAdmission: connection.sendparcel.bookingAdmission,
        });
    }
  }
  return {
    environment,
    paymentAdapters,
    shippingAdapters,
    shippingReadAdapters,
    notificationAdapters,
    publicAbuseGuard:
      env.COMMERCE_ABUSE_SALT && env.COMMERCE_DB
        ? (request, store, kind) =>
            new PublicAbuseGuard(
              new CommerceService(env.COMMERCE_DB),
              env.COMMERCE_ABUSE_SALT,
            ).allow(request, store, kind)
        : undefined,
    operatorSessions,
    operatorAuthorize: composeOperatorAuthorize(
      coreOperatorAuthorize(async () => parse(env.COMMERCE_CORE_GRANTS, [])),
      operatorSessions,
    ),
    privateStorage: env.COMMERCE_FILES ? new R2PrivateStorage(env.COMMERCE_FILES) : undefined,
    loadDocumentFont: env.ASSETS
      ? async () => {
          const result = await env.ASSETS.fetch(
            new Request('https://commerce-assets.internal/fonts/NotoSans-Regular.ttf'),
          );
          requireValue(result.ok, 'document_font_missing', 503);
          return limitedBytes(result.body);
        }
      : undefined,
  };
}
export const adminAssets = {
  '/admin': '/admin.html',
  '/admin.css': '/admin.css',
  '/admin.mjs': '/admin.mjs',
  '/backoffice-ui.mjs': '/backoffice-ui.mjs',
  '/finished-stock-ui.mjs': '/finished-stock-ui.mjs',
  '/shipping-ui.mjs': '/shipping-ui.mjs',
  '/private-files-ui.mjs': '/private-files-ui.mjs',
  '/shipment-commands-ui.mjs': '/shipment-commands-ui.mjs',
  '/jobs-ui.mjs': '/jobs-ui.mjs',
  '/catalog-ui.mjs': '/catalog-ui.mjs',
  '/finance-io-ui.mjs': '/finance-io-ui.mjs',
  '/returns-ui.mjs': '/returns-ui.mjs',
  '/commerce': '/commerce.html',
  '/commerce-client.mjs': '/commerce-client.mjs',
  '/checkout-ui.mjs': '/checkout-ui.mjs',
  '/checkout.css': '/checkout.css',
  '/commerce-preview.mjs': '/commerce-preview.mjs',
};
export function runtimeHandler(service, options, assets) {
  const api = createHandler({ service, ...options });
  return async (request) => {
    try {
      const url = new URL(request.url);
      const store = await service.resolveHost(url.host, options.environment);
      if (['GET', 'HEAD'].includes(request.method) && adminAssets[url.pathname] && assets) {
        const buyerAssets = [
          '/commerce',
          '/commerce-client.mjs',
          '/checkout-ui.mjs',
          '/checkout.css',
          '/commerce-preview.mjs',
        ];
        if (!buyerAssets.includes(url.pathname) && options.operatorSessions?.isConfigured(store)) {
          const principal = await options.operatorAuthorize?.(request, store, 'read');
          requireValue(
            principal?.storeId === store.id &&
              Array.isArray(principal.permissions) &&
              principal.permissions.includes('read'),
            'operator_forbidden',
            403,
          );
        }
        const assetUrl = new URL(adminAssets[url.pathname], url.origin);
        const response = await assets.fetch(new Request(assetUrl, { method: request.method }));
        const headers = new Headers(response.headers);
        headers.set('cache-control', 'no-store');
        headers.set('x-robots-tag', 'noindex, nofollow');
        headers.set('x-content-type-options', 'nosniff');
        headers.set(
          'content-security-policy',
          "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        );
        return new Response(response.body, { status: response.status, headers });
      }
      return api(request);
    } catch (error) {
      return Response.json(
        { error: error.code || 'runtime_configuration_invalid' },
        {
          status: error.status || 503,
          headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
        },
      );
    }
  };
}
export function workerRuntime(env) {
  return runtimeHandler(new CommerceService(env.COMMERCE_DB), runtimeOptions(env), env.ASSETS);
}
