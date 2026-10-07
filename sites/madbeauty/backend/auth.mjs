import {randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {randomId,reject} from './primitives.mjs';
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
export function createAuth(store){
  const {db,siteId,clock}=store;
  const session=(token,{create=true}={})=>{
    const now=clock(),h=store.hash(token||'');
    let row=token?db.prepare('SELECT * FROM sessions WHERE token_hash=? AND site_id=?').get(h,siteId):null;
    if(row&&(row.expires_at<=now||row.touched_at+30*60*1000<=now)){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(h);row=null;}
    if(row){db.prepare('UPDATE sessions SET touched_at=? WHERE token_hash=?').run(now,h);row.touched_at=now;return {...row,token:null};}
    if(!create)return null;
    const fresh=randomBytes(32).toString('base64url'),csrf=randomBytes(24).toString('base64url');
    db.prepare('INSERT INTO sessions(token_hash,site_id,account_id,csrf,created_at,touched_at,expires_at) VALUES(?,?,NULL,?,?,?,?)').run(store.hash(fresh),siteId,csrf,now,now,now+8*60*60*1000);
    return {token_hash:store.hash(fresh),site_id:siteId,account_id:null,csrf,token:fresh,expires_at:now+8*60*60*1000};
  };
  const account=s=>s?.account_id?db.prepare('SELECT id,email,name,operator FROM accounts WHERE id=? AND site_id=?').get(s.account_id,siteId):null;
  const requireAccount=s=>{const u=account(s);if(!u)reject('UNAUTHENTICATED','Prisijunkite el. paštu.',401);return u;};
  const csrf=(s,value)=>{if(!s||!equal(s.csrf,value||''))reject('CSRF','Sesija pasikeitė. Atnaujinkite puslapį.',403);};
  const start=(s,email,ip)=>{
    email=String(email||'').trim().toLowerCase();
    if(email.length>254||!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email))reject('INVALID_INPUT','Įrašykite teisingą el. paštą.');
    return store.transaction(()=>{
      store.limit('auth-ip:'+ip,20,900);store.limit('auth-email:'+email,5,900);
      db.prepare('UPDATE email_challenges SET consumed=1 WHERE site_id=? AND session_hash=? AND consumed=0').run(siteId,s.token_hash);
      const id=randomId('challenge'),code=String(randomInt(0,1000000)).padStart(6,'0'),now=clock();
      db.prepare('INSERT INTO email_challenges(id,site_id,session_hash,email,code_hash,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').run(id,siteId,s.token_hash,email,store.hash(id+':'+code),now+10*60*1000,now);
      store.mail({challengeId:id,recipient:email,type:'login-code',payload:{subject:'Prisijungimo kodas',code,expiresAt:new Date(now+600000).toISOString()}});
      return {challengeId:id,message:'Prisijungimo kodas paruoštas. Patikrinkite savo el. paštą.',expiresAt:new Date(now+600000).toISOString()};
    });
  };
  const verify=(s,id,code,ip)=>{
    // Attempts are committed even when verification fails; no rollback restores guesses.
    const result=store.transaction(()=>{
      store.limit('verify-ip:'+ip,40,900);
      const c=db.prepare('SELECT * FROM email_challenges WHERE id=? AND site_id=? AND session_hash=?').get(String(id||''),siteId,s.token_hash);
      if(!c||c.consumed||c.expires_at<=clock()||c.attempts>=5)return {error:true};
      db.prepare('UPDATE email_challenges SET attempts=attempts+1 WHERE id=?').run(c.id);
      if(!/^\d{6}$/.test(String(code||''))||!equal(store.hash(c.id+':'+code),c.code_hash))return {error:true};
      db.prepare('UPDATE email_challenges SET consumed=1 WHERE id=?').run(c.id);
      let u=db.prepare('SELECT id,email,name,operator FROM accounts WHERE site_id=? AND email=?').get(siteId,c.email);
      if(!u){u={id:randomId('account'),email:c.email,name:'',operator:0};db.prepare('INSERT INTO accounts(id,site_id,email,name,created_at) VALUES(?,?,?,?,?)').run(u.id,siteId,u.email,u.name,clock());}
      // Imported or administrator-created accounts need the same client identity as new sign-ins.
      const d=store.read();if(!d.clients.some(x=>x.id===u.id)){d.clients.push({id:u.id,accountId:u.id,name:u.name,email:u.email,version:1});store.write(d);}
      if(store.onVerifiedAccount)u=store.onVerifiedAccount(u);
      db.prepare('DELETE FROM sessions WHERE token_hash=? AND site_id=?').run(s.token_hash,siteId);
      const fresh=session(null);db.prepare('UPDATE sessions SET account_id=? WHERE token_hash=?').run(u.id,fresh.token_hash);fresh.account_id=u.id;
      return {session:fresh,user:u};
    });
    if(result.error)reject('INVALID_CODE','Kodas neteisingas arba nebegalioja. Gaukite naują kodą.',400);
    return result;
  };
  const logout=s=>{db.prepare('DELETE FROM sessions WHERE token_hash=? AND site_id=?').run(s.token_hash,siteId);return session(null);};
  return {session,account,requireAccount,csrf,start,verify,logout};
}
