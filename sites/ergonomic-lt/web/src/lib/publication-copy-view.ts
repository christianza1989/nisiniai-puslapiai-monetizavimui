import type {Product,ProductArticle} from './types';
export function privateArticle(product:Product,configurationId:string,article:ProductArticle|undefined):ProductArticle|undefined{
 const copy=(product as Product&{publicationCopy?:Record<string,{summary:string;paragraphs:string[]}>}).publicationCopy?.[configurationId];
 return copy?{...(article||{scopeNote:'',technicalSections:[],seo:{title:product.name,description:copy.summary}}),summary:copy.summary,paragraphs:copy.paragraphs}:article;
}
