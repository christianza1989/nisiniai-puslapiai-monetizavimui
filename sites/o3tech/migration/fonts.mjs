import{mkdir,writeFile,readFile}from'node:fs/promises';import path from'node:path';import{createHash}from'node:crypto';
const root=path.resolve(process.env.O3TECH_MIGRATION_ROOT||path.resolve(import.meta.dirname,'../../../..')),pub=path.join(root,'dovanos-memorycasting');
const cssUrl='https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap';
const response=await fetch(cssUrl,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}});if(!response.ok)throw Error('Font CSS unavailable');const original=await response.text();
let css='',records=[];await mkdir(path.join(pub,'public/fonts/o3tech'),{recursive:true});
for(const subset of ['latin-ext','latin']){
const group=original.match(new RegExp('/\\* '+subset+' \\*/\\s*(@font-face\\s*\\{[\\s\\S]*?\\})'))?.[1];if(!group)throw Error('Missing font subset '+subset);
const url=group.match(/url\(([^)]+)\)/)?.[1];const r=await fetch(url);if(!r.ok)throw Error('Font download failed');const bytes=Buffer.from(await r.arrayBuffer());const file='open-sans-'+subset+'.woff2';await writeFile(path.join(pub,'public/fonts/o3tech',file),bytes);
css+=group.replace("'Open Sans'","'O3tech Open Sans'").replace(/font-weight:\s*\d+;/,'font-weight:400 700;').replace(url,'/fonts/o3tech/'+file)+'\n';records.push({url,file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
const licenseUrl='https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OFL.txt';const license=await fetch(licenseUrl);if(!license.ok)throw Error('Font license missing');await writeFile(path.join(pub,'public/fonts/o3tech/OFL.txt'),await license.text());
await writeFile(path.join(pub,'public/fonts/o3tech/font.css'),css);
await writeFile(path.join(pub,'components/niche/o3tech-fonts.css'),css);
await writeFile(path.join(root,'private/font-provenance.json'),JSON.stringify({cssUrl,licenseUrl,records,at:new Date().toISOString()},null,2));
const file=path.join(pub,'components/niche/o3tech.css');const source=await readFile(file,'utf8');await writeFile(file,source.replace("font-family:'Open Sans'","font-family:'O3tech Open Sans'"));console.log(records.map(x=>({file:x.file,bytes:x.bytes})));
