import { pathToFileURL } from 'node:url';
import { productionD1Target } from '../src/node-production-d1.mjs';
import {
  deliveryPricingCommand,
  updateProductionDeliveryPricing,
} from '../src/node-delivery-pricing.mjs';
export const deliveryPricingUsage =
  'node scripts/update-delivery-pricing.mjs --account <id> --database <uuid> --database-name <name> --confirm-database <uuid> --store <id> --country <LT> --expected-config-hash <sha256> --delivery <comma-separated-ids> --charge <single_parcel|all_parcels> [--apply-remote]';
export async function runDeliveryPricingCommand(
  args,
  { update = updateProductionDeliveryPricing } = {},
) {
  const allowed = [
      '--account',
      '--database',
      '--database-name',
      '--confirm-database',
      '--store',
      '--country',
      '--expected-config-hash',
      '--delivery',
      '--charge',
    ],
    values = {};
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === '--apply-remote') {
      if (apply) throw Error('delivery_pricing_arguments_invalid');
      apply = true;
    } else {
      if (
        !allowed.includes(k) ||
        values[k] !== undefined ||
        !args[i + 1] ||
        args[i + 1].startsWith('--')
      )
        throw Error('delivery_pricing_arguments_invalid');
      values[k] = args[++i];
    }
  }
  const confirmation = values['--confirm-database'],
    target = productionD1Target(
      {
        accountId: values['--account'],
        databaseId: values['--database'],
        databaseName: values['--database-name'],
      },
      confirmation,
    );
  const command = deliveryPricingCommand({
    storeId: values['--store'],
    country: values['--country'],
    expectedConfigHash: values['--expected-config-hash'],
    deliveryIds: values['--delivery']?.split(','),
    customerCharge: values['--charge'],
  });
  return apply
    ? update(target, command, { confirmation })
    : { state: 'PLAN_ONLY_NO_REMOTE_CONNECTION', ...target, ...command };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--help' && process.argv.length === 3) console.log(deliveryPricingUsage);
  else
    try {
      console.log(JSON.stringify(await runDeliveryPricingCommand(process.argv.slice(2)), null, 2));
    } catch (e) {
      console.error(
        JSON.stringify({
          state: 'BLOCKED',
          reason: /^[a-z][a-z0-9_]{2,100}$/.test(e.code || e.message)
            ? e.code || e.message
            : 'delivery_pricing_update_failed',
          usage: deliveryPricingUsage,
        }),
      );
      process.exitCode = 1;
    }
}
