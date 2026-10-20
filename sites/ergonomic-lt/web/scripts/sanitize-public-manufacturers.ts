import fs from 'node:fs';
import path from 'node:path';
import {parseHTML} from 'linkedom';
import {publicProductText} from '../src/lib/public-product-copy';

const names=/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/i;
const backup='../research/private-manufacturers-20261013/static-before';
let changed=0;
for(const relative of fs.readdirSync('public',{recursive:true}) as string[]){
 if(!relative.endsWith('.html'))continue;
 const file=path.join('public',relative),original=fs.readFileSync(file,'utf8');
 if(!names.test(original))continue;
 const {document}=parseHTML(original);
 for(const node of document.querySelectorAll('.brand-line,.selected-brand-line,.trusted-brands,.brand-strip')){
  if(names.test(node.textContent))node.remove();
 }
 function textOnly(node:any){
  if(['SCRIPT','STYLE','CODE','PRE'].includes(node.nodeName))return;
  for(const child of Array.from(node.childNodes) as any[]){
   if(child.nodeType===3&&names.test(child.textContent))child.textContent=publicProductText(child.textContent);
   else if(child.nodeType===1)textOnly(child);
  }
 }
 textOnly(document);
 for(const node of document.querySelectorAll('[alt],[title],[aria-label],meta[content]')){
  for(const attribute of ['alt','title','aria-label','content']){
   const value=node.getAttribute(attribute);if(value&&names.test(value))node.setAttribute(attribute,publicProductText(value));
  }
 }
 // Demo data can be rendered by shared.js after load. It is separate from the
 // private authoritative catalogue and has no role in resolving real orders.
 function demoData(value:any):any{
  if(Array.isArray(value))return value.map(demoData);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='brand'?'':demoData(item)]));
  return typeof value==='string'&&names.test(value)&&!/^https?:/.test(value)?publicProductText(value):value;
 }
 for(const node of document.querySelectorAll('script[type="application/json"],script[type="application/ld+json"]')){
  if(names.test(node.textContent))node.textContent=JSON.stringify(demoData(JSON.parse(node.textContent)));
 }
 const target=path.join(backup,relative);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target))fs.writeFileSync(target,original);
 fs.writeFileSync(file,document.toString());changed++;
}
console.log(JSON.stringify({changedHtmlFiles:changed,backup}));
