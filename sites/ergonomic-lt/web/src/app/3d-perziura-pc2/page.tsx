import {notFound} from 'next/navigation';
import entries from '../../../content/pc2-chair-review-candidates.json';
import Pc2ChairReview from '@/components/pc2-chair-review';
export const metadata={title:'PC2 kėdžių techninė peržiūra',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{chair?:string}>}){
 if(process.env.LAUNCH_SITE==='true'||process.env.ERGONOMIC_PC2_CHAIR_REVIEW!=='true')notFound();
 const {chair}=await searchParams;
 return <Pc2ChairReview entries={entries.entries} initialCode={chair}/>;
}
