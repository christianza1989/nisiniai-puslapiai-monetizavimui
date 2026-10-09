// Read-only, bounded checks. This script does not install redirects or change DNS.
import { readFile, writeFile } from 'node:fs/promises';
import { resolveNs, resolve4, resolve6 } from 'node:dns/promises';
import { createHash } from 'node:crypto';
const mapBytes = await readFile(new URL('./migration-url-map.json', import.meta.url));
const map = JSON.parse(mapBytes);
const args = process.argv.slice(2);
const mode = args[0];
if (!['preview', 'preflight', 'postflight'].includes(mode)) throw new Error('Usage: node verify-migration.mjs preview|preflight|postflight [--base http://127.0.0.1:8798] [--report absolute-path.json]');
const option = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
const base = option('--base');
if (mode === 'preview' && (!base || !['127.0.0.1', 'localhost'].includes(new URL(base).hostname) || new URL(base).protocol !== 'http:')) throw new Error('Preview requires a local HTTP base');
if (mode !== 'preview' && base) throw new Error('Production checks cannot substitute a preview');
if (map.products.length !== 5 || new Set(map.products.map(x => x.slug)).size !== 5 || map.products.some(x => !/^paraso-plansete-stepover-[a-z0-9.-]+$/.test(x.slug))) throw new Error('Invalid reviewed five-product map');
const target = slug => `${map.targetOrigin}/produktas/${slug}`;
const allowedHosts = new Set([new URL(map.sourceOrigin).hostname, new URL(map.targetOrigin).hostname, 'www.signaturepads.lt', 'www.parasoplansetes.lt']);
async function htmlHead(response) {
  if (!response.body) return '';
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { while (size < 262144) { const r = await reader.read(); if (r.done) break; chunks.push(r.value); size += r.value.length; if (Buffer.concat(chunks).includes(Buffer.from('</head>'))) break; } }
  finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).subarray(0, 262144).toString('utf8');
}
async function inspect(url, headers = {}) {
  try {
    const r = await fetch(url, {redirect: 'manual', headers: {Accept: 'text/html', ...headers}, signal: AbortSignal.timeout(10000)});
    const head = await htmlHead(r);
    const link = (head.match(/<link\b[^>]*>/gi) || []).find(x => /\brel\s*=\s*["']canonical["']/i.test(x));
    const canonical = link?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || null;
    const robots = (head.match(/<meta\b[^>]*>/gi) || []).filter(x => /\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(x)).join(' ');
    return {url, status: r.status, location: r.headers.get('location'), canonical,
      noindex: /noindex/i.test(robots + ' ' + (r.headers.get('x-robots-tag') || ''))};
  } catch (e) { return {url, status: null, error: e.cause?.code || e.name}; }
}
async function dns(host) {
  const records = await Promise.all([['NS',resolveNs], ['A',resolve4], ['AAAA',resolve6]].map(async ([type, fn]) => {
    try { return {type, values: await fn(host)}; } catch (e) { return {type, values: [], error: e.code}; }
  })); return {host, records};
}
const report = {version:1, checkedAt:new Date().toISOString(), mode, siteId:map.siteId,
  mapSha256:createHash('sha256').update(mapBytes).digest('hex'), writesPerformed:false,
  limits:'This read-only URL check does not certify mail, privacy, DNS ownership, rankings or full launch readiness.'};
if (mode !== 'preview') report.dns = await Promise.all([...allowedHosts].filter(x => !x.startsWith('www.')).map(dns));
report.targets = await Promise.all(map.products.map(async ({slug}) => {
  const expected = target(slug);
  const r = await inspect(mode === 'preview' ? `${base}/produktas/${slug}` : expected,
    mode === 'preview' ? {Host:new URL(map.targetOrigin).hostname} : {});
  return {...r, expectedCanonical:expected, pass:r.status === 200 && r.canonical === expected && (mode === 'preview' || !r.noindex)};
}));
if (mode !== 'preview') {
  report.sources = await Promise.all(map.products.flatMap(({slug}) => ['', '/'].map(async suffix => {
    const r = await inspect(`${map.sourceOrigin}/produktas/${slug}${suffix}`);
    const destination = r.location ? new URL(r.location, r.url).href : null;
    return {...r, expectedDestination:target(slug), observedDestination:destination,
      pass:mode === 'preflight' ? undefined : r.status === 301 && destination === target(slug)};
  })));
  report.preservedPaths = await Promise.all(map.preserveSourcePaths.map(async path => {
    const chain = []; let url = map.sourceOrigin + path;
    for (let hops = 0; hops < 4; hops++) {
      const r = await inspect(url); chain.push(r);
      if (![301,302,307,308].includes(r.status) || !r.location) break;
      const next = new URL(r.location,url);
      if (!allowedHosts.has(next.hostname) || next.protocol !== 'https:') break;
      url = next.href;
    }
    const last = chain.at(-1); return {path,chain,pass:last.status === 200 && ['signaturepads.lt','www.signaturepads.lt'].includes(new URL(last.url).hostname)};
  }));
}
report.status = report.targets.every(x => x.pass) && (mode === 'preview' || report.preservedPaths.every(x => x.pass)) && (mode !== 'postflight' || report.sources.every(x => x.pass)) ? 'PASS_URL_CHECKS' : 'BLOCKED_URL_CHECKS';
const file = option('--report'); if (file) await writeFile(file, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (report.status !== 'PASS_URL_CHECKS') process.exitCode = 1;
