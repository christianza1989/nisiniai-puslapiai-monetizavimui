// Private stdin/stdout protocol: do not pass recipient data as process arguments.
import { canonicalNativeEmail, ADDRESS_RULE } from '../../contracts/recipient-binding-v1/recipient-binding.mjs';
let raw = '';
for await (const chunk of process.stdin) {
  raw += chunk;
  if (Buffer.byteLength(raw) > 4096) throw new Error('recipient_input_too_large');
}
try {
  const input = JSON.parse(raw);
  process.stdout.write(JSON.stringify({ address_rule: ADDRESS_RULE, canonical_recipient: canonicalNativeEmail(input.email) }));
} catch {
  process.stderr.write('invalid_canonical_recipient');
  process.exitCode = 1;
}
