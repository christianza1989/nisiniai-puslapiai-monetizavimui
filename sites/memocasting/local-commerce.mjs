// Local storefront harness; imports the shared commerce implementation unchanged.
// No payment simulation is exposed to the browser. Never deploy this entrypoint.
import {createServer} from 'node:http';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {NodeDatabase} from '../../commerce-core/src/node-db.mjs';
import {CommerceService} from '../../commerce-core/src/service.mjs';
import {createHandler} from '../../commerce-core/src/http.mjs';
const port=8797, host=`127.0.0.1:${port}`;
mkdirSync(new URL('./runtime/',import.meta.url),{recursive:true});
const db=new NodeDatabase(fileURLToPath(new URL('./runtime/storefront.sqlite',import.meta.url)));db.migrate();
const service=new CommerceService(db);
if(!await service.one('SELECT id FROM stores WHERE id=?','memocasting_local')) await service.provisionStore({
  id:'memocasting_local',environment:'sandbox',enabled:true,testOnly:true,requireCustomer:true,
  legalEntityId:'memo_local_entity',legalSnapshot:{name:'MB Memocasting — local fixture'},
  hosts:[host],paymentAccountRef:'memo_unconnected_sandbox',
  markets:[{country:'LT',currency:'EUR',policyVersion:'local_fixture_v1',delivery:[{id:'fixture_courier',amount:450,label:'Testinis kurjeris (ne komercinis tarifas)'}]}],
  checkout:{successUrl:`http://${host}/success`,cancelUrl:`http://${host}/cart`}
},[
  {sku:'couple',title:'Rankų liejimo rinkinys porai',stock:8,prices:{LT:3200},package:{weightGrams:2000,dimensionsMm:[200,200,170]}},
  {sku:'couple_white',title:'Rinkinys porai su baltais dažais',stock:8,prices:{LT:3500},package:{weightGrams:2000,dimensionsMm:[200,200,170]}},
  {sku:'family',title:'Rankų liejimo rinkinys šeimai',stock:8,prices:{LT:4800},package:{weightGrams:4000,dimensionsMm:[250,250,200]}}
]);
const handler=createHandler({service,environment:'sandbox'});
createServer(async(req,res)=>{
 try{
  if(req.headers.host!==host){res.writeHead(404);res.end();return;}
  const chunks=[];let size=0;
  for await(const c of req){size+=c.length;if(size>65536){res.writeHead(413);res.end();return;}chunks.push(c);}
  const response=await handler(new Request(`http://${host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local adapter error');}
}).listen(port,'127.0.0.1',()=>console.log(`Memocasting isolated shared-commerce fixture: http://${host}. Payment/shipping adapters OFF.`));
