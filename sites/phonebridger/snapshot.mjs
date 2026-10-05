import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const source = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw Error('Usage: node sites/phonebridger/snapshot.mjs <PhoneBridger/design/website/homepage>');
const target = path.join(here, 'prototype');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const runtime = new Set(['.html','.js','.css','.svg','.webp','.png','.jpg','.ttf','.woff2','.mp4','.wav']);
const chosen = new Set(['index.html', 'assets/fonts/OFL.txt']);
async function directory(relative, predicate) {
  for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await directory(name, predicate);
    else if (predicate(name)) chosen.add(name);
  }
}
// Dynamic filenames are selected from these reviewed simulator-only libraries.
await directory('assets/app-ui-v1', name => runtime.has(path.extname(name)) && !name.endsWith('index.html'));
await directory('assets/simulator-v2', name => ['.js','.css','.webp','.wav'].includes(path.extname(name)));
await directory('assets/experience-v1', name => runtime.has(path.extname(name)));
await directory('tests', name => name.endsWith('.cjs'));
const inspected = new Set();
for (;;) {
  const next = [...chosen].find(name => !inspected.has(name));
  if (!next) break;
  inspected.add(next);
  if (!['.html','.js','.css','.svg'].includes(path.extname(next))) continue;
  const text = await readFile(path.join(source, next), 'utf8');
  const candidates = [...text.matchAll(/(?:src|href)=["']([^"'#<>]+)["']|url\(["']?([^\s)'"<>]+)["']?\)|["']((?:assets\/|\.\/)[^"'`$\s<>]+\.(?:js|css|svg|webp|png|jpg|ttf|woff2|mp4|wav))["']/g)].map(m => m[1] || m[2] || m[3]);
  candidates.push(...[...text.matchAll(/\bsrcset=["']([^"']+)["']/g)].flatMap(m => m[1].split(',').map(candidate => candidate.trim().split(/\s+/)[0])));
  for (let name of candidates) {
    name = name.split(/[?#]/)[0];
    if (!name || /^(?:[a-z]+:|\/)/i.test(name)) continue;
    // Existing scripts use paths relative to the HTML document. CSS URLs use
    // the CSS location, except the legacy root asset references already on disk.
    const possible = [name, path.posix.normalize(path.posix.join(path.posix.dirname(next), name))];
    for (const file of possible) {
      if (file.startsWith('../') || !runtime.has(path.extname(file))) continue;
      try { if ((await stat(path.join(source, file))).isFile()) { chosen.add(file); break; } } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}
const files = [];
for (const name of [...chosen].sort()) {
  const bytes = await readFile(path.join(source, name));
  let output = bytes;
  if (name === 'index.html') {
    let html = bytes.toString('utf8').replace('<head>', '<head>\n<meta name="robots" content="noindex,nofollow,noarchive">');
    html = html.replace(/href="(?:\.\.\/)+release\/[^" ]+"/g, 'href="#integration-preview"');
    html = html.replace('<body>', '<body>\n<aside id="integration-preview" style="padding:12px 20px;background:#23232b;color:#eee;text-align:center;font:14px system-ui">Private project preview · Demo earnings and transfers are fictional. Beta installers remain in the application repository.</aside>');
    output = Buffer.from(html);
  }
  await mkdir(path.dirname(path.join(target, name)), { recursive: true });
  await writeFile(path.join(target, name), output);
  files.push({ path: name, bytes: output.length, sha256: digest(output), sourceSha256: digest(bytes) });
}
const privateFile = f => f.path.startsWith('tests/') || f.path.endsWith('/OFL.txt');
await writeFile(path.join(target, 'manifest.json'), JSON.stringify({ schemaVersion: 1, siteId: 'phonebridger', mode: 'private-prototype', locale: 'en', sourceRepository: 'https://github.com/christianza1989/PhoneBridger', sourceBaseCommit: 'b4c57fe112723747145b97d41d763ca060ca4c94', sourceState: 'owner-authorized website working snapshot; not a native release', transforms: ['private robots meta and notice', 'installer links point to the private-preview notice'], files: files.filter(f => !privateFile(f)), verificationFiles: files.filter(privateFile) }, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, bytes: files.reduce((n,f) => n+f.bytes,0), nativeFilesCopied: 0, originalsCopied: 0 }));
