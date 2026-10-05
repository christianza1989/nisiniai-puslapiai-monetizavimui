import {readFile,writeFile,copyFile} from 'node:fs/promises';
const src='C:/Users/lenovo/Documents/dovanos-memorycasting/components/niche/miniekskavatoriai-site.module.css';
let s=await readFile(src,'utf8');s=s.replace('letter-spacing:-.05em','letter-spacing:-.03em').replace('border-left:2px solid var(--accent)','border-left:1px solid var(--accent)');await writeFile(src,s);
await copyFile(src,'C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/content-studio/output/miniekskavatoriai-production/components/niche/miniekskavatoriai-site.module.css');
