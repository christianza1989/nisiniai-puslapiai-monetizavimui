
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import { z } from 'zod';
import { randomUUID, createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import { dbOne,dbRun,rateAllowed } from './db';
import { visibleProductsAsync } from './catalog';
import type { QuotePayload } from './types';
import {pilotSelection} from './configurator';
import {createExpandedEngine} from './expanded-configurator';
import {loadCatalogRuntime} from './catalog-runtime-loader';
import {modelName,modelProduct} from './product-models';
import {configurableArticle} from './configuration-article';
import {supplierOptions,optionDetails} from './configuration-labels';
import {supplierReference,quoteOrderText} from './supplier-reference';

export const quoteSchema=z.object({
  name:z.string().trim().min(2).max(100),email:z.email().max(200),phone:z.string().trim().max(40),
  company:z.string().trim().max(160),message:z.string().trim().max(5000),
  items:z.array(z.object({productId:z.string().max(200),configurationId:z.string().max(100).nullable(),configurationState:z.object({family:z.string().max(30),anchor:z.string().max(100),values:z.record(z.string().regex(/^[A-Z0-9]+$/),z.string().max(100)).refine(x=>Object.keys(x).length<=35)}).optional(),quantity:z.number().int().min(1).max(1000),note:z.string().max(500)})).max(30),
  consent:z.literal(true),submissionKey:z.uuid(),website:z.string().max(100),startedAt:z.number()
}).refine(p=>p.items.length>0||p.message.length>=10,{message:copyText("ui.742aa41acaeed80e038c","Įrašykite užklausą arba pasirinkite prekę.")});
export type QuoteRecord={id:string;payload:string;created_at:string;status:string;delivery_status:string;delivery_error:string|null;delivery_attempts:number};
export async function storeQuote(input:unknown) {
  const payload=quoteSchema.parse(input) as QuotePayload;
  if(payload.website||Date.now()-payload.startedAt<1200||payload.startedAt>Date.now())throw new Error(copyText("ui.6185b8e6657822aaf0ce","Patikrinkite formą ir bandykite dar kartą."));
  const prior=await dbOne<{id:string}>('SELECT id FROM quotes WHERE submission_key=?',payload.submissionKey);
  if(prior)return {id:prior.id,duplicate:true};
  const products=await visibleProductsAsync();
  const resolved:object[]=[];
  for(const item of payload.items){
    const p=products.find(p=>p.id===item.productId);if(!p)throw new Error(copyText("ui.8b2bc0e5fcb7d4a51bed","Viena iš pasirinktų prekių nebepasiekiama. Atnaujinkite sąrašą."));
    if(item.configurationState){const model=p.configurations.find(c=>c.id===item.configurationId),candidate=model?modelProduct(p,model):p;
      const configured=configurableArticle(candidate)?candidate:p,engine=createExpandedEngine(await loadCatalogRuntime(configured,item.configurationState)),selection=engine.expandedSelection(configured,item.configurationState),article=engine.selectionArticle(configured,selection.state);
      if(item.configurationId!==selection.configuration.id)throw Error(copyText("ui.b67f291ae5800555e0e3","Komplektacijos kodas neatitinka produkto."));
      const selectedSample=p.configurations.find(c=>c.id===selection.configuration.id&&c.code===selection.configuration.code)||p.configurations.find(c=>c.code===selection.configuration.code);
      resolved.push({...item,...supplierReference(p),configurationState:selection.state,productName:article?configured.name:selectedSample?modelName(p,selectedSample):p.name,configurationName:selection.configuration.description,baseArticle:selection.configuration.code,supplierOptions:selection.configuration.supplierOptions,configurationDetails:selection.configuration.details,
        ...(article?{configurationArticle:article}:{}),...(article?{configurationArticle:article}:{}),...(article?{configurationArticle:article}:{}),configurationEvidence:{schemaVersion:2,kind:'public-export-independent-parts',base:selection.assets.base,patches:selection.assets.patches.map(p=>({remove:p.remove,geometry:p.geometry,...(p.geometries?{geometries:p.geometries}:{})})),notice:selection.variant.visualizationNote}});
      continue;
    }
    const config=item.configurationId?p.configurations.find(c=>c.id===item.configurationId):null;
    if(item.configurationId&&!config)throw new Error(copyText("ui.d55fae12d560ae5536d1","Pasirinkta konfigūracija nebegalioja."));
    const pilot=config?pilotSelection(p,config.id):undefined;
    resolved.push({...item,...supplierReference(p),productName:config?modelName(p,config):p.name,configurationName:pilot?.variant.label||config?.description||null,baseArticle:config?.code||null,
      supplierOptions:config?supplierOptions(config):[],configurationDetails:config?.details|| (config?optionDetails(supplierOptions(config)):[]),supplierConfigurationDescription:config?.sourceDescription||config?.description||null,
      configurationEvidence:pilot?{schemaVersion:1,kind:'public-preset-3d-pilot',supplierOptions:pilot.variant.supplierOptions,
        model:pilot.variant.asset,modelSha256:pilot.variant.assetSha256,sourceCad:pilot.variant.sourceCadUrl,sourceCadSha256:pilot.variant.sourceCadSha256,
        image:pilot.variant.image,notice:pilot.variant.visualizationNote}:null});
  }
  const emailKey=createHash('sha256').update(payload.email.toLowerCase()).digest('hex');
  if(!await rateAllowed('quote-email:'+emailKey,5,15*60_000))throw new Error(copyText("ui.684b0117a0f40df1a988","Per daug užklausų. Bandykite po 15 minučių arba susisiekite telefonu."));
  const id=randomUUID();
  const inserted=await dbRun('INSERT INTO quotes(id,submission_key,payload,created_at) VALUES(?,?,?,?) ON CONFLICT(submission_key) DO NOTHING',id,payload.submissionKey,JSON.stringify({...payload,items:resolved}),new Date().toISOString());
  if(!inserted.changes){const existing=await dbOne<{id:string}>('SELECT id FROM quotes WHERE submission_key=?',payload.submissionKey);if(existing)return {id:existing.id,duplicate:true};throw Error(copyText("ui.97164bb3ddaf47c7c21e","Užklausos išsaugoti nepavyko."));}
  return {id,duplicate:false};
}
export async function deliverQuote(id:string) {
  const record=await dbOne<QuoteRecord>('SELECT * FROM quotes WHERE id=?',id);
  if(!record)throw new Error(copyText("ui.5c43fbbe147bd6ad8126","Užklausa nerasta."));
  if(record.delivery_status==='sent')return 'sent';
  if(!process.env.SMTP_HOST||!process.env.SMTP_FROM){await dbRun("UPDATE quotes SET delivery_status='awaiting_configuration' WHERE id=?",id);return 'awaiting_configuration';}
  const claimed=await dbRun("UPDATE quotes SET delivery_status='sending', delivery_started_at=?, delivery_attempts=delivery_attempts+1 WHERE id=? AND delivery_status!='sent' AND (delivery_status!='sending' OR delivery_started_at<?)",Date.now(),id,Date.now()-120_000);
  if(!claimed.changes)return 'sending';
  const p=JSON.parse(record.payload);
  const items=p.items.map(quoteOrderText).join('\n\n');
  const text=copyText("ui.7774b62e446a65145b55","Užklausa {{p0}}\n\nVardas: {{p1}}\nEl. paštas: {{p2}}\nTelefonas: {{p3}}\nĮmonė: {{p4}}\n\nPrekės:\n{{p5}}\n\nŽinutė:\n{{p6}}",{p0:(id),p1:(p.name),p2:(p.email),p3:(p.phone),p4:(p.company),p5:(items||'Bendra užklausa'),p6:(p.message)});
  try {
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',
      auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,
      connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:15_000,requireTLS:process.env.SMTP_SECURE!=='true',disableFileAccess:true,disableUrlAccess:true});
    await transport.sendMail({from:process.env.SMTP_FROM,to:process.env.QUOTE_TO||'info@ergonomic.lt',replyTo:p.email,subject:`Ergonomic.lt užklausa ${id.slice(0,8)}`,text});
    await dbRun("UPDATE quotes SET delivery_status='sent',delivery_error=NULL WHERE id=?",id);return 'sent';
  } catch {
    await dbRun(copyText("ui.29703db59b63575d717c","UPDATE quotes SET delivery_status='failed',delivery_error='El. pašto transporto klaida. Patikrinkite SMTP konfigūraciją.' WHERE id=?"),id);return 'failed';
  }
}
