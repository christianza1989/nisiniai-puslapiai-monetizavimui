import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {optimizeRaster} from '../../../content-studio/src/image-pipeline.mjs';
const prompt="Use case: photorealistic-natural. Asset type: Madbeauty website photographic hero background, not a website mockup. Create an original premium beauty editorial photograph, wide landscape. Two anatomically correct adult female hands resting loosely on a soft ivory towel, short oval nails painted glossy saturated violet #7040E8, a simple silver ring, realistic skin texture. Hands and manicure occupy the center-right two thirds, with clean softly out-of-focus ivory and very pale lilac space on the left third for a separate HTML headline. Soft daylight from left, precise nail highlights, natural quiet contemporary salon mood. Framing close-up, substantial crop room above and below. No face, no people in background, no lettering, no logos, no watermark, no UI, no border, no collage. This is illustrative photography for a private fictional platform demo, not a real salon or customer result. Match a modern black/white/violet visual identity.";
const original=await readFile(new URL('./private-originals/hero-violet-v1.png',import.meta.url));
const output=await optimizeRaster(original,'image/png');
const hash=b=>createHash('sha256').update(b).digest('hex');
const variants=[];
for(const v of output.variants){const file='images/hero-violet-'+v.width+'.webp';await writeFile(new URL('./public/'+file,import.meta.url),v.bytes);variants.push({file,width:v.width,height:v.height,bytes:v.bytes.length,sha256:hash(v.bytes)});}
const asset={id:'hero-violet',generator:'built-in ImageGen',prompt,alt:'Violetinis manikiūras ant šviesaus rankšluosčio',use:'private-demo/editorial-illustration',rights:'Original AI illustration; not a real client result or provider portfolio.',source:{file:'private-originals/hero-violet-v1.png',...output.source,bytes:original.length,sha256:hash(original)},variants,policy:output.policy,crop:{hero:'right center',mobile:'60% center'},review:'Sequential agent pixel review 2026-10-05: intact hands, correct violet identity, left copy area.'};
await writeFile(new URL('./public/app-media.json',import.meta.url),JSON.stringify({privateDemo:true,assets:[asset]},null,2)+'\n');
await writeFile(new URL('./IMPLEMENTATION_ASSET_MANIFEST.json',import.meta.url),JSON.stringify({date:'2026-10-05',assets:[asset]},null,2)+'\n');
console.log(JSON.stringify({newAssets:1,variants:variants.length,pipeline:output.policy}));
