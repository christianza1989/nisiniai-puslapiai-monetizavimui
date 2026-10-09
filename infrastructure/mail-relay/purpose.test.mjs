import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transactionalMail} from '../../sites/madbeauty/backend/transactional-mail.mjs';

test('deployed PHP purpose contract admits platform transactional messages and rejects unrelated subjects',async()=>{
 const php=await readFile(new URL('./relay.php',import.meta.url),'utf8');
 const guard=php.match(/if \(\$site === 'madbeauty' && !in_array\(\$message\['subject'\], \[([^\]]+)\], true\)\) reply\(400, \['error'=>'Invalid purpose'\]\);/);
 assert.ok(guard,'strict purpose check remains before SMTP');
 const subjects=[...guard[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 for(const type of ['login-code','booking-confirmed','booking-rescheduled','booking-cancelled','reminder','waitlist-offer']){
  const message=transactionalMail({id:'contract',recipient:'fixture@example.com',type},{code:'000000',expiresAt:'2026-10-12T10:00:00Z',bookingId:'fixture',status:'confirmed',startAt:'2026-10-12T10:00:00Z'});
  assert.ok(subjects.includes(message.subject),type+' must pass actual PHP purpose guard');
 }
 assert.equal(subjects.length,4);assert.ok(!subjects.includes('Newsletter'));
 assert.ok(php.includes("$site === 'dovanos123' && $message['to'] !== $config['user']"));
 assert.ok(php.indexOf('Invalid purpose')<php.indexOf('$mail->send()'));
});
