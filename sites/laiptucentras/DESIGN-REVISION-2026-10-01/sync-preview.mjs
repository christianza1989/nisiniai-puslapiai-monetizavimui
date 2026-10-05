import fs from 'node:fs/promises';
import path from 'node:path';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting';
const target=path.join(core,'output/laiptucentras-redesign-20261001');
const files=['components/niche/laiptucentras-site.tsx','components/niche/laiptucentras-site.module.css','components/niche/laiptucentras-quote-check.tsx','lib/laiptucentras-quote-check.mjs','tests/laiptucentras-quote-check.test.mjs'];
for(const file of files)await fs.copyFile(path.join(core,file),path.join(target,file));
console.log(`Synced ${files.length} own niche files to isolated preview.`);
