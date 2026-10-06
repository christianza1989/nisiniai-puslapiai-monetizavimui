import {openStore} from './store.mjs';
import {createPlatform} from './platform.mjs';
const [filename]=process.argv.slice(2),store=openStore({filename,secret:'x'.repeat(64),clock:()=>Date.parse('2026-10-05T07:00:00Z')}),api=createPlatform(store);
process.on('message',({user,candidate,key})=>{try{const h=api.hold(user,candidate),b=api.confirm(user,{holdId:h.id,name:'Lygiagretus testas',idempotencyKey:key});process.send({ok:true,bookingId:b.id});}catch(e){process.send({ok:false,code:e.code});}finally{store.close();process.disconnect();}});
process.send({ready:true});
