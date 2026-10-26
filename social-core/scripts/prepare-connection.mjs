// Local operator bridge. Accepts a private file, never a token in CLI arguments/output.
import fs from 'node:fs/promises';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {syncInstagram} from '../instagram.mjs';
const options={};for(let i=2;i<process.argv.length;i+=2){if(!['--token-file','--output','--username'].includes(process.argv[i])||!process.argv[i+1])throw Error('Expected --token-file private-file --output ignored-directory --username owned-handle');options[process.argv[i].slice(2)]=process.argv[i+1];}
if(!options['token-file']||!options.output||!options.username)throw Error('Missing private token file, output or username');
const output=path.resolve(options.output),probe=path.join(output,'connection.json');
if(spawnSync('git',['check-ignore','--quiet',probe],{windowsHide:true}).status!==0)throw Error('Output must be Git-ignored');
const text=(await fs.readFile(options['token-file'],'utf8')).trim();let token=text;if(text.startsWith('{'))token=JSON.parse(text).INSTAGRAM_SEED_TOKEN;
if(typeof token!=='string'||token.length<30)throw Error('Invalid private token input');
const store=new Map(),kv={get:async(key,type)=>store.has(key)?type==='json'?JSON.parse(store.get(key)):store.get(key):null,put:async(key,value)=>{store.set(key,value);},delete:async key=>{store.delete(key);}};
const result=await syncInstagram({INSTAGRAM_STATE:kv,INSTAGRAM_ENABLED:'1',INSTAGRAM_USERNAME:options.username,INSTAGRAM_API_VERSION:'v26.0',INSTAGRAM_SEED_TOKEN:token});
if(result.status!=='connected')throw Error('Real account acceptance failed: '+result.status);
await fs.mkdir(output,{recursive:true});for(const [key,value]of store)await fs.writeFile(path.join(output,key+'.json'),value,{mode:0o600,flag:'wx'});
const feed=JSON.parse(store.get('feed'));console.log(JSON.stringify({status:result.status,username:feed.username,posts:result.posts,types:[...new Set(feed.items.map(i=>i.type))],verifiedAt:new Date(feed.fetchedAt).toISOString()}));
