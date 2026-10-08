export async function loadJson(url,{timeoutMs=15000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{signal:controller.signal,credentials:'same-origin'});
  if(!response.ok)throw Error('Unavailable public data');
  const value=await response.json();
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid public data');
  return value;
 }catch{
  throw Object.assign(Error(controller.signal.aborted?'Duomenų įkėlimas užtruko. Patikrink interneto ryšį ir bandyk dar kartą.':'Duomenų įkelti nepavyko. Patikrink interneto ryšį ir bandyk dar kartą.'),{code:'NETWORK_ERROR'});
 }finally{clearTimeout(timer);}
}
