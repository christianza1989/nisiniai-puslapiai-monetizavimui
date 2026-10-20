
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import type {Configuration} from './types';

const labels:Record<string,string>={
  CBASE:'Pagrindas',CBASEMETALCOLOR:'Pagrindo spalva',CBASEMETALMATERIAL:'Pagrindo medžiaga',
  CBACKREST:'Atlošas',CHEADREST:'Galvos atrama',CLUMBARSUPPORT:'Juosmens atrama',
  CARMRESTS:'Porankiai',CARMPAD:'Porankių atramos',CMECHANISM:'Mechanizmas',
  CCASTORS:'Ratukai',CGLIDES:'Pėdutės',CFOOTREST:'Kojų atrama',
  CFRAMEMETALCOLOR:'Rėmo spalva',CFRAMEMETALMATERIAL:'Rėmo medžiaga',
  CFRAMEPLASTICCOLOR:'Plastikinio rėmo spalva',CPLASTICCOLORVERSION:'Plastiko spalvos variantas',
  CPLASTICCOLORVERSION2:'Plastiko spalvos variantas',CPLASTICCOLOR:'Plastiko spalva',
  CSEAT:'Sėdynė',CSEATWOODCOLOR:'Sėdynės medienos spalva',CSEATWOODMATERIAL:'Sėdynės medžiaga',
  CUPHGROUP:'Apmušalo kolekcijos kodas',CUPHCOLOR:'Apmušalo spalvos kodas',
  CUPHSEATCOLOR:'Sėdynės apmušalo spalvos kodas',CUPHBACKRESTCOLOR:'Atlošo apmušalo spalvos kodas',
  CMESHCOLOR:'Tinklelio spalvos kodas',CMESHGROUP:'Tinklelio kolekcijos kodas',
  CHEADRESTUPHGROUP:'Galvos atramos apmušalo kolekcijos kodas',CHEADRESTUPHCOLOR:'Galvos atramos apmušalo spalvos kodas',
  CSHELLPLASTICCOLOR:'Korpuso plastiko spalva',CSHELLWOODCOLOR:'Korpuso medienos spalva',
  CWOODMATERIAL:'Mediena',CWOODCOLOR:'Medienos spalva',CTABLET:'Rašymo lentelė',
  FTOPBOARDCOLOR:'Stalviršio spalva',FTOPBOARDCOLOR1:'Stalviršio spalva',FTOPCOLOR:'Stalviršio spalva',
  FTOPBOARDMATERIAL:'Stalviršio medžiaga',FTOPMATERIAL:'Stalviršio medžiaga',FTOPSHAPE:'Stalviršio forma',
  FBASECOLOR:'Pagrindo spalva',FBASEMETALCOLOR:'Metalinio pagrindo spalva',FBASEMETALMATERIAL:'Pagrindo medžiaga',
  FUPHGROUP:'Apmušalo kolekcijos kodas',FUPHCOLOR:'Apmušalo spalvos kodas',FHEIGHTADJUSTMENT:'Aukščio reguliavimas',
  FDOORBOARDCOLOR:'Durelių spalva',FCARCASSBOARDCOLOR:'Korpuso spalva',FFRONTBOARDCOLOR:'Priekinės dalies spalva',
  DWIDTH:'Plotis',DDEPTH:'Gylis',DHEIGHT:'Aukštis',DDIAMETER:'Skersmuo',DTOPWIDTH:'Stalviršio plotis',DTOPDEPTH:'Stalviršio gylis'
};
const values:Record<string,string>={BLACK:'Juoda',WHITE:'Balta',GREY:'Pilka',GRAY:'Pilka',GREEN:'Žalia',
  BLACKEDITION:'Juoda',WHITEEDITION:'Balta',NONE:'Be šio elemento',YES:'Taip',NO:'Ne',
  STEELPC:'Dažytas plienas',STEELCR:'Chromuotas plienas',ALUMINIUM:'Aliuminis',POLISHED:'Poliruotas'};

export function supplierOptions(configuration:Pick<Configuration,'configurator'|'supplierOptions'>):string[]{
  if(configuration.supplierOptions)return configuration.supplierOptions;
  if(!configuration.configurator)return [];
  try{return (new URLSearchParams(new URL(configuration.configurator).hash.slice(1)).get('ovc')||'').split(';').filter(Boolean);}catch{return [];}
}
export function optionDetails(options:string[]){
  const rows:{label:string;value:string}[]=[];
  for(const option of options){
    const equals=option.indexOf('=');if(equals<1)continue;
    const key=option.slice(0,equals).split('.').pop()!,raw=option.slice(equals+1);
    if(!labels[key])continue;
    const value=values[raw]?`${values[raw]} (${raw})`:raw;
    rows.push({label:labels[key],value});
  }
  return rows;
}
export function configurationDescription(name:string,source:string,index:number){
  const parts:string[]=[];
  if(/\bDUO-BACK\b/i.test(source))parts.push(copyText("ui.682d34e4afb5e79cfa12","Duo-Back atlošas"));
  else if(/\bMESH\b/i.test(source))parts.push(copyText("ui.63098d690dc9fb73bce7","Tinklinis atlošas"));
  else if(/\bUPH(?:\/P)?\b/i.test(source))parts.push(copyText("ui.b382479ac6479a106613","Apmušalai"));
  if(/\b4L\b/.test(source))parts.push(copyText("ui.40a28aada58ce9701ede","Keturios kojos"));
  else if(/\bCFA\b/.test(source))parts.push(copyText("ui.85cfb206890596a1fe90","Rėmas CFA"));
  else if(/\bCF\b/.test(source))parts.push(copyText("ui.349216d2274afc636d5b","Rėmas CF"));
  for(const [word,text] of [['BLACK',copyText("ui.63594342344560949914","Juoda")],['WHITE',copyText("ui.6742b790540b4b73c71c","Balta")],['GREY',copyText("ui.4e5676e6e3066c918520","Pilka")],['GRAY',copyText("ui.4e5676e6e3066c918520","Pilka")],['GREEN',copyText("ui.f33e544559aeee475e30","Žalia")]] as const)
    if(new RegExp(`\\b${word}\\b`,'i').test(source))parts.push(text);
  return `${name} · ${parts.length?parts.join(' · '):`komplektacija ${index+1}`}`;
}
export function localizeConfiguration(configuration:Configuration,productName:string,index:number):Configuration{
  const original=configuration.sourceDescription||configuration.description;
  const options=supplierOptions(configuration);
  return {...configuration,name:`Komplektacija ${index+1}`,description:configurationDescription(productName,original,index),
    sourceDescription:original,supplierOptions:options,details:optionDetails(options)};
}
