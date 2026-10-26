// Maintained Lithuanian policy. Ordinary return postage: owner's 2026-10-19 reply.
// Statutory withdrawal and non-conformity rights are distinct; no custom-kit exemption.
export function returnsPolicy({company,ownerContact}){
 const heading=text=>({type:'heading',level:2,text}),paragraph=text=>({type:'paragraph',text});
 return {
  title:'Prekių grąžinimas ir pinigų grąžinimas',
  description:'Kaip per 14 dienų atsisakyti pirkinio, kur siųsti grąžinamą rinkinį, kas apmoka siuntimą ir kaip sprendžiami prekės trūkumai.',
  intent:'Pirkėjui aiškiai paaiškinti sutarties atsisakymo, prekės grąžinimo ir pinigų grąžinimo tvarką Lietuvoje.',
  body:[
   paragraph(`Ši tvarka taikoma vartotojų internetu iš ${company.name} įsigytiems ir Lietuvoje pristatytiems rankų liejimo rinkiniams. Jei persigalvojote, apie sutarties atsisakymą praneškite per 14 kalendorinių dienų nuo prekės gavimo. Atsisakymo priežasties nurodyti nereikia.`),
   heading('Trumpai apie grąžinimą'),
   {type:'list',items:['Terminas pranešti apie atsisakymą – 14 kalendorinių dienų nuo prekės gavimo.','Pranešus apie atsisakymą, prekę išsiųskite ne vėliau kaip per kitas 14 kalendorinių dienų.','Persigalvojus grąžinimo siuntimą apmoka pirkėjas.','Brokuotos ar klaidingai atsiųstos prekės grąžinimo išlaidas apmokame mes.',`Grąžinimo adresas: ${company.contactAddress}.`,`Pranešimai ir pagalba: ${ownerContact.email}, tel. ${ownerContact.phone}.`]},
   heading('Kaip pranešti apie atsisakymą?'),
   paragraph(`Parašykite ${ownerContact.email} arba atsiųskite aiškų pareiškimą paštu adresu ${company.contactAddress}. Nurodykite savo vardą, užsakymo numerį ar kitus pirkimą leidžiančius atpažinti duomenis, gautą prekę ir gavimo datą. Pakanka pranešimą išsiųsti iki termino pabaigos; mūsų atsakymo laukti, kad išsaugotumėte šią teisę, nereikia.`),
   paragraph('Galite naudoti tokį tekstą: „Pranešu, kad atsisakau šios prekės pirkimo sutarties. Prekė: […]. Užsakymo numeris: […]. Užsakyta: […]. Gauta: […]. Pirkėjo vardas ir pavardė: […]. Adresas: […]. Pranešimo data: […].“ Jei pareiškimą siunčiate popieriuje, jį pasirašykite. Šis pavyzdys neprivalomas.'),
   heading('Kaip supakuoti ir išsiųsti?'),
   paragraph(`Rinkinį su jo dalimis saugiai supakuokite ir siųskite paštu arba kurjeriu gavėjui ${company.name}, adresu ${company.contactAddress}. Išsaugokite išsiuntimo kvitą ir, jei turite, sekimo numerį. Norint atsisakyti sutarties, nebūtina atvykti į fizinę parduotuvę ar turėti klientų paskyrą.`),
   paragraph('Kai persigalvojate dėl kokybiškos prekės, siuntimo paslaugą pasirenkate ir už ją tiesiogiai vežėjui mokate jūs. Mokamos grąžinimo etiketės į rinkinį nepridedame. Atskiro administravimo ar prekės priėmimo mokesčio netaikome.'),
   heading('Kokios būklės prekę galima grąžinti?'),
   paragraph('Prekę galite apžiūrėti tiek, kiek būtina jos pobūdžiui, savybėms ir veikimui nustatyti. Vien atidaryta išorinė pakuotė teisės atsisakyti sutarties nepanaikina. Jei prekė naudota daugiau, nei reikia tokiai apžiūrai, gali tekti atlyginti pagrįstą jos vertės sumažėjimą. Tai vertiname individualiai ir paaiškiname; fiksuoto procentinio atskaitymo netaikome.'),
   paragraph('Liejimo medžiagų maišymas su vandeniu ir jų sunaudojimas liejiniui pagaminti viršija įprastą prekės apžiūrą. Tačiau vien dėl to skundo dėl galimo medžiagos trūkumo neatmetame. Nenaudotą komplektaciją ir pakuotes, jei jas išsaugojote, grąžinkite kartu.'),
   heading('Kada ir kaip grąžinami pinigai?'),
   paragraph('Gautus mokėjimus grąžiname ne vėliau kaip per 14 kalendorinių dienų nuo jūsų pranešimo apie sutarties atsisakymą. Galime sulaikyti grąžinimą, kol gausime prekę arba jos išsiuntimo įrodymą, atsižvelgdami į tai, kas įvyksta anksčiau. Pinigus grąžiname tuo pačiu mokėjimo būdu, nebent aiškiai susitariame kitaip, ir papildomo grąžinimo mokesčio netaikome.'),
   paragraph('Atsisakius viso užsakymo, grąžinama ir įprasto pigiausio mūsų siūlyto pristatymo kaina. Jei rinkotės brangesnį pristatymą, šio papildomo kainos skirtumo negrąžiname. Pirkėjo apmokėtos grąžinimo siuntimo išlaidos persigalvojimo atveju nekompensuojamos.'),
   heading('Jei prekė brokuota, pažeista ar atsiųsta ne ta'),
   paragraph(`Susisiekite ${ownerContact.email}: aprašykite trūkumą ir nurodykite užsakymo duomenis. Nuotraukos gali padėti greičiau įvertinti situaciją. Prieš siunčiant tokią prekę, suderinsime siuntimo būdą; būtinas grąžinimo išlaidas apmokame mes. Vartotojo teisės dėl prekės neatitikties nėra apribotos 14 dienų persigalvojimo terminu.`),
   paragraph('Teisė į prekės pataisymą, pakeitimą, kainos sumažinimą ar sutarties nutraukimą taikoma įstatymų nustatyta tvarka. Savanoriško kokybiškos prekės keitimo į kitą rinkinį nesiūlome: galite pasinaudoti grąžinimu ir atskirai užsisakyti kitą. Tai neriboja įstatymų numatytos teisės pakeisti netinkamos kokybės prekę.'),
   heading('Pardavėjas ir kontaktai'),
   paragraph(`${company.name}, įmonės kodas ${company.code}. Kontaktinis ir grąžinimo adresas: ${company.contactAddress}. El. paštas ${ownerContact.email}, telefonas ${ownerContact.phone}. Šios sąlygos neriboja privalomų vartotojo teisių. Atnaujinta 2026 m. spalio 19 d.`)
  ],
  externalLinks:[{url:'https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_lt.htm',label:'„Jūsų Europa“: grąžinimas ir teisė atsisakyti sutarties',reason:'Oficiali ES informacija vartotojams apie nuotolinių pirkinių atsisakymą ir prekių trūkumus.',verified:true},{url:'https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm',label:'„Jūsų Europa“: nuotolinė prekyba ir pardavėjo pareigos',reason:'Oficialus paaiškinimas apie pinigų grąžinimą, pristatymo išlaidas ir prekės vertės sumažėjimą.',verified:true}]
 };
}
