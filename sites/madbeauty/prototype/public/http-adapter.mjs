export function createHttpAdapter(){
  let session=null;
  const adapter={mode:'real',clock:{now:new Date().toISOString(),timezone:'Europe/Vilnius'}};
  async function request(path,data){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let r,result;
    try{r=await fetch('/api/madbeauty/'+path,{signal:controller.signal,method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'content-type':'application/json','x-csrf-token':session?.csrf||''},...(data===undefined?{}:{body:JSON.stringify(data)})});result=await r.json();if(!result||typeof result!=='object')throw Error('Invalid response');}
    catch{throw Object.assign(Error(controller.signal.aborted?'Atsakymas užtruko. Patikrink veiksmo būseną paskyroje, prieš bandydamas dar kartą.':'Ryšys nutrūko arba atsakymas nepasiekiamas. Patikrink internetą ir veiksmo būseną, prieš bandydamas dar kartą.'),{code:'NETWORK_ERROR'});}
    finally{clearTimeout(timer);}
    if(!r.ok){const e=Error(result.error?.message||'Užklausos įvykdyti nepavyko.');e.code=result.error?.code||'SERVER_ERROR';e.status=r.status;throw e;}return result;
  }
  async function rpc(method,input={}){if(!session)await adapter.refreshSession();return(await request('rpc',{method,input,siteId:'madbeauty'})).result;}
  adapter.refreshSession=async()=>{session=await request('session');adapter.clock=session.clock;adapter.session=session;return session;};
  adapter.authStart=async email=>request('auth/start',{email});
  adapter.authVerify=async(challengeId,code)=>{session=await request('auth/verify',{challengeId,code});adapter.clock=session.clock;adapter.session=session;return session;};
  adapter.logout=async()=>{session=await request('logout',{});adapter.session=session;return session;};
  adapter.demoIdentities=async()=>({organizations:session?.organizations||[],clients:session?.user?[{id:session.user.id,name:session.user.name||session.user.email}]:[]});
  adapter.catalog=input=>rpc('catalog',input);
  adapter.profile=id=>rpc('profile',{id});
  adapter.option=(id,addons=[])=>rpc('option',{id,addons});
  adapter.workspace=scope=>rpc('workspace',scope);
  adapter.availability=input=>rpc('availability',input);
  adapter.hold=candidate=>rpc('hold',candidate);
  adapter.releaseHold=id=>rpc('releaseHold',{id});
  adapter.upload=async(file,{organizationId,alt,rights,usage})=>{const r=await fetch('/api/madbeauty/upload',{method:'POST',credentials:'same-origin',headers:{origin:location.origin,'content-type':file.type,'x-csrf-token':session.csrf,'x-organization-id':organizationId,'x-asset-alt':encodeURIComponent(alt),'x-asset-rights':encodeURIComponent(rights),'x-asset-usage':usage},body:file});const value=await r.json();if(!r.ok){const e=Error(value.error?.message||'Vaizdo įkelti nepavyko.');e.code=value.error?.code;throw e;}return value.result;};
  for(const method of ['confirm','changeBooking','cancelBooking','manualVisit','createInquiry','edit','submitRevision','moderate','moderateReview','message','review','report','preferences','metrics','createOrganization','createService','createStaff','createResource','createClient','createBusyBlock','releaseBusyBlock','retryOutbox','completeBooking','favorite'])adapter[method]=input=>rpc(method,input);
  return adapter;
}
