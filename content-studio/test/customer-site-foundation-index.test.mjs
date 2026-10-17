// Pure synthetic package/renderer-membership checks: no HTTP, release, account or customer artifacts.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicCoreDirectory} from '../src/public-core.mjs';
import {foundationArticleIndex} from '../scripts/customer-site-foundation.mjs';

const publicCore=publicCoreDirectory();
process.env.STUDIO_PUBLIC_CORE_DIR=publicCore;
const {nativeFixture,approveFixture}=await import(pathToFileURL(path.join(publicCore,'tests/fixtures/native-niche-v2.mjs')).href);
const now=Date.parse('2029-01-01T00:00:00.000Z');
function fixture(){
  const pkg=nativeFixture(),guide=structuredClone(pkg.pages.find(page=>page.id==='current'));
  Object.assign(guide,{id:'standalone',slug:'sprendimas',title:'Atskiras sintetinis gidas'});
  pkg.pages.push(guide);
  const index=pkg.pages.find(page=>page.id==='index');
  index.body.push({type:'richParagraph',content:[{type:'link',text:guide.title,target:{kind:'page',pageId:guide.id}}]});
  approveFixture(pkg);
  return {pkg,ids:['home','index','current','standalone'],guide,index};
}
async function rejected(pkg,ids,code='foundation_article_index_unavailable'){
  const original=JSON.stringify(pkg);
  await assert.rejects(foundationArticleIndex(pkg,ids,now),error=>error.code===code);
  assert.equal(JSON.stringify(pkg),original,'rejection does not edit snapshots or approval');
}
test('required semantic hub covers a genuine guide outside its stable URL prefix',async()=>{
  const {pkg,ids,guide}=fixture(),original=JSON.stringify(pkg);
  assert.equal(guide.type,'guide');assert.equal(guide.slug,'sprendimas');
  assert.equal((await foundationArticleIndex(pkg,ids,now)).id,'index');
  assert.equal(JSON.stringify(pkg),original,'no URL/type/approval mutation');
});
test('ordinary nested guide and nearest eligible nested index retain their actual hub',async()=>{
  const {pkg,index,guide}=fixture();
  guide.slug='gidai/atsakymai/sprendimas';index.slug='gidai/atsakymai';
  approveFixture(pkg);
  assert.equal((await foundationArticleIndex(pkg,['home','index','standalone'],now)).id,'index');
});
test('missing index, unknown required identity and an omitted required hub remain blocked',async()=>{
  const {pkg,ids}=fixture();
  await rejected(pkg,ids.filter(id=>id!=='index'));
  await rejected(pkg,[...ids,'unknown-required-page']);
  const noIndex=structuredClone(pkg);noIndex.pages=noIndex.pages.filter(page=>page.id!=='index');approveFixture(noIndex);
  await rejected(noIndex,ids.filter(id=>id!=='index'));
});
test('a wrong index or a reverse guide-to-index link does not create semantic coverage',async()=>{
  const {pkg,ids,index,guide}=fixture();
  index.body=[{type:'paragraph',text:'Izoliuotas indekso turinys.'}];
  guide.links.push({targetPageId:index.id,label:'Indeksas'});approveFixture(pkg);
  await rejected(pkg,ids);
});
test('an eligible unrelated required index cannot replace the actual omitted hub',async()=>{
  const {pkg,ids}=fixture(),other=structuredClone(pkg.pages.find(page=>page.id==='index'));
  Object.assign(other,{id:'other-index',slug:'kita-tema',body:[{type:'paragraph',text:'Kita bandymo tema.'}]});
  pkg.pages.push(other);approveFixture(pkg);
  await rejected(pkg,ids.map(id=>id==='index'?'other-index':id));
});
test('future or unapproved indexes and articles remain unavailable',async()=>{
  for(const id of ['index','standalone']){
    const {pkg,ids}=fixture();pkg.pages.find(page=>page.id===id).publishAt='2040-01-01T00:00:00.000Z';approveFixture(pkg);
    await rejected(pkg,ids,'foundation_publication_pending');
    const unapproved=fixture();delete unapproved.pkg.pages.find(page=>page.id===id).approval;
    await rejected(unapproved.pkg,unapproved.ids);
  }
});
test('foreign index identity, host and wrong renderer fail without borrowing another site',async()=>{
  for(const patch of [{siteId:'foreignqa'},{siteSnapshot:{id:'foreignqa'}}]){
    const {pkg,ids,index}=fixture();Object.assign(index,patch);await rejected(pkg,ids);
  }
  const {pkg,ids}=fixture();pkg.site.renderer='gift';await rejected(pkg,ids);
});
test('a selected index without any required guide is insufficient',async()=>{
  const {pkg}=fixture();await rejected(pkg,['home','index']);
});
