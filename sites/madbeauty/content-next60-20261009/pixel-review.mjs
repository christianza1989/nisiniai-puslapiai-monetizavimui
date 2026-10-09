import fs from 'node:fs/promises';
const url=new URL('MEDIA-PLAN.json',import.meta.url);
const [index,state,note]=process.argv.slice(2);
if(!['PASS_ORIGINAL_PIXELS','REQUIRES_IMAGE_CORRECTION'].includes(state)||!note)throw Error('Actual pixel observation required');
const plan=JSON.parse(await fs.readFile(url,'utf8')),p=plan.find(p=>p.index===Number(index));
if(!p?.originalSha256)throw Error('Saved original required');
p.originalPixelReview={at:new Date().toISOString(),sha256:p.originalSha256,state,observation:note,scope:'Original pixels actually inspected; mobile rendering and responsive asset checks are separate.'};
await fs.writeFile(url,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({index:p.index,planId:p.planId,state}));
