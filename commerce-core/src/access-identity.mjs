import { createRemoteJWKSet, jwtVerify } from 'jose';
import { operatorGrantAllows, OPERATOR_GRANTS } from './identity.mjs';
import { CommerceError, requireValue, identifier, integer, digest } from './validation.mjs';
const keySets = new Map();
const text = (v, max = 200) =>
  typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
function remoteKeys(issuer) {
  if (!keySets.has(issuer)) {
    if (keySets.size >= 100) keySets.delete(keySets.keys().next().value);
    keySets.set(
      issuer,
      createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs'), {
        timeoutDuration: 3000,
        cooldownDuration: 30000,
        cacheMaxAge: 600000,
      }),
    );
  }
  return keySets.get(issuer);
}
function validateConfiguration(value, storeId) {
  requireValue(
    value && typeof value === 'object' && !Array.isArray(value),
    'operator_access_configuration_invalid',
    403,
  );
  requireValue(
    Object.keys(value).every((k) =>
      ['issuer', 'audience', 'adminHosts', 'memberships', 'allowBearerBootstrap'].includes(k),
    ),
    'operator_access_configuration_invalid',
    403,
  );
  requireValue(
    typeof value.issuer === 'string' &&
      /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(value.issuer) &&
      typeof value.audience === 'string' &&
      /^[A-Za-z0-9_-]{16,512}$/.test(value.audience) &&
      Array.isArray(value.adminHosts) &&
      value.adminHosts.length > 0 &&
      value.adminHosts.length <= 20 &&
      new Set(value.adminHosts).size === value.adminHosts.length &&
      value.adminHosts.every((h) => typeof h === 'string' && /^[a-z0-9.-]+$/.test(h)) &&
      (value.allowBearerBootstrap === undefined ||
        typeof value.allowBearerBootstrap === 'boolean') &&
      Array.isArray(value.memberships) &&
      value.memberships.length <= 128,
    'operator_access_configuration_invalid',
    403,
  );
  for (const member of value.memberships)
    requireValue(
      member &&
        Object.keys(member).every((k) =>
          [
            'id',
            'issuer',
            'subject',
            'storeId',
            'legalEntityId',
            'environment',
            'permissions',
            'revoked',
          ].includes(k),
        ) &&
        identifier(member.id) &&
        member.issuer === value.issuer &&
        text(member.subject) &&
        member.storeId === storeId &&
        identifier(member.legalEntityId) &&
        ['sandbox', 'production'].includes(member.environment) &&
        typeof member.revoked === 'boolean' &&
        Array.isArray(member.permissions) &&
        member.permissions.includes('read') &&
        new Set(member.permissions).size === member.permissions.length &&
        member.permissions.every((g) => OPERATOR_GRANTS.includes(g)),
      'operator_access_configuration_invalid',
      403,
    );
  return value;
}
// Access authenticates; exact trusted core membership authorizes. No account creation.
export class AccessOperatorSessions {
  constructor({ configuration, db, now = () => Date.now(), keyResolverFactory = remoteKeys } = {}) {
    this.db = db;
    this.now = now;
    this.keyResolverFactory = keyResolverFactory;
    this.configurations = new Map();
    this.invalid = false;
    if (configuration === undefined) return;
    try {
      requireValue(
        typeof configuration === 'string' && configuration.length <= 65536,
        'operator_access_configuration_invalid',
      );
      const parsed = JSON.parse(configuration);
      requireValue(
        parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          Object.keys(parsed).length <= 100 &&
          Object.keys(parsed).every(identifier),
        'operator_access_configuration_invalid',
      );
      this.configurations = new Map(Object.entries(parsed));
    } catch {
      this.invalid = true;
    }
  }
  isConfigured(store) {
    return this.invalid || this.configurations.has(store.id);
  }
  configuration(store) {
    requireValue(
      !this.invalid && this.configurations.has(store.id),
      'operator_access_configuration_invalid',
      403,
    );
    return validateConfiguration(this.configurations.get(store.id), store.id);
  }
  isAdminHost(request, store) {
    try {
      const url = new URL(request.url);
      return (
        url.protocol === 'https:' &&
        !url.port &&
        this.configuration(store).adminHosts.includes(url.hostname)
      );
    } catch {
      return false;
    }
  }
  allowsBearerBootstrap(store) {
    try {
      return this.configuration(store).allowBearerBootstrap === true;
    } catch {
      return false;
    }
  }
  async identify(request, store, action, { allowRevoked = false } = {}) {
    const config = this.configuration(store),
      url = new URL(request.url);
    requireValue(
      url.protocol === 'https:' && !url.port && config.adminHosts.includes(url.hostname),
      'operator_forbidden',
      403,
    );
    const token = request.headers.get('cf-access-jwt-assertion');
    requireValue(
      typeof token === 'string' && token.length > 0 && token.length <= 16384,
      'operator_forbidden',
      403,
    );
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.keyResolverFactory(config.issuer), {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ['RS256'],
        currentDate: new Date(this.now()),
      }));
    } catch {
      throw new CommerceError('operator_forbidden', 403);
    }
    requireValue(
      payload.type === 'app' &&
        text(payload.sub) &&
        text(payload.email, 320) &&
        payload.common_name === undefined &&
        integer(payload.iat, 0, 9999999999) &&
        integer(payload.exp, 0, 9999999999),
      'operator_forbidden',
      403,
    );
    const matches = config.memberships.filter(
      (m) =>
        m.issuer === payload.iss &&
        m.subject === payload.sub &&
        operatorGrantAllows(
          { ...m, issuedAt: payload.iat * 1000, expiresAt: payload.exp * 1000 },
          store,
          action,
          this.now(),
        ),
    );
    requireValue(matches.length === 1, 'operator_forbidden', 403);
    if (!['GET', 'HEAD'].includes(request.method))
      requireValue(request.headers.get('origin') === url.origin, 'operator_csrf_forbidden', 403);
    const tokenHash = await digest(token);
    if (!allowRevoked)
      requireValue(
        !(await this.db
          .prepare('SELECT 1 FROM operator_access_revocations WHERE store_id=? AND token_hash=?')
          .bind(store.id, tokenHash)
          .first()),
        'operator_forbidden',
        403,
      );
    const member = matches[0];
    return {
      tokenHash,
      principal: {
        id: member.id,
        storeId: store.id,
        legalEntityId: store.legalEntityId,
        environment: store.environment,
        permissions: [...member.permissions],
        authentication: 'access',
        expiresAt: payload.exp * 1000,
      },
    };
  }
  async authorize(request, store, action) {
    try {
      return (await this.identify(request, store, action)).principal;
    } catch {
      return false;
    }
  }
  async logout(request, store) {
    requireValue(request.method === 'POST', 'operator_forbidden', 403);
    const { tokenHash, principal } = await this.identify(request, store, 'read', {
      allowRevoked: true,
    });
    await this.db.batch([
      this.db
        .prepare(
          'INSERT OR IGNORE INTO operator_access_revocations(store_id,token_hash,expires_at,revoked_at,actor_ref) VALUES(?,?,?,?,?)',
        )
        .bind(store.id, tokenHash, principal.expiresAt, this.now(), principal.id),
      this.db
        .prepare('DELETE FROM operator_access_revocations WHERE store_id=? AND expires_at<=?')
        .bind(store.id, this.now()),
    ]);
    return { loggedOut: true, logoutUrl: new URL('/cdn-cgi/access/logout', request.url).href };
  }
}
export function composeOperatorAuthorize(bearer, sessions) {
  return async (request, store, action) => {
    if (sessions.isConfigured(store)) {
      if (request.headers.has('cf-access-jwt-assertion'))
        return sessions.authorize(request, store, action);
      if (!sessions.allowsBearerBootstrap(store)) return false;
    }
    return bearer ? bearer(request, store, action) : false;
  };
}
