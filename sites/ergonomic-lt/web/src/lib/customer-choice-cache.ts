import type {CustomerConfiguration} from './customer-configuration';
/** Page-local, short-lived read-ahead of complete server-validated transitions.
 * Never infer reverse transitions or combine selections from different states. */
export class CustomerChoiceCache{
 private entries=new Map<string,{at:number;promise:Promise<CustomerConfiguration>}>();
 constructor(private load:(from:CustomerConfiguration,field:string,value:string)=>Promise<CustomerConfiguration>,private clock=Date.now){}
 get(from:CustomerConfiguration,field:string,value:string){
  const key=JSON.stringify([from.productId,from.selectionId,field,value]),now=this.clock(),old=this.entries.get(key);
  if(old&&now-old.at<30000)return old.promise;
  const promise=this.load(from,field,value);this.entries.delete(key);this.entries.set(key,{at:now,promise});
  void promise.then(()=>{const entry=this.entries.get(key);if(entry?.promise===promise)entry.at=this.clock();},()=>{});
  while(this.entries.size>8)this.entries.delete(this.entries.keys().next().value!);
  void promise.catch(()=>{if(this.entries.get(key)?.promise===promise)this.entries.delete(key);});return promise;
 }
 /** A return choice is independently requested and validated by the server.
  * Never substitute the old DTO or infer that dependent values are reversible. */
 async preloadRoundTrip(from:CustomerConfiguration,field:string,value:string){
  const next=await this.get(from,field,value),original=from.controls.find(c=>c.id===field)?.value;
  const back=next.controls.find(c=>c.id===field&&!c.disabled);
  if(original&&back?.choices.some(c=>c.id===original))await this.get(next,field,original);
 }
 clear(){this.entries.clear();}
}
