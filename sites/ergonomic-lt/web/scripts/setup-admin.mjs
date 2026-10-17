import {randomBytes,scryptSync} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const envFile='.env.local';let env=existsSync(envFile)?readFileSync(envFile,'utf8'):readFileSync('.env.example','utf8');
if(/^ADMIN_PASSWORD_HASH=.+$/m.test(env)&&/^SESSION_SECRET=.+$/m.test(env)){console.log('Administratoriaus konfigūracija jau yra. Slaptažodis nekeistas.');process.exit(0);}
const password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
env=env.replace(/^ADMIN_PASSWORD_HASH=.*$/m,`ADMIN_PASSWORD_HASH=${salt}:${hash}`).replace(/^SESSION_SECRET=.*$/m,`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
writeFileSync(envFile,env,{mode:0o600});writeFileSync('.local-admin.txt',`Vietinis administravimas: http://127.0.0.1:3001/admin/\nSlaptažodis: ${password}\n\nLaikykite šį failą privačiai. Nesiųskite jo kartu su projekto archyvu.\n`,{mode:0o600});
console.log('Vietinis administratorius sukurtas. Prisijungimas privačiame faile .local-admin.txt.');
