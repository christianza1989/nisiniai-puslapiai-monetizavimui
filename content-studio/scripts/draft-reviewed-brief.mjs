// Bounded file-first pilot; never approves, imports, deploys or enables V2 autopilot.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {generateEditorialJson} from '../src/editorial-cli.mjs';
import {loadEditorialSkill,buildEditorialPrompt} from '../src/editorial-skill.mjs';
const [briefFile,destination,validationFlag]=process.argv.slice(2);
if(!briefFile||!destination)throw Error('Usage: node draft-reviewed-brief.mjs <reviewed-brief.json> <private-output-directory>');
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(destination);
const brief=JSON.parse(await readFile(briefFile,'utf8'));
if(brief.status!=='SOURCE_NOTES_REVIEWED_FOR_DRAFT'||!brief.coverageMap||!brief.sourceNotes?.length)throw Error('A researched map and explicitly reviewed source notes are required');
const coverage=JSON.parse(await readFile(path.resolve(path.dirname(briefFile),brief.coverageMap),'utf8'));
const planned=coverage.pages.find(p=>p.id===brief.planId);
if(!planned||planned.slug!==brief.slug||coverage.domain!==brief.site.domain||coverage.pages.length!==brief.coverage.newGuides)throw Error('Brief must bind to the complete same-site researched map');
if(validationFlag==='--validate-only'){console.log(JSON.stringify({coveragePages:coverage.pages.length,planId:planned.id,slug:planned.slug,status:'VALIDATED_WITHOUT_GENERATION'}));process.exit(0);}
if(validationFlag)throw Error('Unknown flag');
await mkdir(out,{recursive:true});
const schema=JSON.parse(await readFile(path.join(root,'schemas/draft-result.schema.json'),'utf8'));
schema.required.push('imageBrief');
schema.properties.imageBrief={type:'object',additionalProperties:false,required:['prompt','alt','role','proofBoundary'],properties:Object.fromEntries(['prompt','alt','role','proofBoundary'].map(k=>[k,{type:'string'}]))};
const schemaFile=path.join(out,'article-result.schema.json');await writeFile(schemaFile,JSON.stringify(schema,null,2));
const skill=await loadEditorialSkill('draft');
const instruction=`Write the complete Lithuanian article for the supplied single brief. Use the supplied source notes only within their precise boundaries; most of the article must be original practical assistance, not source paraphrase. No invented research or product testing. Do not invoke tools: all reviewed evidence needed for this bounded article is provided. Improve the awkward planning metadata into natural Lithuanian. Include a reusable text template with [įrašykite] fields that the reader can copy and fill in their notes, plus a clearly hypothetical example of an unconfirmed booking request and a complete confirmed appointment. Explicitly explain how to use the template. Do not claim an actual Madbeauty booking, available providers, functioning filters or UI steps. The owner is preparing all categories, but this draft is a cross-category decision guide. No medical advice, eligibility criteria or legal deadlines. Avoid collecting health details, payment card numbers or identifying photos in a generic message. Keep health instructions specific to the chosen provider and their appropriate private channel. Do not fill the page with questions instead of actionable answers. Respect the supplied source-paraphrase word limits. Output the draft-result fields plus the required imageBrief extension in the supplied schema; this pilot extension overrides only the draft field list. imageBrief is a proposal, never proof that media exists: provide an exact English image-generation prompt, Lithuanian alt, visual role and proof boundary. Use the supplied current DESIGN. Record missing actual image and any unresolved platform description in factChecks; do not fabricate IDs or public internal links. Do not add unprovided sources or network links. Self-review the complete result before returning.`;
const prompt=buildEditorialPrompt(skill,{mode:'draft',instruction,siteData:brief.site,pageData:brief});
await writeFile(path.join(out,'prompt.txt'),prompt);
console.log('Starting article CLI: gpt-6-luna / xhigh; no fallback.');
const {result,receipt}=await generateEditorialJson(prompt,schemaFile,{root,dataDir:out,mode:'draft'});
await writeFile(path.join(out,'article.json'),JSON.stringify(result,null,2)+'\n');
await writeFile(path.join(out,'generation-receipt.json'),JSON.stringify({...receipt,editorialSkill:skill.metadata,briefFile:path.basename(briefFile),coverageMap:brief.coverageMap,coveragePages:coverage.pages.length,planId:planned.id},null,2)+'\n');
console.log(JSON.stringify({model:receipt.observed,blocks:result.blocks.length,title:result.title,privateOutput:out}));
