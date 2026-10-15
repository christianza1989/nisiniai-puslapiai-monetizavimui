// TEST ONLY: offline public-key fixtures, never a production Worker entrypoint.
import { createLocalJWKSet } from 'jose';
import { runtimeOptions, runtimeHandler } from '../src/runtime.mjs';
import { AccessOperatorSessions, composeOperatorAuthorize } from '../src/access-identity.mjs';
import { CommerceService } from '../src/service.mjs';
export default {
  fetch(request, env) {
    if (env.TEST_HARNESS !== 'access-fixture-only')
      return new Response('Fixture disabled', { status: 503 });
    const options = runtimeOptions({ ...env, COMMERCE_ACCESS: undefined });
    const operatorSessions = new AccessOperatorSessions({
      configuration: env.TEST_ACCESS_CONFIG,
      db: env.COMMERCE_DB,
      keyResolverFactory: () => createLocalJWKSet(JSON.parse(env.TEST_ACCESS_JWKS)),
    });
    return runtimeHandler(
      new CommerceService(env.COMMERCE_DB),
      {
        ...options,
        operatorSessions,
        operatorAuthorize: composeOperatorAuthorize(options.operatorAuthorize, operatorSessions),
      },
      env.ASSETS,
    )(request);
  },
};
