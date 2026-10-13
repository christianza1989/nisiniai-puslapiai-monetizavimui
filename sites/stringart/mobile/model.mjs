export const SCHEMA='memorystring.instructions/v1';
export const ALGORITHM='trevor-sse-004a7b7-memorystring-v1';
export function validateProject(p){
  if(!p||p.schema!==SCHEMA||typeof p.id!=='string'||p.id.length>80||typeof p.title!=='string'||p.title.length>100)throw Error('Unrecognised project format.');
  if(!p.frame||!Number.isInteger(p.frame.pins)||p.frame.pins<32||p.frame.pins>300||![42,50,60].includes(p.frame.diameterCm)||p.frame.numbering!=='clockwise-top-1')throw Error('Unrecognised frame or pin numbering.');
  if(!Array.isArray(p.layers)||!p.layers.length||p.layers.length>4)throw Error('The thread sequence is missing.');
  let count=0;
  for(const l of p.layers){
    if(!l||!/^#[0-9a-f]{6}$/i.test(l.color)||!Number.isFinite(l.alpha)||l.alpha<.01||l.alpha>.5||!Array.isArray(l.path)||l.path.length<2||l.path.length>5001)throw Error('Invalid thread layer.');
    if(l.path.some((v,i)=>!Number.isInteger(v)||v<0||v>=p.frame.pins||(i>0&&v===l.path[i-1])))throw Error('The sequence contains an invalid pin number.');
    count+=l.path.length-1;
  }
  if(!Number.isInteger(p.step)||p.step<0||p.step>count)throw Error('Invalid build position.');
  // Construct a known projection; never retain arbitrary imported HTML or fields.
  return {schema:SCHEMA,id:p.id,title:p.title,createdAt:typeof p.createdAt==='string'?p.createdAt:new Date().toISOString(),algorithm:typeof p.algorithm==='string'?p.algorithm.slice(0,100):'imported',frame:{pins:p.frame.pins,diameterCm:p.frame.diameterCm,numbering:p.frame.numbering},layers:p.layers.map(l=>({color:l.color,alpha:l.alpha,path:[...l.path]})),step:p.step};
}
export function steps(p){return p.layers.flatMap((l,layer)=>l.path.slice(1).map((to,i)=>({from:l.path[i],to,color:l.color,layer,tie:i===0})));}
export function phrase(s){const a=s.from+1,b=s.to+1;return `${s.tie?'Tie the thread at pin':'From pin'} ${a}, ${s.tie?'then go to pin':'to pin'} ${b}.`;}
export function pin(i,n){const a=-Math.PI/2+2*Math.PI*i/n;return {x:.5+.47*Math.cos(a),y:.5+.47*Math.sin(a)};}
export function threadMeters(p){let m=0;for(const l of p.layers)for(let i=1;i<l.path.length;i++){const a=pin(l.path[i-1],p.frame.pins),b=pin(l.path[i],p.frame.pins);m+=Math.hypot(a.x-b.x,a.y-b.y)/.94*p.frame.diameterCm/100;}return m;}
