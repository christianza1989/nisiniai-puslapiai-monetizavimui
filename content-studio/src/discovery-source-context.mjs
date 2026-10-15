// Private captured external claims; never business-fact, rights or source admission.
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {stableV2} from './content-package-v2.mjs';

export const SOURCE_CONTEXT_VERSION='discovery-source-context.v1';
const fail=()=>{throw Object.assign(new Error('Invalid Discovery source context'),{code:'invalid_discovery_source_context'});};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,expected)=>{if(!object(v)||Object.keys(v).length!==expected.length||Object.keys(v).some(k=>!expected.includes(k)))fail();};
const integer=(v,max,min=0)=>{if(!Number.isSafeInteger(v)||Object.is(v,-0)||v<min||v>max)fail();};
const text=(v,max,min=0)=>{if(typeof v!=='string'||!v.isWellFormed()||[...v].length<min||[...v].length>max)fail();};
const hex=(v,length=64)=>{if(typeof v!=='string'||!new RegExp('^[a-f0-9]{'+length+'}$').test(v))fail();};
const uuid=v=>{if(typeof v!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v))fail();};
const digest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
function url(v) {
  text(v,1024,1);let u;
  try{u=new URL(v);}catch{fail();}
  const host=u.hostname.replace(/\.$/,'');
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||/[\x00-\x20\\]/.test(v)
      ||host.length>253||!host.includes('.')||host.endsWith('.local')||host.endsWith('.localhost')||isIP(host)
      ||host.split('.').some(label=>! /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))fail();
}
function observed(v) {
  keys(v,['url','status','title','observedAt','httpStatus','responseBytes','bodySha256','textSha256','text','textChars','textMayBeClipped']);
  url(v.url);text(v.title,180);text(v.observedAt,64,1);
  const date=/^(\d{4})-(\d\d)-(\d\d)T\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.exec(v.observedAt);
  if(!date||+date[1]<1970||!Number.isFinite(Date.parse(v.observedAt)))fail();
  const calendar=new Date(Date.UTC(+date[1],+date[2]-1,+date[3]));
  if(calendar.getUTCFullYear()!==+date[1]||calendar.getUTCMonth()!==+date[2]-1||calendar.getUTCDate()!==+date[3])fail();
  integer(v.httpStatus,299,200);integer(v.responseBytes,800000,1);hex(v.bodySha256);hex(v.textSha256);
  text(v.text,9000,1);integer(v.textChars,9000,1);
  if(v.status!=='observed'||v.textChars!==[...v.text].length||typeof v.textMayBeClipped!=='boolean'
      ||v.textMayBeClipped!==(v.textChars===9000)||createHash('sha256').update(v.text,'utf8').digest('hex')!==v.textSha256)fail();
}
export function validateDiscoverySourceContext(value,{creationId}={}) {
  keys(value,['version','creationId','discoveryId','reportId','reportRevision','reportSha256','planSha256','discoveryJobId',
    'sourceRevision','capturedSourcesSha256','sources','coverage','claimStatus','independentVerification','excerptLimitChars','contextSha256']);
  if(Buffer.byteLength(stableV2(value))>65536||value.version!==SOURCE_CONTEXT_VERSION
      ||value.claimStatus!=='external_source_claims'||value.independentVerification!=='UNVERIFIED'||value.excerptLimitChars!==9000)fail();
  for(const k of ['creationId','discoveryId','reportId','discoveryJobId'])uuid(value[k]);
  if(creationId!==undefined&&value.creationId!==creationId)fail();
  integer(value.reportRevision,2147483647,1);
  for(const k of ['reportSha256','planSha256','capturedSourcesSha256','contextSha256'])hex(value[k]);
  hex(value.sourceRevision,40);
  if(!Array.isArray(value.sources)||value.sources.length>12)fail();
  for(const item of value.sources) {
    if(item?.status==='observed')observed(item);
    else{keys(item,['url','status','error']);url(item.url);text(item.error,80,1);if(item.status!=='unavailable')fail();}
  }
  const c=value.coverage;
  keys(c,['readerReportedComplete','capturedCount','includedCount','omittedCount','remainingUrlCount','capturedClippedCount','includedClippedCount']);
  if(typeof c.readerReportedComplete!=='boolean')fail();
  for(const k of Object.keys(c).filter(k=>k!=='readerReportedComplete'))integer(c[k],2000);
  const clipped=value.sources.filter(s=>s.textMayBeClipped===true).length;
  if(c.includedCount!==value.sources.length||c.capturedCount!==c.includedCount+c.omittedCount
      ||c.includedClippedCount!==clipped||c.capturedClippedCount<clipped||c.capturedClippedCount>c.capturedCount
      ||c.capturedClippedCount>clipped+c.omittedCount
      ||c.readerReportedComplete&&(c.remainingUrlCount||value.sources.some(s=>s.status==='unavailable'))
      ||value.contextSha256!==digest(Object.fromEntries(Object.entries(value).filter(([k])=>k!=='contextSha256'))))fail();
  return structuredClone(value);
}
