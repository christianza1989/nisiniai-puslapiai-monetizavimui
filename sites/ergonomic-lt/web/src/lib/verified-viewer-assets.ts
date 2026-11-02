import type {Asset} from './expanded-configurator';

/** A bounded cache of verified originals, never of mutable scene objects. */
export class VerifiedAssetCache {
 private entries=new Map<string,ArrayBuffer>();
 private bytes=0;
 constructor(private readonly limit=24_000_000){}
 private key(asset:Asset){return asset.assetSha256+':'+asset.bytes;}
 get(asset:Asset):ArrayBuffer|undefined {
  const key=this.key(asset),bytes=this.entries.get(key);if(!bytes)return;
  this.entries.delete(key);this.entries.set(key,bytes);
  return bytes.slice(0);
 }
 put(asset:Asset,bytes:ArrayBuffer){
  if(bytes.byteLength!==asset.bytes||bytes.byteLength>this.limit)return;
  const key=this.key(asset),old=this.entries.get(key);if(old)this.bytes-=old.byteLength;
  this.entries.delete(key);this.entries.set(key,bytes.slice(0));this.bytes+=bytes.byteLength;
  while(this.bytes>this.limit){const oldest=this.entries.keys().next().value!;this.bytes-=this.entries.get(oldest)!.byteLength;this.entries.delete(oldest);}
 }
 get size(){return this.bytes;}
}
const originals=new VerifiedAssetCache();

export async function verifiedViewerAsset(asset:Asset,signal:AbortSignal,cache=originals,fetcher:typeof fetch=fetch):Promise<ArrayBuffer>{
 signal.throwIfAborted();
 if(!/^[a-f0-9]{64}$/.test(asset.assetSha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<=0||asset.bytes>32_000_000)throw Error('Invalid component identity');
 const cached=cache.get(asset);if(cached)return cached;
 const response=await fetcher(asset.asset+'?v='+asset.assetSha256.slice(0,12),{signal});
 if(!response.ok)throw Error('Asset unavailable');
 const bytes=await response.arrayBuffer();signal.throwIfAborted();
 if(bytes.byteLength!==asset.bytes)throw Error('Component bytes changed');
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 if(sha!==asset.assetSha256)throw Error('Component bytes changed');
 signal.throwIfAborted();cache.put(asset,bytes);return bytes;
}
