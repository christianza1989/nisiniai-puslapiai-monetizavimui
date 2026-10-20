import {createHash} from 'node:crypto';
import {z} from 'zod';
import {publicationOne,publicationAll} from '@/lib/publication-db';
import type {Product} from './types';
const text=z.string().trim().min(20).max(12000).refine(s=>!/<[^>]+>|\b(?:Pinet|Verslomatika|Nowy\s+Styl|SOHOS|Kusch\s*\+\s*Co)\b/i.test(s),'Tekste yra markup arba viešai nerodomas operatorius / tiekėjas.');
const schema=z.object({key:z.string().max(250),baseRevisionHash:z.string().regex(/^[a-f0-9]{64}$/),copy:z.object({summary:text.max(700),paragraphs:z.array(text).min(2).max(12)}).strict(),gemini:z.object({provider:z.literal('Gemini App'),model:z.literal('4 Argon'),thinking:z.literal('low'),conversation:z.url().refine(s=>/^https:\/\/gemini\.google\.com\/(?:u\/\d+\/)?app\/[A-Za-z0-9_-]+$/.test(s)),originalResponse:z.string().min(100).max(180000)}).strict(),factualReview:z.object({actor:z.string().min(3).max(120),notes:z.string().min(40).max(4000),sourceRevisionHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict()}).strict();
export function validateCopy(input:unknown,currentHash:string){
 const value=schema.parse(input);
 if(value.baseRevisionHash!==currentHash||value.factualReview.sourceRevisionHash!==currentHash)throw Error('Gemini užduoties šaltinio revizija pasikeitė. Reikia naujos faktų peržiūros.');
 const raw=value.gemini.originalResponse.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
 const original=JSON.parse(raw);if(JSON.stringify(original)!==JSON.stringify(value.copy))throw Error('Tekstas nesutampa su originaliu Gemini atsakymu. Išsaugokite saviredaguotą originalą.');
 return {...value,at:new Date().toISOString(),responseSha256:createHash('sha256').update(value.gemini.originalResponse).digest('hex')};
}
export type CopyDraft=ReturnType<typeof validateCopy>;
export type Drafts={version:1;models:Record<string,CopyDraft>};
export async function readDrafts():Promise<Drafts>{
 const row=await publicationOne<{payload:string}>("SELECT payload FROM admin_documents WHERE name='drafts.json'");
 if(!row)throw Error('Tekstų saugykla neparuošta.');
 const value=JSON.parse(row.payload);
 const rows=await publicationAll<{model_key:string;view_payload:string}>("SELECT model_key,view_payload FROM publication_model_documents WHERE document='drafts.json'");
 value.models={...value.models,...Object.fromEntries(rows.map(r=>[r.model_key,JSON.parse(r.view_payload)]))};return value;
}
export function applyDrafts(products:Product[],drafts:Drafts):Product[]{
 return products.map(p=>({...p,publicationCopy:Object.fromEntries(p.configurations.flatMap(c=>{const d=drafts.models[p.id+':'+c.id];return d?[[c.id,d.copy]]:[];}))}));
}
