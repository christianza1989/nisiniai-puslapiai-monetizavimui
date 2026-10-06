import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('./public/',import.meta.url);
const replacements={
'Pakeisti  rolę':'Mano paskyra','Pasirinkti  rolę':'Atidaryti paskyrą','Atlikti demo':'Atlikti','Patvirtinti demo':'Patvirtinti','Pašalinti iš demo':'Pašalinti iš katalogo','Grąžinti į demo':'Grąžinti į katalogą','Patvirtinti tik demo':'Patvirtinti profilį','Atšaukti demo':'Atšaukti vizitą','Pasiūlyta demo':'Pasiūlyta','Išspręstas demo':'Išspręstas','Paslėptas demo':'Paslėptas','{demo vardas}':'{vardas}',
'Tikra autentifikacija, sesijos, pranešimai ir mokėjimai neprijungti.':'Prisijungimo ir vizitų pranešimus gali valdyti savo paskyroje.',
'Išbandyti profilio pradžią':'Užbaigti profilio parengimą','Vieta demonstracinė. Tikrą veiklos subjektą, adresą ir dokumentus reikės patvirtinti atskirai.':'Nurodyk savo veiklos vietą ir patikrink viešai rodomą informaciją.',
'Paraiška bus vietinė pending versija operatoriaus peržiūrai. Ji automatiškai nevirsta tikru patvirtintu profiliu.':'Pateiktą versiją peržiūrės operatorius. Patvirtinus profilis pasirodys kataloge.',
'Profilis nėra tikro teikėjo patvirtinimas.':'Katalogo tinkamumą įvertink pagal pateiktą informaciją ir peržiūros rezultatą.',
'Suprantu, kad realiam portfolio reikės autoriaus ir viešinimo teisių':'Turiu pateiktų vaizdų viešinimo teisę',
'Užklausos demonstracija':'Užklausa','privatus juodraštis':'MB Pinet redakcija',
'Šiame preview katalogas ir laikai yra demonstraciniai.':'Pasirink miestą, palygink paslaugas ir patikrink visam vizitui tinkantį laiką.',
'Fiktyvūs demonstracijos atsiliepimai rodo sąsajos elgesį. Jie nesuteikia pagrindo rekomenduoti realų žmogų ar saloną.':'Platformoje atsiliepimą gali pateikti klientas po atlikto vizito. Vis tiek vertink konkrečią atsiliepimo informaciją.',
'Kodas galioja10 minučių':'Kodas galioja 10 minučių','8valandas':'8 valandas','30minučių':'30 minučių','10minučių':'10 minučių',
};
for(const name of ['app.mjs','content.mjs','booking-ui.mjs','workspace-ui.mjs','product-trust.mjs','account-ui.mjs']){
 const file=new URL(name,root);let source=await readFile(file,'utf8');for(const [a,b] of Object.entries(replacements))source=source.replaceAll(a,b);
 if(name==='workspace-ui.mjs'){
  source=source.replace('ignoreBookingId:b.id}','ignoreBookingId:b.id,scope:ctx.state.session}');
  source=source.replace('const rows=ctx.rows.filter((r,i,a)=>ctx.state.favorites.includes','if(ctx.adapter.mode===\'real\')ctx.state.favorites=d.client.favoriteIds||[];const rows=ctx.rows.filter((r,i,a)=>ctx.state.favorites.includes');
  source=source.replace("${btn('reset-demo','Išvalyti demo','','button outline')}","${btn('account-logout','Atsijungti','','button outline')}");
  source=source.replace('${m.demoEvents}','${m.events??m.demoEvents}');
  source=source.replace("a.download=id+'-demo-vizitai.csv'","a.download=id+'-vizitai.csv'").replace('b.priceMinor,true]','b.priceMinor,ctx.adapter.mode!==\'real\']');
  source=source.replace("await ctx.adapter.edit({scope,table:'outbox',id,values:{state:'demo-only'}});ctx.closeDialog();ctx.toast('retry → demo-only. Tai nėra laiško išsiuntimas.');","if(ctx.adapter.mode==='real')await ctx.adapter.retryOutbox({scope,id});else await ctx.adapter.edit({scope,table:'outbox',id,values:{state:'demo-only'}});ctx.closeDialog();ctx.toast('Pranešimo būsena atnaujinta.');");
  source=source.replace("'Išbandyti vietinį retry'","'Pakartoti parengimą'");
 }
 if(name==='app.mjs')source=source.replace("const h=$('#header');if(y<220","const h=$('#header');if(document.body.classList.contains('workspace-page')||y<220");
 await writeFile(file,source);
}
