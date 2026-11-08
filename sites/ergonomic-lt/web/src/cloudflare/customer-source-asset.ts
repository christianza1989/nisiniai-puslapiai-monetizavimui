import {env} from 'cloudflare:workers';
export async function customerSourceAsset(asset:string):Promise<Uint8Array>{
 if(!/^\/(?:models|media)\/[A-Za-z0-9_./%=+-]+$/.test(asset)||asset.split('/').some(p=>p==='..'||/%2e|%2f|%5c/i.test(p)))throw Error('Invalid source asset');
 const ownFinish=/^\/media\/chair-finish-v2\/[a-f0-9]{64}\.(?:jpg|png)$/.test(asset);
 const headers=new Headers();if(!ownFinish&&env.REFERENCE_ASSETS&&env.PRIVATE_SOURCE_READ_TOKEN)headers.set('Authorization','Bearer '+env.PRIVATE_SOURCE_READ_TOKEN);
 const response=await (ownFinish?env.ASSETS:env.REFERENCE_ASSETS||env.ASSETS).fetch(new Request('https://localhost'+asset.replaceAll('=','%3D').replaceAll('+','%2B'),{headers,redirect:'manual'}));if(!response.ok)throw Error('Source asset unavailable');return new Uint8Array(await response.arrayBuffer());
}
