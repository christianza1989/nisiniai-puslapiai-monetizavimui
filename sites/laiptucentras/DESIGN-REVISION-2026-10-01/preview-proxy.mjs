import {createServer,request} from 'node:http';
// Read-only canonical-host bridge; no secrets, lead writes or SMTP.
createServer((req,res)=>{
 if(!['127.0.0.1:8899','localhost:8899'].includes(req.headers.host)){req.resume();res.writeHead(403);res.end();return;}
 if(req.url==='/ivykius'&&req.method==='POST'){req.resume();res.writeHead(204);res.end();return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){req.resume();res.writeHead(405);res.end();return;}
 const upstream=request({hostname:'127.0.0.1',port:8866,path:req.url,method:req.method,headers:{...req.headers,host:'laiptucentras.lt'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
 upstream.on('error',()=>{res.writeHead(502);res.end();});upstream.end();
}).listen(8899,'127.0.0.1',()=>console.log('Laiptų peržiūra http://127.0.0.1:8899; read-only canonical-host bridge.'));
