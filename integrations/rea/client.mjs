import {readFile, mkdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

export const ROOT = import.meta.dirname;
export const VERSION = '6.5.0';
export const TOOLS = Object.freeze([
  'list_browser_targets', 'inspect_web_page', 'analyze_web_bundle', 'observe_web_session',
  'capture_web_screenshot', 'compare_web_captures', 'compare_web_screenshots',
  'analyze_javascript_application',
]);
const BROWSER = new Set(TOOLS.slice(0, 5));
export const digest = value => createHash('sha256').update(value).digest('hex');

export function origin(value) {
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol) || u.hostname.includes('*') || u.username || u.password ||
      u.origin !== value || u.search || u.hash) throw Error('exact_http_origin_required');
  return u.origin;
}

export function endpoint(value) {
  const u = new URL(value);
  if (u.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(u.hostname) || !u.port ||
      u.username || u.password || u.pathname !== '/' || u.search || u.hash)
    throw Error('literal_loopback_cdp_endpoint_required');
  return u.origin;
}

export async function policy(file = path.join(ROOT, '.local/policy.json')) {
  try {
    const value = JSON.parse(await readFile(file, 'utf8'));
    if (value.version !== 1 || !Array.isArray(value.allowedOrigins) || value.allowedOrigins.length > 20)
      throw Error('invalid_rea_policy');
    return {version: 1, endpoint: endpoint(value.endpoint),
      allowedOrigins: [...new Set(value.allowedOrigins.map(origin))],
      artifactRoot: await realpath(value.artifactRoot)};
  } catch (e) {
    if (e.code === 'ENOENT' && e.path === file) return null;
    throw e;
  }
}

export async function prepareCall(name, args, scope) {
  if (!TOOLS.includes(name)) throw Error('rea_tool_not_allowed');
  if (!args || Array.isArray(args) || typeof args !== 'object') throw Error('object_arguments_required');
  const input = structuredClone(args);
  if (BROWSER.has(name)) {
    if (!scope || !scope.allowedOrigins.length) throw Error('rea_browser_scope_not_configured');
    if (input.cdp_endpoint && input.cdp_endpoint !== scope.endpoint) throw Error('rea_endpoint_out_of_scope');
    if (input.allowed_origins && (!Array.isArray(input.allowed_origins) || !input.allowed_origins.length ||
        input.allowed_origins.some(o => !scope.allowedOrigins.includes(origin(o)))))
      throw Error('rea_origin_out_of_scope');
    input.cdp_endpoint = scope.endpoint;
    input.allowed_origins ??= scope.allowedOrigins;
    if (['inspect_web_page', 'analyze_web_bundle', 'observe_web_session'].includes(name))
      input.observation_ms ??= name === 'observe_web_session' ? 1000 : 500;
    if (input.observation_ms !== undefined && (!Number.isInteger(input.observation_ms) ||
        input.observation_ms < 0 || input.observation_ms > 5000)) throw Error('rea_observation_limit');
    // Public reference analysis never reads account storage or console contents.
    for (const key of ['include_storage_keys', 'include_storage_fingerprints', 'include_console_text',
      'include_json_body_shapes', 'include_websocket_shapes']) {
      if (input[key] === true) throw Error('rea_private_capture_not_allowed');
    }
    if (input.fetch_source_maps === true) throw Error('rea_source_map_fetch_not_enabled');
  }
  if (name === 'analyze_javascript_application') {
    if (!scope) throw Error('rea_artifact_scope_not_configured');
    const target = await realpath(input.input_path);
    const relative = path.relative(scope.artifactRoot, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('rea_artifact_out_of_scope');
    input.input_path = target;
  }
  return input;
}

export async function connect() {
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'node_modules/rea-agents/package.json'), 'utf8'));
  if (pkg.name !== 'rea-agents' || pkg.version !== VERSION) throw Error('rea_pinned_version_required');
  const home = path.join(ROOT, '.local/home');
  await mkdir(home, {recursive: true});
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) =>
    ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT'].includes(k.toUpperCase())));
  Object.assign(env, {HOME: home, USERPROFILE: home, APPDATA: path.join(home, 'AppData/Roaming'),
    LOCALAPPDATA: path.join(home, 'AppData/Local'), NODE_ENV: 'production'});
  const transport = new StdioClientTransport({command: process.execPath,
    args: [path.join(ROOT, 'node_modules/rea-agents/scripts/rea.mjs'), 'mcp'],
    cwd: ROOT, env, stderr: 'pipe'});
  const client = new Client({name: 'pinet-rea', version: '1.0.0'}, {capabilities: {}});
  try {
    await client.connect(transport);
    const catalogue = [];
    let cursor;
    do {
      const page = await client.listTools(cursor ? {cursor} : {});
      catalogue.push(...page.tools.filter(t => TOOLS.includes(t.name)));
      cursor = page.nextCursor;
    } while (cursor);
    if (TOOLS.some(name => !catalogue.some(t => t.name === name))) throw Error('rea_upstream_contract_missing');
    return {client, catalogue, close: () => client.close()};
  } catch (e) { await transport.close(); throw e; }
}

export async function call(connection, name, args, scope) {
  const input = await prepareCall(name, args, scope);
  let result;
  try {
    result = await connection.client.callTool({name, arguments: input}, undefined,
      {timeout: 60_000, maxTotalTimeout: 60_000});
  } catch (e) {
    result = {isError: true, content: [{type: 'text', text: 'REA transport failed: ' + String(e.message).slice(0, 4096)}]};
  }
  const receipt = {version: 1, engine: 'rea-agents', engineVersion: VERSION, tool: name,
    observedAt: new Date().toISOString(), argumentsSha256: digest(JSON.stringify(input)), result};
  const bytes = JSON.stringify(receipt);
  if (Buffer.byteLength(bytes) > 24 * 1024 * 1024) throw Error('rea_result_too_large');
  const sha256 = digest(bytes);
  const target = path.join(ROOT, '.local/evidence', sha256 + '.json');
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(target, bytes, {flag: 'wx', mode: 0o600});
  return {...result, _meta: {...result._meta, pinet: {engineVersion: VERSION, receiptSha256: sha256,
    receiptPath: target, actualToolSucceeded: !result.isError}}};
}
