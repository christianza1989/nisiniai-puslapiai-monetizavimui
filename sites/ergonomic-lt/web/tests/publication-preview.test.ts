import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {proxy} from '../src/proxy';
import {sessionToken,SESSION_COOKIE} from '../src/lib/auth';
test('private preview rewrites internally, keeps historical selection and rejects missing owner',()=>{
 process.env.SESSION_SECRET='TEST ONLY preview rewrite secret';process.env.LAUNCH_SITE='false';
 const url='https://ergonomic-preview.pinet-azprekyba.workers.dev/valdymas/perziura/?model=product_xilium-swivel-chairs_0fe4091b%3A23636152';
 assert.equal(proxy(new NextRequest(url)).status,401);
 const r=proxy(new NextRequest(url,{headers:{Cookie:`${SESSION_COOKIE}=${sessionToken()}`}}));
 const target=new URL(r.headers.get('x-middleware-rewrite')!);
 assert.equal(target.pathname,'/produktai/kedes/xilium-darbo-kedes-modelis-23636148/');assert.equal(target.searchParams.get('pavyzdys'),'23636152');
 assert.equal(r.headers.get('X-Frame-Options'),'SAMEORIGIN');assert.equal(r.headers.get('x-middleware-request-x-ergonomic-preview'),'1');
 assert.equal(proxy(new NextRequest(url.replace('23636152','invented'),{headers:{Cookie:`${SESSION_COOKIE}=${sessionToken()}`}})).status,404);
 process.env.LAUNCH_SITE='true';assert.equal(proxy(new NextRequest(url,{headers:{Cookie:`${SESSION_COOKIE}=${sessionToken()}`}})).status,404);process.env.LAUNCH_SITE='false';
});
