import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const output=path.resolve(process.argv[2]||'../../output/signaturepads-migration-20261029/editorial');
const sources=[
 ['stepover-esignatureoffice','https://stepover.com/en/products/software/esignatureoffice/'],
 ['signoapi-java','https://docs.signotec.com/en/signoapi-java-windows-linux/latest'],
 ['signoapi-java-interface','https://docs.signotec.com/en/signoapi-java-windows-linux/latest/signoapi-java-interface-description'],
 ['signoapi-java-requirements','https://docs.signotec.com/en/signoapi-java-windows-linux/latest/signoapi-java-system-requirements'],
 ['signoapi-windows','https://docs.signotec.com/en/signoapi-windows/latest'],
 ['signoapi-windows-components','https://docs.signotec.com/en/signoapi-windows/latest/notes-on-working-with-the-components'],
 ['signosign-universal-manual','https://docs.signotec.com/en/signosign-universal/latest'],
 ['adobe-plugin-manual','https://docs.signotec.com/en/adobe-acrobat-plugin/latest'],
 ['adobe-plugin-requirements','https://docs.signotec.com/en/adobe-acrobat-plugin/latest/systemvorraussetzungen'],
 ['adobe-plugin-signatures','https://docs.signotec.com/en/adobe-acrobat-plugin/latest/unterschriften-erfasssen'],
 ['signosign-pro-manual','https://docs.signotec.com/en/signosign2/latest/pro'],
 ['signosign-pro-comparison','https://docs.signotec.com/en/signosign2/latest/pro/lite-and-pro-version']
];
await mkdir(path.join(output,'sources'),{recursive:true});
const decode=text=>text.replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n)).replace(/&(nbsp|amp|quot|apos|lt|gt|ndash|mdash|rsquo|lsquo|rdquo|ldquo);/g,(_,n)=>({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“'}[n]));
const index=[];
for(const [id,url] of sources){
 let raw,finalUrl=url,retrievedAt,cached=false;
 try{raw=await readFile(path.join(output,'sources',id+'.html'));retrievedAt=(await stat(path.join(output,'sources',id+'.html'))).birthtime.toISOString();cached=true;}
 catch{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok){index.push({id,url,status:r.status,error:'public-source-unavailable'});continue;}raw=Buffer.from(await r.arrayBuffer());finalUrl=r.url;retrievedAt=new Date().toISOString();}
 const full=raw.toString('utf8');
 const main=full.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||full.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||full;
 const text=decode(main.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:p|h[1-6]|div|section|li|tr)>/gi,'\n').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[\t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 if(!cached)await writeFile(path.join(output,'sources',id+'.html'),raw);await writeFile(path.join(output,'sources',id+'.txt'),text);
 index.push({id,url,finalUrl,retrievedAt,status:200,rawSha256:createHash('sha256').update(raw).digest('hex'),textSha256:createHash('sha256').update(text).digest('hex'),bytes:raw.length,characters:text.length,rawArtifact:`sources/${id}.html`,textArtifact:`sources/${id}.txt`});
}
await writeFile(path.join(output,'sources-index.json'),JSON.stringify(index,null,2));
console.log(JSON.stringify(index.map(s=>({id:s.id,status:s.status,characters:s.characters})),null,2));
