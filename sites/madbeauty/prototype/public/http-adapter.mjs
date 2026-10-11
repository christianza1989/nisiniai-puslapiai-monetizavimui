import {createMediaUploadIntents,mediaUploadFingerprint} from './media-upload-intent.mjs';
export function createHttpAdapter(){
  let session=null,refreshPending=null;
  let uploadStorage=null;try{uploadStorage=globalThis.sessionStorage;}catch{}
  const uploads=createMediaUploadIntents(uploadStorage);
  const readMethods=new Set(['taxonomy','search','searchResults','visitAvailability','catalog','profile','option','workspace','availability','organizationReport','erasureCase','erasurePreview','erasureStatus','rebooking','exportCustomer','metrics']);
  const adapter={mode:'real',clock:{now:new Date().toISOString(),timezone:'Europe/Vilnius'}};
  async function request(path,data){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let r,result;
    try{r=await fetch('/api/madbeauty/'+path,{signal:controller.signal,method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'content-type':'application/json','x-csrf-token':session?.csrf||''},...(data===undefined?{}:{body:JSON.stringify(data)})});result=await r.json();if(!result||typeof result!=='object')throw Error('Invalid response');}
    catch{throw Object.assign(Error(controller.signal.aborted?'Atsakymas užtruko. Patikrink veiksmo būseną paskyroje, prieš bandydamas dar kartą.':'Ryšys nutrūko arba atsakymas nepasiekiamas. Patikrink internetą ir veiksmo būseną, prieš bandydamas dar kartą.'),{code:'NETWORK_ERROR'});}
    finally{clearTimeout(timer);}
    if(!r.ok){const e=Error(result.error?.message||'Užklausos įvykdyti nepavyko.');e.code=result.error?.code||'SERVER_ERROR';e.status=r.status;throw e;}return result;
  }
  async function rpc(method,input={}){const previousUser=session?.user?.id;if(refreshPending)await refreshPending;else if(!session)await adapter.refreshSession();if(previousUser&&previousUser!==session.user?.id&&!readMethods.has(method))throw Object.assign(Error('Paskyros sesija pasikeitė. Prisijunk iš naujo ir patikrink veiksmą prieš jį kartodamas.'),{code:'SESSION_CHANGED',status:409});return(await request('rpc',{method,input,siteId:'madbeauty'})).result;}
  adapter.refreshSession=()=>{if(!refreshPending)refreshPending=request('session').then(value=>{session=value;adapter.clock=session.clock;adapter.session=session;return session;}).finally(()=>{refreshPending=null;});return refreshPending;};
  adapter.authStart=async email=>request('auth/start',{email});
  adapter.community=async(method,input={},organizationId=null)=>{const user=session?.user?.id;if(refreshPending)await refreshPending;else if(!session)await adapter.refreshSession();if(user&&user!==session?.user?.id)throw Object.assign(Error('Paskyra pasikeitė. Prisijunk iš naujo.'),{code:'SESSION_CHANGED'});return (await request('community',{method,input,organizationId})).result;};
  adapter.communityUpload=async(file,{mode,target='',organizationId='',alt,rights})=>{
   const user=session?.user?.id;if(refreshPending)await refreshPending;else if(!session)await adapter.refreshSession();
   if(!session?.user?.id||user&&user!==session.user.id)throw Object.assign(Error('Paskyra pasikeitė. Prisijunk iš naujo.'),{code:'SESSION_CHANGED',status:409});
   if(!file?.size||file.size>6*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Object.assign(Error('Pasirink JPG, PNG arba WebP nuotrauką iki 6 MB.'),{code:'INVALID_INPUT'});
   const scope='community:'+mode+':'+organizationId+':'+target,fingerprint=await mediaUploadFingerprint(file,{organizationId:scope,usage:'gallery',alt,rights}),intent=uploads.reserve(session.user.id,scope+':'+fingerprint,fingerprint),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);let response,value;
   try{response=await fetch('/api/madbeauty/community-upload',{signal:controller.signal,method:'POST',credentials:'same-origin',headers:{'content-type':file.type,'x-csrf-token':session.csrf,'x-community-mode':mode,'x-community-target':target,'x-organization-id':organizationId,'x-asset-alt':encodeURIComponent(alt),'x-asset-rights':encodeURIComponent(rights),'x-asset-rights-confirmed':'true','x-asset-operation':intent.idempotencyKey},body:file});value=await response.json();if(!value||typeof value!=='object')throw Error('Invalid response');}
   catch{throw Object.assign(Error('Nuotraukos įkėlimo atsakymas nepasiekiamas. Tą pačią nuotrauką galima bandyti įkelti dar kartą.'),{code:'NETWORK_ERROR'});}
   finally{clearTimeout(timer);}
   if(!response.ok)throw Object.assign(Error(value.error?.message||'Nuotraukos įkelti nepavyko.'),{code:value.error?.code,status:response.status});
   if(!value.result?.id)throw Object.assign(Error('Nuotraukos įkėlimo rezultatas nepasiekiamas.'),{code:'NETWORK_ERROR'});
   return {asset:value.result,intent};
  };
  adapter.completeCommunityUploads=entries=>entries.forEach(entry=>uploads.complete(entry.intent));
  adapter.facebookStart=async(input={})=>{if(refreshPending)await refreshPending;else if(!session)await adapter.refreshSession();return request('auth/facebook/start',input);};
  adapter.facebookUnlink=async()=>{const result=await request('auth/facebook/unlink',{});await adapter.refreshSession();return result;};
  adapter.authVerify=async(challengeId,code)=>{session=await request('auth/verify',{challengeId,code});adapter.clock=session.clock;adapter.session=session;return session;};
  adapter.logout=async()=>{session=await request('logout',{});adapter.session=session;return session;};
  adapter.demoIdentities=async()=>({organizations:session?.organizations||[],clients:session?.user?[{id:session.user.id,name:session.user.name||session.user.email}]:[]});
  adapter.taxonomy=()=>rpc('taxonomy');
  adapter.search=input=>rpc('search',input);
  adapter.searchResults=input=>rpc('searchResults',input);
  adapter.visitAvailability=input=>rpc('visitAvailability',input);
  adapter.holdVisit=input=>rpc('holdVisit',input);
  adapter.catalog=input=>rpc('catalog',input);
  adapter.profile=id=>rpc('profile',{id});
  adapter.option=(id,addons=[],practitionerId)=>rpc('option',{id,addons,practitionerId});
  adapter.workspace=scope=>rpc('workspace',scope);
  adapter.availability=input=>rpc('availability',input);
  adapter.hold=candidate=>rpc('hold',candidate);
  adapter.releaseHold=id=>rpc('releaseHold',{id});
  adapter.upload=async(file,metadata)=>{
   const previousUser=session?.user?.id;if(refreshPending)await refreshPending;else if(!session)await adapter.refreshSession();
   if(!session.user?.id||previousUser&&previousUser!==session.user.id)throw Object.assign(Error('Paskyros sesija pasikeitė. Prisijunk iš naujo.'),{code:'SESSION_CHANGED',status:409});
   if(!file?.size||file.size>12*1024*1024)throw Object.assign(Error('Pasirink vaizdą iki 12 MB.'),{code:'INVALID_INPUT'});
   const {organizationId,alt,rights,usage}=metadata,intent=uploads.reserve(session.user.id,organizationId,await mediaUploadFingerprint(file,metadata)),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);let r,value;
   try{r=await fetch('/api/madbeauty/upload',{signal:controller.signal,method:'POST',credentials:'same-origin',headers:{origin:location.origin,'content-type':file.type,'x-csrf-token':session.csrf,'x-organization-id':organizationId,'x-asset-alt':encodeURIComponent(alt),'x-asset-rights':encodeURIComponent(rights),'x-asset-rights-confirmed':'true','x-asset-usage':usage,'x-asset-operation':intent.idempotencyKey},body:file});value=await r.json();if(!value||typeof value!=='object')throw Error('Invalid upload response');}
   catch{throw Object.assign(Error('Atsakymas nepasiekiamas. Patikrink galeriją, prieš bandydamas dar kartą.'),{code:'NETWORK_ERROR'});}
   finally{clearTimeout(timer);}
   if(!r.ok){const e=Error(value.error?.message||'Vaizdo įkelti nepavyko.');e.code=value.error?.code;e.status=r.status;throw e;}
   if(!value.result?.id)throw Object.assign(Error('Įkėlimo rezultatas nepasiekiamas. Patikrink galeriją.'),{code:'NETWORK_ERROR'});
   uploads.complete(intent);return value.result;
  };
  for(const method of ['saveGallery','reviewReport','organizationReport','saveBookingRules','erasureCase','erasurePreview','erasureStatus','reviewErasure','rebooking','saveClientCard','exportCustomer','requestErasure','withdrawErasure','createWaitlist','acceptWaitlist','closeWaitlist','confirmVisit','changeVisit','saveLocation','submitLocation','moderateLocation','setLocationActive','assignStaffLocations','grantMembership','revokeMembership','bulkOfferPrices','saveMenuGroup','selectProcedures','saveOffer','submitOffer','moderateOffer','archiveOffer','requestProcedure','moderateProcedure','changeTaxonomy','assessQualification','migrateCatalogue','confirm','changeBooking','cancelBooking','manualVisit','createInquiry','edit','submitRevision','moderate','moderateReview','message','review','report','preferences','metrics','createOrganization','createService','createStaff','createResource','createClient','createBusyBlock','releaseBusyBlock','retryOutbox','completeBooking','favorite'])adapter[method]=input=>rpc(method,input);
  return adapter;
}
