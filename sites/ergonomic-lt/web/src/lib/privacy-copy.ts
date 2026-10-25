import original from '../../content/privacy-copy.json';
import {copyText} from './editorial-copy';
export function privacyText(id:string,_fallback?:string){return copyText(id,(original as Record<string,string>)[id]);}
export function privacyDocument(){return [
 ...Object.keys(original).filter(id=>!['ui.67095de234af3fa7d9a9','ui.5213ce70040e222a6d7f','ui.c47513ff296f01e4960a'].includes(id)).map(id=>privacyText(id)),
 privacyText('ui.5213ce70040e222a6d7f')+'info@ergonomic.lt '+privacyText('ui.c47513ff296f01e4960a')
];}
