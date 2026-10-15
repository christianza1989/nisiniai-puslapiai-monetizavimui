#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {connect, call, policy, TOOLS, VERSION} from './client.mjs';

async function main() {
  const [action, name, file] = process.argv.slice(2);
  if (!['doctor', 'schemas', 'call'].includes(action))
    throw Error('Usage: node integrations/rea/cli.mjs doctor | schemas | call TOOL arguments.json');
  const connection = await connect();
  try {
    const scope = await policy();
    if (action === 'doctor') console.log(JSON.stringify({status: 'READY', engine: 'rea-agents',
      version: VERSION, tools: TOOLS, browserConfigured: Boolean(scope?.allowedOrigins.length),
      artifactConfigured: Boolean(scope), scope: 'Website references and offline comparison; no native execution or publishing'}, null, 2));
    else if (action === 'schemas') console.log(JSON.stringify(connection.catalogue, null, 2));
    else {
      const result = await call(connection, name, JSON.parse(await readFile(file, 'utf8')), scope);
      console.log(JSON.stringify(result, null, 2));
      if (result.isError) process.exitCode = 1;
    }
  } finally { await connection.close(); }
}
main().catch(e => {console.error(e.message); process.exitCode = 1;});
