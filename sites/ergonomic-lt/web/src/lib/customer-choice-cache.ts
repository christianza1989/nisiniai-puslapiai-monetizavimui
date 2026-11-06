import type {CustomerConfiguration} from './customer-configuration';
/** Page-local, short-lived read-ahead of complete server-validated transitions.
 * Never infer reverse transitions or combine selections from different states. */
export class CustomerChoiceCache{
 private entries=new Map<string,{at:number;promise:Promise<CustomerConfiguration>}>();
 constructor(private load:(from:CustomerConfiguration,field:string,value:string)=>Promise<CustomerConfiguration>,private clock=Date.now){}
 get(from:CustomerConfiguration,field:string,value:string){
  const key=JSON.stringify([from.productId,from.selectionId,field,value]),now=this.clock(),old=this.entries.get(key);
  if(old&&now-old.at<5000)return old.promise;
  const promise=this.load(from,field,value);this.entries.delete(key);this.entries.set(key,{at:now,promise});
  void promise.then(()=>{const entry=this.entries.get(key);if(entry?.promise===promise)entry.at=this.clock();},()=>{});
  while(this.entries.size>8)this.entries.delete(this.entries.keys().next().value!);
  void promise.catch(()=>{if(this.entries.get(key)?.promise===promise)this.entries.delete(key);});return promise;
 }
 clear(){this.entries.clear();}
}
