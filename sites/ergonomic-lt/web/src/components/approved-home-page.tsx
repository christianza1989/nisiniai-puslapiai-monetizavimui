import {findLegacy} from '@/lib/catalog';
import {legacyMetadata} from '@/lib/metadata';
import {approvedHeroMarkup,approvedSectionsMarkup} from '@/lib/approved-home-markup';
import {ApprovedHomeInteractive} from './approved-home-interactive';
import {ApprovedHomeContact} from './approved-home-contact';
import {applyEditorialHtml} from '@/lib/editorial-server';

export function generateMetadata(){return legacyMetadata(findLegacy('/')!);}
export default function Home(){return <ApprovedHomeInteractive>
  <div dangerouslySetInnerHTML={{__html:applyEditorialHtml('home-hero',approvedHeroMarkup)}}/>
  <div dangerouslySetInnerHTML={{__html:applyEditorialHtml('home-sections',approvedSectionsMarkup)}}/>
  <ApprovedHomeContact/>
</ApprovedHomeInteractive>;}
