import { createHmac, timingSafeEqual, scryptSync, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
export const SESSION_COOKIE='ergonomic_admin';
export function checkPassword(password:string) {
  const configured=process.env.ADMIN_PASSWORD_HASH;
  if(!configured||!process.env.SESSION_SECRET)return false;
  const [salt,hash]=configured.split(':');
  if(!salt||!hash||hash.length!==128)return false;
  const actual=scryptSync(password,salt,64),expected=Buffer.from(hash,'hex');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export function sessionToken(expires=Date.now()+8*3600_000) {
  const secret=process.env.SESSION_SECRET;if(!secret)throw new Error('Administratorius nesukonfigūruotas.');
  const body=String(expires);return body+'.'+createHmac('sha256',secret).update(body).digest('hex');
}
export function validSession(token:string|undefined) {
  if(!token||!process.env.SESSION_SECRET)return false;
  const parts=token.split('.');if(parts.length!==2)return false;const [body,sig]=parts;if(!body||!sig||!/^[0-9a-f]{64}$/.test(sig)||!/^\d+$/.test(body))return false;
  if(Number(body)<Date.now()||Number(body)>Date.now()+9*3600_000)return false;
  const expected=createHmac('sha256',process.env.SESSION_SECRET).update(body).digest();
  return timingSafeEqual(Buffer.from(sig,'hex'),expected);
}
export async function isAdmin() { return validSession((await cookies()).get(SESSION_COOKIE)?.value); }
export function originAllowed(req:NextRequest) {
  const origin=req.headers.get('origin');
  const expected=process.env.PUBLIC_ORIGIN||new URL(req.url).origin;
  return origin===expected;
}
export function rateKey(req:NextRequest,prefix:string) {
  const ip=process.env.TRUST_PROXY==='true'?req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local';
  return prefix+':'+createHash('sha256').update(ip).digest('hex');
}
export async function readJson(req:NextRequest,max=100_000) {
  if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('Reikalingas JSON formatas.');
  const reader=req.body?.getReader();if(!reader)throw new Error('Tuščia užklausa.');
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();throw new Error('Užklausa per didelė.');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
