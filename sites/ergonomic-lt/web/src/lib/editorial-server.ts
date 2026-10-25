import data from '../../content/editorial/compiled-server.json';
import {parseHTML} from 'linkedom';
import type {LegacyPage,Product,ProductArticle} from './types';

type HtmlBinding={id:string;selector:string;index:number;attribute?:string;original:string;value:string;tokens?:Record<string,string>};
type ServerCopy={pages:Record<string,{h1?:string;title?:string;description?:string}>;products:Record<string,{description?:string;features?:Record<string,string>;configurations?:Record<string,string>;articles?:Record<string,ProductArticle>}>;categories:Record<string,string>;html:Record<string,HtmlBinding[]>};
const copy=data as ServerCopy;
export function editorialPage(page:LegacyPage):LegacyPage{return {...page,...copy.pages[page.path]};}
export function editorialProduct(product:Product):Product{
 return editorialProductWithCopy(product,copy.products[product.id]);
}
export function editorialProductWithCopy(product:Product,text:ServerCopy['products'][string]|undefined):Product{
 if(!text)return product;
 return {...product,description:text.description??product.description,features:product.features.map(f=>text.features?.[f]??f),
  configurations:product.configurations.map(c=>text.configurations?.[c.id]!==undefined
   ?{...c,sourceDescription:c.sourceDescription||c.description,description:text.configurations[c.id]}:c)};
}
export function editorialConfiguration(productId:string,id:string,fallback:string){return copy.products[productId]?.configurations?.[id]??fallback;}
export function editorialModelArticle(productId:string,id:string){return copy.products[productId]?.articles?.[id];}
export function editorialCategory(id:string,fallback:string){return copy.categories[id]??fallback;}
export function hasEditorialPage(path:string){return !!copy.pages[path]||!!copy.html['legacy:'+path]?.length||(path==='/'&&(!!copy.html['home-hero']?.length||!!copy.html['home-sections']?.length));}
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function htmlTemplate(element:Element):{text:string;tokens:Record<string,string>}{
 let n=0;const tokens:Record<string,string>={};
 function walk(node:Node):string{
  if(node.nodeType===3)return node.nodeValue||'';
  if(node.nodeType!==1)return '';
  const el=node as Element,index=n++,key='open'+index,end='close'+index;
  const outer=el.outerHTML,opening=outer.slice(0,outer.indexOf('>')+1);
  if(['BR','IMG','INPUT','HR'].includes(el.tagName)){const single='void'+index;tokens[single]=outer;return '[['+single+']]';}
  tokens[key]=opening;tokens[end]='</'+el.tagName.toLowerCase()+'>';
  return '[['+key+']]'+Array.from(el.childNodes).map(walk).join('')+'[['+end+']]';
 }
 return {text:Array.from(element.childNodes).map(walk).join(''),tokens};
}
export function applyEditorialHtml(scope:string,html:string):string{
 const bindings=copy.html[scope];if(!bindings?.length)return html;
 const {document}=parseHTML('<html><body>'+html+'</body></html>');
 for(const binding of bindings){
  const node=document.body.querySelectorAll(binding.selector)[binding.index];if(!node)continue;
  if(binding.attribute){if(node.getAttribute(binding.attribute)===binding.original)node.setAttribute(binding.attribute,binding.value);continue;}
  if(htmlTemplate(node).text!==binding.original)continue; // changed source is never overwritten by a stale revision
  const placeholders=binding.tokens||{};
  node.innerHTML=escape(binding.value).replace(/\[\[(open\d+|close\d+|void\d+)\]\]/g,(token,key)=>placeholders[key]??token);
 }
 return document.body.innerHTML;
}
