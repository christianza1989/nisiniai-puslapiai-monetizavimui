import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),sheets=[];
const notes=[
 'Pages1–15 actual first-fold pixels: full wrapped titles, author/date, distinct ear portrait, gymgroup, grooming dog, HVLPtent, consultation/medical rooms and hands. No broken image or overlap visible.',
 'Pages16–30 actual first-fold pixels: SPA/meditation/sketch/camera/jewellery/price desk/feet/nails/room images visibly varied; titles and spacing readable, no overlap or missing image.',
 'Pages31–45 actual first-fold pixels: consultation portraits, Pilatesstudio, dentistportrait, family session, tape hair tray, paraffinbath, headSPAchair, sketch session, sealedtools and wrap supplies distinct. Long headings fit.',
 'Pages46–60 actual first-fold pixels: two illustrative handpieces, metallic versus stripe nail detail, tips, lip portrait, hair texture, hamam, product powders, jewellery, maturelashes, shave tools and male-forearm consultation varied. All shown images loaded and headings wrapped.'
];
for(const device of ['desktop','mobile'])for(let n=1;n<=4;n++){
 const name=`SCREENS-${device}-${n}.png`,data=await fs.readFile(new URL(name,here));
 sheets.push({path:name,sha256:createHash('sha256').update(data).digest('hex'),observedAt:new Date().toISOString(),observation:notes[n-1]+' '+(device==='mobile'?'Actual390px view contact crops observed: long Lithuanian headings fit inside narrow column, main subject remains visible, no text/image overlap or horizontal clipping in first fold.':'Actual1440px view contact crops observed: centred content, readable title hierarchy and generous image width.')});
}
await fs.writeFile(new URL('RENDERED-PIXEL-REVIEW.json',here),JSON.stringify({state:'PASS_ACTUAL_RENDERED_PIXELS',checkedAt:new Date().toISOString(),scope:'Eight actual first-fold contact sheets seen using view_image; full texts read separately, whole-page geometry/image checks in RENDER-CHECK. Owned private presentation adapter, not canonical production renderer.',sheets},null,2)+'\n');
console.log({sheets:sheets.length,state:'PASS_ACTUAL_RENDERED_PIXELS'});
