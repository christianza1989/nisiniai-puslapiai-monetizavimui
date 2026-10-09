import {hostname} from 'node:os';
export const currentJobOwner=()=>({host:hostname(),pid:process.pid});
export function jobOwnerActive(owner,{host=hostname(),probe=pid=>process.kill(pid,0)}={}){
 if(!owner||owner.host!==host||!Number.isInteger(owner.pid)||owner.pid<1)return false;
 try{probe(owner.pid);return true;}catch(error){if(error.code==='ESRCH')return false;return true;}
}
