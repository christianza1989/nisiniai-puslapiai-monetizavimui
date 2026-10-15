// Fixed read-only import probe; no initialize, case input, provider or server.
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const VERSION = 'customer-content-preflight.v1';
const fail = code => {throw Object.assign(new Error(code), {code});};
export async function preflightDependencies(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).length !== 1 || input.version !== VERSION) fail('studio_preflight_invalid_input');
  // Targets are source-owned constants; never accept module paths from a caller.
  const [intake, writer, workflow, model, sharpModule] = await Promise.all([
    import('./customer-creation-intake.mjs'), import('./customer-content-write.mjs'),
    import('./customer-content-workflow.mjs'), import('../src/model.mjs'), import('sharp'),
  ]);
  const sharp = sharpModule.default;
  if (typeof intake.intakeCreationDraft !== 'function' || typeof writer.customerContentWrite !== 'function'
      || typeof workflow.customerContentWorkflow !== 'function' || typeof model.initialize !== 'function'
      || typeof model.getSite !== 'function' || typeof model.saveResponsiveAsset !== 'function'
      || typeof sharp !== 'function' || !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?$/.test(sharp.versions?.sharp || ''))
    fail('studio_preflight_invalid_exports');
  return {version:VERSION, state:'ready', modules:['intake','writer','workflow','model','sharp'],
    sharpVersion:sharp.versions.sharp, providerCalls:0, initialization:'not-performed', server:'not-started'};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const chunks=[];let size=0;
    for await (const chunk of process.stdin) {size+=chunk.length;if(size>4096)fail('studio_preflight_invalid_input');chunks.push(chunk);}
    let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('studio_preflight_invalid_input');}
    process.stdout.write(JSON.stringify(await preflightDependencies(input))+'\n');
  } catch (error) {
    const own = new Set(['studio_preflight_invalid_input','studio_preflight_invalid_exports']);
    const code = own.has(error.code) ? error.code
      : ['ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND','ERR_DLOPEN_FAILED'].includes(error.code)
        ? 'studio_dependency_missing' : 'studio_dependency_import_failed';
    process.stderr.write(JSON.stringify({version:VERSION,state:'failed',code})+'\n');
    process.exitCode=1;
  }
}
