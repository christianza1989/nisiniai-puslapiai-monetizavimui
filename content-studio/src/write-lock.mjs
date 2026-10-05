import {mkdir,open,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export async function withStudioWriteLock(data, task, timeout = 30000) {
  await mkdir(data,{recursive:true});
  const filename=path.join(data,'.model-write.lock'),token=randomUUID(),deadline=Date.now()+timeout;
  let handle;
  while(!handle){
    try{handle=await open(filename,'wx',0o600);}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      if(Date.now()>=deadline)throw new Error('Studijos rašymo užraktas užimtas. Kito proceso nestabdykite ir užrakto netrinkite; patikrinkite jo savininką.');
      await new Promise(resolve=>setTimeout(resolve,25));
    }
  }
  try{
    await handle.writeFile(JSON.stringify({token,pid:process.pid,createdAt:new Date().toISOString()}));
    return await task();
  }finally{
    await handle.close();
    // Crashed writers leave a lock for explicit recovery. Never steal a lock on age alone.
    for(let attempt=0;;attempt++){
      const owner=JSON.parse(await readFile(filename,'utf8'));
      if(owner.token!==token)throw new Error('Studijos rašymo užrakto savininkas pasikeitė.');
      try{await unlink(filename);break;}
      catch(error){
        // Windows scanners/readers can briefly prevent removal after our handle closes.
        // Retain the lock on permanent failure; recheck ownership on every retry.
        if(process.platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=8)throw error;
        await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));
      }
    }
  }
}
