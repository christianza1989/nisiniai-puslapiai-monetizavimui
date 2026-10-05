import {readFile,writeFile,copyFile} from 'node:fs/promises';
const core='C:/Users/lenovo/Documents/dovanos-memorycasting',stem='/components/niche/laiptucentras-site';
let code=await readFile(core+stem+'.tsx','utf8');
const edits=[
 ['function GuideList({livePages}:{livePages:NichePage[]}){return','function GuideList({livePages,headingLevel=3}:{livePages:NichePage[];headingLevel?:2|3}){const Heading=headingLevel===2?"h2":"h3";return'],
 ['<h3><a href={nichePagePath(p)}>{p.title}</a></h3>','<Heading><a href={nichePagePath(p)}>{p.title}</a></Heading>'],
 ['<GuideList livePages={livePages}/></section>:<div','<GuideList livePages={livePages} headingLevel={2}/></section>:<div'],
 ['const result:{title:string;blocks:NicheBlock[]}[]=[];for(const b of body){if(b.type===\'heading\'&&b.level===2)result.push({title:b.text,blocks:[b]});','const result:{title:string;blocks:NicheBlock[];offset:number}[]=[];for(const [i,b] of body.entries()){if(b.type===\'heading\'&&b.level===2)result.push({title:b.text,blocks:[b],offset:i});'],
 ...[0,1,2].map(i=>[`blocks={sections[${i}]?.blocks??[]}`,`blocks={sections[${i}]?.blocks??[]} offset={sections[${i}]?.offset??0}`])
 ];
for(const [from,to] of edits){if(!code.includes(from))throw Error('Missing expected renderer text: '+from);code=code.replace(from,to);}
await writeFile(core+stem+'.tsx',code);
let css=await readFile(core+stem+'.module.css','utf8');css=css.replaceAll('font-size:14px','font-size:15px').replaceAll('.guideGrid h3','.guideGrid :is(h2,h3)');
await writeFile(core+stem+'.module.css',css);
for(const ext of ['.tsx','.module.css'])await copyFile(core+stem+ext,core+'/output/laiptucentras-production'+stem+ext);
console.log('Repaired duplicate section IDs, index headings and utility type. No approved copy changed.');
