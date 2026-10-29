import{readFile,writeFile,mkdir,access}from'node:fs/promises';
import{createHash}from'node:crypto';import path from'node:path';
const output=path.resolve(process.argv[2]||'../../output/signaturepads-migration-20261029/editorial');
const source=JSON.parse(await readFile('../niche-public-core/sites/signaturepads/migration/site-source.json','utf8'));
const templateFile='G:/My Drive/Web puslapiai/Visi verslai/Tekstu-Sistema-v2/sablonai/gemini-produktas.md';
const template=await readFile(templateFile,'utf8');const promptTemplate=template.split(/\r?\n---\r?\n/)[1].replace(/\r?\n---\s*$/,'').trim();
const sourceMap={7084:['stepover-esignatureoffice'],6867:['signoapi-java','signoapi-java-interface','signoapi-java-requirements'],6865:['signoapi-windows','signoapi-windows-components'],6863:['signosign-universal-manual'],6861:['adobe-plugin-manual','adobe-plugin-requirements','adobe-plugin-signatures'],6859:['signosign-pro-manual','signosign-pro-comparison']};
await mkdir(path.join(output,'prompts'),{recursive:true});await mkdir(path.join(output,'answers'),{recursive:true});
const queue=[];
for(const [id,ids]of Object.entries(sourceMap)){
 const product=source.products.find(p=>p.id===+id);const texts=[],missing=[];
 for(const s of ids){try{texts.push(await readFile(path.join(output,'sources',s+'.txt'),'utf8'));}catch{missing.push(s);}}
 if(missing.length){queue.push({id:+id,path:product.path,status:'source-pending',missing});continue;}
 const fields={'{domenas}':'signaturepads.lt','{prekės ženklas}':'signaturepads.lt','{kas kalba}':'parašo planšečių ir programinės įrangos katalogas','{modelis ir pavadinimas}':product.name,'{skaitytojas ir kokį sprendimą jis priima}':'įmonės IT specialistas arba dokumentų pasirašymo sprendimą besirenkantis darbuotojas, kuris lygina šios programinės įrangos paskirtį ir naudojimo aplinką','{frazė}':product.name.replace(/^Programinė įranga /,''),'{gamintojo tekstas}':texts.join('\n\n'),'{temos – trumpai}':'parašo planšetės; PDF dokumentų pasirašymas; programinė įranga'};
 let prompt=promptTemplate;for(const[key,value]of Object.entries(fields))if(key!=='{gamintojo tekstas}')prompt=prompt.replaceAll(key,value);const unresolved=[...prompt.matchAll(/\{[^}]+\}/g)].map(m=>m[0]).filter(p=>p!=='{gamintojo tekstas}');if(unresolved.length)throw Error('Unfilled template fields: '+unresolved.join(','));prompt=prompt.replace('{gamintojo tekstas}',fields['{gamintojo tekstas}']);
 const promptFile=path.join(output,'prompts',id+'.txt');await writeFile(promptFile,prompt);
 queue.push({id:+id,path:product.path,name:product.name,status:'ready',sourceIds:ids,promptFile,promptSha256:createHash('sha256').update(prompt).digest('hex'),templateSha256:createHash('sha256').update(template).digest('hex')});
}
await writeFile(path.join(output,'generation-queue.json'),JSON.stringify(queue,null,2));console.log(JSON.stringify(queue.map(q=>({id:q.id,status:q.status,missing:q.missing})),null,2));
