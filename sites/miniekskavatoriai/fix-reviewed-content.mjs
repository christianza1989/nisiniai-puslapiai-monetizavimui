import {getSite,editPage,approvePage,exportPackage} from '../../content-studio/src/model.mjs';
const id='miniekskavatoriai',s=await getSite(id),tool=s.pages.find(p=>p.slug==='transejos-kasimas');
await editPage(id,tool.id,{body:tool.body.map(b=>b.type==='paragraph'?{...b,text:b.text.replace('Žemiau galima paruošti','Šiame puslapyje galima paruošti')}:b)});
await approvePage(id,tool.id,'miniekskavatoriai-agent-source-review');
const home=s.pages.find(p=>p.type==='home');await editPage(id,home.id,{externalLinks:tool.externalLinks});await approvePage(id,home.id,'miniekskavatoriai-agent-source-review');
const pillar=s.pages.find(p=>p.slug==='su-operatoriumi');
for(const p of s.pages.filter(p=>!p.approval))await editPage(id,p.id,{pillarPageId:pillar.id});
console.log(JSON.stringify(await exportPackage(id)));
