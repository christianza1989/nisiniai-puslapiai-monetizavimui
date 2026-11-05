import test from 'node:test';import assert from 'node:assert/strict';
import {customerConfigurationRevisionSource as revision} from '../src/lib/customer-configuration-revision';
import {customerCapabilities} from '../src/lib/customer-capability';
const family={id:'captured',productId:'one',baseArticle:'ARTICLE',sample:'old-example',articles:[{code:'ARTICLE',sample:'old-example'}],anchors:[{id:'anchor',sample:'old-example',choices:{mechanism:['one','two']},components:[{sha256:'original-geometry'}]}]};
test('prepared-catalog example aliases retain the captured configuration revision',()=>{
 const projected={...family,sample:'visible-example',articles:family.articles.map(a=>({...a,sample:'visible-example'}))};
 assert.deepEqual(revision(projected),revision(family));
 assert.deepEqual(revision(Object.fromEntries(Object.entries(projected).reverse())),revision(family));
});
test('actual option/geometry/model changes still invalidate the configuration; token stays bound to its example',()=>{
 for(const changed of [{...family,baseArticle:'OTHER'},{...family,productId:'other'},{...family,anchors:[{...family.anchors[0],choices:{mechanism:['one']}}]},{...family,anchors:[{...family.anchors[0],components:[{sha256:'changed'}]}]}])assert.notDeepEqual(revision(changed),revision(family));
 const cap=customerCapabilities('private-test-key-at-least-thirty-two-characters');
 assert.notEqual(cap.id('selection',{product:'one',sample:'a',revision:revision(family)}),cap.id('selection',{product:'one',sample:'b',revision:revision(family)}));
});
