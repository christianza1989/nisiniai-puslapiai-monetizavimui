import {notFound} from 'next/navigation';
import entries from '../../../content/pc2-chair-review-candidates.json';
import Pc2ChairReview from '@/components/pc2-chair-review';
import {buildReviewScope,reviewProductForCode} from '@/lib/text-review-server';
import {TextReviewProvider} from '@/components/text-review-provider';
import {isAdmin} from '@/lib/auth';
export const metadata={title:'PC2 kėdžių techninė peržiūra',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{chair?:string}>}){
 if(process.env.LAUNCH_SITE==='true'||process.env.ERGONOMIC_PC2_CHAIR_REVIEW!=='true')notFound();
 const {chair}=await searchParams;
 const selected=entries.entries.find(e=>e.code===chair)||entries.entries[0],p=selected?await reviewProductForCode(selected.code):undefined;
 const view=<Pc2ChairReview entries={entries.entries} initialCode={chair}/>;
 if(!p)return view;
 const scope=await buildReviewScope(p);
 return <TextReviewProvider key={scope.publicScope.scope} initial={scope.publicScope} admin={await isAdmin()?scope:undefined}>{view}</TextReviewProvider>;
}
