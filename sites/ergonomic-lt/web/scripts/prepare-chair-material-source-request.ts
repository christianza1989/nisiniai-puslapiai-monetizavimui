import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chairFinishRoles} from '../src/lib/chair-material-groups';

// Reconcile the existing owner110 audit. Do not reopen Native checkpoints,
// reread geometry, repeat that audit, or contact the supplier.
const arg=(name:string)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const auditFile=arg('audit'),csvFile=arg('csv'),output=arg('output');
assert(auditFile&&csvFile&&output,'Required --audit=PATH --csv=PATH --output=PATH');
const audit=JSON.parse(fs.readFileSync(auditFile,'utf8')),bytes=fs.readFileSync(csvFile);
const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,audit.csvSha256,'Audit CSV identity changed');
function csv(text:string){
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else{assert(quoted||value==='','Invalid CSV quoting');quoted=!quoted;}}
  else if(!quoted&&(c===','||c==='\n')){row.push(value.replace(/\r$/,''));value='';if(c==='\n'){rows.push(row);row=[];}}
  else value+=c;
 }
 assert(!quoted,'Unclosed CSV quote');if(value||row.length){row.push(value.replace(/\r$/,''));rows.push(row);}
 const [headers,...body]=rows;return body.map(cells=>{assert.equal(cells.length,headers.length,'CSV column mismatch');return Object.fromEntries(headers.map((h,i)=>[h,cells[i]]));});
}
const rows=csv(bytes.toString('utf8').replace(/^\uFEFF/,''));assert.equal(rows.length,audit.colorFieldRows);
const rollout=JSON.parse(fs.readFileSync('content/chair-material-rollout.json','utf8'));
const count=(value:string)=>/^\d+$/.test(value)?Number(value):null;
const models=audit.models.map((m:any)=>{
 const current=rollout.models.find((r:any)=>r.code===m.code);
 const fields=rows.filter(r=>r.code===m.code).filter(r=>{
  // These labels are evidence checks only. The renderer accepts only explicit
  // IDs from chairFinishRoles, never substring/name-based surface matching.
  if(/^(Upholstery colour|Mesh colour|Colour 3D upholstery)/i.test(r.label))assert(chairFinishRoles[r.field],'Unrecognized supplier material controller: '+r.field);
  return !!chairFinishRoles[r.field]||r.field==='CPRICEGROUP'||/UPH.*GROUP|MESHGROUP/.test(r.field);
 }).map(r=>({field:r.field,label:r.label,kind:r.kind,
  capturedDomainValues:count(r.observed_manufacturer_values),domainScope:r.manufacturer_domain_scope,
  geometryWitnessValues:count(r.runtime_geometry_witness_values),causalBindings:count(r.proven_field_material_bindings),
  missingKnownValues:count(r.missing_runtime_values),missingValues:r.missing_values?r.missing_values.split('|'):[],
  bindingStatus:r.slot_mesh_binding_status,baseVariant:r.base_variant,sourceScope:r.source_scope}));
 return {code:m.code,job:m.job,sourceClosed:m.sourceClosed,previousPublishedRoute:current?.url??null,
  previousPublishedBindingSha256:current?.bindingSha256??null,previousMode:current?.mode??'OUTSIDE_PREVIOUS_PUBLISHED_LIST',
  fullPalettePass:m.fullPalettePass,requiresNewSourceEvidence:fields.some((f:any)=>f.causalBindings===0||f.missingKnownValues===null||f.missingKnownValues>0),fields};
});
assert.equal(models.length,audit.chairs);
const fields=models.flatMap((m:any)=>m.fields),summary={models:models.length,closedModels:models.filter((m:any)=>m.sourceClosed).length,
 modelsRequiringNewSource:models.filter((m:any)=>m.requiresNewSourceEvidence).length,
 upholsteryMeshAndControllerFields:fields.length,missingKnownCapturedValues:fields.reduce((n:number,f:any)=>n+(f.missingKnownValues??0),0),
 lowerBoundOrUnknownDomainRows:fields.filter((f:any)=>f.capturedDomainValues===null||f.domainScope==='LOWER_BOUND_OR_UNKNOWN').length};
const report={schemaVersion:1,kind:'CHAIR_MATERIAL_SOURCE_REQUEST_NOT_COMPLETION',sourceAuditResult:audit.result,sourceCsvSha256:sha256,
 sourceGeometryReads:0,checkpointBodyReads:0,supplierRequests:0,NativeAllowed:false,summary,
 requiredDelivery:['Exact current own runtime/asset identities and construction tuple','Actual post-prefix material/collection domains; unknown domains stay unknown',
 'Causal own primitive bindings, or whole observed-state/part-swap bindings; disjoint composition must be proved',
 'Original manufacturer material/texture identities and retained original materials','Explicit coverage limits for uncaptured construction contexts'],
 models};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'SOURCE_REQUEST_PREPARED_NOT_PALETTE_PASS',...summary,sourceGeometryReads:0,checkpointBodyReads:0,supplierRequests:0,output}));
