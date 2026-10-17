import copy from '../../content/editorial/compiled-ui.json';

/** Public, data-only dictionary; no supplier facts, DB data or secrets in clients. */
export function copyText(id:string,fallback:string,values?:Record<string,unknown>):string{
 const value=(copy as Record<string,string>)[id]??fallback;
 return values?value.replace(/\{\{(p\d+)\}\}/g,(token,key)=>Object.hasOwn(values,key)?String(values[key]):token):value;
}
export function copyValue(value:string):string{
 const direct=(copy as Record<string,string>)['value:'+value];if(direct)return direct;
 const coded=value.match(/^(.*?) (\([^()]+\))$/);
 return coded?((copy as Record<string,string>)['value:'+coded[1]]??coded[1])+' '+coded[2]:value;
}
