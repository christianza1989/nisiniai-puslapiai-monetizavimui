import { CommerceService } from './service.mjs';
import { createHandler } from './http.mjs';
// Local D1 runtime uses the same domain/repository interface as the Node acceptance adapter.
// Production provider/identity bindings are deliberately absent until admission.
export default {
  async fetch(request, env) {
    if (env.COMMERCE_ENV !== 'sandbox')
      return Response.json(
        { error: 'runtime_not_admitted' },
        { status: 503, headers: { 'cache-control': 'no-store' } },
      );
    return createHandler({ service: new CommerceService(env.COMMERCE_DB), environment: 'sandbox' })(
      request,
    );
  },
};
