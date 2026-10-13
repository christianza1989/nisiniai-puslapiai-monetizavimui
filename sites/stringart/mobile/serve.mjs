import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const page=()=>readFileSync(path.join(root,'output','MemoryString.html'));
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(req.method!=='GET'||!['/','/MemoryString.html'].includes(url.pathname)){res.writeHead(404);res.end('Not found');return;}let html=page().toString('utf8');const qa=url.searchParams.get('qa');if(qa==='text200')html=html.replace('</head>','<style>html{font-size:200%!important}</style></head>');if(qa==='spacing')html=html.replace('</head>','<style>*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}</style></head>');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob: data:; worker-src blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(html);});
server.listen(Number(process.env.MEMORYSTRING_PORT||4318),'127.0.0.1',()=>console.log('MemoryString Local: http://127.0.0.1:4318'));
process.on('SIGINT',()=>server.close(()=>process.exit()));
