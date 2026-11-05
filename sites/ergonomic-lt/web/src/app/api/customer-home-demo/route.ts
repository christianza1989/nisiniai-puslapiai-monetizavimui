import {customerHomeDemo} from '@/lib/customer-home-demo-server';
export const runtime='nodejs';
export async function GET(){try{return Response.json(await customerHomeDemo(),{headers:{'Cache-Control':'public, max-age=300','X-Robots-Tag':'noindex, nofollow'}});}catch{return Response.json({error:'3D demonstracijos nepavyko paruošti.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
