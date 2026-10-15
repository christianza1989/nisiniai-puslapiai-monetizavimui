#!/usr/bin/env node
import {mkdir, readFile, writeFile, realpath, lstat, symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {ROOT, origin, endpoint, policy} from './client.mjs';

const [action, cdp, targetOrigin, artifactDirectory] = process.argv.slice(2);
async function main() {
  await mkdir(path.join(ROOT, '.local'), {recursive: true});
  if (action === 'configure') {
    const selectedEndpoint = endpoint(cdp), selectedOrigin = origin(targetOrigin);
    const existing = await policy();
    if (existing && existing.endpoint !== selectedEndpoint) throw Error('existing_endpoint_preserved_edit_policy_explicitly');
    const artifactRoot = path.resolve(artifactDirectory ?? path.join(ROOT, '.local/artifacts'));
    await mkdir(artifactRoot, {recursive: true});
    const resolvedRoot = await realpath(artifactRoot);
    if (existing && existing.artifactRoot !== resolvedRoot) throw Error('existing_artifact_root_preserved');
    const value = {version: 1, endpoint: selectedEndpoint,
      allowedOrigins: [...new Set([...(existing?.allowedOrigins ?? []), selectedOrigin])], artifactRoot: resolvedRoot};
    await writeFile(path.join(ROOT, '.local/policy.json'), JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
    console.log(JSON.stringify({configured: true, allowedOrigins: value.allowedOrigins, artifactRoot: resolvedRoot}));
  } else if (action === 'install-skill') {
    const source = await realpath(path.resolve(ROOT, '../../SKILLS/website-reference-analysis'));
    const destination = path.join(process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex'), 'skills/website-reference-analysis');
    await mkdir(path.dirname(destination), {recursive: true});
    try {
      await lstat(destination);
      if ((await realpath(destination)).toLowerCase() !== source.toLowerCase()) throw Error('existing_skill_preserved');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      // lstat first also preserves broken links; never remove a foreign entry.
      try { await lstat(destination); throw Error('existing_skill_preserved'); }
      catch (other) { if (other.code !== 'ENOENT') throw other; }
      await symlink(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
    }
    console.log(JSON.stringify({installed: true, source, destination}));
  } else if (action === 'codex-config') {
    const content = '[mcp_servers.pinet_rea]\ncommand = ' + JSON.stringify(process.execPath) +
      '\nargs = [' + JSON.stringify(path.join(ROOT, 'server.mjs')) + ']\nstartup_timeout_sec = 60\n';
    await writeFile(path.join(ROOT, '.local/codex.toml'), content);
    console.log(content);
  } else throw Error('Usage: setup.mjs configure LOOPBACK_CDP EXACT_ORIGIN [ARTIFACT_DIRECTORY] | install-skill | codex-config');
}
main().catch(e => {console.error(e.message); process.exitCode = 1;});
