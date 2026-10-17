import fs from 'node:fs/promises';
import path from 'node:path';

export async function sourceMirrors(anchor,sourceRoot='../research/configurator/batch-10-source'){
 anchor.profiles=anchor.profiles.filter(rule=>!['fixed-color-source-probes','hidden-group-source-probes'].includes(rule.derived));
 const dir=path.resolve(sourceRoot,anchor.article,anchor.id.split(':').slice(1).join(':'));
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 const values=s=>Object.fromEntries(Object.entries(s.properties).map(([k,p])=>[k.split('.').at(-1),p.value]));
 const states=await Promise.all(manifest.profiles.map(file=>fs.readFile(path.join(dir,file),'utf8').then(JSON.parse)));
 const base=JSON.parse(await fs.readFile(path.join(dir,manifest.base),'utf8'));
 const editable=(state,field)=>Object.entries(state.properties).some(([key,p])=>key.endsWith('.'+field)&&p.visible&&p.editable);
 const color=key=>/COLOR|CHCOL/.test(key);
 // A source-fixed wooden arm-pad color can follow the editable shell color.
 // Require two distinct measured source colours and consistent hidden values
 // across all captured profiles; coincidentally equal defaults are insufficient.
 const materialStates=await Promise.all((manifest.materials||[]).map(async record=>({field:record.field,state:JSON.parse(await fs.readFile(path.join(dir,record.file),'utf8'))})));
 const roleRecords=await Promise.all(Object.entries(manifest.roles||{}).map(async ([field,file])=>({field,state:JSON.parse(await fs.readFile(path.join(dir,file),'utf8'))})));
 const roleStates=roleRecords.map(record=>record.state);
 const baseValues=values(base),mirrors={};
 for(const target of Object.keys(baseValues).filter(key=>color(key)&&!editable(base,key))){
  for(const control of Object.keys(baseValues).filter(key=>key!==target&&color(key)&&editable(base,key))){
   const probes=[...materialStates,...roleRecords].filter(record=>record.field.split('.').at(-1)===control).map(record=>record.state);
   if(new Set([values(base)[control],...probes.map(state=>values(state)[control])]).size<2)continue;
   const evidence=[base,...states,...probes].filter(state=>values(state)[target]!==undefined&&!editable(state,target));
   if(evidence.every(state=>values(state)[target]===values(state)[control])){mirrors[target]=control;break;}
  }
 }
 if(Object.keys(mirrors).length)anchor.profiles.push({when:{},defaults:{},choices:{},hidden:[],mirrors,derived:'fixed-color-source-probes'});
 const finish=k=>k==='CPRICEGROUP'||k.endsWith('GROUP')||(/COLOR|CHCOL/.test(k)&&!/PLASTIC|FRAME/.test(k));
 for(let i=0;i<states.length;i++){
  const changedGroup=manifest.profiles[i].match(/--([^=]+)=/)?.[1];if(!changedGroup)continue;
  const state=states[i],v=values(state),first=values(states.find(s=>values(s).CPRICEGROUP===v.CPRICEGROUP)),rule=anchor.profiles[i];
  for(const key of Object.keys(v))if(finish(key)&&v[key]!==first[key]){
   rule.defaults[key]=v[key];
   if(!Object.entries(state.properties).some(([k,p])=>k.endsWith('.'+key)&&p.visible&&p.editable)&&!rule.hidden.includes(key))rule.hidden.push(key);
  }
 }
 // Some mesh selectors expose colours while keeping their group read-only.
 // Require complete measured colour coverage and a unique group for each
 // colour across every captured price/profile. Never infer it from the code.
 const groupEvidence=[base,...states,...roleStates,...materialStates.map(record=>record.state)];
 for(const target of Object.keys(baseValues).filter(key=>key.endsWith('GROUP')&&key!=='CPRICEGROUP'&&!editable(base,key))){
  const control=target.replace(/GROUP$/,'COLOR');
  const observed=groupEvidence.filter(state=>values(state)[target]!==undefined&&values(state)[control]!==undefined);
  if(!observed.length||observed.some(state=>editable(state,target)))continue;
  const mapping=new Map(),domain=new Set();
  for(const state of observed){
   const v=values(state),groups=mapping.get(v[control])||new Set();groups.add(v[target]);mapping.set(v[control],groups);
   for(const [key,list] of Object.entries(state.choices))if(key.endsWith('.'+control))for(const choice of list)if(choice.selectable)domain.add(choice.value);
  }
  if(domain.size<2||[...mapping.values()].some(groups=>groups.size!==1)||[...domain].some(value=>!mapping.has(value)))continue;
  if(new Set([...mapping.values()].flatMap(groups=>[...groups])).size<2)continue;
  for(const value of domain)anchor.profiles.push({when:{[control]:value},defaults:{[target]:[...mapping.get(value)][0]},choices:{},hidden:[target],derived:'hidden-group-source-probes'});
 }
 if(!manifest.coupledRoleEvidence)return anchor;
 const evidence=values(JSON.parse(await fs.readFile(path.join(dir,Object.values(manifest.coupledRoleEvidence)[0]),'utf8')));
 if(evidence.CUPHCOLOR===anchor.defaults.CUPHCOLOR||evidence.CUPHCOLOR!==evidence.CHEADRESTUPHCOLOR)throw Error('Missing coupled-color source evidence');
 for(let i=0;i<manifest.profiles.length;i++){
  const state=states[i],v=values(state),rule=anchor.profiles[i];rule.mirrors={};
  const editable=field=>Object.entries(state.properties).some(([k,p])=>k.endsWith('.'+field)&&p.visible&&p.editable);
  for(const [target,control] of Object.entries({CUPHCOLOR:'CHEADRESTUPHCOLOR',CUPHGROUP:'CHEADRESTUPHGROUP'}))if(!editable(target)&&editable(control)&&v[target]===v[control])rule.mirrors[target]=control;
 }
 return anchor;
}

// A group capture changes its selected default even when its editable list
// has not changed. Do not re-add that unchanged list after a dependency
// capture made the same field fixed/hidden (e.g. Z-body leather headrest).
export function refineProfiles(anchor){
 for(const rule of anchor.profiles){
  if(Object.keys(rule.when).length<2)continue;
  const base=anchor.profiles.find(r=>Object.keys(r.when).length===1&&r.when.CPRICEGROUP===rule.when.CPRICEGROUP);
  if(!base)continue;
  for(const key of Object.keys(rule.choices))if(JSON.stringify(rule.choices[key])===JSON.stringify(base.choices[key]))delete rule.choices[key];
 }
 return anchor;
}
if(process.argv[1]?.endsWith('refine-catalog-profiles.mjs')){
 const file='content/configurator-catalog.json',data=JSON.parse(await fs.readFile(file,'utf8'));
 for(const family of data.families)for(const anchor of family.anchors){refineProfiles(anchor);await sourceMirrors(anchor);}
 await fs.writeFile(file,JSON.stringify(data));console.log('Refined conditional group profiles');
}
