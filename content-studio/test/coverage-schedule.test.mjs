import test from 'node:test';
import assert from 'node:assert/strict';
import {contentPolicy,planningWindow,scheduledPlan} from '../src/content-schedule.mjs';
test('coverage plans share a dependency-ready date without invented weekly or daily quotas',()=>{
 const now=Date.parse('2026-10-07T07:00:00Z'),policy=contentPolicy({cadence:'coverage',topicTarget:35,months:6});
 assert.equal(planningWindow(policy,now).target,35);assert.equal(policy.articlesPerMonth,undefined);
 const proposals=Array.from({length:35},(_,i)=>({type:'guide',slug:'distinct-'+i,publishDate:'2026-10-07'}));
 const plan=scheduledPlan(proposals,[],policy,now);
 assert.equal(new Set(plan.map(p=>p.publishAt)).size,1);
 assert.equal(plan[0].publishAt,'2026-10-07T07:00:00.000Z');
 const late=scheduledPlan([proposals[0]],[],policy,now+60000);assert.equal(late[0].publishAt,'2026-10-07T07:01:00.000Z');
 assert.throws(()=>contentPolicy({cadence:'coverage'}),/Aprėpties/);
});
