// Default plan does not connect remotely. Verify the public approved revision first.
import { pathToFileURL } from 'node:url';
import { productionD1Target } from '../src/node-production-d1.mjs';
import { marketPolicyCommand, updateProductionMarketPolicy } from '../src/node-market-policy.mjs';

export const marketPolicyUsage =
  'node scripts/update-market-policy.mjs --account <account-id> --database <uuid> --database-name <name> --confirm-database <same-uuid> --store <store-id> --country <country> --expected-old <sha256> --next <approved-public-sha256> [--apply-remote]';
export function parseMarketPolicyArgs(args) {
  const values = {},
    allowed = [
      '--account',
      '--database',
      '--database-name',
      '--confirm-database',
      '--store',
      '--country',
      '--expected-old',
      '--next',
    ];
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--apply-remote') {
      if (apply) throw Error('market_policy_arguments_invalid');
      apply = true;
    } else {
      if (
        !allowed.includes(key) ||
        !args[i + 1] ||
        args[i + 1].startsWith('--') ||
        values[key] !== undefined
      )
        throw Error('market_policy_arguments_invalid');
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
  const command = marketPolicyCommand({
    storeId: values['--store'],
    country: values['--country'],
    expectedPolicyVersion: values['--expected-old'],
    nextPolicyVersion: values['--next'],
  });
  return { target, command, confirmation, apply };
}
export async function runMarketPolicyCommand(args, dependencies = {}) {
  const { target, command, confirmation, apply } = parseMarketPolicyArgs(args);
  if (!apply)
    return {
      state: 'PLAN_ONLY_NO_REMOTE_CONNECTION',
      ...target,
      ...command,
      next: 'Verify the approved public terms revision, then use explicit --apply-remote.',
    };
  return (dependencies.update || updateProductionMarketPolicy)(target, command, { confirmation });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--help')
    console.log(marketPolicyUsage);
  else
    try {
      console.log(JSON.stringify(await runMarketPolicyCommand(process.argv.slice(2)), null, 2));
    } catch (error) {
      const reason = error.code || error.message;
      console.error(
        JSON.stringify({
          state: 'BLOCKED',
          reason: /^[a-z][a-z0-9_]{2,100}$/.test(reason || '')
            ? reason
            : 'market_policy_update_failed',
          usage: marketPolicyUsage,
        }),
      );
      process.exitCode = 1;
    }
}
