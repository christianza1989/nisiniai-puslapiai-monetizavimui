import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const schema = JSON.parse(await readFile(new URL('schemas/content-package.schema.json', root), 'utf8'));
const str = (maxLength=300) => ({type:'string',minLength:1,maxLength});
const obj = (properties, required=Object.keys(properties)) => ({type:'object',additionalProperties:false,required,properties});
const arr = (items, maxItems=100) => ({type:'array',maxItems,items});
const utc = {type:'string',format:'date-time',pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'};
const https = {...str(2048),format:'uri',pattern:'^https://'};
const nullableDate = {anyOf:[utc,{type:'null'}]};
schema.$id='https://local.niche-core.invalid/content-package.v2.schema.json';
schema.title='Approved content package v2 (lossless editorial snapshots)';
schema.properties.schemaVersion={const:2};
schema.properties.site.required.push('renderer');
schema.properties.site.properties.renderer={enum:['gift','niche']};
schema.properties.site.required.push('operatorName');
schema.properties.site.properties.operatorName=str(300);
schema.properties.pages.minItems=1;
schema.properties.pages.maxItems=2000;
schema.$defs.target={oneOf:[
  obj({kind:{const:'page'},pageId:str(100)}),
  obj({kind:{const:'external'},url:https}),
  obj({kind:{const:'network'},siteId:schema.properties.siteId,pageId:str(100)}),
  obj({kind:{const:'commerce'},targetId:str(100)}),
]};
schema.$defs.inline={oneOf:[obj({type:{const:'text'},text:str(12000)}),obj({type:{const:'link'},text:str(1000),target:{$ref:'#/$defs/target'}})]};
const inline={...arr({$ref:'#/$defs/inline'},500),minItems:1};
schema.$defs.block.oneOf.push(
  obj({type:{const:'richParagraph'},content:inline}),
  obj({type:{const:'richHeading'},level:{enum:[2,3]},content:inline}),
  obj({type:{const:'richList'},ordered:{type:'boolean'},items:{...arr(inline,100),minItems:1}}),
);
schema.$defs.author=obj({id:str(100),siteId:schema.properties.siteId,locale:str(30),slug:str(150),name:str(200),role:{type:'string',maxLength:300},bio:{type:'string',maxLength:12000},kind:{enum:['person','organization']},sameAs:arr(https,20)});
schema.$defs.source=obj({id:str(100),title:str(500),publisher:str(300),url:https,accessedAt:utc,public:{const:true}});
schema.$defs.commerceTarget=obj({id:str(100),url:https,label:str(200),relationship:str(500),verified:{type:'boolean'},checkedAt:nullableDate});
schema.$defs.editorial=obj({
  category:{type:'string',maxLength:200},readingMinutes:{type:'integer',minimum:0,maximum:1000},
  authors:arr({$ref:'#/$defs/author'},20),sources:arr({$ref:'#/$defs/source'},100),
  datePublished:nullableDate,dateModified:nullableDate,productRecommendation:{type:'boolean'},
  featuredImageId:{anyOf:[str(100),{type:'null'}]},relatedPageIds:arr(str(100),100),
  commerceTargets:arr({$ref:'#/$defs/commerceTarget'},30),
});
const page=schema.$defs.page;
page.properties.id={...str(100),pattern:'^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$'};
for(const key of ['title','description','intent'])page.properties[key]=str(1000);
page.properties.slug={type:'string',maxLength:150};
page.required.push('contentVersion','editorial','siteSnapshot');
page.properties.contentVersion={const:2};
page.properties.type.enum.push('article','index','author','policy','about','contact');
page.properties.editorial={$ref:'#/$defs/editorial'};
page.properties.siteSnapshot=structuredClone(schema.properties.site);
page.properties.body.minItems=1;page.properties.body.maxItems=1000;
page.properties.publishAt=utc;page.properties.approval.properties.approvedAt=utc;
const file=new URL('schemas/content-package.v2.schema.json',root);
await writeFile(file,JSON.stringify(schema,null,2)+'\n');
// root is content-studio/, public repo is its parent's sibling.
const publicFile=new URL('../../dovanos-memorycasting/schemas/content-package.v2.schema.json',root);
await mkdir(new URL('./',publicFile),{recursive:true});
await writeFile(publicFile,JSON.stringify(schema,null,2)+'\n');
console.log('Generated matching v2 schemas; v1 unchanged.');
