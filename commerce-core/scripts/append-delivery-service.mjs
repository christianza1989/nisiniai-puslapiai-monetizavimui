import { pathToFileURL } from 'node:url';
import { productionD1Target } from '../src/node-production-d1.mjs';
import {
  deliveryServiceCommand,
  appendProductionDeliveryService,
} from '../src/node-delivery-service.mjs';
export const usage =
  'node scripts/append-delivery-service.mjs --account <id> --database <uuid> --database-name <name> --confirm-database <uuid> --store <id> --country <LT> --expected-config-hash <sha256> --delivery <id> --service <numeric-id> [--apply-remote]';
export async function runCommand(args, { update = appendProductionDeliveryService } = {}) {
  const allowed = [
      '--account',
      '--database',
      '--database-name',
      '--confirm-database',
      '--store',
      '--country',
      '--expected-config-hash',
      '--delivery',
      '--service',
    ],
    values = {};
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--apply-remote') {
      if (apply) throw Error('delivery_service_arguments_invalid');
      apply = true;
    } else {
      if (
        !allowed.includes(key) ||
        values[key] !== undefined ||
        !args[i + 1] ||
        args[i + 1].startsWith('--')
      )
        throw Error('delivery_service_arguments_invalid');
      values[key] = args[++i];
    }
  }
  const confirmation = values['--confirm-database'];
  const target = productionD1Target(
    {
      accountId: values['--account'],
      databaseId: values['--database'],
      databaseName: values['--database-name'],
    },
    confirmation,
  );
  const command = deliveryServiceCommand({
    storeId: values['--store'],
    country: values['--country'],
    expectedConfigHash: values['--expected-config-hash'],
    deliveryId: values['--delivery'],
    serviceId: values['--service'],
  });
  return apply
    ? update(target, command, { confirmation })
    : { state: 'PLAN_ONLY_NO_REMOTE_CONNECTION', ...target, ...command };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--help' && process.argv.length === 3) console.log(usage);
  else
    try {
      console.log(JSON.stringify(await runCommand(process.argv.slice(2)), null, 2));
    } catch (e) {
      console.error(
        JSON.stringify({
          state: 'BLOCKED',
          reason: /^[a-z][a-z0-9_]{2,100}$/.test(e.code || e.message)
            ? e.code || e.message
            : 'delivery_service_update_failed',
          usage,
        }),
      );
      process.exitCode = 1;
    }
}
