import {
  migrateProductionD1,
  productionD1Target,
  productionMigrationSources,
} from '../src/node-production-d1.mjs';
import { digest } from '../src/validation.mjs';
const usage =
  'node scripts/migrate-production-d1.mjs --account <account-id> --database <uuid> --database-name <name> --confirm-database <same-uuid> [--apply-remote]';
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(usage);
  process.exit(0);
}
try {
  const options = {};
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply-remote') {
      apply = true;
      continue;
    }
    if (
      !['--account', '--database', '--database-name', '--confirm-database'].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw Error('production_d1_arguments_invalid');
    if (options[args[i]] !== undefined) throw Error('production_d1_arguments_invalid');
    options[args[i]] = args[++i];
  }
  const target = productionD1Target(
    {
      accountId: options['--account'],
      databaseId: options['--database'],
      databaseName: options['--database-name'],
    },
    options['--confirm-database'],
  );
  if (!apply) {
    const sources = await productionMigrationSources();
    console.log(
      JSON.stringify(
        {
          state: 'PLAN_ONLY_NO_REMOTE_CONNECTION',
          ...target,
          migrations: await Promise.all(
            sources.map(async (s) => ({
              name: s.name,
              sha256: await digest(s.source.replaceAll('\r\n', '\n')),
            })),
          ),
          next: 'Explicit --apply-remote executes schema changes on this exact confirmed database.',
        },
        null,
        2,
      ),
    );
  } else
    console.log(
      JSON.stringify(
        await migrateProductionD1(target, { confirmation: options['--confirm-database'] }),
        null,
        2,
      ),
    );
} catch (error) {
  const code = error.code || error.message;
  console.error(
    JSON.stringify({
      state: 'BLOCKED',
      reason: /^[a-z][a-z0-9_]{2,100}$/.test(code || '') ? code : 'production_d1_migration_failed',
      usage,
    }),
  );
  process.exitCode = 1;
}
