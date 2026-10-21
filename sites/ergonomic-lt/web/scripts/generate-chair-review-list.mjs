import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const args = new Map(process.argv.slice(2).map(value => {
  const split = value.indexOf('=');
  assert(split > 2, 'Use --input=PATH --output=PATH --ledger=STATE.json');
  return [value.slice(2, split), value.slice(split + 1)];
}));
for (const key of ['input', 'output', 'ledger']) assert(args.has(key), 'Missing --' + key);
const baseline = JSON.parse(await fs.readFile(new URL('../content/chair-human-review.json', import.meta.url), 'utf8'));
const reviewedCodes = new Set(baseline.reviewedCodes);
assert(reviewedCodes.size === baseline.reviewedCodes.length, 'Duplicate reviewed code');
const source = await fs.readFile(args.get('input'), 'utf8');
const rows = [...source.matchAll(/<tr(?:\s[^>]*)?><td>(K[A-Z0-9]+)<\/td><td><a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/td><\/tr>/g)].map(match => ({
  code: match[1], href: match[2], name: match[3], html: match[0], reviewed: reviewedCodes.has(match[1])
}));
assert(rows.length > 0, 'No review list rows found');
assert(new Set(rows.map(row => row.code)).size === rows.length, 'Duplicate list code');
for (const row of rows) {
  const url = new URL(row.href);
  assert(url.origin === 'https://ergonomic-preview.pinet-azprekyba.workers.dev' && url.pathname.startsWith('/produktai/kedes/'), 'Unexpected product URL');
}
const state = JSON.parse(await fs.readFile(args.get('ledger'), 'utf8'));
const ledger = Object.values(state.technicalDraftModelStates);
assert(ledger.length === rows.length, 'List must include every published draft exactly once');
for (const entry of ledger) assert(rows.some(row => row.code === entry.code && new URL(row.href).pathname === entry.path), 'Published draft mismatch: ' + entry.code);
for (const code of reviewedCodes) assert(rows.some(row => row.code === code), 'Missing owner-reviewed baseline: ' + code);
const pending = rows.filter(row => !row.reviewed);
const checked = rows.filter(row => row.reviewed);
function section(id, title, items) {
  return '<section id="' + id + '"><h2>' + title + ' <span class="count">' + items.length + '</span></h2><p class="empty" hidden>Pagal paiešką įrašų nėra.</p><table><thead><tr><th scope="col">Kodas</th><th scope="col">Modelis</th></tr></thead><tbody>' + items.map(row => row.html).join('') + '</tbody></table></section>';
}
const html = '<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kėdžių konfigūratorių peržiūra</title><style>body{font:17px/1.6 system-ui;background:#f4f3ef;color:#192c2c;margin:32px auto;padding:0 20px;max-width:1060px}h1{font-size:clamp(28px,5vw,38px);line-height:1.2}h2{font-size:24px;line-height:1.3;margin:0 0 16px}p{max-width:760px}input{box-sizing:border-box;font:inherit;padding:12px;border:1px solid #798a83;border-radius:6px;width:min(100%,500px);min-height:48px;margin:8px 0 24px;display:block}table{border-collapse:collapse;width:100%;background:white}td,th{text-align:left;padding:14px;border-bottom:1px solid #ddd}td:first-child{white-space:nowrap}a{color:#005f56;text-underline-offset:3px}a:focus-visible,input:focus-visible{outline:3px solid #a44510;outline-offset:3px}thead{background:#dae5dc}section{margin:0 0 36px}#pending{border-top:5px solid #a44510;padding-top:20px}.count{display:inline-block;font-size:17px;font-weight:600;padding:2px 10px;border-radius:20px;background:#e7e1d3;vertical-align:middle}.summary a{display:inline-block;min-height:44px;margin-right:24px}.empty{font-size:16px}@media(max-width:600px){body{padding:0 12px;margin:24px auto}td,th{padding:12px 8px;font-size:15px}h2{font-size:22px}td:nth-child(2){overflow-wrap:anywhere}}[hidden]{display:none!important}</style><main><h1>' + rows.length + ' kėdžių konfigūratoriai</h1><p>Techniniai juodraščiai su konstrukcijos pasirinkimais ir originalia apdaila. Žemiau atskirta žmogaus atlikta konfigūratorių patikra. Tekstų priėmimas ir viešas paleidimas – atskiri etapai.</p><nav class="summary" aria-label="Patikros grupės"><a href="#pending">Žmogaus dar netikrinti: ' + pending.length + '</a><a href="#reviewed">Žmogaus patikrinti: ' + checked.length + '</a></nav><label for="q">Paieška pagal kodą arba modelį</label><input type="search" id="q" placeholder="Kodas arba modelis">' + section('pending', 'Žmogaus dar netikrinti', pending) + section('reviewed', 'Žmogaus patikrinti', checked) + '</main><script>const q=document.querySelector("#q");q.addEventListener("input",()=>{const text=q.value.trim().toLocaleLowerCase("lt");document.querySelectorAll("section").forEach(section=>{let visible=0;section.querySelectorAll("tbody tr").forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase("lt").includes(text);if(!row.hidden)visible++});section.querySelector(".count").textContent=visible;section.querySelector(".empty").hidden=visible>0;section.querySelector("table").hidden=visible===0})})</script></html>';
const output = path.resolve(args.get('output'));
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, html + '\n', 'utf8');
console.log(JSON.stringify({ result: 'PASS', output, published: rows.length, humanReviewed: checked.length, humanReviewPending: pending.length, pendingCodes: pending.map(row => row.code), noAutomaticPromotion: true }));
