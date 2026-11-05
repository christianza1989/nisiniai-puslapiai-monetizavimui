import {visibleProductsAsync} from '@/lib/catalog';
import {findLegacy} from '@/lib/catalog';
import {legacyMetadata} from '@/lib/metadata';
import {approvedHeroMarkup,approvedSectionsMarkup} from '@/lib/approved-home-markup';
import {ApprovedHomeInteractive} from './approved-home-interactive';
import {ApprovedHomeContact} from './approved-home-contact';
import {applyEditorialHtml} from '@/lib/editorial-server';
import {responsiveHomeHero} from '@/lib/home-hero';
import {customerHomeMarkup} from '@/lib/customer-home-demo-server';
import {customerQuoteFormToken} from '@/lib/customer-capability';
import {isAdmin} from '@/lib/auth';

export function generateMetadata(){return legacyMetadata(findLegacy('/')!);}
export default async function Home(){const customer=process.env.PUBLIC_CUSTOMER_BOUNDARY==='true'&&!await isAdmin();let sections=applyEditorialHtml('home-sections',approvedSectionsMarkup);if(process.env.PREPARED_3D_CATALOG_ONLY==='true'){const products=await visibleProductsAsync(),categories=new Set(products.flatMap(p=>[p.categoryId,p.subcategoryId]));sections=sections.replace(/<li class="hp-category-slide" data-category-id="([^"]+)">[\s\S]*?<\/li>/g,(slide,id)=>categories.has(id)?slide:'');}return <ApprovedHomeInteractive customerDemo={customer}>
  <div dangerouslySetInnerHTML={{__html:responsiveHomeHero(applyEditorialHtml('home-hero',approvedHeroMarkup))}}/>
  <div dangerouslySetInnerHTML={{__html:customer?customerHomeMarkup(sections):sections}}/>
  <ApprovedHomeContact formToken={process.env.PUBLIC_CUSTOMER_BOUNDARY==='true'?customerQuoteFormToken():undefined}/>
</ApprovedHomeInteractive>;}
