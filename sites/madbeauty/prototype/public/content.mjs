import {contentCard,renderContentPage} from './content-render.mjs';
import {trustPages as baseTrustPages,withRetentionPolicy} from './product-trust.mjs';
import {crumbs} from './ui.mjs';
export let trustPages=baseTrustPages;
export const setRetentionPolicy=policy=>{trustPages=withRetentionPolicy(baseTrustPages,policy);};
export let guides=[];
let content={pages:[],operatorName:'MB Pinet'};
export function setContentData(data){if(data.siteId!=='madbeauty')throw Error('Wrong content site');content=data;guides=data.pages.filter(p=>['guide','article'].includes(p.type)&&p.slug.startsWith('gidai/')).map(p=>({...p,slug:p.slug.replace(/^gidai\//,'')}));}
export function guideCard(ctx,g){return contentCard({...g,slug:'gidai/'+g.slug});}
export function guideView(ctx,slug){const p=content.pages.find(p=>['guide','article'].includes(p.type)&&p.slug==='gidai/'+slug);return p?renderContentPage(p,content):null;}
export function projectedPageView(path){const p=content.pages.find(p=>'/'+p.slug===path||!p.slug&&path==='/');return p?renderContentPage(p,content):null;}
export function approvedHomeFragment(){const p=content.pages.find(p=>p.type==='home'&&!p.slug&&p.contentVersion===2);return p?renderContentPage(p,{...content,homeFragment:true}):'';}
export function guideIndex(){const p=content.pages.find(p=>p.slug==='gidai');return p?renderContentPage(p,content):null;}
export function trustView(path){const c=content.pages.find(p=>p.slug===path.slice(1)&&p.slug==='redakcija');if(c)return renderContentPage(c,content);const p=trustPages[path];return p?`<div class="page container">${crumbs([[p.title]])}<article class="prose"><h1 class="page-title">${p.title}</h1>${p.body}</article></div>`:null;}
