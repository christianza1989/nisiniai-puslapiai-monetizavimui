import {notFound} from 'next/navigation';
import registry from '../../../content/pc2-desk-observed-candidates.json';
import ObservedDeskReviewPage from '@/components/observed-desk-review';
export const metadata={title:'Surinktos stalų komplektacijos | Ergonomic.lt',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{desk?:string}>}){
 if(process.env.LAUNCH_SITE==='true'||process.env.ERGONOMIC_PC2_CHAIR_REVIEW!=='true')notFound();
 const {desk}=await searchParams;
 return <ObservedDeskReviewPage entries={registry.entries} initialCode={desk}/>;
}
