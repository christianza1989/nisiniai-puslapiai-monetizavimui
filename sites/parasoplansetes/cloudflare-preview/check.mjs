import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const pkg = JSON.parse(fs.readFileSync(path.resolve(root, '../dovanos-memorycasting/content-packages/parasoplansetes/content-package.json'), 'utf8'));
const base = process.argv[2] || 'http://127.0.0.1:8802';
const checks = [];
for (const page of pkg.pages) {
  const pathname = page.slug ? '/' + page.slug : '/';
  const response = await fetch(base + pathname);
  const html = await response.text();
  const canonical = html.match(/<link\b(?=[^>]*rel="canonical")(?=[^>]*href="([^"]+)")[^>]*>/)?.[1];
  const pass = response.status === 200 && response.headers.get('x-robots-tag') === 'noindex, nofollow' && canonical === 'https://parasoplansetes.lt' + pathname && html.includes('<h1');
  checks.push({ path: pathname, status: response.status, canonical, noindex: response.headers.get('x-robots-tag'), pass });
}
for (const pathname of ['/niche/parasoplansetes', '/api/health', '/gift/parasoplansetes']) {
  const response = await fetch(base + pathname);
  checks.push({ path: pathname, status: response.status, pass: response.status === 404 });
}
const robots = await fetch(base + '/robots.txt');
checks.push({ path: '/robots.txt', status: robots.status, pass: robots.status === 200 && (await robots.text()).includes('Disallow: /') });
const form = await fetch(base + '/uzklausa', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=QA&email=qa%40example.invalid&message=Clearly+marked+synthetic+test+message&consent=yes' });
checks.push({ path: '/uzklausa', kind: 'cross-origin', status: form.status, pass: form.status === 403 });
const media = [...new Set(pkg.pages.flatMap(page => (page.media || []).map(item => item.src)))];
for (const pathname of media) {
  const response = await fetch(base + pathname);
  const bytes = (await response.arrayBuffer()).byteLength;
  checks.push({ path: pathname, status: response.status, bytes, pass: response.status === 200 && bytes > 0 && response.headers.get('x-robots-tag') === 'noindex, nofollow' });
}
const report = { checkedAt: new Date().toISOString(), base, kind: 'preview-runtime', pages: pkg.pages.length, checks, pass: checks.every(item => item.pass), remoteDeploymentProven: new URL(base).hostname.endsWith('.workers.dev') };
const reportPath = process.argv[3];
if (reportPath) fs.writeFileSync(path.resolve(reportPath), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
