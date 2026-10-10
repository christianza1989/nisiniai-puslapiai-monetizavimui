// Candidate server-only recipient proof codec. No routes, keys, storage or transport enabled.
const encoder=new TextEncoder();
export const ADDRESS_RULE='madbeauty-email-v1-js-trim-lower';
export function canonicalVerifiedEmail(email){
 if(typeof email!=='string')throw new TypeError('Verified native email must be a string');
 const value=email.trim().toLowerCase();
 if(value.length>254||!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(value))throw new TypeError('Invalid native email');
 return value;
}
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const token=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{32,256}$/.test(value);
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function createRecipientBindingProposal({secret,scope,adapterId,keyId}){
 if(!(secret instanceof Uint8Array)||secret.byteLength<32)throw new TypeError('Dedicated recipient key required');
 if(!scope||Object.keys(scope).sort().join(',')!=='business_id,environment_class,environment_id,site_id'||!['test','production'].includes(scope.environment_class)||!['business_id','environment_id','site_id'].every(k=>id(scope[k]))||scope.site_id!=='madbeauty'||!id(adapterId)||!id(keyId))throw new TypeError('Trusted native scope required');
 const frozen=Object.freeze({...scope});
 const key=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 function bytes({invitationRef,challengeNonce,verifiedEmail}){
  if(!token(invitationRef)||!token(challengeNonce))throw new TypeError('Opaque192-bit token required');
  // Ordered JSON string array, compact UTF-8, no final newline. Never concatenate free-form delimiters.
  return encoder.encode(JSON.stringify(['madbeauty-recipient-binding-v1',ADDRESS_RULE,frozen.business_id,frozen.site_id,frozen.environment_id,frozen.environment_class,adapterId,keyId,invitationRef,challengeNonce,canonicalVerifiedEmail(verifiedEmail)]));
 }
 return Object.freeze({
  async sign(input){return hex(await crypto.subtle.sign('HMAC',key,bytes(input)));},
  async matches(input,digest){
   if(typeof digest!=='string'||!/^v1=[a-f0-9]{64}$/.test(digest))return false;
   try{return await crypto.subtle.verify('HMAC',key,Uint8Array.from(digest.slice(3).match(/../g),v=>parseInt(v,16)),bytes(input));}catch{return false;}
  },
  addressRule:ADDRESS_RULE,
 });
}
