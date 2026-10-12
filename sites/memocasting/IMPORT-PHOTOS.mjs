import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
process.env.STUDIO_DATA_DIR=fileURLToPath(new URL('./studio-data/',import.meta.url));
process.env.STUDIO_OUTPUT_DIR=fileURLToPath(new URL('./studio-output/',import.meta.url));
const {getSite,saveResponsiveAsset,editDraftAssetMetadata}=await import('../../content-studio/src/model.mjs');
const source='C:/Users/Lenovo/Downloads/holders3/';
const definitions=[
 ['owner-main','main_picture_with_logo_Black_png_c1259d42-e683-4b32-9a11-b6dca95ea0cb.webp','Memory Casting rinkinio ir rankų liejinio vaizdas su pakuotėmis bei mediniu pagrindu.','Rinkinio ir liejinio vaizdas. Komplektaciją tikrinkite pasirinkto produkto apraše.','public-home; pictured extras not confirmed'],
 ['owner-couple','3d-ranku-liejimo-rinkinys-porai-591224.webp','Baltas susikibusių poros rankų liejinys rožiniame ir žydrame fone.','Rankų liejinio pavyzdys; rinkinio komplektacija aprašyta tekste.','public-couple-example; not a customer testimonial'],
 ['owner-family','didelis-ranku-liejimo-rinkinys-seimai-257535.webp','Kelių susikibusių rankų liejinys rožiniame ir žydrame fone.','Liejinio pavyzdys; nuotrauka nenustato rinkinio dalyvių skaičiaus.','public-family-example; capacity not verified'],
 ['owner-baby','kudikio-pedutes-961017.webp','Du pėdučių liejiniai rožiniame ir žydrame fone.','Liejinių pavyzdys; produkto tinkamumas ir pardavimo duomenys dar nepatvirtinti.','public-informational-example-only; no baby SKU or safety approval'],
 ['owner-closeup','close-up-of-a-detailed-3d-hand-cast-scul_Tg7wfN7lSSyjI9XcEykuXA_-NILgU_BTcC1532LyTcckA.webp','Rožinės ir žydros spalvos rankų skulptūros vaizdas ant stalo.','','private-only; unknown creation provenance, not verified real result'],
 ['owner-wood','isdziovintas-uosinis-padeklas-922559.webp','Rankų liejinys ant apvalaus medinio pagrindo.','Medinis pagrindas pasirenkamas atskirai už 10 €. Liejinys vaizde yra pavyzdys.','public-optional-base; wood species and dimensions unconfirmed']
];
let site=await getSite('memocasting');const entries=[];
for(const [key,file,alt,credit,decision] of definitions){
 const bytes=await readFile(source+file),sha256=createHash('sha256').update(bytes).digest('hex');
 let family=site.assets.filter(a=>a.alt===alt);
 if(!family.length)family=(await saveResponsiveAsset(site.id,{mime:'image/webp',alt,credit,rights:'Savininko pateiktas vaizdas ir tiesioginis leidimas naudoti svetainės pamatui 2026-10-12; ne kliento atsiliepimo ar nepriklausomo produkto bandymo įrodymas.',prompt:'Owner supplied existing WebP. Imported unchanged through shared responsive pipeline; no AI generation/edit. '+decision},bytes)).variants;
 if(family[0].credit!==credit&&!family.some(a=>a.metadataPublished)){await editDraftAssetMetadata(site.id,family[0].id,{alt,credit},'memocasting-editorial-agent');site=await getSite(site.id);family=site.assets.filter(a=>a.alt===alt);}
 entries.push({key,sourceFile:file,sourceSha256:sha256,alt,credit,decision,variantIds:family.map(a=>a.id),variants:family.map(a=>({id:a.id,width:a.width,height:a.height,src:a.src}))});
 site=await getSite(site.id);
}
await writeFile(new URL('./OWNER-ASSETS.json',import.meta.url),JSON.stringify({recordedOn:'2026-10-12',source:'Direct owner message with six local image attachments, read via shop thread',entries},null,2));
console.log(JSON.stringify({importedFamilies:entries.length,variants:entries.reduce((n,e)=>n+e.variantIds.length,0),privateFamilies:entries.filter(e=>e.decision.startsWith('private')).map(e=>e.key)}));
