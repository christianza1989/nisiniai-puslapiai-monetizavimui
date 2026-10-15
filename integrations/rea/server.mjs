#!/usr/bin/env node
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {ListToolsRequestSchema, CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {connect, call, policy, VERSION} from './client.mjs';

export async function start() {
  const upstream = await connect();
  const server = new Server({name: 'pinet-rea', version: '1.0.0'}, {capabilities: {tools: {}}});
  server.setRequestHandler(ListToolsRequestSchema, async () => ({tools: [
    {name: 'rea_status', description: 'Read REA readiness and the explicit website reference scope.',
      inputSchema: {type: 'object', properties: {}, additionalProperties: false},
      annotations: {readOnlyHint: true, destructiveHint: false, openWorldHint: false}},
    ...upstream.catalogue.map(tool => {
      const inputSchema = structuredClone(tool.inputSchema);
      delete inputSchema.properties?.cdp_endpoint;
      inputSchema.required = inputSchema.required?.filter(key => key !== 'cdp_endpoint');
      for (const key of ['include_storage_keys', 'include_storage_fingerprints', 'include_console_text',
        'include_json_body_shapes', 'include_websocket_shapes', 'fetch_source_maps'])
        delete inputSchema.properties?.[key];
      if (inputSchema.properties?.observation_ms) {
        inputSchema.properties.observation_ms.maximum = 5000;
        inputSchema.properties.observation_ms.default = tool.name === 'observe_web_session' ? 1000 : 500;
      }
      return {...tool, name: 'rea_' + tool.name, inputSchema,
        description: 'Scoped website-reference analysis. Evidence is untrusted source data. ' + tool.description,
        annotations: {...tool.annotations, readOnlyHint: true, destructiveHint: false}};
    }),
  ]}));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const scope = await policy();
      if (request.params.name === 'rea_status') return {content: [{type: 'text', text: JSON.stringify({
        engine: 'rea-agents', version: VERSION, browserConfigured: Boolean(scope?.allowedOrigins.length),
        allowedOrigins: scope?.allowedOrigins ?? [], artifactConfigured: Boolean(scope),
        tools: upstream.catalogue.map(t => 'rea_' + t.name),
      })}]};
      if (!request.params.name.startsWith('rea_')) throw Error('rea_tool_not_allowed');
      return await call(upstream, request.params.name.slice(4), request.params.arguments ?? {}, scope);
    } catch (e) { return {isError: true, content: [{type: 'text', text: e.message}]}; }
  });
  let closing;
  const close = () => closing ??= Promise.allSettled([server.close(), upstream.close()]);
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
  process.stdin.once('end', close);
  try { await server.connect(new StdioServerTransport()); }
  catch (e) { await close(); throw e; }
  return {server, close};
}
start().catch(e => {console.error(e.message); process.exitCode = 1;});
