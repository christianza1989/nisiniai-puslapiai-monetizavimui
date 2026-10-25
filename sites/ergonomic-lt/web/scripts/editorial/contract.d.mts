export function hash(value:unknown):string;
export function tokens(value:string):string[];
export function numberTokens(value:string):string[];
export function validatePackage(candidate:any,baseline:any):{fields:number;changed:number};
export function compilePackage(candidate:any):{ui:Record<string,string>;server:any};
