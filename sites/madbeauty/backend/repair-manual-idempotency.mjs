import {readFile,writeFile} from 'node:fs/promises';
const f=new URL('./platform.mjs',import.meta.url);let s=await readFile(f,'utf8'),from=s.indexOf('    manualVisit(user,input){'),to=s.indexOf('    edit(user,input){',from);if(from<0||to<0)throw Error('Missing source markers');
const method=`    manualVisit(user,input){return mutate(d=>{
      ownOrg(d,user,input.scope?.organizationId);const key=user.id+':manual:'+text(input.idempotencyKey,160),fingerprint=store.hash(JSON.stringify(canonical(input))),prior=d.idempotency[key];
      if(prior){if(prior.fingerprint!==fingerprint)reject('IDEMPOTENCY_CONFLICT','Raktas panaudotas kitam vizitui.',409);return find(d,'bookings',prior.bookingId);}
      const c=choose(d,input.candidate,{internal:true});if(c.organizationId!==input.scope.organizationId)reject('FORBIDDEN','Kita organizacija.',403);const client=find(d,'clients',input.clientId);
      if(!d.bookings.some(b=>b.clientId===client.id&&b.organizationId===c.organizationId))reject('FORBIDDEN','Klientas nepriklauso šiai organizacijai.',403);
      const s=find(d,'services',c.providerServiceId),b={...c,id:randomId('booking'),clientId:client.id,status:'confirmed',version:1,currency:'EUR',timezone:'Europe/Vilnius',bufferBeforeMin:s.bufferBeforeMin,bufferAfterMin:s.bufferAfterMin,createdAt:clock().now};delete b.occupiedStart;delete b.occupiedEnd;d.bookings.push(b);d.idempotency[key]={bookingId:b.id,fingerprint};outbox(d,b,'confirmation');event(d,'booking-manual',b.id);return b;
    });},
`;
s=s.slice(0,from)+method+s.slice(to);await writeFile(f,s);
for(const name of ['http.mjs','../prototype/public/http-adapter.mjs']){const u=new URL(name,import.meta.url);let source=await readFile(u,'utf8');source=source.replace("'createOrganization','createService'","'createOrganization','createService','createStaff','createResource'");await writeFile(u,source);}
