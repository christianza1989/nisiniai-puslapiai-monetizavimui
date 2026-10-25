import { requireValue, identifier } from './validation.mjs';
export function selectedLocker(method, id) {
  const l = method?.lockers?.find((l) => l.id === id);
  requireValue(method?.kind === 'locker' && l, 'locker_not_enabled');
  return l;
}
export function lockerLocation(l) {
  requireValue(
    l &&
      identifier(l.id) &&
      identifier(l.courier) &&
      typeof l.providerId === 'string' &&
      l.providerId.length > 0 &&
      /^[A-Z]{2}$/.test(l.country) &&
      [l.address, l.city, l.postalCode].every(
        (v) => typeof v === 'string' && v.length > 0 && !/[\x00-\x1f\x7f]/.test(v),
      ),
    'locker_not_enabled',
  );
  return {
    country: l.country,
    line1: l.address,
    city: l.city,
    postalCode: l.postalCode,
    line2: '',
  };
}
export function lockerReference(l) {
  return {
    id: l.id,
    label: l.label,
    country: l.country,
    courier: l.courier,
    providerId: l.providerId,
  };
}
export function configuredDispatch(config, method) {
  if (method?.senderMode !== 'locker') return config.dispatch;
  const l = config.dispatchLockers?.[method.courier];
  requireValue(l?.courier === method.courier, 'shipping_origin_not_found', 503);
  return { ...config.dispatch, ...lockerLocation(l), locker: lockerReference(l) };
}
