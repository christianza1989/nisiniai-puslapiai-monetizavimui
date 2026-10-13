import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const output=new URL('./output/',import.meta.url);await mkdir(new URL('_private/',output),{recursive:true});
const version='v7.1.1',files=['src/Exception.php','src/PHPMailer.php','src/SMTP.php','LICENSE','COMMITMENT'];
const lock=JSON.parse(await readFile(new URL('DEPENDENCY.json',import.meta.url),'utf8'));
if(lock.version!==version)throw Error('Reviewed PHPMailer version mismatch');
for(const file of files){const url=`https://raw.githubusercontent.com/PHPMailer/PHPMailer/${version}/${file}`;const response=await fetch(url);if(!response.ok)throw Error('PHPMailer source unavailable');const bytes=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==lock.hashes[file])throw Error('Reviewed PHPMailer source changed: '+file);await writeFile(new URL('_private/'+file.split('/').at(-1),output),bytes);}
await copyFile(new URL('private.htaccess',import.meta.url),new URL('_private/.htaccess',output));
for(const file of ['relay.php','index.php'])await copyFile(new URL(file,import.meta.url),new URL(file,output));
await writeFile(new URL('_private/protection-probe.txt',output),'private protection probe');
console.log('Prepared credential-free relay and pinned PHPMailer sources.');
