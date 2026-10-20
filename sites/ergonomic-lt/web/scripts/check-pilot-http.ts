import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pilotModels} from '../src/lib/configurator';

async function main(){
  const base='http://127.0.0.1:3002',results=[];
  for(const model of pilotModels){
    assert.equal((await fetch(base+model.path)).status,200);
    for(const variant of model.variants){
      const asset=await fetch(base+variant.asset),bytes=Buffer.from(await asset.arrayBuffer());
      assert.equal(asset.status,200);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),variant.assetSha256);
      const pdf=await fetch(base+'/api/produkto-kortele/?produktas='+model.productId+'&komplektacija='+variant.id);
      assert.equal(pdf.status,200);
      assert.match(pdf.headers.get('content-type')||'',/application\/pdf/);
      assert.match(pdf.headers.get('x-robots-tag')||'',/noindex/);
      assert.match(pdf.headers.get('content-disposition')||'',/attachment/);
      const card=Buffer.from(await pdf.arrayBuffer());assert.equal(card.subarray(0,5).toString(),'%PDF-');
      assert(card.length>10_000);
      results.push({model:model.name,variant:variant.id,glbBytes:bytes.length,sha256:true,pdfStatus:200,pdfBytes:card.length});
    }
  }
  assert.equal((await fetch(base+'/api/produkto-kortele/?produktas='+pilotModels[0].productId+'&komplektacija='+pilotModels[1].variants[0].id)).status,404);
  const db=new DatabaseSync('.runtime-configurator-qa/ergonomic.sqlite',{readOnly:true});
  const record=db.prepare('SELECT id,payload,delivery_status FROM quotes WHERE id LIKE ?').get('c532c80d%') as {id:string;payload:string;delivery_status:string};
  assert(record);const payload=JSON.parse(record.payload);
  assert.equal(payload.email,'3d-patikra@example.invalid');assert.equal(record.delivery_status,'awaiting_configuration');
  const expected=[{id:'23636151',qty:2},{id:'23664987',qty:3}];
  assert.equal(payload.items.length,2);
  for(const expectedItem of expected){
    const item=payload.items.find((i:any)=>i.configurationId===expectedItem.id);assert(item);
    const variant=pilotModels.flatMap(m=>m.variants).find(v=>v.id===expectedItem.id)!;
    assert.equal(item.quantity,expectedItem.qty);assert.equal(item.configurationName,variant.label);
    assert.equal(item.baseArticle,variant.supplierCode);assert.deepEqual(item.supplierOptions,variant.supplierOptions);
    assert.equal(item.configurationEvidence.modelSha256,variant.assetSha256);
    assert.equal(item.configurationEvidence.sourceCadSha256,variant.sourceCadSha256);
    assert.equal(item.configurationEvidence.image,variant.image);
  }
  db.close();
  const report={checkedAt:new Date().toISOString(),compiledStandalone:true,variants:results,
    crossProductPdf:404,browserQuote:{id:record.id,items:2,variantIds:expected.map(i=>i.id),quantities:expected.map(i=>i.qty),
      exactSourceCodes:true,modelAndCadHashes:true,deliveryStatus:record.delivery_status},
    independentStorage:'.runtime-configurator-qa',smtpDeliveryTested:false};
  writeFileSync('.impeccable/review/configurator/http-check.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({variants:results.length,pdfs:results.length,browserQuote:report.browserQuote},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
