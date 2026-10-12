// Dedicated 0.7 browser integration fixture. Does not alter 8795/8797 or their DBs.
import {createServer} from 'node:http';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {NodeDatabase} from '../../commerce-core/src/node-db.mjs';
import {NodePrivateStorage} from '../../commerce-core/src/node-private-storage.mjs';
import {CommerceService} from '../../commerce-core/src/service.mjs';
import {createHandler} from '../../commerce-core/src/http.mjs';
const port=8827,host=`127.0.0.1:${port}`,runtime=new URL('./runtime/commerce-07-8827/',import.meta.url);
mkdirSync(runtime,{recursive:true});const db=new NodeDatabase(fileURLToPath(new URL('store.sqlite',runtime)));db.migrate();
const service=new CommerceService(db),countries=['LT','PL','LV','EE'];
if(!await service.one('SELECT id FROM stores WHERE id=?','memocasting_local_07_8827'))await service.provisionStore({id:'memocasting_local_07_8827',environment:'sandbox',enabled:true,testOnly:true,requireCustomer:true,legalEntityId:'memo_07_fixture',legalSnapshot:{name:'MB Memocasting — local integration fixture'},hosts:[host],paymentAccountRef:'memo_07_unconnected',markets:countries.map(country=>({country,currency:'EUR',policyVersion:'memo_07_fixture_v1',delivery:[{id:'fixture_courier',amount:450,label:'Fixture courier — not a commercial tariff'}]})),checkout:{successUrl:`http://${host}/success`,cancelUrl:`http://${host}/cart`}},[
 {sku:'couple',title:'Rankų liejimo rinkinys porai',stock:12,prices:Object.fromEntries(countries.map(c=>[c,3200])),package:{weightGrams:2000,dimensionsMm:[200,200,170]}},
 {sku:'family',title:'Rankų liejimo rinkinys šeimai',stock:12,prices:Object.fromEntries(countries.map(c=>[c,4800])),package:{weightGrams:4000,dimensionsMm:[250,250,200]}}
]);
// Unmeasured extras are omitted from this fixture; never invent their parcel data.
const handler=createHandler({service,environment:'sandbox',privateStorage:new NodePrivateStorage(fileURLToPath(new URL('private-files/',runtime))),loadDocumentFont:async()=>readFileSync(new URL('../../commerce-core/public/fonts/NotoSans-Regular.ttf',import.meta.url))});
createServer(async(req,res)=>{try{if(req.headers.host!==host){res.writeHead(404);res.end();return;}let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end();return;}chunks.push(chunk);}const response=await handler(new Request(`http://${host}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local integration failure');}}).listen(port,'127.0.0.1',()=>console.log(`Memocasting 0.7 isolated browser fixture http://${host}; all providers OFF; base parcels only.`));
