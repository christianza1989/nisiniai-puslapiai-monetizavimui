import { requireValue, identifier } from './validation.mjs';
export function operationallyAdmitted(config, environment) {
  return (
    (environment === 'sandbox' && config.testOnly === true) ||
    (environment === 'production' &&
      config.testOnly !== true &&
      config.productionAdmission?.approved === true &&
      config.operationalAdmission?.approved === true)
  );
}
export function requireOperation(config, environment, code = 'operation_not_admitted') {
  requireValue(operationallyAdmitted(config, environment), code, 403);
}
export function documentPolicy(config, environment) {
  if (environment === 'sandbox')
    return {
      testOnly: true,
      series: { sale: 'TEST-S', credit: 'TEST-C', packing: 'TEST-P' },
      timeZone: 'Europe/Vilnius',
    };
  requireOperation(config, environment, 'document_production_not_configured');
  const p = config.documentPolicy,
    legal = config.legalSnapshot;
  requireValue(
    p?.approved === true &&
      p.mode === 'invoice_non_vat' &&
      p.timeZone === 'Europe/Vilnius' &&
      ['sale', 'credit', 'packing'].every(
        (k) => identifier(p.series?.[k]) && p.series[k].length <= 16,
      ) &&
      new Set(Object.values(p.series)).size === 3 &&
      legal?.vatRegistered === false &&
      /^\d{9}$/.test(legal.companyCode) &&
      legal.address?.country === 'LT' &&
      typeof legal.address.line1 === 'string' &&
      legal.address.line1.length >= 2 &&
      typeof legal.address.city === 'string' &&
      /^\d{5}$/.test(legal.address.postalCode),
    'document_policy_invalid',
    503,
  );
  return { ...p, testOnly: false };
}
