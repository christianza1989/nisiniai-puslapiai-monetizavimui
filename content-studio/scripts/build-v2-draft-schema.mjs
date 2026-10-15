import {readFile,writeFile} from 'node:fs/promises';
import {v2CliSchema} from '../src/draft-v2.mjs';
const pub=JSON.parse(await readFile(new URL('../schemas/content-package.v2.schema.json',import.meta.url)));
const old=JSON.parse(await readFile(new URL('../schemas/draft-result.schema.json',import.meta.url)));
const fields={title:{type:'string',minLength:1,maxLength:1000},description:{type:'string',minLength:1,maxLength:1000},body:{type:'array',minItems:1,maxItems:1000,items:{$ref:'#/$defs/block'}},factChecks:{type:'array',maxItems:40,items:{type:'string',minLength:1,maxLength:600}},internalLinks:{...old.properties.internalLinks,maxItems:30},sourceIds:{type:'array',items:{type:'string'}},mediaBrief:{type:'string',minLength:1,maxLength:4000}};
const defs={};function visit(value){if(Array.isArray(value)){value.forEach(visit);return;}if(!value||typeof value!=='object')return;if(value.$ref){const key=value.$ref.split('/').at(-1);if(!defs[key]){defs[key]=pub.$defs[key];visit(defs[key]);}}Object.values(value).forEach(visit);}visit(fields);
await writeFile(new URL('../schemas/draft-result.v2.schema.json',import.meta.url),JSON.stringify(v2CliSchema({type:'object',additionalProperties:false,required:Object.keys(fields),properties:fields,$defs:defs}),null,2)+'\n');
