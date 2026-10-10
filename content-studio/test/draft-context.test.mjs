import test from 'node:test';
import assert from 'node:assert/strict';
import {draftContext} from '../src/draft-context.mjs';
test('large catalogue drafts receive source graph and immutable approved facts, not unrelated inventory',()=>{
 const approved={id:'p1',type:'product',body:[{type:'paragraph',text:'Exact model load16kg'}],media:[{id:'a1'},{id:'a2'}],externalLinks:[{url:'https://manufacturer.test/p1'}],revisionHash:'old'};
 const requested={id:'g1',type:'guide',linkSuggestions:[{targetPageId:'p1'}],externalLinks:[],media:[]};
 const site={pages:[requested,{id:'g2',type:'guide'},{id:'p1',type:'product',body:[{text:'unapproved edit'}],publishedRevision:approved},...Array.from({length:1400},(_,i)=>({id:'other'+i,type:'product'}))],assets:[{id:'a1',groupId:'family',alt:'Model1'},{id:'a2',groupId:'family',alt:'Model1'},{id:'unrelated',alt:'Other'}]};
 const before=JSON.stringify(site);const c=draftContext(site,requested,[{siteId:'foreign',pageId:'remote'}]);
 assert.equal(c.pages.length,3);assert.equal(c.sourceSnapshots.length,1);assert.equal(c.sourceSnapshots[0].body[0].text,'Exact model load16kg');assert.equal(c.assets.length,1);assert.equal(c.network.length,0);assert.equal(c.coverage.totalPages,1403);
 c.sourceSnapshots[0].body[0].text='writer edit';assert.equal(JSON.stringify(site),before);
});
test('source URL and explicit remote targets retain exact identities without inventing new candidates',()=>{
 const page={id:'g',type:'article',externalLinks:[{url:'https://manufacturer.test/p'}],networkLinkSuggestions:[{targetSiteId:'approved-site',targetPageId:'target'}]};
 const s={pages:[page,{id:'p',type:'product',publishedRevision:{body:[],externalLinks:[{url:'https://manufacturer.test/p'}]}},{id:'q',type:'product',publishedRevision:{body:[],externalLinks:[{url:'https://manufacturer.test/other'}]}}],assets:[]};
 const c=draftContext(s,page,[{siteId:'approved-site',pageId:'target'},{siteId:'other',pageId:'target'}]);assert.equal(c.sourceSnapshots[0].id,'p');assert.equal(c.sourceSnapshots.length,1);assert.equal(c.network.length,1);assert.equal(c.network[0].siteId,'approved-site');
});
