import { digest, identifier } from './validation.mjs';

// Local development adapter only. The production core identity binds this same seam.
export function localOperatorAuthorize(load, now = () => Date.now()) {
  return async (request, store, action) => {
    if (store.environment !== 'sandbox') return false;
    const token = request.headers
      .get('authorization')
      ?.match(/^Bearer ([a-zA-Z0-9_-]{32,128})$/)?.[1];
    if (!token) return false;
    const hash = await digest(token),
      records = await load();
    const record = records.find(
      (r) =>
        r.tokenHash === hash &&
        r.storeId === store.id &&
        r.expiresAt > now() &&
        identifier(r.id) &&
        r.permissions.includes(action),
    );
    return record ? { id: record.id, storeId: store.id, permissions: record.permissions } : false;
  };
}
