import {createServer,request} from 'node:http';
// GET-only canonical-host lab bridge. Browser UI remains on the actual 8786 preview.
createServer((req,res)=>{
 if(req.url==='/ivykius'&&req.method==='POST'){req.resume();res.writeHead(204);res.end();return;}
 if(req.method!=='GET'&&req.method!=='HEAD'){req.resume();res.writeHead(405);res.end();return;}
 const upstream=request({hostname:'127.0.0.1',port:8786,path:req.url,method:req.method,headers:{...req.headers,host:'laiptucentras.lt','user-agent':req.headers['user-agent']??'Lighthouse'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
 upstream.on('error',()=>{res.writeHead(502);res.end();});upstream.end();
}).listen(8896,'127.0.0.1',()=>console.log('Canonical GET-only Lighthouse bridge at http://127.0.0.1:8896'));
