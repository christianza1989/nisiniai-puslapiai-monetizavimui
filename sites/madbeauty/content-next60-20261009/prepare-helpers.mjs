import fs from 'node:fs/promises';
const here=new URL('.',import.meta.url),old='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/madbeauty-next30-20261009/sites/madbeauty/content-next30-20261009/';
for(const name of ['screen-contact-sheet.mjs','media-contact-sheet.mjs','render-check.mjs','select-links.mjs','capture-preview.mjs','import-media.mjs']){
 let text=await fs.readFile(old+name,'utf8');
 if(name.includes('contact-sheet'))text=text.replaceAll('batch<2','batch<4').replaceAll('Four QA','Eight QA').replaceAll('Two QA','Four QA');
 if(name==='render-check.mjs')text=text.replace("if(visible!==2)","if(visible!==sel.pages.filter(i=>site.pages.find(p=>p.id===i.pageId).title.toLocaleLowerCase('lt').includes('pedikiūr')).length)");
 if(name==='select-links.mjs'){
  text=text.replace(/const pending=new Set\(\[[^\n]+/,'const pending=new Set();');
  text=text.replace('jos tekstas arba būtina specialistų peržiūra ir vieša revizija dar neparengti','jos tekstas ir faktinė agento peržiūra bei vieša revizija dar neparengti');
 }
 if(name==='capture-preview.mjs'){
  text=text.replace("const delivery=JSON.parse(await fs.readFile(new URL('DELIVERY.json',here),'utf8'));","let delivery={state:'PRIVATE_REVIEW'};try{delivery=JSON.parse(await fs.readFile(new URL('DELIVERY.json',here),'utf8'));}catch{}");
  text=text.replace("127.0.0.1:8868","127.0.0.1:8876").replaceAll('30 papildomų','60 papildomų').replaceAll('30 skirtingų','60 skirtingų').replaceAll('30 straipsnių','60 straipsnių');
  text=text.replace('nuo spalio 29 d. iki gruodžio 2 d.','nuo spalio 30 d. iki gruodžio 23 d.').replace('Kai kuriems procedūrų gidams lieka plane nurodyta specialisto patikra; ji parodyta straipsnio pradžioje.','Turinį pagal svetainės redakcinę politiką tikrina agentas: teiginiai, šaltiniai, nuotraukos, nuorodos ir realus vaizdas tikrinami atskirai.');
  text=text.replace('Antakiai, blakstienos, vyrų paslaugos, plaukai, depiliacija, nagai, pedikiūras ir praktiniai gidai klientams bei meistrams.','Auskarai, estetika, plaukai, nagai, depiliacija, masažas, kūno priežiūra, SPA, burnos priežiūra, sportas, tatuiruotės ir kitos platformos temos.');
 }
 if(name==='import-media.mjs'){
  text=text.replaceAll('All 30','All 60').replace('prompt:p.prompt','prompt:p.actualPrompt||p.prompt');
  text=text.replace("if(!p.originalPath)throw Error('Original missing');","if(!p.originalPath||p.originalPixelReview?.state!=='PASS_ORIGINAL_PIXELS'||p.originalPixelReview.sha256!==p.originalSha256)throw Error('Actual original review missing '+p.planId);");
  text=text.replace(/p.pixelReview='All 30[^;]+;/,"p.pixelReview=p.originalPixelReview.observation;").replace('30 responsive media','60 responsive media');
 }
 await fs.writeFile(new URL(name,here),text);
}
const planFile=new URL('MEDIA-PLAN.json',here),plan=JSON.parse(await fs.readFile(planFile,'utf8'));
plan[0].actualPrompt='Use case: photorealistic-natural original editorial photograph for a Lithuanian guide about choosing an ear piercing. Subject and environment: tight side-profile portrait of an adult woman with a small simple healed silver earlobe stud and short black hair, cobalt wall, soft side daylight, ordinary skin texture, no active piercing. Landscape 3:2 aspect ratio, main ear and simple jewellery safely within central mobile crop. Restrained realistic magazine photography. This is a fictional thematic illustration, never a real provider/client/expert testimonial or healing result. No text, letters, numbers, logos, watermark, UI, generator badge, collages, fake anatomical diagrams, credentials, unsafe tool contact, active invasive treatment, exaggerated skin smoothing, or intimate nudity. One original image. Save the generated image.';
plan[59].alt='Vyras konsultacijoje aptaria dilbio zonos apimtį';
await fs.writeFile(planFile,JSON.stringify(plan,null,2)+'\n');
console.log('Own60 helper adaptation only; tenant not changed.');
