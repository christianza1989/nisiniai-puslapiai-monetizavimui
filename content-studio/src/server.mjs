import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { initialize, ROOT, getSite, listSites, listCalendar, createSite, editSite, addPage, editPage, deleteDraftPage, approvePage, revokePage, exportPackage, listJobs, saveResponsiveAsset, getAssetFile } from './model.mjs';
import { enqueue } from './generator.mjs';
import { listNetworkLinks } from './model.mjs';
import { getContentWorkflow, finalizeInternalLinks, recordEditorialReview, approveReviewedBatch, releaseContent } from './model.mjs';
import { imageSrcSet, responsiveImageVariants, visibleImageCredit } from '../../../dovanos-memorycasting/lib/niche-media.mjs';

const PORT = Number(process.env.STUDIO_PORT || 4317);
const PUBLIC = path.join(ROOT, 'public');
const MAX_BODY = 18 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(body));
};
const fail = (response, error) => json(response, error.status || 400, { error: String(error.message || error) });
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const readBody = request => new Promise((resolve, reject) => {
  let size = 0; const buffers = [];
  request.on('data', data => { size += data.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Užklausa per didelė.'), { status: 413 })); request.destroy(); } else buffers.push(data); });
  request.on('end', () => { try { resolve(JSON.parse(Buffer.concat(buffers).toString('utf8') || '{}')); } catch { reject(new Error('Neteisingas JSON.')); } });
  request.on('error', reject);
});
function preview(site, page) {
  const status = page.publishedRevision && Date.parse(page.publishedRevision.publishAt) <= Date.now() ? 'Publikavimo data atėjo; viešą domeną reikia tikrinti atskirai. Čia rodoma redaguojama studijos kopija' : page.publishedRevision ? 'Patvirtinta, bet dar neskelbiama' : 'Tik privatus juodraštis — viešoje svetainėje nerodomas';
  const bodyImages = page.body.filter(block => block.type === 'image')
    .flatMap(block => page.media.find(asset => asset.id === block.assetId) ?? []);
  const hero = page.media.find(asset => !bodyImages.some(inline => inline.id === asset.id || responsiveImageVariants([asset], inline).length > 0));
  let inlinePriority = !hero;
  const localMedia=page.media.map(asset=>({...asset,src:`/api/media/${encodeURIComponent(site.id)}/${encodeURIComponent(path.basename(asset.src))}`}));
  const imageHtml=(asset,eager=false)=>{const local=localMedia.find(a=>a.id===asset.id);return `<img src="${safe(local.src)}" srcset="${safe(imageSrcSet(localMedia,local))}" sizes="(max-width: 828px) calc(100vw - 48px), 780px" width="${asset.width}" height="${asset.height}" alt="${safe(asset.alt)}" loading="${eager?'eager':'lazy'}" ${eager?'fetchpriority="high"':''}>`;};
  const credit=hero&&visibleImageCredit(hero);
  const heroHtml = hero ? `<figure>${imageHtml(hero,true)}${credit?`<figcaption>${safe(credit)}</figcaption>`:''}</figure>` : '';
  const rich = nodes => nodes.map(node=>{
    if(node.type!=='link')return safe(node.text);
    const target=node.target;
    if(target.kind==='page'){
      const page=site.pages.find(p=>p.id===target.pageId);
      return page?`<a href="/preview/${encodeURIComponent(site.id)}/${encodeURIComponent(page.id)}">${safe(node.text)}</a>`:safe(node.text);
    }
    if(target.kind==='external'&&/^https:\/\//.test(target.url))return `<a href="${safe(target.url)}" rel="noopener noreferrer">${safe(node.text)}</a>`;
    return safe(node.text);
  }).join('');
  const blocks = page.body.map(block => {
    if(block.type==='richParagraph')return `<p>${rich(block.content)}</p>`;
    if(block.type==='richHeading')return `<h${block.level}>${rich(block.content)}</h${block.level}>`;
    if(block.type==='richList'){const tag=block.ordered?'ol':'ul';return `<${tag}>${block.items.map(row=>`<li>${rich(row)}</li>`).join('')}</${tag}>`;}
    if (block.type === 'paragraph') return `<p>${safe(block.text)}</p>`;
    if (block.type === 'heading') return `<h${block.level}>${safe(block.text)}</h${block.level}>`;
    if (block.type === 'list') return `<ul>${block.items.map(item => `<li>${safe(item)}</li>`).join('')}</ul>`;
    if (block.type === 'image') {
      const asset = page.media.find(item => item.id === block.assetId);
      if (!asset) return '';
      const eager = inlinePriority; inlinePriority = false;
      return imageHtml(asset, eager);
    }
    return '';
  }).join('');
  const linkIds = new Set();
  const links = [...(page.links || []), ...(page.linkSuggestions || [])].map(link => {
    if (linkIds.has(link.targetPageId)) return '';
    linkIds.add(link.targetPageId);
    const target = site.pages.find(item => item.id === link.targetPageId);
    return target ? `<a href="/preview/${safe(site.id)}/${safe(target.id)}">${safe(link.label || target.title)}</a>` : '';
  }).filter(Boolean).join(' · ');
  const sources = (page.externalLinks || []).filter(item => /^https:\/\//i.test(item.url || '')).map(item => `<li><a href="${safe(item.url)}" target="_blank" rel="noopener noreferrer">${safe(item.label)}</a> — ${safe(item.reason)}${item.verified ? '' : ' <strong>(nepatikrinta)</strong>'}</li>`).join('');
  return `<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>${safe(page.title)} – ${safe(site.name)}</title><meta name="description" content="${safe(page.description)}"><style>body{font:18px/1.65 system-ui,sans-serif;color:#183438;background:#f7fbfa;margin:0}header,main,footer{max-width:780px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;align-items:center}a{color:${safe(site.brand.accent)};text-underline-offset:3px}h1,h2,h3{line-height:1.16}h1{font-size:clamp(2.3rem,5vw,4.2rem)}h2{margin-top:2.5rem}p,li{max-width:70ch}img{max-width:100%;height:auto;border-radius:18px}figure{margin:24px 0}figcaption{font-size:.8rem;color:#526661}nav{display:flex;gap:12px;flex-wrap:wrap}.cta{display:inline-block;background:${safe(site.brand.accent)};color:white;padding:12px 18px;border-radius:10px;text-decoration:none}.draft{background:#fff3d8;padding:12px 16px;border-radius:10px;font-size:14px;font-weight:700}footer{border-top:1px solid #d6e4e1;font-size:.9rem}</style></head><body><header><strong>${safe(site.name)}</strong><a href="/">Studija</a></header><main><div class="draft">${safe(status)} · ${safe(page.publishAt)} · ${safe(page.cluster || 'Be klasterio')}</div><h1>${safe(page.title)}</h1><p>${safe(page.description)}</p>${heroHtml}${blocks || '<p>Tekstas dar nesugeneruotas. Tai tik suplanuotas įrašas.</p>'}${site.contact.email ? `<p><a class="cta" href="mailto:${safe(site.contact.email)}">Teirautis el. paštu</a></p>` : ''}${links ? `<h2>Planuojamos vidinės nuorodos</h2><nav>${links}</nav>` : ''}${sources ? `<h2>Šaltiniai peržiūrai</h2><ul>${sources}</ul>` : ''}</main><footer>${safe(site.contact.email)}${site.contact.phone ? ` · ${safe(site.contact.phone)}` : ''}</footer></body></html>`;
}

export async function createServer() {
  // Only the single GUI/queue owner performs restart recovery. CLI model clients do not.
  await initialize({recoverJobs:true});
  const server = http.createServer(async (request, response) => {
    try {
      // The studio is a local operator tool. Reject DNS rebinding and cross-origin writes.
      const host = request.headers.host || '';
      const listeningPort = server.address()?.port || PORT;
      if (!new RegExp(`^(127\\.0\\.0\\.1|localhost):${listeningPort}$`).test(host)) return json(response, 403, { error: 'Leidžiama tik vietinė studijos prieiga.' });
      const origin = request.headers.origin;
      if (origin && origin !== `http://${host}`) return json(response, 403, { error: 'Netinkama užklausos kilmė.' });
      if (request.method !== 'GET' && request.headers['x-studio-request'] !== '1') return json(response, 403, { error: 'Trūksta studijos užklausos žymos.' });
      const url = new URL(request.url, `http://${host}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (request.method === 'GET' && url.pathname === '/api/meta') return json(response, 200, { imagegenConfigured: Boolean(process.env.OPENAI_API_KEY), port: PORT });
      if (request.method === 'GET' && url.pathname === '/api/sites') return json(response, 200, await listSites());
      if (request.method === 'GET' && url.pathname === '/api/calendar') return json(response, 200, await listCalendar());
      if (request.method === 'GET' && url.pathname === '/api/network-links') return json(response, 200, await listNetworkLinks());
      if (request.method === 'POST' && url.pathname === '/api/sites') return json(response, 201, await createSite(await readBody(request)));
      if (request.method === 'GET' && url.pathname === '/api/jobs') return json(response, 200, await listJobs());
      if (parts[0] === 'api' && parts[1] === 'sites' && parts[2]) {
        const siteId = parts[2];
        if (parts.length === 4 && parts[3] === 'workflow' && request.method === 'GET') return json(response, 200, await getContentWorkflow(siteId));
        if (parts.length === 4 && parts[3] === 'finalize-links' && request.method === 'POST') return json(response, 200, await finalizeInternalLinks(siteId, (await readBody(request)).pageIds));
        if (parts.length === 4 && parts[3] === 'approve-reviewed' && request.method === 'POST') { const input = await readBody(request); return json(response, 200, await approveReviewedBatch(siteId, input.pageIds, input.actorId)); }
        if (parts.length === 4 && parts[3] === 'release' && request.method === 'POST') return json(response, 200, await releaseContent(siteId));
        if (parts.length === 3 && request.method === 'GET') return json(response, 200, await getSite(siteId));
        if (parts.length === 3 && request.method === 'PUT') return json(response, 200, await editSite(siteId, await readBody(request)));
        if (parts[3] === 'autopilot' && request.method === 'POST') { await getSite(siteId); return json(response, 202, await enqueue('autopilot', siteId)); }
        if (parts[3] === 'plan' && request.method === 'POST') { await getSite(siteId); return json(response, 202, await enqueue('plan', siteId, null, await readBody(request))); }
        if (parts[3] === 'drafts' && parts[4] === 'generate' && request.method === 'POST') { await getSite(siteId); return json(response, 202, await enqueue('draft-batch', siteId)); }
        if (parts[3] === 'export' && request.method === 'POST') return json(response, 200, await exportPackage(siteId));
        if (parts[3] === 'images' && parts[4] === 'generate' && request.method === 'POST') { await getSite(siteId); return json(response, 202, await enqueue('image', siteId, null, await readBody(request))); }
        if (parts[3] === 'assets' && request.method === 'POST') {
          const input = await readBody(request);
          if (!/^[A-Za-z0-9+/=]+$/.test(input.base64 || '')) throw new Error('Netinkamas vaizdo kodavimas.');
          return json(response, 201, await saveResponsiveAsset(siteId, input, Buffer.from(input.base64, 'base64')));
        }
        if (parts[3] === 'pages') {
          if (parts.length === 4 && request.method === 'POST') return json(response, 201, await addPage(siteId, await readBody(request)));
          if (parts[4]) {
            const pageId = parts[4];
            if (parts.length === 6 && parts[5] === 'review' && request.method === 'POST') return json(response, 200, await recordEditorialReview(siteId, pageId, await readBody(request)));
            if (parts.length === 5 && request.method === 'PUT') return json(response, 200, await editPage(siteId, pageId, await readBody(request)));
            if (parts.length === 5 && request.method === 'DELETE') return json(response, 200, await deleteDraftPage(siteId, pageId));
            if (parts[5] === 'approve' && request.method === 'POST') return json(response, 200, await approvePage(siteId, pageId, (await readBody(request)).actorId));
            if (parts[5] === 'revoke' && request.method === 'POST') return json(response, 200, await revokePage(siteId, pageId));
            if (parts[5] === 'generate' && request.method === 'POST') { await getSite(siteId); return json(response, 202, await enqueue('draft', siteId, pageId)); }
            if (parts[5] === 'verify-network' && request.method === 'POST') { await getSite(siteId); return json(response, 202, await enqueue('network-check', siteId, pageId)); }
          }
        }
      }
      if (request.method === 'GET' && parts[0] === 'api' && parts[1] === 'media' && parts.length === 4) {
        const file = await getAssetFile(parts[2], parts[3]);
        response.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=3600' });
        return response.end(await readFile(file));
      }
      if (request.method === 'GET' && parts[0] === 'preview' && parts.length === 3) {
        const site = await getSite(parts[1]); const page = site.pages.find(item => item.id === parts[2]);
        if (!page) throw Object.assign(new Error('Puslapis nerastas.'), { status: 404 });
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex, nofollow' });
        return response.end(preview(site, page));
      }
      if (request.method === 'GET') {
        const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        if (!['index.html', 'app.js', 'style.css', 'favicon.svg'].includes(file)) throw Object.assign(new Error('Nerasta.'), { status: 404 });
        response.writeHead(200, { 'content-type': MIME[path.extname(file)], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        return response.end(await readFile(path.join(PUBLIC, file)));
      }
      throw Object.assign(new Error('Nerasta.'), { status: 404 });
    } catch (error) { if (!response.headersSent && !response.destroyed) fail(response, error); }
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const server = await createServer();
  server.listen(PORT, '127.0.0.1', () => console.log(`Content Studio: http://127.0.0.1:${PORT}`));
}
