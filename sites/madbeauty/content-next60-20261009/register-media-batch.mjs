import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),file=process.argv[2];
const plan=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
const records=JSON.parse(await fs.readFile(new URL(file,here),'utf8'));
for(const row of records){
 const p=plan.find(p=>p.index===row.index);if(!p||!row.sourcePath?.startsWith('C:')||!row.observation||!row.actualPrompt)throw Error('Exact generation and pixel-review evidence required');
 if(p.originalSha256&&!row.correction)throw Error('Existing original must be preserved');
 if(row.correction){p.previousOriginals=[...(p.previousOriginals||[]),{sourcePath:p.sourcePath,originalPath:p.originalPath,originalSha256:p.originalSha256,prompt:p.actualPrompt||p.prompt,pixelReview:p.originalPixelReview}];}
 const out=new URL('originals/'+p.planId+(row.correction?'-correction'+p.previousOriginals.length:'')+'.png',here);
 await fs.mkdir(new URL('originals/',here),{recursive:true});await fs.copyFile(row.sourcePath,out,fs.constants.COPYFILE_EXCL);
 p.sourcePath=row.sourcePath;p.originalPath=out.pathname.replace(/^\/([A-Z]:)/,'$1');p.originalSha256=createHash('sha256').update(await fs.readFile(out)).digest('hex');
 p.actualPrompt=row.actualPrompt;p.generator='built-in image_gen';p.generatedAt=new Date().toISOString();p.status='GENERATED_REQUIRES_RENDERED_REVIEW';
 p.originalPixelReview={at:new Date().toISOString(),sha256:p.originalSha256,state:'PASS_ORIGINAL_PIXELS',observation:row.observation,scope:'Original pixels actually inspected. Responsive assets and mobile rendering require separate checks.'};
 await fs.writeFile(new URL('MEDIA-PLAN.json',here),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({index:p.index,planId:p.planId,sha256:p.originalSha256}));
}
