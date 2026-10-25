import {NextRequest,NextResponse} from 'next/server';
import {originAllowed,SESSION_COOKIE} from '@/lib/auth';
export async function POST(req:NextRequest){if(!originAllowed(req))return NextResponse.json({error:'Neleistina užklausos kilmė.'},{status:403});const res=NextResponse.json({ok:true});res.cookies.delete(SESSION_COOKIE);return res;}
