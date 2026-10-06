import {resolveMode,SCENARIOS} from './config.mjs';
import {generateDemo,makeClock} from './demo-model.mjs';
export function createAdapter({enabled=false,deployment='production',clock=makeClock(),scenario='happy',realAdapter=null,extend=null}={}) {
  const mode=resolveMode({enabled,deployment,realAdapter});
  if(!SCENARIOS.includes(scenario)) throw Error('Unknown scenario');
  if(mode==='real') return realAdapter; // Caller supplies accepted transport; never substitute seed on failure.
  if(mode==='off') return {mode,clock,catalog:async()=>[],profile:async()=>null,appointments:async()=>[]};
  const data=generateDemo(clock);
  const base={mode,clock,scenario,
    async catalog({city=null,taxonomyServiceId=null}={}) {
      if(scenario==='empty') return [];
      return data.services.flatMap(s=>{
        const o=data.organizations.find(x=>x.id===s.organizationId);const p=data.practitioners.find(x=>x.id===s.practitionerId);
        if(!o.approved||(city&&city!==o.city)||(taxonomyServiceId&&taxonomyServiceId!==s.taxonomyServiceId)) return [];
        const calendarState=scenario==='stale'?'stale':scenario==='no-calendar'?'none':o.calendarState;
        return [{...s,organizationName:o.name,practitionerName:p.name,initials:p.initials,city:o.city,calendarState}];
      });
    },
    async profile(id) {const o=data.organizations.find(x=>x.id===id&&x.approved);if(!o)return null;return{...o,location:data.locations.find(x=>x.id===o.locationId),practitioners:data.practitioners.filter(x=>x.organizationId===id),services:data.services.filter(x=>x.organizationId===id),reviews:data.reviews.filter(x=>x.organizationId===id)};},
    async appointments({organizationId}={}) {if(!organizationId) throw Error('Explicit demo scope required');return data.bookings.filter(b=>b.organizationId===organizationId);}
  };
  return extend?extend(base,data):base;
}
