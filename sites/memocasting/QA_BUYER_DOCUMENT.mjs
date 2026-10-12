// Synthetic sandbox-only payment/document source; no provider or SMTP calls.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {NodeDatabase} from '../../commerce-core/src/node-db.mjs';
import {CommerceService} from '../../commerce-core/src/service.mjs';
import {CommerceOperations} from '../../commerce-core/src/operations.mjs';
import {NodePrivateStorage} from '../../commerce-core/src/node-private-storage.mjs';
import {DocumentFiles} from '../../commerce-core/src/document-pdf.mjs';
import {fakeCheckout,payment} from '../../commerce-core/test/fixtures.mjs';
import {CommerceClient} from '../../../dovanos-memorycasting/vendor/commerce-core/commerce-client.mjs';
const store='memocasting_local_07_8827',environment='sandbox',runtime=new URL('./runtime/commerce-07-8827/',import.meta.url);
const db=new NodeDatabase(fileURLToPath(new URL('store.sqlite',runtime)));db.migrate();const service=new CommerceService(db);
try{
 const config=await service.store(store,environment);assert.equal(config.testOnly,true);assert.equal(config.environment,environment);assert.deepEqual(config.hosts,['127.0.0.1:8827']);
 const storageFile=new URL('buyer-document-client.private.json',runtime),storage=new Map(existsSync(storageFile)?JSON.parse(readFileSync(storageFile,'utf8')):[]),responses=[];
 const saveStorage=()=>writeFileSync(storageFile,JSON.stringify([...storage]),{mode:0o600});
 const client=new CommerceClient({storage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>{storage.set(key,value);saveStorage();},removeItem:key=>{storage.delete(key);saveStorage();}},fetchImpl:async(path,init)=>{
  assert.ok(path.startsWith('/api/'));const response=await fetch('http://127.0.0.1:8817/prekyba/'+path.slice(5),init);responses.push({path,status:response.status,cache:response.headers.get('cache-control'),type:response.headers.get('content-type'),csp:response.headers.get('content-security-policy')});return response;
 }});
 await client.initialize();assert.equal(client.context.storeId,store);assert.equal(client.context.productionReady,false);
 const input={country:'LT',currency:'EUR',deliveryId:'fixture_courier',lines:[{sku:'couple',quantity:1}],customer:{name:'Testinis Pirkėjas',email:'document-fixture@example.test',phone:'+37060000000',address:{country:'LT',line1:'Testinė g. 1',city:'Vilnius',postalCode:'01101'}}};
 let order=await client.resume();
 if(!order){const quote=await client.quote(input);order=await client.create({...input,quoteHash:quote.quoteHash,acceptedPolicyVersion:'memo_07_fixture_v1'});}
 const ready=await service.getOrder(store,environment,order.id);
 if(ready.payment_state==='pending'){await service.checkout(store,environment,order.id,fakeCheckout);const awaiting=await service.getOrder(store,environment,order.id);await service.acceptPayment(store,environment,{...payment(awaiting,store,'evt_buyer_doc_'+order.id),accountRef:config.paymentAccountRef});}
 const {document}=await new CommerceOperations(service).issueDocument(store,environment,order.id,{kind:'sale'},'fixture_document_qa');
 const files=new DocumentFiles(service,new NodePrivateStorage(fileURLToPath(new URL('private-files/',runtime))),async()=>new Uint8Array(await readFile(new URL('../../commerce-core/public/fonts/NotoSans-Regular.ttf',import.meta.url))));
 const file=await files.ensure(store,environment,document,'fixture_document_qa');
 const receipt=await client.receipt();assert.ok(receipt.documents.some(d=>d.id===document.id&&d.testOnly===true));
 const bytes=new Uint8Array(await (await client.document(document.id)).arrayBuffer());assert.ok(bytes.length>10000);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'%PDF');
 const firstHash=createHash('sha256').update(bytes).digest('hex'),again=new Uint8Array(await (await client.document(document.id)).arrayBuffer());assert.equal(createHash('sha256').update(again).digest('hex'),firstHash);
 const pdf=responses.filter(r=>r.type==='application/pdf');assert.equal(pdf.length,2);for(const r of pdf){assert.equal(r.status,200);assert.equal(r.cache,'no-store');assert.ok(r.csp.includes('sandbox'));}
 const unauthorized=await fetch('http://127.0.0.1:8817/prekyba/orders/'+order.id+'/documents/'+document.id);assert.equal(unauthorized.status,403);
 const report={state:'LOCAL_BUYER_PDF_GATEWAY_PASS',checkedAt:new Date().toISOString(),store,environment,orderId:order.id,documentId:document.id,fileId:file.id,pdfBytes:bytes.length,pdfSha256:firstHash,authorizedDownloads:2,unauthorizedStatus:unauthorized.status,realPayments:0,limits:['Payment/document source is an explicit internal fixture; no Stripe, money or mail','Only document delivery/hash/authorization are asserted; not statutory invoice or visual-template acceptance']};
 await mkdir(new URL('./qa/',import.meta.url),{recursive:true});await writeFile(new URL('./qa/buyer-document-gateway.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{db.close();}
