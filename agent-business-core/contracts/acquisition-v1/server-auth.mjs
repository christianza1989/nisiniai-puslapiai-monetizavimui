// Server only. Uses Web Crypto in Node/Workers; no browser credential distribution.
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const bytesFromHex = value => Uint8Array.from(value.match(/../g), part => parseInt(part, 16));
const asBytes = body => typeof body === 'string' ? encoder.encode(body) : new Uint8Array(body);

async function input(method, path, timestamp, keyId, rawBody) {
  if (method !== 'POST' || !/^\/[A-Za-z0-9_/-]+$/.test(path)) throw new Error('invalid_signed_target');
  if (!/^[0-9]{1,12}$/.test(String(timestamp)) || !/^[A-Za-z0-9_-]{1,100}$/.test(keyId))
    throw new Error('invalid_signature_metadata');
  const body = asBytes(rawBody);
  if (body.byteLength > 65536) throw new Error('callback_body_too_large');
  const hash = hex(await crypto.subtle.digest('SHA-256', body));
  return encoder.encode(['acquisition-v1', method, path, String(timestamp), keyId, hash].join('\n'));
}

async function key(secret, operation) {
  const bytes = asBytes(secret);
  if (bytes.byteLength < 32) throw new Error('invalid_webhook_grant');
  return crypto.subtle.importKey('raw', bytes, {name: 'HMAC', hash: 'SHA-256'}, false, [operation]);
}

export async function signRequest({keyId, secret, path, body, timestamp}) {
  const value = await input('POST', path, timestamp, keyId, body);
  const signature = hex(await crypto.subtle.sign('HMAC', await key(secret, 'sign'), value));
  return {'X-Acq-Key-Id': keyId, 'X-Acq-Timestamp': String(timestamp),
    'X-Acq-Signature': 'v1=' + signature, 'Content-Type': 'application/json'};
}

// Scope, adapter and permissions must be resolved by the trusted server BEFORE this call.
export async function verifySignature({keyId, secret, method, path, body, headers, now}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const timestamp = lower['x-acq-timestamp'] ?? '';
  const value = await input(method, path, timestamp, lower['x-acq-key-id'] ?? '', body);
  if (lower['x-acq-key-id'] !== keyId) throw new Error('callback_grant_denied');
  if (Math.abs(now - Number(timestamp)) > 300) throw new Error('callback_clock_window');
  const signature = lower['x-acq-signature'] ?? '';
  if (!/^v1=[a-f0-9]{64}$/.test(signature)) throw new Error('callback_signature_invalid');
  if (!await crypto.subtle.verify('HMAC', await key(secret, 'verify'),
    bytesFromHex(signature.slice(3)), value)) throw new Error('callback_signature_invalid');
  return true;
}
