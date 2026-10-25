import data from '../../content/catalog-consolidation.json';
import type {Configuration} from './types';

// Public merchandising only: supplier examples, order IDs and their original
// options stay intact. Different base article codes never share a keeper.
const groups=data.groups;
const identities=new Map(groups.flatMap(group=>group.members.map(member=>[group.productId+':'+member.id,group] as const)));
const paths=new Map(groups.flatMap(group=>group.members.filter(m=>m.id!==group.keeperId).map(member=>[member.path,{...member,keeperPath:group.keeperPath}] as const)));
export function catalogModelVisible(productId:string,c:Pick<Configuration,'id'|'code'>){
 const group=identities.get(productId+':'+c.id);
 return !group||group.code!==c.code||group.keeperId===c.id;
}
export function historicalCatalogPreset(productId:string,keeper:Pick<Configuration,'id'|'code'>,input:unknown){
 if(typeof input!=='string')return;
 const group=identities.get(productId+':'+keeper.id);
 return group?.code===keeper.code&&group.keeperId===keeper.id&&group.members.some(m=>m.id===input)?input:undefined;
}
export function catalogModelAliases(productId:string,id?:string){
 const group=id?identities.get(productId+':'+id):undefined;
 return group&&group.keeperId===id?group.members.map(m=>m.id):[];
}
export function consolidatedRedirect(url:URL):URL|undefined{
 const route=url.pathname.endsWith('/')?url.pathname:url.pathname+'/';
 const retired=paths.get(route);if(!retired)return;
 const target=new URL(url);target.pathname=retired.keeperPath;
 // A historical preset remains addressable, even when it only has photos.
 // Existing saved state tokens and unrelated query parameters are retained.
 target.searchParams.set('pavyzdys',retired.id);
 return target;
}
