import {test} from 'node:test';
import assert from 'node:assert/strict';
import {revisionHash} from '../src/model.mjs';
import {pageRevisionHash} from '../../../dovanos-memorycasting/scripts/content-package-core.mjs';
test('studio and public validator sign the same home projection contract while legacy approvals remain unchanged',()=>{
 const p={siteId:'fixture',type:'home',slug:'',title:'Home',description:'Actual home',intent:'Choose',body:[{type:'paragraph',text:'Canonical actual text'}],publishAt:'2026-10-01T00:00:00Z',media:[],links:[]};
 const old=revisionHash(p);assert.equal(old,pageRevisionHash(p));
 p.bodyProjection='canonical';assert.notEqual(revisionHash(p),old);assert.equal(revisionHash(p),pageRevisionHash(p));
});
