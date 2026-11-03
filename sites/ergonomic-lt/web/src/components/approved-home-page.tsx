import {findLegacy} from '@/lib/catalog';
import {legacyMetadata} from '@/lib/metadata';
import {approvedHeroMarkup,approvedSectionsMarkup} from '@/lib/approved-home-markup';
import {ApprovedHomeInteractive} from './approved-home-interactive';
import {ApprovedHomeContact} from './approved-home-contact';
import {applyEditorialHtml} from '@/lib/editorial-server';
import {responsiveHomeHero} from '@/lib/home-hero';
import {customerHomeMarkup} from '@/lib/customer-home-demo-server';
import {isAdmin} from '@/lib/auth';

export function generateMetadata(){return legacyMetadata(findLegacy('/')!);}
export default async function Home(){const customer=process.env.PUBLIC_CUSTOMER_BOUNDARY==='true'&&!await isAdmin();return <ApprovedHomeInteractive customerDemo={customer}>
  <div dangerouslySetInnerHTML={{__html:responsiveHomeHero(applyEditorialHtml('home-hero',approvedHeroMarkup))}}/>
  <div dangerouslySetInnerHTML={{__html:customer?customerHomeMarkup(applyEditorialHtml('home-sections',approvedSectionsMarkup)):applyEditorialHtml('home-sections',approvedSectionsMarkup)}}/>
  <ApprovedHomeContact/>
</ApprovedHomeInteractive>;}
