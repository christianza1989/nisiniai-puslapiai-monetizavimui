import {NextResponse,type NextRequest} from 'next/server';
import oldProducts from '../content/legacy-product-paths.json';
import decisions from '../content/redirects.json';
import {validatedRedirects} from './lib/redirects';
import {consolidatedRedirect} from './lib/catalog-consolidation';
import {validSession,SESSION_COOKIE} from './lib/auth';
import adminSources from '../content/admin-source-status.json';
const redirects=validatedRedirects(decisions,['/','/ergonomika-darbo-vietoje-reikalavimai/','/biuro-kedes/','/mokykliniai-baldai/','/aktyvus-sedejimas/','/ergonominiai-stalai/','/ergonomines-kedes/','/shop/balansines-kedes/','/shop/priedai/'].map(path=>({path})));
const removed=new Set(oldProducts);
const aliases:Record<string,string>={'/parduotuve/':'/produktai/','/balansines-kedes/':'/shop/balansines-kedes/','/shop/biuro-kedes/':'/biuro-kedes/'};
export function proxy(req:NextRequest){
  const route=req.nextUrl.pathname.endsWith('/')?req.nextUrl.pathname:req.nextUrl.pathname+'/';
  if(process.env.LAUNCH_SITE==='true'&&(route.startsWith('/admin/')||route.startsWith('/valdymas/')))return new NextResponse('Puslapis nerastas.',{status:404});
  if(route==='/valdymas/perziura/'){
    if(!validSession(req.cookies.get(SESSION_COOKIE)?.value))return new NextResponse('Reikia prisijungti.',{status:401,headers:{'Cache-Control':'no-store'}});
    const model=adminSources.models.find(m=>m.key===req.nextUrl.searchParams.get('model'));
    if(!model)return new NextResponse('Modelis nerastas.',{status:404});
    const original=new URL(model.path,req.url),target=consolidatedRedirect(original)||original;
    const headers=new Headers(req.headers);headers.set('x-ergonomic-preview','1');
    // Render internally. A same-Worker network fetch is rejected by Cloudflare
    // with 1042 and must never be used as a product-preview transport.
    const response=NextResponse.rewrite(target,{request:{headers}});
    response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');
    response.headers.set('X-Frame-Options','SAMEORIGIN');response.headers.set('Content-Security-Policy',"frame-ancestors 'self'");
    return response;
  }
  if(req.nextUrl.hostname==='www.ergonomic.lt'){const url=req.nextUrl.clone();url.hostname='ergonomic.lt';url.protocol='https:';return NextResponse.redirect(url,308);}
  const consolidated=process.env.LAUNCH_SITE==='true'?undefined:consolidatedRedirect(new URL(req.url));if(consolidated)return NextResponse.redirect(consolidated,308);
  if(aliases[route])return NextResponse.redirect(new URL(aliases[route],req.url),308);
  if(redirects.has(route))return NextResponse.redirect(new URL(redirects.get(route)!,req.url),301);
  if(removed.has(route))return new NextResponse('<!doctype html><html lang="lt"><meta name="robots" content="noindex,follow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prekė nebetiekiama | Ergonomic.lt</title><body style="font:18px system-ui;margin:10vh auto;padding:24px;max-width:700px"><h1>Šio produkto puslapis pašalintas.</h1><p>Atraskite naują baldų katalogą arba susisiekite dėl konkretaus poreikio.</p><p><a href="/produktai/">Baldų katalogas</a> · <a href="/kontaktai/">Kontaktai</a></p></body></html>',{status:410,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex,follow'}});
  return NextResponse.next();
}
export const config={matcher:['/((?!api|_next|media|fonts|wp-content|icon.svg).*)']};
