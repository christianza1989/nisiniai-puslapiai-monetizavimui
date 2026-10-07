import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {ApiError,reject} from './primitives.mjs';
import {requireCapability} from './permissions.mjs';
export function createApiHandler(store,{origin='http://127.0.0.1:8788',secure=false,media}={}){
  const {prepareMedia,readMedia}=media;
  const auth=createAuth(store),platform=createPlatform(store),cookieName=secure?'__Host-madbeauty_sid':'madbeauty_sid';
  const cookie=s=>`${cookieName}=${s.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure?'; Secure':''}`;
  const cookies=req=>Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
  const body=async req=>{let bytes=0,text='';for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)reject('PAYLOAD_TOO_LARGE','Per didelė užklausa.',413);text+=chunk;}try{return JSON.parse(text);}catch{reject('INVALID_INPUT','Netinkama užklausa.');}};
  const publicMethods=new Set(['catalog','profile','availability','option','taxonomy','search','searchResults','visitAvailability']);
  const methods=new Set([...publicMethods,'saveGallery','reviewReport','organizationReport','saveBookingRules','erasureCase','reviewErasure','rebooking','saveClientCard','exportCustomer','requestErasure','withdrawErasure','createWaitlist','acceptWaitlist','closeWaitlist','holdVisit','confirmVisit','changeVisit','saveLocation','submitLocation','moderateLocation','setLocationActive','assignStaffLocations','grantMembership','revokeMembership','bulkOfferPrices','saveMenuGroup','selectProcedures','saveOffer','submitOffer','moderateOffer','archiveOffer','requestProcedure','moderateProcedure','changeTaxonomy','assessQualification','migrateCatalogue','workspace','createOrganization','createService','createStaff','createResource','createClient','createBusyBlock','releaseBusyBlock','hold','releaseHold','confirm','cancelBooking','changeBooking','manualVisit','edit','submitRevision','moderate','moderateReview','createInquiry','message','review','report','preferences','metrics','favorite','retryOutbox','completeBooking']);
  const send=(res,status,data,session=null)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',...(session?.token?{'Set-Cookie':cookie(session)}:{})});res.end(JSON.stringify(data));};
  async function handle(req,res){
    if(!req.url.startsWith('/api/madbeauty/'))return false;
    try{
      if(req.headers.host!==new URL(origin).host)reject('ORIGIN','Netinkamas origin.',403);
      const pathname=new URL(req.url,origin).pathname;
      if(!['GET','POST'].includes(req.method))reject('METHOD','Metodas neleidžiamas.',405);
      if(req.method==='GET'&&!['/api/madbeauty/session','/api/madbeauty/customer-data','/api/madbeauty/organization-report.csv','/api/madbeauty/offer-prices.csv'].includes(pathname)&&!pathname.startsWith('/api/madbeauty/media/'))reject('NOT_FOUND','Puslapis nerastas.',404);
      const upload=pathname==='/api/madbeauty/upload';
      if(req.method==='POST'&&(req.headers.origin!==origin||!upload&&!String(req.headers['content-type']||'').startsWith('application/json')))reject('ORIGIN','Užklausa neleidžiama.',403);
      let s=auth.session(cookies(req)[cookieName],{create:false});
      if(!s&&pathname==='/api/madbeauty/session'){store.limit('session-ip:'+(req.socket.remoteAddress||'unknown'),60,60);s=auth.session(null);}
      if(!s&&req.method==='POST')reject('CSRF','Sesija pasikeitė. Prisijunkite iš naujo.',403);
      if(req.method==='GET'&&pathname==='/api/madbeauty/offer-prices.csv'){
        if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&req.headers.origin!==origin)reject('ORIGIN','Užklausa neleidžiama.',403);
        const user=auth.requireAccount(s);store.limit('offer-export:'+user.id,20,600);const csv=platform.exportOfferCsv(user,Object.fromEntries(new URL(req.url,origin).searchParams));
        res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="madbeauty-pasiulymu-kainos.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'});res.end(csv);return true;
      }
      if(req.method==='GET'&&pathname==='/api/madbeauty/organization-report.csv'){
        if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&req.headers.origin!==origin)reject('ORIGIN','Užklausa neleidžiama.',403);
        const user=auth.requireAccount(s),input=Object.fromEntries(new URL(req.url,origin).searchParams),csv=platform.reportCsv(user,input);store.limit('report-export:'+user.id,20,600);
        res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="madbeauty-vizitu-suvestine.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'});res.end(csv);return true;
      }
      if(req.method==='GET'&&pathname==='/api/madbeauty/customer-data'){
        if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&req.headers.origin!==origin)reject('ORIGIN','Užklausa neleidžiama.',403);
        const result=platform.exportCustomer(auth.requireAccount(s));store.limit('customer-export:'+s.account_id,10,600);
        res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="madbeauty-mano-duomenys.json"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(result,null,2));return true;
      }
      if(req.method==='GET'&&pathname.startsWith('/api/madbeauty/media/')){const bytes=await readMedia(store,pathname.split('/').at(-1),auth.account(s),platform);res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(bytes);return true;}
      if(req.method==='GET'){send(res,200,{...platform.session(auth.account(s)),csrf:s.csrf,clock:platform.clock()},s);return true;}
      auth.csrf(s,req.headers['x-csrf-token']);
      if(upload){if(req.headers['x-asset-rights-confirmed']!=='true')reject('INVALID_INPUT','Patvirtinkite vaizdo viešinimo teisę.');const user=auth.requireAccount(s),organizationId=String(req.headers['x-organization-id']||'');requireCapability(platform.workspace(user,{role:'professional',organizationId}),'profile');store.limit('media-account:'+user.id,24,3600);let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>12*1024*1024)reject('PAYLOAD_TOO_LARGE','Vaizdas viršija12 MB.',413);chunks.push(chunk);}const metadata={organizationId,rightsConfirmedAt:new Date(store.clock()).toISOString(),rightsConfirmedBy:user.id,alt:decodeURIComponent(String(req.headers['x-asset-alt']||'')),rights:decodeURIComponent(String(req.headers['x-asset-rights']||'')),usage:String(req.headers['x-asset-usage']||''),mime:String(req.headers['content-type']||''),bytes:Buffer.concat(chunks)};const a=await prepareMedia(store,metadata);let result;try{result=platform.attachMedia(user,a);}catch(error){await media.discardMedia?.(a);throw error;}send(res,200,{result},s);return true;}
      const input=await body(req),ip=req.socket.remoteAddress||'unknown';
      store.limit('api-ip:'+ip,300,60);
      if(input.siteId&&input.siteId!==store.siteId)reject('SITE_SCOPE','Kitos svetainės užklausa neleidžiama.',403);
      if(pathname==='/api/madbeauty/auth/start'){send(res,200,auth.start(s,input.email,ip),s);return true;}
      if(pathname==='/api/madbeauty/auth/verify'){const result=auth.verify(s,input.challengeId,input.code,ip);send(res,200,{...platform.session(result.user),csrf:result.session.csrf,clock:platform.clock()},result.session);return true;}
      if(pathname==='/api/madbeauty/logout'){const fresh=auth.logout(s);send(res,200,{...platform.session(null),csrf:fresh.csrf,clock:platform.clock()},fresh);return true;}
      if(pathname!=='/api/madbeauty/rpc'||!methods.has(input.method))reject('NOT_FOUND','Operacija nerasta.',404);
      const user=publicMethods.has(input.method)?auth.account(s):auth.requireAccount(s),v=input.input||{};let result;
      if(input.method==='visitAvailability')result=platform.visitAvailability(v,user);
      else if(input.method==='searchResults')result=platform.searchResults(v);
      else if(input.method==='taxonomy')result=platform.taxonomy();
      else if(input.method==='search')result=platform.search(v);
      else if(input.method==='catalog')result=platform.catalog(v);
      else if(input.method==='profile')result=platform.profile(v.id);
      else if(input.method==='availability')result=platform.availability(v,user);
      else if(input.method==='option')result=platform.option(v.id,v.addons,v.practitionerId);
      else if(input.method==='workspace')result=platform.workspace(user,v);
      else if(input.method==='releaseHold')result=platform.releaseHold(user,v.id);
      else if(input.method==='metrics')result=platform.metrics(user);
      else result=platform[input.method](user,v);
      send(res,200,{result},s);
    }catch(e){const known=e instanceof ApiError;send(res,known?e.status:500,{error:{code:known?e.code:'SERVER_ERROR',message:known?e.message:'Užklausos įvykdyti nepavyko. Bandykite dar kartą.'}});}
    return true;
  }
  return {handle,platform,auth};
}
