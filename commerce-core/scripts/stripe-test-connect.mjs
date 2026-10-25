import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { stripeTestConnectionHandler } from '../src/stripe-test-connect.mjs';
import { requireValue } from '../src/validation.mjs';
const [accountRef, portText = '8837'] = process.argv.slice(2);
const port = Number(portText);
requireValue(
  Number.isInteger(port) && port >= 1024 && port <= 65535,
  'stripe_connection_port_invalid',
);
const origin = 'http://127.0.0.1:' + port;
const directory = new URL('../runtime/stripe-memocasting/', import.meta.url);
const handler = stripeTestConnectionHandler({
  origin,
  accountRef,
  save: async (config) => {
    await mkdir(directory, { recursive: true });
    await writeFile(new URL('connection-pending.json', directory), JSON.stringify(config), {
      flag: 'wx',
      mode: 0o600,
    });
  },
});
createServer(async (req, res) => {
  try {
    const chunks = [];
    let length = 0;
    for await (const part of req) {
      length += part.length;
      requireValue(length <= 4096, 'stripe_connection_input_too_large');
      chunks.push(part);
    }
    const result = await handler(
      new Request(origin + req.url, {
        method: req.method,
        headers: req.headers,
        ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
      }),
    );
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    res.writeHead(400, { 'cache-control': 'no-store' });
    res.end('Invalid request');
  }
}).listen(port, '127.0.0.1', () => console.log('Stripe TEST secure input: ' + origin));
