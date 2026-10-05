import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(root,'public');
const modules=new Set(['config.mjs','demo-model.mjs','demo-adapter.mjs']);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
export function createKitServer(){
  const now=new Date().toISOString();
  return http.createServer(async(req,res)=>{
    const headers={'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'"};
    if(req.method!=='GET'){res.writeHead(405,headers);res.end();return;}
    try {
      const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if(requested==='/boot.json'){res.writeHead(200,{...headers,'Content-Type':mime['.json']});res.end(JSON.stringify({now,deployment:'local-preview',enabled:true}));return;}
      if(requested==='/robots.txt'){res.writeHead(200,{...headers,'Content-Type':mime['.txt']});res.end('User-agent: *\nDisallow: /\n');return;}
      const relative=requested==='/'?'index.html':requested.slice(1);
      const file=modules.has(relative)?path.join(root,relative):path.resolve(publicRoot,relative);
      if(!modules.has(relative)&&!file.startsWith(publicRoot+path.sep))throw Error('Outside public root');
      const type=mime[path.extname(file)];if(!type)throw Error('Not allowed');
      const body=await readFile(file);res.writeHead(200,{...headers,'Content-Type':type});res.end(body);
    } catch {res.writeHead(404,{...headers,'Content-Type':mime['.txt']});res.end('Not found');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.MADBEAUTY_KIT_PORT||8786);
  const server=createKitServer();server.listen(port,'127.0.0.1',()=>console.log('Private Madbeauty UI kit: http://127.0.0.1:'+port));
}
