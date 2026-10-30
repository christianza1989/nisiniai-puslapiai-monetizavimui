// Node-only adapter for the owner's explicitly enabled, loopback draft preview.
// The eventual hosted Worker must qualify its own transport separately.
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {connect} from 'node:tls';
import {Readable,Writable} from 'node:stream';
import {smtpMessage,smtpSession} from '../../../../dovanos-memorycasting/lib/smtp-protocol.mjs';

export async function smtpNodeTransport(settings,mail){
 const socket=connect({host:'smtp.hostinger.com',port:465,servername:'smtp.hostinger.com',rejectUnauthorized:true});
 socket.on('error',()=>{});
 try{
  await new Promise((resolve,reject)=>{
   socket.once('secureConnect',resolve);socket.once('error',reject);
   socket.setTimeout(15000,()=>{socket.destroy();reject(Error('Mail connection timed out'));});
  });
  await smtpSession({readable:Readable.toWeb(socket),writable:Writable.toWeb(socket),close:async()=>socket.destroy()},
   {user:settings.user,password:settings.password,timeoutMs:15000},mail);
  return true;
 }catch{throw Error('Hostinger mail failed; acceptance may be unknown; do not automatically retry');}
 finally{socket.destroy();}
}

export async function loadPreviewMail({configPath,privateRoot,transport=smtpNodeTransport}){
 if(!configPath)return{enabled:false,send:async()=>false};
 try{
  const allowedRoot=await realpath(path.join(privateRoot,'mail-kontaktuforma'));
  const actualConfig=await realpath(configPath);
  if(actualConfig!==path.join(allowedRoot,'connection.json'))throw Error();
  const settings=JSON.parse(await readFile(actualConfig,'utf8'));
  if(settings.siteId!=='o3tech'||settings.canonicalHost!=='o3tech.lt'||settings.username!=='kontaktuforma@kontaktuforma.lt'||settings.from!==settings.username||
    settings.smtpHost!=='smtp.hostinger.com'||settings.smtpPort!==465||settings.implicitTls!==true||settings.passwordFile!=='slaptazodis.txt'||
    !Array.isArray(settings.to)||settings.to.length!==1||settings.to[0]!=='sales@o3tech.lt')throw Error();
  const passwordPath=await realpath(path.join(allowedRoot,settings.passwordFile));
  if(passwordPath!==path.join(allowedRoot,'slaptazodis.txt'))throw Error();
  const password=(await readFile(passwordPath,'utf8')).replace(/^\uFEFF/,'').replace(/\r?\n$/,'');
  if(!password||/[\r\n\x00]/.test(password))throw Error();
  return{enabled:true,async send(_env,mail){
   if(mail.to!==settings.to[0])throw Error('Unconfigured mail recipient');
   const message={...mail,from:settings.username,fromName:'UAB A-Z Prekyba'};
   smtpMessage(message); // Validate all headers before connecting to the provider.
   return transport({user:settings.username,password},message);
  }};
 }catch{throw Error('Private o3tech mail configuration invalid; no secret values printed');}
}
