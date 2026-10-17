import original from '../../content/custom-furniture-copy.json';
import {copyText} from './editorial-copy';
/** Shared exact approved values for the visible article and reading adapter. */
export function customFurnitureText(id:string,_fallback?:string){return copyText(id,(original as Record<string,string>)[id]);}
export function customFurnitureDocument(steam:boolean){
 const t=customFurnitureText;
 return {path:steam?'/steam-baldai/':'/biuro-baldu-gamyba/',title:t(steam?'ui.b590deaa13522891e6f3':'ui.675ca511bd53cf833b07'),texts:[
  t('ui.15ecdada28f595f3f236')+t(steam?'ui.729ffaf8cf239ea93764':'ui.7572b1a0345a9280ba9c'),
  t('ui.8c214d46b16753532d1d'),t(steam?'ui.dcc1c686d3dbaa0a0e50':'ui.4ca9cd27a52100f5d635')+' '+t('ui.d201b85948a565d095c3'),
  t('ui.ddeefa63819713ddcb7f'),...['ui.09f10abdd12628e46f64','ui.d7549344c6a1bb6f0561','ui.60fb3ab892e4bde89feb','ui.743c0bc82b279a4bbabf','ui.ac484fc70f9c85d354cc'].map(id=>t(id)),
  t('ui.cd6a93d2be36c23170fb'),t('ui.38e891947f9a3afdfeb6'),t('ui.3799808f072d0244ad45'),t('ui.6cbe4d507b930f1721f8')
 ]};
}
