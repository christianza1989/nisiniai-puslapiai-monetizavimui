
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import type {Product} from './types';
import {selectedModelConfiguration} from './product-models';
import {productHeading,productKind} from './product-presentation';
import {localizeConfiguration} from './configuration-labels';
import {categoryLabel} from './category-labels';
import {baseSeed} from './catalog';
import {editorialCategory} from './editorial-server';
export function modelSeo(p:Product){
 if(p.modelArticle)return p.modelArticle.seo;
 const c=selectedModelConfiguration(p);
 const facts=(c?.details||[]).filter(d=>/Plotis|Gylis|Aukštis|spalva|spalvos kodas|medžiaga/i.test(d.label)).slice(0,3).map(d=>d.label+': '+d.value);
 let peers=p.configurations.filter(other=>other.id!==c?.id&&other.code===c?.code&&(other.sourceDescription||other.description)===(c?.sourceDescription||c?.description)).map((other,i)=>localizeConfiguration(other,p.familyName||p.name,i));
 const variable=(c?.details||[]).filter(row=>peers.some(other=>other.details?.some(r=>r.label===row.label&&r.value!==row.value)));
 const chosen:typeof variable=[];
 for(const row of variable){if(!peers.length)break;if(peers.some(other=>other.details?.find(r=>r.label===row.label)?.value!==row.value)){chosen.push(row);peers=peers.filter(other=>other.details?.find(r=>r.label===row.label)?.value===row.value);}}
 const variantFacts=chosen.map(row=>row.label+': '+row.value);
 const identity=c?.code||p.modelConfigurationId;
 const titleVariant=chosen.map(row=>/Plotis|Gylis|Aukštis/i.test(row.label)?row.label+': '+row.value:row.value);
 const category=editorialCategory(p.subcategoryId,categoryLabel(p.subcategoryId,baseSeed().categories.find(c=>c.id===p.subcategoryId)?.name||''));
 const categorySuffix=!productKind(p)&&p.subcategoryId!=='www_officechairs'?' – '+category:'';
 const title=productHeading(p)+categorySuffix+(identity&&p.configurations.length>1?' · '+identity:'')+(titleVariant.length?' · '+titleVariant.join(' · '):'')+(peers.length?' · '+p.modelConfigurationId:'');
 const description=[productHeading(p),...(!c?[category]:[]),...new Set([...variantFacts,...facts]),...(identity?[identity]:[]),...(peers.length&&p.modelConfigurationId?[p.modelConfigurationId]:[]),copyText('ui.78d2499daa5e8623867e','Kaina pagal užklausą')].filter(Boolean).join('. ');
 return {title,description};
}
