import {readFile,writeFile,copyFile} from 'node:fs/promises';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting',file='/components/niche/laiptucentras-site.tsx';let code=await readFile(core+file,'utf8');
if(!code.includes('<main id="turinys">'))throw Error('Expected scoped main');code=code.replace('<main id="turinys">','<main id="turinys" tabIndex={-1}>');await writeFile(core+file,code);await copyFile(core+file,core+'/output/laiptucentras-production'+file);
console.log('Main now accepts native skip-link focus.');
