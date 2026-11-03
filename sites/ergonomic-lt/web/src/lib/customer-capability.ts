import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes} from 'node:crypto';
/** Server-only authenticated opaque capabilities. No source identifier is encoded in clear text. */
export function customerCapabilities(secret:string){
 if(secret.length<32)throw Error('Viešo konfigūravimo raktas nesukonfigūruotas.');
 const key=createHash('sha256').update('ergonomic/customer/v1\0'+secret).digest();
 const id=(kind:string,value:unknown)=>createHmac('sha256',key).update(kind+'\0'+JSON.stringify(value)).digest('hex').slice(0,32);
 function seal(kind:string,value:unknown){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(kind));
  const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return 'v1_'+Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');
 }
 function open<T>(kind:string,token:string):T{
  if(!/^v1_[A-Za-z0-9_-]{40,24000}$/.test(token))throw Error('Komplektacija negalioja.');
  try{const bytes=Buffer.from(token.slice(3),'base64url'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAAD(Buffer.from(kind));decipher.setAuthTag(bytes.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8')) as T;}catch{throw Error('Komplektacija negalioja.');}
 }
 return {id,seal,open};
}
export function customerKey(){return customerCapabilities(process.env.PUBLIC_CONFIGURATION_SECRET||process.env.SESSION_SECRET||'');}
