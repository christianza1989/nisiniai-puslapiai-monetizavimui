// Official own-account read-only API. Never return provider payloads or tokens to a browser.
export const MAX_POSTS = 48;
const HOUR = 3600000, DAY = 24 * HOUR;
const ID = /^\d{5,40}$/;
export class InstagramFailure extends Error {
  constructor(code, reconnect = false) { super(code); this.code = code; this.reconnect = reconnect; }
}
export function instagramMediaUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.searchParams.has('access_token') &&
      ['cdninstagram.com', 'fbcdn.net'].some(host => u.hostname.endsWith('.' + host)) ? u.href : null;
  } catch { return null; }
}
function permalink(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['www.instagram.com','instagram.com'].includes(u.hostname) && /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname) && !u.username && !u.password && !u.port ? 'https://www.instagram.com' + u.pathname : null; } catch { return null; }
}
export function normalizeInstagramMedia(data) {
  if (!Array.isArray(data)) throw new InstagramFailure('invalid_media');
  const unique = new Map();
  for (const raw of data.slice(0, 100)) {
    const id = String(raw?.id ?? ''), type = raw?.media_type, href = permalink(raw?.permalink), timestamp = Date.parse(raw?.timestamp);
    if (!ID.test(id) || !['IMAGE','VIDEO','CAROUSEL_ALBUM'].includes(type) || !href || !Number.isFinite(timestamp)) continue;
    const media = instagramMediaUrl(raw.media_url), poster = instagramMediaUrl(type === 'VIDEO' ? raw.thumbnail_url : raw.media_url);
    if (!media || (type !== 'VIDEO' && !poster)) continue;
    unique.set(id, {id, type, href, timestamp: new Date(timestamp).toISOString(), caption: String(raw.caption ?? '').trim().slice(0, 2200), media, poster});
  }
  return [...unique.values()].sort((a,b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, MAX_POSTS);
}
export function publicInstagramFeed(snapshot, now = Date.now()) {
  if (!snapshot || !Array.isArray(snapshot.items) || now - snapshot.fetchedAt > 6 * HOUR) return null;
  return {username: snapshot.username, updatedAt: new Date(snapshot.fetchedAt).toISOString(), stale: now - snapshot.fetchedAt > HOUR,
    items: snapshot.items.map(({id,type,href,timestamp,caption,poster}) => ({id,type,href,timestamp,caption,poster: poster ? `/social/instagram/media/${id}/poster` : null, video: type === 'VIDEO' ? `/social/instagram/media/${id}/video` : null}))};
}
async function boundedJson(response) {
  const reader = response.body?.getReader(); if (!reader) throw new InstagramFailure('empty_provider_response');
  const parts = []; let total = 0;
  try { while (true) { const {done,value} = await reader.read(); if (done) break; total += value.byteLength; if (total > 1024 * 1024) throw new InstagramFailure('provider_response_too_large'); parts.push(value); } }
  finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(total); let offset = 0; for (const part of parts) { bytes.set(part,offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new InstagramFailure('invalid_provider_json'); }
}
export async function instagramJson(url, {token, fetcher = fetch} = {}) {
  let response;
  try { response = await fetcher(url, {headers: token ? {Authorization: `Bearer ${token}`} : {}, redirect: 'error', signal: AbortSignal.timeout(20000)}); }
  catch { throw new InstagramFailure('provider_unavailable'); }
  const data = await boundedJson(response);
  if (!response.ok || data.error) throw new InstagramFailure('provider_rejected', [190,102].includes(data?.error?.code) || [401,403].includes(response.status));
  return data;
}
export async function syncInstagram(env, {now = Date.now(), fetcher = fetch} = {}) {
  const kv = env.INSTAGRAM_STATE; if (!kv || env.INSTAGRAM_ENABLED !== '1') return {status:'disabled'};
  let connection = await kv.get('connection', 'json');
  if (connection?.disconnected) return {status:'reconnect_required'};
  try {
    if (!connection) {
      if (!env.INSTAGRAM_SEED_TOKEN) return {status:'not_connected'};
      const profile = await instagramJson(`https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}/me?fields=user_id,username`, {token: env.INSTAGRAM_SEED_TOKEN, fetcher});
      const account = Array.isArray(profile.data) ? profile.data[0] : profile;
      if (account?.username?.toLowerCase() !== env.INSTAGRAM_USERNAME.toLowerCase() || !ID.test(String(account?.user_id))) throw new InstagramFailure('wrong_account', true);
      connection = {token: env.INSTAGRAM_SEED_TOKEN, userId: String(account.user_id), username: account.username, refreshedAt: now, expiresAt: null};
      await kv.put('connection', JSON.stringify(connection));
    }
    if (connection.username.toLowerCase() !== env.INSTAGRAM_USERNAME.toLowerCase()) throw new InstagramFailure('wrong_account', true);
    if (connection.expiresAt && connection.expiresAt <= now) throw new InstagramFailure('expired_token', true);
    if (now - connection.refreshedAt >= 7 * DAY) {
      const refreshUrl = new URL('https://graph.instagram.com/refresh_access_token'); refreshUrl.searchParams.set('grant_type','ig_refresh_token'); refreshUrl.searchParams.set('access_token',connection.token);
      const refreshed = await instagramJson(refreshUrl.href, {fetcher});
      if (typeof refreshed.access_token !== 'string' || !Number.isFinite(refreshed.expires_in) || refreshed.expires_in <= 0) throw new InstagramFailure('invalid_refresh');
      connection = {...connection, token: refreshed.access_token, refreshedAt: now, expiresAt: now + refreshed.expires_in * 1000};
      await kv.put('connection', JSON.stringify(connection));
    }
    const url = new URL(`https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}/${connection.userId}/media`);
    url.searchParams.set('fields','id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'); url.searchParams.set('limit',String(MAX_POSTS));
    const raw = await instagramJson(url.href, {token: connection.token, fetcher});
    const items = normalizeInstagramMedia(raw.data);
    // Never treat a partly malformed non-empty response as an empty valid account.
    if (raw.data.length && !items.length) throw new InstagramFailure('invalid_media');
    await kv.put('feed', JSON.stringify({username: connection.username, fetchedAt: now, items}));
    await kv.put('status', JSON.stringify({status:'connected',at:now,posts:items.length}));
    return {status:'connected', posts:items.length};
  } catch (error) {
    if (error?.reconnect) {
      await kv.put('connection',JSON.stringify({disconnected:true,at:now})); await kv.delete('feed');
    }
    const status = error?.reconnect ? 'reconnect_required' : 'temporarily_unavailable';
    await kv.put('status',JSON.stringify({status,at:now}));
    return {status};
  }
}
const headers = {'x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
export async function instagramResponse(request, env, {fetcher = fetch, now = Date.now()} = {}) {
  const url = new URL(request.url);
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD','cache-control':'no-store'}});
  if (!env.INSTAGRAM_STATE || env.INSTAGRAM_ENABLED !== '1') return new Response(null,{status:503,headers:{...headers,'cache-control':'no-store'}});
  const snapshot = await env.INSTAGRAM_STATE.get('feed','json'), feed = publicInstagramFeed(snapshot,now);
  if (url.pathname === '/feed') {
    const options={status:feed?200:503,headers:{...headers,'content-type':'application/json','cache-control':feed?'public, max-age=120':'no-store'}};
    return request.method==='HEAD'?new Response(null,options):Response.json(feed ?? {username:env.INSTAGRAM_USERNAME,items:[],unavailable:true},options);
  }
  const match = /^\/media\/(\d{5,40})\/(poster|video)$/.exec(url.pathname);
  const item = match && feed ? snapshot.items.find(item => item.id === match[1]) : null;
  const media = item && (match[2] === 'poster' ? item.poster : item.type === 'VIDEO' ? item.media : null);
  if (!media || !instagramMediaUrl(media)) return new Response('Not found',{status:404,headers:{...headers,'cache-control':'no-store'}});
  const range = request.headers.get('range');
  if (range && (!/^bytes=\d*-\d*$/.test(range) || range === 'bytes=-')) return new Response(null,{status:416,headers:{...headers,'cache-control':'no-store'}});
  let response; try { response = await fetcher(media,{method:request.method,headers:range?{Range:range}:{},redirect:'error',signal:AbortSignal.timeout(120000)}); } catch { return new Response(null,{status:502,headers:{...headers,'cache-control':'no-store'}}); }
  const type = response.headers.get('content-type') ?? '', expected = match[2] === 'video' ? /^video\/(mp4|webm)(;|$)/ : /^image\/(jpeg|png|webp|avif)(;|$)/;
  if (![200,206].includes(response.status) || !expected.test(type)) { await response.body?.cancel(); return new Response(null,{status:502,headers:{...headers,'cache-control':'no-store'}}); }
  const outgoing = new Headers({...headers,'content-type':type,'cache-control':'public, max-age=600'});
  for (const name of ['content-length','content-range','accept-ranges','etag','last-modified']) if (response.headers.has(name)) outgoing.set(name,response.headers.get(name));
  return new Response(request.method === 'HEAD' ? null : response.body,{status:response.status,headers:outgoing});
}
