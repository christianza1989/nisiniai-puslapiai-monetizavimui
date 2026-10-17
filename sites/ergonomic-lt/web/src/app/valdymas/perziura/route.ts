import {NextRequest} from 'next/server';
import {isAdmin} from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!await isAdmin()||process.env.LAUNCH_SITE==='true')return new Response('Reikia prisijungti.',{status:401,headers:{'Cache-Control':'no-store'}});
 // The authenticated proxy rewrites this to the exact product renderer. A
 // failed/missing proxy must fail closed rather than fetching our Worker URL.
 return new Response('Peržiūros maršrutas neparuoštas.',{status:503,headers:{'Cache-Control':'no-store'}});
}
