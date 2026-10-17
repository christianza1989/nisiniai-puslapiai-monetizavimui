import type {LegacyPage} from './types';
export type RedirectDecision={from:string;to:string;approved:boolean;reason:string};
export function validatedRedirects(input:unknown,protectedPages:Pick<LegacyPage,'path'>[]){
  if(!Array.isArray(input))throw new Error('Nukreipimų registras turi būti masyvas.');
  const protectedPaths=new Set(protectedPages.map(p=>p.path)),map=new Map<string,string>();
  for(const row of input as RedirectDecision[]){if(!row.approved)continue;if(typeof row.from!=='string'||typeof row.to!=='string'||!row.reason?.trim()||!/^\/[a-z0-9\-_/]+\/$/.test(row.from)||!/^\/[a-z0-9\-_/]+\/$/.test(row.to)||row.from===row.to||protectedPaths.has(row.from)||row.to.startsWith('/admin/')||row.to.startsWith('/api/')||row.to==='/uzklausa/')throw new Error('Neleistinas arba nepagrįstas nukreipimas.');if(map.has(row.from))throw new Error('Pasikartojantis nukreipimas.');map.set(row.from,row.to);}
  for(const to of map.values())if(map.has(to))throw new Error('Nukreipimų grandinės ir ciklai neleidžiami.');
  return map;
}
