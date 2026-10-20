import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
// Exercise the actual browser helpers without starting its DOM/network bootstrap.
const helpers=source.slice(0,source.indexOf("const app = document.querySelector('#app');"));
const {contentGroup, groupedPages, normalizePageFilters, pageFilterUrl}=vm.runInNewContext(helpers+';({contentGroup,groupedPages,normalizePageFilters,pageFilterUrl})',{URL});
const plain=value=>JSON.parse(JSON.stringify(value));

const pages = [
  { id:'guide', type:'guide', slug:'gidai/pasirinkimas', publishAt:'2026-10-20', revisionState:{changed:true,reviewed:true} },
  { id:'category', type:'faq', slug:'kategorijos/vezimeliai', publishAt:'2026-10-20', revisionState:{changed:true,reviewed:false} },
  { id:'product', type:'product', slug:'produktai/vezimelis', publishAt:'2026-10-20', revisionState:{changed:true,reviewed:true} },
  { id:'faq', type:'faq', slug:'duk', publishAt:'2026-10-20', revisionState:{changed:false,reviewed:false} },
  { id:'home', type:'home', slug:'', publishAt:'2026-10-20' },
  { id:'planned-category', type:'faq', slug:'kategorijos/stalai', publishAt:'2026-10-21' },
];

test('category routes are distinct from real FAQ and information pages without mutating content', () => {
  const before=structuredClone(pages);
  assert.deepEqual(pages.map(contentGroup), ['guide','category','product','other','other','category']);
  assert.equal(contentGroup({type:'faq',slug:'/kategorijos/stalai'}),'category');
  assert.equal(contentGroup({type:'faq',slug:'kategorijos-klausimai'}),'other');
  assert.equal(contentGroup({type:'service',slug:'kontaktai'}),'other');
  const all=groupedPages(pages,normalizePageFilters('all','all'));
  assert.deepEqual(plain(all.map(group=>group.pages.length)),[1,2,1,2]);
  assert.equal(new Set(all.flatMap(group=>group.pages.map(page=>page.id))).size,pages.length);
  assert.deepEqual(pages,before);
});

test('counts follow real revision state; empty planned texts are not counted as changed or reviewed', () => {
  assert.deepEqual(plain(groupedPages(pages,normalizePageFilters('changed','all')).map(group=>group.pages.length)),[1,1,1,0]);
  assert.deepEqual(plain(groupedPages(pages,normalizePageFilters('reviewed','category')).map(group=>group.pages.length)),[1,0,1,0]);
  assert.deepEqual(plain(groupedPages([],normalizePageFilters('all','all')).map(group=>group.pages.length)),[0,0,0,0]);
});

test('links restore both independent filters and preserve unrelated query fields', () => {
  const filters=normalizePageFilters('changed','category');
  const url=pageFilterUrl('http://127.0.0.1:4317/?foo=kept#old','sample',filters);
  assert.equal(url.searchParams.get('foo'),'kept');
  assert.equal(url.searchParams.get('site'),'sample');
  assert.equal(url.searchParams.get('view'),'pages');
  assert.equal(url.hash,'#sample');
  assert.deepEqual(normalizePageFilters(url.searchParams.get('filter'),url.searchParams.get('kind')),filters);
  const reset=pageFilterUrl(url.href,'sample',normalizePageFilters('reviewed','all'));
  assert.equal(reset.searchParams.has('kind'),false);
  assert.deepEqual(plain(normalizePageFilters('arbitrary','faq')),{revisionFilter:'all',contentFilter:'all'});
});
