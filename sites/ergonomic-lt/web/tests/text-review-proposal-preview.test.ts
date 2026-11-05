import test from 'node:test';
import assert from 'node:assert/strict';
import {displayedReviewText,textReviewProposalPreview} from '../src/lib/text-review-state';
import type {TextEdit} from '../src/lib/text-review-types';

test('Unapproved proposals are displayed only in the explicitly enabled text-review site',()=>{
 const priorFlag=process.env.TEXT_REVIEW_PROPOSALS,priorOrigin=process.env.PUBLIC_ORIGIN;
 const def={sourceHash:'current',suggested:'Paruoštas lietuviškas pasiūlymas'};
 const edit:TextEdit={key:'term',source_hash:'current',draft:'Pataisytas juodraštis',state:'draft',revision:1,published:'Anksčiau paskelbta',published_hash:'current',updated_at:'2026-11-05'};
 try{
  process.env.TEXT_REVIEW_PROPOSALS='true';
  process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';
  assert(textReviewProposalPreview());
  assert.equal(displayedReviewText(def,undefined,'Senas tekstas'),def.suggested);
  assert.equal(displayedReviewText(def,edit,'Senas tekstas'),edit.draft);
  assert.equal(edit.state,'draft');
  assert.equal(displayedReviewText(def,{...edit,source_hash:'old'},'Senas tekstas'),def.suggested);
  assert.equal(displayedReviewText(def,{...edit,state:'kept'},'Paliktas tekstas'),'Paliktas tekstas');
  process.env.PUBLIC_ORIGIN='https://ergonomic.lt';
  assert(!textReviewProposalPreview());
  assert.equal(displayedReviewText(def,edit,'Senas tekstas'),edit.published);
  assert.equal(displayedReviewText(def,undefined,'Senas tekstas'),'Senas tekstas');
  process.env.PUBLIC_ORIGIN='https://ergonomic-text-review.pinet-azprekyba.workers.dev';
  delete process.env.TEXT_REVIEW_PROPOSALS;
  assert(!textReviewProposalPreview());
  assert.equal(displayedReviewText(def,edit,'Senas tekstas'),edit.published);
 }finally{
  if(priorFlag===undefined)delete process.env.TEXT_REVIEW_PROPOSALS;else process.env.TEXT_REVIEW_PROPOSALS=priorFlag;
  if(priorOrigin===undefined)delete process.env.PUBLIC_ORIGIN;else process.env.PUBLIC_ORIGIN=priorOrigin;
 }
});
