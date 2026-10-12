import { workerRuntime, runtimeOptions } from './runtime.mjs';
import { CommerceService } from './service.mjs';
import { CommerceJobs } from './jobs.mjs';
async function scheduledJobs(env, storeId) {
  const options = runtimeOptions(env),
    service = new CommerceService(env.COMMERCE_DB),
    jobs = new CommerceJobs(service, options);
  const stores = storeId
    ? [{ id: storeId }]
    : await service.rows(
        'SELECT id FROM stores WHERE environment=? LIMIT 100',
        options.environment,
      );
  for (const store of stores) {
    try {
      const config = await service.store(store.id, options.environment);
      if (options.environment === 'production' && config.automationPolicy?.approved !== true)
        continue;
      await jobs.scheduled(store.id, options.environment);
    } catch (error) {
      if (!['store_disabled', 'automation_not_admitted'].includes(error.code)) throw error;
    }
  }
}
// Local D1 runtime uses the same domain/repository interface as the Node acceptance adapter.
// Production provider/identity bindings are deliberately absent until admission.
export default {
  async scheduled(_controller, env, context) {
    if (env.COMMERCE_AUTOMATION_ENABLED === '1') context.waitUntil(scheduledJobs(env));
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const body = message.body;
      if (
        env.COMMERCE_AUTOMATION_ENABLED !== '1' ||
        body?.schemaVersion !== 1 ||
        body.environment !== env.COMMERCE_ENV ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(body.storeId)
      ) {
        message.retry({ delaySeconds: 300 });
        continue;
      }
      try {
        await scheduledJobs(env, body.storeId);
        message.ack();
      } catch {
        message.retry({ delaySeconds: 60 });
      }
    }
  },
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
