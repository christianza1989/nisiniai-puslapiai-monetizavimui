import {createServer,request} from 'node:http';
createServer((req,res)=>{
 if(req.url==='/ivykius'&&req.method==='POST'){req.resume();res.writeHead(204);res.end();return;}
 if(!['GET','HEAD'].includes(req.method)){req.resume();res.writeHead(405);res.end();return;}
 const r=request({hostname:'127.0.0.1',port:8793,path:req.url,method:req.method,headers:{...req.headers,host:'miniekskavatoriai.lt'}},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});r.on('error',()=>{res.writeHead(502);res.end()});r.end();
}).listen(8794,'127.0.0.1',()=>console.log('Canonical GET-only lab bridge 8794; no leads or measured events accepted.'));
