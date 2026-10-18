import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { collectRetainedAuthorRejections, buildGenerationPayload } from '../src/rewrite-pipeline/host-ports.mjs';
import { buildAuthorPrompt } from '../src/rewrite-pipeline/gemini-ui.mjs';
import { selectCapturedPages } from '../src/rewrite-pipeline/capture.mjs';

const captureRef = { path: 'fixture/actual-retained.json', sha256: 'a'.repeat(64) };
const rawRef = { path: 'fixture/whole-original.json', sha256: 'b'.repeat(64) };
const parser = (reason, extra = {}) => ({ attemptId: 'attempt-1', status: 'REJECTED', captureRef, rawRef, rejection: { pageId: 'piccolo', status: 'rejected', reason }, ...extra });
const review = (reason, extra = {}) => ({ candidateId: 'candidate-1', decision: 'rejected', reason, ...extra });
const record = () => ({ pageId: 'piccolo', status: 'RETRY', generationResults: [parser('Description is 161 UTF16; own description over 160 UTF16 or contains anchors')], candidates: [{ candidateId: 'candidate-1', attemptId: 'attempt-0', captureRef, candidate: { pageId: 'piccolo' } }], reviews: [review('Vieno komponento apkrovos nepriskirk visam vežimėliui.')] });

async function retainedFixture(t) {
  const parent=path.resolve(import.meta.dirname,'../tmp/rewrite-pipeline-prompt');await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(path.join(parent,'capture-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const spec={pageId:'piccolo',title:'PICCOLO vežimėliai',bodyParagraphCount:2,sourceReasonCount:1};
  const other={...spec,pageId:'other',title:'Kitas puslapis'};
  const link={url:'https://example.com/sku01',label:'Produkto kortelė'};
  const sources=[{...link,reason:'Dokumente pateikti konkretūs modelio duomenys.'}];
  const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const block=(tag,text,anchors=[])=>({tag,text,html:`<${tag}>${anchors.length?escape(text).replace(link.label,`<a href="${link.url}">${link.label}</a>`):escape(text)}</${tag}>`,anchors});
  const page=(s,marker)=>[block('h1',s.title),block('p',`${marker} ankstesnis aprašymas.`),
    block('p',`${marker} ankstesnė rišli pastraipa. Produkto kortelė.`,[link]),block('p',`${marker} antroji ankstesnė pastraipa.`),block('p','PRIVATE_SOURCE_JSON: '+JSON.stringify(sources))];
  const blocks=[...page(spec,'OWN_LITERAL'),...page(other,'OTHER_PAGE_PROSE')];
  const raw={at:'2026-10-18T10:00:00.000Z',url:'https://gemini.google.com/u/4/app/fixture',responseIndex:0,responseId:'retained-response',queryCount:1,responseCount:1,queries:[{text:'actual fixture prompt'}],stopControls:[],text:blocks.map(b=>b.text).join('\n\n'),html:blocks.map(b=>b.html).join(''),blocks,orderedAnchors:blocks.flatMap(b=>b.anchors)};
  const bytes=JSON.stringify(raw),file=path.join(directory,'raw.json');await writeFile(file,bytes);
  const ref={path:file,sha256:createHash('sha256').update(bytes).digest('hex')},selection={responseIndex:0,responseId:raw.responseId,pages:[spec,other]};
  const parsed=selectCapturedPages(raw,selection),own=record();
  own.generationResults[0].captureRef=ref;own.generationResults[0].rawRef=ref;
  own.candidates[0].captureRef=ref;own.candidates[0].candidate={...parsed.outcomes[0].candidate,pageId:spec.pageId,captureSelection:selection};
  const batch={batchId:'retry-piccolo-002',pages:[{pageId:spec.pageId,capturePage:spec}]};
  const authorTasks={piccolo:{readerJob:'Palyginti modelius.',paragraphCount:2,facts:['SKU01: 50 kg visam gaminiui.'],limits:['Nesumuoti komponentų apkrovų.'],sources:[{...link,documentRole:'individual product facts'}],links:[link]}};
  const examples=[{accepted:true,reference:'fixture/a',text:'Priimtas A.'},{accepted:true,reference:'fixture/b',text:'Priimtas B.'}];
  const pipeline={pages:[own,{...record(),pageId:'other',reviews:[review('DO_NOT_SEND_OTHER_PAGE')]}]};
  return {input:{batch,pipeline,authorTasks,examples,commonMistakes:['Išsaugok konkretaus modelio ribas.']},raw,bytes,file,own};
}

test('selects latest retained parser and latest own-candidate review rejection separately', () => {
  const own = record();
  own.generationResults.unshift(parser('OLD_PARSER'));
  own.generationResults.push(parser('UNKNOWN_NOT_A_CORRECTION', { status: 'UNKNOWN' }));
  own.reviews.unshift(review('OLD_REVIEW'));
  own.reviews.push(review('NO_CAPTURE', { candidateId: 'missing-candidate' }));
  const unrelated = { ...record(), pageId: 'unrelated', reviews: [review('UNRELATED_REVIEW')] };
  const result = collectRetainedAuthorRejections({ pageIds: ['piccolo'], records: [own, unrelated] });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(({ pageId, kind, status }) => ({ pageId, kind, status })), [{ pageId: 'piccolo', kind: 'parser', status: 'REJECTED' }, { pageId: 'piccolo', kind: 'review', status: 'rejected' }]);
  assert.equal(result[0].reason, own.generationResults[1].rejection.reason);
  assert.equal(result[1].reason, own.reviews[1].reason);
  assert.deepEqual(result[0].rawRef, rawRef);
  assert.doesNotMatch(JSON.stringify(result), /OLD_PARSER|OLD_REVIEW|UNKNOWN_NOT_A_CORRECTION|UNRELATED_REVIEW|NO_CAPTURE/);
});

test('UNKNOWN records, another page capture, absent pins and unobserved candidate outcomes never supply corrections', () => {
  const unknown = { ...record(), status: 'UNKNOWN' };
  assert.deepEqual(collectRetainedAuthorRejections({ pageIds: ['piccolo'], records: [unknown] }), []);
  for (const mutate of [
    r => { r.generationResults[0].captureRef = null; r.candidates[0].captureRef = null; },
    r => { r.generationResults[0].rejection.pageId = 'other'; r.candidates[0].candidate.pageId = 'other'; },
    r => { r.generationResults[0].status = 'UNKNOWN'; r.generationResults.push({ attemptId: 'attempt-0', status: 'UNKNOWN', captureRef }); },
  ]) {
    const r = record(); mutate(r);
    assert.deepEqual(collectRetainedAuthorRejections({ pageIds: ['piccolo'], records: [r] }), []);
  }
});

test('actual GEMINI_GENERATE repair contains verified own literal original and links without cross-page prose', async t => {
  const fixture=await retainedFixture(t),{batch,pipeline,authorTasks,examples,commonMistakes}=fixture.input;
  const before = JSON.stringify({ pipeline, authorTasks });
  const payload = await buildGenerationPayload(fixture.input);
  assert.equal(payload.batchId, batch.batchId);
  assert.deepEqual(payload.pages, batch.pages.map(p => p.capturePage));
  assert.ok(payload.prompt.includes('Description is 161 UTF16; own description over 160 UTF16 or contains anchors'));
  assert.ok(payload.prompt.includes('Vieno komponento apkrovos nepriskirk visam vežimėliui.'));
  assert.ok(payload.prompt.includes('SKU01: 50 kg visam gaminiui.'));
  assert.ok(payload.prompt.includes('tikras Markdown [label](URL)'));
  assert.ok(payload.prompt.includes('Kontaktų ir kitų promedical.lt nuorodų į PRIVATE_SOURCE_JSON neįtrauk'));
  const jobs = JSON.parse(payload.prompt.split('KONKREČIOS UŽDUOTYS:\n')[1].split('\n\nPrieš grąžindamas')[0]);
  assert.equal(jobs[0].sourceReasonCount, authorTasks.piccolo.sources.length);
  assert.doesNotMatch(payload.prompt, /DO_NOT_SEND_OTHER_PAGE/);
  assert.doesNotMatch(payload.prompt,/OTHER_PAGE_PROSE/);
  const baseline=payload.previousRejections.find(r=>r.kind==='review').priorActual;
  const actual=fixture.own.candidates[0].candidate;
  assert.deepEqual(baseline.original,actual.original);assert.deepEqual(baseline.orderedBodyLinks,actual.orderedBodyLinks);
  assert.deepEqual(baseline.slice,actual.slice);assert.equal(baseline.responseId,actual.responseId);assert.equal(baseline.candidateId,'candidate-1');
  for(const text of [actual.original.title,actual.original.description,...actual.original.body,actual.original.sourceItems[0].reason])assert.ok(payload.prompt.includes(text));
  assert.ok(payload.prompt.includes('už šių taisymų ribų išsaugok visas ankstesnes'));
  assert.ok(payload.prompt.includes('Grąžink visą pilną naują puslapio versiją'));
  assert.equal(payload.previousRejections.find(r=>r.kind==='parser').priorActual,undefined);
  assert.equal(payload.prompt, buildAuthorPrompt({ batchId: batch.batchId, pages: [{ ...authorTasks.piccolo, id: 'piccolo', h1: 'PICCOLO vežimėliai' }], examples, commonMistakes, previousRejections: payload.previousRejections }), 'the exact returned bridge prompt includes the same selected correction records');
  assert.equal(JSON.stringify({ pipeline, authorTasks }), before, 'retained capture/review/original facts are immutable');
  assert.equal(await readFile(fixture.file,'utf8'),fixture.bytes);
});

test('tampered capture, candidate words, link order or response identity fail before payload can be sent', async t => {
  const fixture=await retainedFixture(t);
  for(const mutate of [
    input=>{input.pipeline.pages[0].candidates[0].captureRef.sha256='0'.repeat(64);},
    input=>{input.pipeline.pages[0].candidates[0].candidate.original.body[0]+=' Invented fact.';},
    input=>{input.pipeline.pages[0].candidates[0].candidate.orderedBodyLinks[0].label='Altered label';},
    input=>{input.pipeline.pages[0].candidates[0].candidate.slice.startUtf16++;},
    input=>{input.pipeline.pages[0].candidates[0].candidate.responseId='another-response';},
    input=>{input.pipeline.pages[0].candidates[0].candidate.captureSelection.pages[0].pageId='other';},
  ]){const input=structuredClone(fixture.input);mutate(input);await assert.rejects(buildGenerationPayload(input));}
});

test('parser-only rejection retains structural notes without fabricating a previous candidate',async t=>{
  const fixture=await retainedFixture(t);fixture.own.candidates=[];fixture.own.reviews=[];
  const payload=await buildGenerationPayload(fixture.input);
  assert.equal(payload.previousRejections.length,1);assert.equal(payload.previousRejections[0].kind,'parser');
  assert.equal(payload.previousRejections[0].priorActual,undefined);assert.doesNotMatch(payload.prompt,/OWN_LITERAL|OTHER_PAGE_PROSE|už šių taisymų ribų/);
});
