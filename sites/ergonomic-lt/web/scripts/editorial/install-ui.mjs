import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {hash} from './contract.mjs';
const root=process.cwd(),out=path.join(root,'content/editorial');fs.mkdirSync(out,{recursive:true});
const registry=new Map((fs.existsSync(path.join(out,'ui-registry.json'))?JSON.parse(fs.readFileSync(path.join(out,'ui-registry.json'),'utf8')):[]).map(f=>[f.id,f])),protectedLiterals=[];
const single=new Set('Katalogas Kontaktai Ergonomika Produktai Pradžia Priedai Plotis Gylis Aukštis Skersmuo Mediena Juoda Balta Pilka Žalia Taip Ne Nauja Rodyti Modelis Mechanizmas Porankiai Pagrindas Ratukai Apdaila Atlošas Specifikacija Vardas Telefonas Spalva Įmonė'.split(' '));
const human=value=>value.trim()&&!/^(SELECT|INSERT|UPDATE|DELETE|CREATE|PRAGMA|ALTER|BEGIN|COMMIT|ROLLBACK)\b/.test(value)&&(/[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/.test(value)||single.has(value.trim())||(/^[A-Z]/.test(value)&&/[a-z]{2,}/.test(value)&&/[A-Za-z]\s+[A-Za-z]/.test(value)));
const contact=/@|\+370|UAB A-Z Prekyba|Buivydiškių|Ergonomic\.lt|ERGONOMIC\.LT/;
const libNames=new Set(['seo-page-content.ts','seo-collections.ts','legacy-article.ts','category-labels.ts','configuration-labels.ts','expanded-configurator.ts','catalog-configurator.ts','configurator.ts','product-card-pdf.ts','quotes.ts','model-seo.ts']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(path.join(root,'src')).filter(file=>/\.(ts|tsx)$/.test(file)&&!file.includes(path.sep+'admin'+path.sep)&&!path.basename(file).startsWith('admin-')&&(
 file.includes(path.sep+'components'+path.sep)||file.includes(path.sep+'app'+path.sep)||libNames.has(path.basename(file))))
 .filter(file=>!file.endsWith('approved-home-markup.ts')&&!file.endsWith('types.ts')&&!file.endsWith('layout.tsx'));
files.push(path.join(root,'scripts/home-final-demo/configurator-demo.js'),path.join(root,'scripts/home-final-demo/carousels-source.js'));
function add(value,file,kind='ui',context=''){
 const id=kind+'.'+hash(value).slice(0,20),old=registry.get(id);
 const location={file:path.relative(root,file).replaceAll('\\','/'),context};
 if(old){if(!old.uses.some(u=>u.file===location.file&&u.context===location.context))old.uses.push(location);return id;}
 registry.set(id,{id,role:kind==='value'?'term':'interface',original:value,value,binding:{kind},uses:[location],maxLength:Math.max(value.length*3,300),protectedTerms:value.match(/\b(?:CFA|CF|MESH|UPH|Duo-Back)\b/g)||[]});return id;
}
function jsxText(raw){const lines=raw.split(/\r\n|\n|\r/);let result='';for(let i=0;i<lines.length;i++){let line=lines[i].replace(/\t/g,' ');if(i!==0)line=line.replace(/^ +/,'');if(i!==lines.length-1)line=line.replace(/ +$/,'');if(line){result+=line;if(i!==lines.length-1)result+=' ';}}return result;}
let changed=0;
for(const file of files){
 let source=fs.readFileSync(file,'utf8');const wired=source.includes('// editorial-copy-wired');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),edits=[];let needValue=false;
 function ignored(node){
  for(let p=node.parent;p;p=p.parent){
   if(ts.isImportDeclaration(p)||ts.isExportDeclaration(p)||ts.isTypeNode(p)||ts.isImportTypeNode(p))return true;
   if(ts.isCallExpression(p)&&ts.isPropertyAccessExpression(p.expression)&&['includes','indexOf','startsWith','endsWith','replace','replaceAll','match','test','split','querySelector','querySelectorAll','getElementById','closest','matches'].includes(p.expression.name.text))return true;
   if(ts.isBinaryExpression(p)&&[ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.EqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind))return true;
  }
  if(node.parent&&ts.isPropertyAssignment(node.parent)&&node.parent.name===node)return true;
  return false;
 }
 function visit(node){
  if(ignored(node))return;
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['copyText','copyValue'].includes(node.expression.text))return;
  if(ts.isJsxExpression(node)&&node.expression&&ts.isPropertyAccessExpression(node.expression)&&['label','value'].includes(node.expression.name.text)&&!ts.isJsxAttribute(node.parent)){
   edits.push({start:node.expression.getStart(ast),end:node.expression.end,text:'copyValue('+node.expression.getText(ast)+')'});needValue=true;return;
  }
  if(ts.isJsxText(node)){
   const value=jsxText(node.getText(ast));if(value.trim()&&/[\p{L}]/u.test(value)&&!contact.test(value)){
    const id=add(value,file,'ui','JSX text');edits.push({start:node.getStart(ast),end:node.end,text:'{copyText('+JSON.stringify(id)+','+JSON.stringify(value)+')}'});
   }else if(value.trim())protectedLiterals.push({file:path.relative(root,file),value,reason:'contact or brand'});return;
  }
  if(ts.isTemplateExpression(node)){
   const value=node.head.text+node.templateSpans.map((s,i)=>'{{p'+i+'}}'+s.literal.text).join('');
   if(human(value)&&!contact.test(value)&&!/<[a-z]/i.test(value)){
    const id=add(value,file,'ui','template');const values=node.templateSpans.map((s,i)=>'p'+i+':('+s.expression.getText(ast)+')').join(',');
    edits.push({start:node.getStart(ast),end:node.end,text:'copyText('+JSON.stringify(id)+','+JSON.stringify(value)+',{'+values+'})'});return;
   }
  }
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){
   const value=node.text;
   if(!human(value)||contact.test(value)||/^(?:\/|https?:|#|\.)/.test(value)||/<[a-z]/i.test(value))return;
   if(ts.isJsxAttribute(node.parent)&&!['alt','title','placeholder','aria-label'].includes(node.parent.name.getText(ast)))return;
   // Canonical semantic labels are data used by rules; translate only when displayed.
   if(path.basename(file)==='configuration-labels.ts'&&ts.isPropertyAssignment(node.parent)){
    add(value,file,'value','canonical term');return;
   }
   const id=add(value,file,'ui',node.parent.kind.toString());let text='copyText('+JSON.stringify(id)+','+JSON.stringify(value)+')';
   if(ts.isJsxAttribute(node.parent))text='{'+text+'}';
   edits.push({start:node.getStart(ast),end:node.end,text});return;
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
 if(!edits.length)continue;
 edits.sort((a,b)=>b.start-a.start);for(const e of edits)source=source.slice(0,e.start)+e.text+source.slice(e.end);
 if(!wired){const directive=source.match(/^(['"]use client['"];?\s*)/),at=directive?directive[0].length:0;
  const module=file.includes(path.sep+'scripts'+path.sep)?'../../src/lib/editorial-copy.ts':'@/lib/editorial-copy';
  source=source.slice(0,at)+"\n// editorial-copy-wired\nimport {copyText"+(needValue?',copyValue':'')+"} from '"+module+"';\n"+source.slice(at);
 }else if(needValue&&!source.includes('copyText,copyValue'))source=source.replace('import {copyText}', 'import {copyText,copyValue}');
 fs.writeFileSync(file,source);changed++;
}
fs.writeFileSync(path.join(out,'ui-registry.json'),JSON.stringify([...registry.values()],null,2)+'\n');
fs.writeFileSync(path.join(out,'ui-inventory.json'),JSON.stringify({files:files.map(f=>path.relative(root,f)),wiredFiles:files.filter(f=>fs.readFileSync(f,'utf8').includes('editorial-copy-wired')).length,changedFiles:changed,fields:registry.size,protectedLiterals},null,2)+'\n');
console.log('UI dictionary wiring:',changed,'files,',registry.size,'deduplicated fields.');
