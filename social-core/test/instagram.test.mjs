import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeInstagramMedia,publicInstagramFeed,instagramMediaUrl,instagramResponse,syncInstagram,instagramJson} from '../instagram.mjs';
const at=Date.parse('2026-10-20T06:00:00Z'),token='fixture-private-token',cdn='https://scontent.cdninstagram.com/photo.jpg?signature=fixture';
const photo=(id='123456789',extra={})=>({id,media_type:'IMAGE',media_url:cdn,permalink:'https://www.instagram.com/p/fixture/',timestamp:'2026-10-20T05:00:00Z',caption:'Tikra akimirka <script>fixture</script>',...extra});
class MemoryKV{values=new Map();async get(key,type){const value=this.values.get(key);return value===undefined?null:type==='json'?JSON.parse(value):value;}async put(key,value){this.values.set(key,value);}async delete(key){this.values.delete(key);}}
const environment=()=>({INSTAGRAM_STATE:new MemoryKV(),INSTAGRAM_ENABLED:'1',INSTAGRAM_USERNAME:'memocasting.lt',INSTAGRAM_API_VERSION:'v26.0',INSTAGRAM_SEED_TOKEN:token});
const json=(data,status=200)=>Response.json(data,{status});
test('image, reel and carousel are ordered, deduplicated and hostile provider links are discarded',()=>{
 const items=normalizeInstagramMedia([photo(),photo(),photo('123456790',{media_type:'VIDEO',thumbnail_url:cdn,timestamp:'2026-10-20T05:30:00Z'}),photo('123456791',{media_type:'CAROUSEL_ALBUM'}),photo('123456792',{media_url:'https://cdninstagram.com.evil.test/a'}),photo('123456793',{permalink:'javascript:alert(1)'})]);
 assert.equal(items.length,3);assert.equal(items[0].type,'VIDEO');assert.equal(items[2].type,'CAROUSEL_ALBUM');assert.ok(items[1].caption.includes('<script>')); // Plain text; UI must render as text, never innerHTML.
 assert.equal(instagramMediaUrl('https://cdninstagram.com.evil.test/x'),null);assert.equal(instagramMediaUrl('http://x.fbcdn.net/x'),null);assert.equal(instagramMediaUrl('https://user:password@x.fbcdn.net/x'),null);
 assert.equal(normalizeInstagramMedia(Array.from({length:70},(_,i)=>photo(String(123450000+i)))).length,48);
});
test('public snapshot exposes only same-origin media IDs, never credentials, raw CDN or cursors',async()=>{
 const env=environment();await env.INSTAGRAM_STATE.put('feed',JSON.stringify({username:'memocasting.lt',fetchedAt:at,token,items:normalizeInstagramMedia([photo()]),paging:{next:'secret'}}));
 const response=await instagramResponse(new Request('https://internal/feed'),env,{now:at});const body=await response.text();assert.equal(response.status,200);assert.ok(body.includes('/social/instagram/media/123456789/poster'));for(const secret of [token,cdn,'paging'])assert.ok(!body.includes(secret));
 assert.equal(publicInstagramFeed({fetchedAt:at,items:[]},at+7*3600000),null);
});
test('only known CDN media stream, Range preserved, provider cookies stripped, MIME checked',async()=>{
 const env=environment();await env.INSTAGRAM_STATE.put('feed',JSON.stringify({username:'memocasting.lt',fetchedAt:at,items:normalizeInstagramMedia([photo('123456789',{media_type:'VIDEO',thumbnail_url:cdn})])}));
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(url,cdn);assert.equal(options.redirect,'error');assert.deepEqual(options.headers,{Range:'bytes=0-3'});return new Response('test',{status:206,headers:{'content-type':'video/mp4','content-range':'bytes 0-3/100','set-cookie':'private=fixture'}});};
 const response=await instagramResponse(new Request('https://internal/media/123456789/video',{headers:{Range:'bytes=0-3'}}),env,{now:at,fetcher});assert.equal(response.status,206);assert.equal(response.headers.get('set-cookie'),null);assert.equal(await response.text(),'test');assert.equal(response.headers.get('content-range'),'bytes 0-3/100');
 assert.equal((await instagramResponse(new Request('https://internal/media/999999/video'),env,{now:at,fetcher})).status,404);assert.equal(calls,1);
 const bad=await instagramResponse(new Request('https://internal/media/123456789/poster'),env,{now:at,fetcher:async()=>new Response('<html>bad</html>',{headers:{'content-type':'text/html'}})});assert.equal(bad.status,502);
});
test('seed verifies exact owned username; subsequent sync uses durable token and never seeds a rejected account',async()=>{
 const env=environment(),calls=[];const fetcher=async(url,options)=>{calls.push({url,options});assert.equal(options.headers.Authorization,'Bearer '+token);return url.includes('/me?')?json({user_id:'123450000',username:'memocasting.lt'}):json({data:[photo()]});};
 assert.deepEqual(await syncInstagram(env,{now:at,fetcher}),{status:'connected',posts:1});assert.equal((await env.INSTAGRAM_STATE.get('connection','json')).expiresAt,null);assert.equal(calls.length,2);
 await syncInstagram(env,{now:at+1800000,fetcher});assert.equal(calls.length,3);
 const other=environment();assert.equal((await syncInstagram(other,{now:at,fetcher:async()=>json({user_id:'123450000',username:'other'})})).status,'reconnect_required');assert.equal(await other.INSTAGRAM_STATE.get('feed','json'),null);
 let reseed=0;await syncInstagram(other,{now:at+1800000,fetcher:async()=>{reseed++;}});assert.equal(reseed,0);
});
test('weekly refresh replaces durable token using actual expiry and subsequent media request uses new token',async()=>{
 const env=environment();await env.INSTAGRAM_STATE.put('connection',JSON.stringify({token,username:'memocasting.lt',userId:'123450000',refreshedAt:at-8*86400000,expiresAt:null}));
 const urls=[];const result=await syncInstagram(env,{now:at,fetcher:async(url,options)=>{urls.push(url);if(url.includes('refresh_access_token'))return json({access_token:'renewed-fixture',expires_in:5184000});assert.equal(options.headers.Authorization,'Bearer renewed-fixture');return json({data:[photo()]});}});
 assert.equal(result.status,'connected');const saved=await env.INSTAGRAM_STATE.get('connection','json');assert.equal(saved.token,'renewed-fixture');assert.equal(saved.expiresAt,at+5184000000);assert.equal(urls.length,2);
});
test('transient error keeps last snapshot; revoked token deletes snapshot and closes feed',async()=>{
 const env=environment();await env.INSTAGRAM_STATE.put('connection',JSON.stringify({token,username:'memocasting.lt',userId:'123450000',refreshedAt:at,expiresAt:null}));await env.INSTAGRAM_STATE.put('feed',JSON.stringify({username:'memocasting.lt',fetchedAt:at,items:normalizeInstagramMedia([photo()])}));
 assert.equal((await syncInstagram(env,{now:at+1800000,fetcher:async()=>json({error:{code:2}},500)})).status,'temporarily_unavailable');assert.ok(await env.INSTAGRAM_STATE.get('feed','json'));
 assert.equal((await syncInstagram(env,{now:at+3600000,fetcher:async()=>json({error:{code:190}},400)})).status,'reconnect_required');assert.equal(await env.INSTAGRAM_STATE.get('feed','json'),null);
 assert.equal((await instagramResponse(new Request('https://internal/feed'),env,{now:at+3600000})).status,503);
});
test('provider JSON is bounded, unsafe methods and public credential paths are rejected',async()=>{
 await assert.rejects(instagramJson('https://graph.instagram.com/test',{fetcher:async()=>new Response('x'.repeat(1024*1024+1))}),/provider_response_too_large/);
 const env=environment();assert.equal((await instagramResponse(new Request('https://internal/feed',{method:'POST'}),env)).status,405);assert.equal((await instagramResponse(new Request('https://internal/connection'),env)).status,404);
});
