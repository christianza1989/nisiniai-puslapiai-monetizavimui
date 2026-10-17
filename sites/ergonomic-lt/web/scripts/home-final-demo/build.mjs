import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(directory, '../..');
const {build} = await import(pathToFileURL(path.join(web, 'node_modules/esbuild/lib/main.js')).href);
const output = path.join(web, 'public/media/home-final/demo.js');
fs.mkdirSync(path.dirname(output), {recursive: true});
const result = await build({
  entryPoints: [path.join(directory, 'configurator-demo.js')],
  outfile: output,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
  nodePaths: [path.join(web, 'node_modules')],
  metafile: true,
});
const exports = Object.values(result.metafile.outputs).flatMap(item => item.exports);
if (exports.length !== 1 || exports[0] !== 'mountDemo') throw new Error('Unexpected browser module exports');
console.log(JSON.stringify({output, bytes: fs.statSync(output).size, exports}));
await build({entryPoints:[path.join(directory,'carousels-source.js')],outfile:path.join(web,'public/media/home-final/carousels.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false,legalComments:'eof',nodePaths:[path.join(web,'node_modules')]});
