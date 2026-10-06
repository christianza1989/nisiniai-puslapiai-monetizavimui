import {getSite,editPage} from '../../../content-studio/src/model.mjs';
const site=await getSite('madbeauty'),home=site.pages.find(p=>p.type==='home');
const text='Pridėjus pasirinktus darbus, tikrink bendrą procedūros trukmę.';
if(!home.body.some(b=>b.text===text))await editPage('madbeauty',home.id,{body:[...home.body,{type:'paragraph',text}]});
console.log('Homepage summary clarified; current review required.');
