import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getSite,saveResponsiveAsset,editPage} from '../src/model.mjs';
const inputs=[
  {
    "key": "hero",
    "file": "exec-a8de6131-0878-42f1-ac54-d94fa498b358.png",
    "alt": "Šviesus iliustracinis kambarys su dviem lininio atspalvio roletais",
    "slug": "",
    "prompt": "Create a beautiful original architectural interior editorial photograph-like illustration, ultra-wide landscape 3:2 crop. A lived-in quiet modern Baltic apartment living/dining room, soft oatmeal walls, pale oak table, a low ivory sofa, a small understated branch in a ceramic vase. The central subject is a wide clean window fitted with two REALISTIC warm linen-colored fabric ROLLER BLINDS, partly lowered, flat continuous fabric panels, thin subtle bottom bars, discreet enclosed roller at the top. Gentle afternoon daylight filtered through fabric, clearly visible fine textile texture. No wooden/slatted blinds, no Roman folds, no zebra stripes in this hero. A neutral blurred leafy courtyard outside, no recognizable city or landmark. Broad horizontal composition and natural shadow shape, tactile, refined, inviting without luxury excess. No people, no brand logos, no typography, no visible loose cords or loops, no photorealistic customer documentation claims. Keep window and blinds readable in a central mobile crop. This is an illustrative interior for a roller blind selection information site, not a real installation or stocked product."
  },
  {
    "key": "choice",
    "file": "exec-9010008e-2e1d-4c3f-a2ee-d3ce306f3f7a.png",
    "alt": "Skirtingo tankumo audinio pavyzdžiai prie lango rėmo ir roleto apatinės juostos",
    "slug": "gidai/roletu-pasirinkimas",
    "prompt": "Original editorial still-life photograph-like illustration for an article about CHOOSING roller blind fabric and construction. Landscape 3:2. Close tactile warm linen and pale gray roller-blind fabric swatches laid across an oak worktop next to a modern white window frame section and a discreet realistic roller-blind bottom rail. Several small unbranded samples, continuous woven fabric rather than curtains. Soft natural light from left revealing different fabric densities, plenty of quiet negative space. No people, no logos, no text, no invented measurements, no hand drawn arrows, no cord loops. Oatmeal, warm ink, wood and soft stone palette. Useful subject-specific composition: fabric is separate from the window's construction. It is a generated illustration, not a customer project or product for sale."
  },
  {
    "key": "light",
    "file": "exec-b0266419-df85-4468-9aa2-93dbbb910b36.png",
    "alt": "Diena–naktis roleto tankios ir permatomos juostos prie miegamojo lango",
    "slug": "gidai/sviesa-ir-privatumas",
    "prompt": "Original editorial photograph-like illustration for a roller blind article about DAY-NIGHT FABRIC versus room darkening. Landscape 3:2. One clean close medium view of a modern neutral bedroom window fitted with an accurately plausible unbranded zebra/day-night roller blind: two continuous parallel fabric layers alternating horizontal opaque warm ivory woven stripes with fine transparent mesh stripes, in a partly aligned light-filtering position. Clearly visible doubled fabric layers at lower bar, subtle enclosing top cassette. Soft daylight outside, warm cream wall and edge of linen bed at bottom, no recognisable locality. The illustration teaches that stripe alignment controls light; do not show a fake split day/night time scene or claim perfect darkness. No text, numbers, branding, arrows, dangling cord loops or humans. Tactile materials and quiet editorial composition matching oatmeal/tobacco interiors. Generated illustrative system, not customer work or stock."
  },
  {
    "key": "measure",
    "file": "exec-593252b0-5e9d-42c4-9282-3f3d56c8efff.png",
    "alt": "Lango rėmas ir rankena, ant palangės užrašų lapas ir susukta matavimo juosta",
    "slug": "gidai/matmenys-uzklausai",
    "prompt": "Original editorial photograph-like illustration for a practical guide 'What to measure before a roller blind enquiry'. Landscape 3:2 close medium view of a clean white tilt-and-turn apartment window with a clearly visible white handle and realistic frame/sash/glass borders. A partly lowered unbranded warm ivory fabric roller blind at the top. A plain orange tape-measure housing lies on the pale oak windowsill with the metal tape retracted, a simple unmarked notebook and pencil beside it. NO measurement numbers, no diagrams/arrows, no hands or people, no text/logos, no dangling loop cords. The image visually establishes frame versus glass and preparing notes, not a precise technical installation instruction. Soft daylight, neutral blurred exterior, warm oatmeal palette, clean architectural photography with tactile materials. Important central frame and handle visible in mobile crop. Generated illustrative window, not a customer site or product sold."
  },
  {
    "key": "quote",
    "file": "exec-173b496e-6fc2-4aba-a0ff-6c8fe7f54b5b.png",
    "alt": "Audinių ir kasetės pavyzdžiai šalia tuščių pasiūlymo apimties lapų",
    "slug": "gidai/pasiulymu-palyginimas",
    "prompt": "Original quiet editorial still-life photograph-like illustration for a guide about comparing roller blind quotes fairly. Landscape 3:2. On a warm pale oak table beside a soft daylight window: three distinctly textured unbranded roller blind fabric samples in ivory, warm gray and muted tobacco, one realistic small white roller-blind cassette sample, a pencil and two entirely blank cream paper sheets with no numbers or readable printing. Arrangement thoughtfully separates fabric choice and mechanism from paper scope notes, beautiful natural soft shadow. No humans, brands, money, calculator screens, logos, prices or typography. The image communicates specifying like-for-like components, does not imply our stock or an actual quote. Refined tactile material photography, oatmeal palette matching a warm architectural interiors journal, important items in central mobile crop."
  }
];
const folder='C:/Users/Lenovo/.codex/generated_images/01a1161b-c5e5-78e3-8b39-dd2b3dbfff3d/';
const manifest=[];
for(const input of inputs){
 const bytes=await readFile(folder+input.file);
 const asset=await saveResponsiveAsset('roletaiklaipedoje',{mime:'image/png',alt:input.alt,rights:'Originali šio projekto ImageGen iliustracija, 2026-10-07. Ne klientų projektas ar parduodamas gaminys.',prompt:input.prompt,credit:''},bytes);
 if(input.slug){const page=(await getSite('roletaiklaipedoje')).pages.find(p=>p.slug===input.slug);await editPage('roletaiklaipedoje',page.id,{media:[{id:asset.id}]});}
 manifest.push({...input,tool:'image_gen.imagegen',model:'not disclosed by tool',sourceSha256:createHash('sha256').update(bytes).digest('hex'),assetId:asset.id,variants:asset.variants.map(({id,src,width,height,bytes,sha256})=>({id,src,width,height,bytes,sha256})),optimization:asset.optimization,review:'Actual generated pixels viewed by root. Subject and source-original isolation retained; final CSS crops still require rendered verification.'});
}
await writeFile(new URL('../../sites/roletaiklaipedoje/MEDIA_PROVENANCE.json',import.meta.url),JSON.stringify(manifest,null,2));
await mkdir(new URL('../output/roletai-concepts/',import.meta.url),{recursive:true});
await copyFile(folder+'exec-c09b49fa-cc1a-40bb-9bf8-5971e2c4f193.png',new URL('../output/roletai-concepts/directions.png',import.meta.url));
console.log(JSON.stringify(manifest.map(m=>({key:m.key,assetId:m.assetId,optimization:m.optimization}))));
