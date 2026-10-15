import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv';
import {projectTool} from '../tool-schema.mjs';
import {prepareCall} from '../client.mjs';

const original = JSON.parse(await readFile(new URL('./fixtures/inspect-web-page.schema.json', import.meta.url)));
test('published inspect schema accepts target-only input after endpoint projection', async () => {
  const projected = projectTool({name: 'inspect_web_page', description: 'Fixture from pinned REA6.5.0', inputSchema: original});
  const validate = new AjvJsonSchemaValidator().getValidator(projected.inputSchema);
  const input = {target_id: 'TARGET_ID_FROM_LIST_BROWSER_TARGETS'};
  assert.equal(validate(input).valid, true);
  assert.equal(validate({}).valid, false);
  assert.equal(validate({...input, cdp_endpoint: 'http://127.0.0.1:9222'}).valid, false);
  for (const example of projected.inputSchema.examples) assert.equal(validate(example).valid, true);
  const prepared = await prepareCall('inspect_web_page', input,
    {endpoint: 'http://127.0.0.1:9338', allowedOrigins: ['https://example.com']});
  assert.equal(prepared.cdp_endpoint, 'http://127.0.0.1:9338');
  assert.deepEqual(prepared.allowed_origins, ['https://example.com']);
  assert.equal(original.minProperties, 2); // The upstream fixture is preserved.
});
