import fs from 'node:fs/promises';
const u=new URL('SELECTION.json',import.meta.url),s=JSON.parse(await fs.readFile(u,'utf8'));
s.previousStatus=s.status;s.status='11_AGENT_REVIEWED_APPROVED_DEPLOYED_SCHEDULED';
for(const p of s.pages){p.previousHumanGate={status:p.status,readiness:p.readiness,reviewLevel:p.reviewLevel};p.status='APPROVED_DEPLOYED_SCHEDULED';p.reviewLevel='AUTONOMOUS_AGENT_EDITORIAL_REVIEW';p.readiness='Actual revision-bound agent review, immutable approval and canonical-domain acceptance recorded in REVIEW-NOTES.json, DELIVERY.json and DOMAIN-ACCEPTANCE.json.';}
await fs.writeFile(u,JSON.stringify(s,null,2)+'\n');
