import {isAdmin} from '@/lib/auth';
import modelCodes from './model-order.json';

export async function GET() {
 const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
 if(process.env.LAUNCH_SITE==='true'||process.env.ERGONOMIC_PC2_CHAIR_REVIEW!=='true'||!await isAdmin()){
  return new Response(null,{status:404,headers});
 }
 return Response.json(modelCodes,{headers});
}
