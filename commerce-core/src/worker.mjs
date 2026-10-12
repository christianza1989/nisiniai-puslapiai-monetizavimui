import { workerRuntime } from './runtime.mjs';
// Local D1 runtime uses the same domain/repository interface as the Node acceptance adapter.
// Production provider/identity bindings are deliberately absent until admission.
export default {
  async fetch(request, env) {
    try {
      return await workerRuntime(env)(request);
    } catch {
      return Response.json(
        { error: 'runtime_not_admitted' },
        {
          status: 503,
          headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
        },
      );
    }
  },
};
