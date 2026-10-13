export const ownerContact={email:'info@memorycasting.lt',phone:'+37069108251'};
export const company={name:'MB Memocasting',code:'306026827',contactAddress:'Molynės g. 2C, Vilnius, LT-02211'};
export function applyOwnerFacts(pages){
 for(const page of pages){
  for(const b of page.body)if(b.text)b.text=b.text.replace('1 200 g gipso ir kibiras.','1 200 g gipso, kibiras ir maišymo pagaliukai.').replace('Šeimos pakelių svoriai, dalyvių ribos ir tikros produktų nuotraukos dar ruošiamos.','Šeimos pakelių svoriai ir dalyvių ribos dar tikslinami. Rinkinių vaizdus pateikė savininkas; juose matomi pavyzdžiai nepatvirtina neaprašytų savybių.');
  if(page.slug==='')page.body[2].text+=' Į šeimos rinkinį taip pat įeina maišymo pagaliukai. Medinis pagrindas pasirenkamas atskirai už 10 €.';
  if(['products/liejimo-rinkinys-porai','products/seimos-rinkinys-1'].includes(page.slug)){
   page.body.find(b=>b.type==='list').items.push('Maišymo pagaliukai.');
   page.additionalImages=['owner-wood'];
   page.body.push({type:'heading',level:2,text:'Pasirenkamas medinis pagrindas'},{type:'paragraph',text:'Medinį pagrindą galima pasirinkti atskirai už 10 €. Jis neįeina į bazinę rinkinio kainą. Pagrindo matmenys ir medžio rūšis dar nepatvirtinti. Nuotraukoje matomas liejinys pateikiamas kaip vaizdo pavyzdys.'},{type:'image',assetId:'owner-wood'},{type:'paragraph',text:'Nurodytas bazinio rinkinio siuntos svoris ir matmenys neapima nepatvirtintų papildomos komplektacijos pakuotės duomenų. Galutinę siuntą prekybos serveris turi įvertinti pagal konkretų pasirinkimą. Vietiniame pirkimo bandyme šio priedo pasirinkimas bus prijungtas tik prie serverio patvirtintos kainos ir pakuotės.'});
  }
  if(page.slug==='collections/all')page.body.push({type:'paragraph',text:'Maišymo pagaliukai įeina į poros ir šeimos rinkinius. Medinis pagrindas yra atskirai pasirenkamas priedas už 10 €. Balti dažai įeina į poros ir šeimos rinkinius. Priedų pakuotės duomenys tikrinami atskirai nuo bazinių siuntų.'});
  if(page.slug==='apie-projekta'){
   page.body=page.body.filter(b=>!b.text?.startsWith('Vietinis projektas atkuria'));
   page.body.push({type:'heading',level:2,text:'Pardavėjas ir kontaktai'},{type:'list',items:[`Pardavėjas: ${company.name}.`,`Įmonės kodas: ${company.code}.`,`El. paštas: ${ownerContact.email}.`,`Telefonas: ${ownerContact.phone}.`,`Kontaktinis ir grąžinimo adresas: ${company.contactAddress}.`]},{type:'paragraph',text:'Kontaktinis ir grąžinimo adresas pateiktas savininko. Registrų centro 2026-05-03 leidinyje buveinė nurodyta atskirai: Pupinės g. 10-55, Vilnius, LT-02206. Šio registro įrašo nepateikiame kaip vėliau atnaujinto adreso patvirtinimo. Prieš tikrą prekybos paleidimą abu adreso vaidmenys turi būti galutinai sutikrinti.'});
   page.sources=[{url:'https://www.registrucentras.lt/jar/infleid/download.do?oid=336173',label:'Registrų centro 2026-05-03 informacinis leidinys',reason:'MB Memocasting įmonės kodas ir šiame datuotame leidinyje pateikta buveinė patikrinti. Tai nėra dabartinio siuntimo ar savininko kontaktinio adreso šaltinis.',verified:true}];
  }
  if(page.slug==='kontaktai')page.body[0].text=`Klientų aptarnavimo kontaktai: ${ownerContact.email}, ${ownerContact.phone}. Kontaktinis ir grąžinimo adresas: ${company.contactAddress}. Šioje vietinėje peržiūroje formos duomenys saugomi testinėje aplinkoje, automatinis laiškų pristatymas išjungtas. Naudokite tik testinius kontaktus; tikras formos laiško gavimas bus priimtas atskiru bandymu.`;
  if(page.slug==='privatumas')page.body[0].text=`Duomenų valdytojas — ${company.name}, įmonės kodas ${company.code}. Dėl duomenų tvarkymo galima kreiptis ${ownerContact.email}. Ši peržiūra skirta vietiniam bandymui: naudokite tik testinius vardus, adresus ir kontaktus.`;
  if(page.slug==='pristatymas')page.body[2].text='Siuntėjo adresas — '+company.contactAddress+'. Bazinių rinkinių pakuotės duomenys pateikti savininko; siuntos su priedais vertinamos atskirai. Tikras vežėjo paslaugų sąrašas, terminai ir galutinės rinkų pristatymo kainos dar nepriimti. LT, PL, LV ir EE struktūra planuojama atskirai; dabartinis vietinis pirkimo bandymas dar nepatvirtina realaus siuntimo šiose šalyse.';
  if(page.slug==='grazinimas')page.body[1].text=`Dėl grąžinimo ar galimo prekės trūkumo kreipkitės ${ownerContact.email} arba ${ownerContact.phone}. Savininko nurodytas grąžinimo adresas — ${company.contactAddress}. Ši vietinė peržiūra dar nėra tikra prekyba; pilnos vartotojui taikomos sąlygos ir grąžinimo procesas turi būti priimti prieš mokėjimų įjungimą. Jei klausimas susijęs su nepavykusiu liejimu, nurodykite rinkinio bei medžiagos duomenis ir proceso etapą; kliento kaltės nenustatome iš vieno sakinio.`;
 }
 return pages;
}
