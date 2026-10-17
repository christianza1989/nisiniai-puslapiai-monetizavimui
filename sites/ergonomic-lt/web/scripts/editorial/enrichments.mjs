import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file=new URL('../../content/editorial/approved-enrichments.json',import.meta.url);
const approvals=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
// Only an exact reviewed PDF enrichment may add facts beyond an old English label.
// The original baseline, maxLength, source numbers and binding remain immutable.
export function approvedEnrichment(field){
 const approval=approvals[field.id];
 if(!approval||field.value===field.original)return null;
 const digest=createHash('sha256').update(field.value).digest('hex');
 if(digest!==approval.valueSha256)return null;
 assert.equal(field.binding.kind,'configuration');
 assert.equal(field.binding.productId,approval.productId);
 assert.equal(field.binding.configurationId,approval.configurationId);
 assert(field.value.length<=approval.maxLength,'Reviewed enrichment too long');
 const [text,seo,...extra]=field.value.split('\n\nSEO metaduomenys\n\n');
 assert.equal(extra.length,0);assert(seo,'Missing SEO fields');
 const [staticText,configurableText,...surplus]=text.split('\n\nPasirinkimų aprašai (JSON)\n\n');
 assert.equal(surplus.length,0);
 let configurable;
 if(configurableText){
  assert.equal(approval.formatVersion,2,'Conditional format has not been reviewed');
  assert.equal(createHash('sha256').update(configurableText).digest('hex'),approval.configurableSha256,'Conditional copy revision differs');
  configurable=JSON.parse(configurableText);
  assert.equal(configurable.schemaVersion,1);
  assert.equal(configurable.productId,approval.productId);assert.equal(configurable.configurationId,approval.configurationId);assert.equal(configurable.baseArticle,approval.baseCode);
  const textOk=v=>typeof v==='string'&&v.trim()&&v.length<3000;
  assert(!configurable.displayName||textOk(configurable.displayName));
  assert(Array.isArray(configurable.intro)&&configurable.intro.every(textOk)&&textOk(configurable.scopeNote)&&textOk(configurable.photoNote));
  assert(Array.isArray(configurable.sections)&&configurable.sections.length>0&&configurable.sections.length<=12);
  assert(!approval.conditionFields||Array.isArray(approval.conditionFields)&&approval.conditionFields.every(k=>/^C[A-Z0-9]+$/.test(k)));
  const ids=new Set(),fields=new Set(['CMECHANISM','CBACKRESTMOVEMECH','CPLASTICCOLORVERSION2','CHEADREST','CBACKRESTCONNECTOR','CARMRESTS','CBASE','CCASTORS',...(approval.conditionFields||[])]);
  for(const section of configurable.sections){
   assert(/^[a-z-]+$/.test(section.id)&&!ids.has(section.id));ids.add(section.id);assert(textOk(section.heading));
   assert(Array.isArray(section.fields)&&section.fields.every(k=>fields.has(k)));
   assert(Array.isArray(section.blocks)&&section.blocks.length>0);
   for(const block of section.blocks){
    assert(block.when&&typeof block.when==='object'&&!Array.isArray(block.when));assert(Object.entries(block.when).every(([k,v])=>fields.has(k)&&typeof v==='string'&&/^[A-Z0-9]+$/.test(v)));
    assert(Array.isArray(block.paragraphs)&&block.paragraphs.every(textOk));assert(Array.isArray(block.rows)&&block.rows.every(r=>textOk(r.label)&&textOk(r.value)));
   }
  }
  assert(ids.has('finishes'));
  assert(configurable.choiceLabels&&Object.entries(configurable.choiceLabels).every(([k,labels])=>fields.has(k)&&labels&&typeof labels==='object'&&Object.entries(labels).every(([v,label])=>/^[A-Z0-9]+$/.test(v)&&textOk(label))));
  assert(!configurable.fieldLabels||Object.entries(configurable.fieldLabels).every(([k,v])=>fields.has(k)&&textOk(v)));
 }
 const [narrative,technical,...rest]=staticText.split('\n\nTechniniai duomenys\n\n');
 assert.equal(rest.length,0);assert(technical,'Missing technical sections');
 const [summary,...body]=narrative.split('\n\n');
 const scopeNote=body.pop();assert(summary&&body.length&&scopeNote);
 const sections=[];
 for(const block of technical.split('\n\n')){
  const colon=block.indexOf(':');
  if(colon<0)sections.push({heading:block,rows:[]});
  else{assert(sections.length,'Row without heading');sections.at(-1).rows.push({label:block.slice(0,colon),value:block.slice(colon+1).trim()});}
 }
 assert.equal(sections.reduce((n,s)=>n+s.rows.length,0),approval.expectedRows);
 assert(sections.every(s=>s.heading&&s.rows.length));
 const [title,description,...left]=seo.split('\n\n');
 assert.equal(left.length,0);assert(title&&description);
 return {summary,paragraphs:body,scopeNote,technicalSections:sections,seo:{title,description},...(configurable?{configurable}:{})};
}
