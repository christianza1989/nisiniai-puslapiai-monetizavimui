import http from 'node:http';
import {candidate,seedPublicFixture,origin} from './candidate.mjs';
const f=await candidate(),fixture=await seedPublicFixture(f),port=8951;
const server=http.createServer(async(req,res)=>{try{if(req.url.startsWith('/api/')){res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:{message:'Controlled API failure; local acceptance only'}}));}const r=await f.mf.dispatchFetch(origin+req.url);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch{res.writeHead(500);res.end('Local fixture failed');}});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({preview:'http://127.0.0.1:'+port,profile:'/salonai/'+fixture.org.id,isolated:true,apiBlocked:true})));
server.on('close',()=>f.close());
