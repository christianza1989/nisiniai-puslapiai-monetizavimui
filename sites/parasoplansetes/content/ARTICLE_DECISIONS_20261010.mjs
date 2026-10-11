// Editorial decisions verified against primary sources on 2026-10-10.
// Native studio performs validation, review, approval, scheduling and release.
const source=(url,label,reason)=>({url,label,reason,verified:true});
export const sources={
 eso:source('https://stepover.com/en/products/software/esignatureoffice/','StepOver: eSignatureOffice','Gamintojo programos aprašymas; konkretaus kliento dokumento ar mūsų atlikto bandymo rezultatų nepatvirtina.'),
 print:source('https://stepover.com/en/products/software/print2ng/','StepOver: Print2NG','Gamintojo aprašytas virtualaus spausdinimo ir NG kelias; konkrečios aplinkos palaikymas tikrinamas atskirai.'),
 api:source('https://stepover.com/en/products/developer/','StepOver: developer interfaces','Gamintojo sąsajų katalogas ir jų paskirtis; nėra mūsų sistemos integracijos patvirtinimas.'),
 cloud:source('https://stepover.com/en/products/cloud-sign-online/','StepOver: cloud signing','Gamintojo debesijos produktų kryptys; mūsų paslaugos aktyvumas, kainos ir sutartys čia nepatvirtinami.'),
 office:source('https://stepover.com/en/products/software/stepover-office-plugin/','StepOver: Office Plugin','Gamintojas aprašo parašo vaizdo įterpimą į Word ir Excel bei skirtingus įskiepio variantus.'),
 ng5:source('https://stepover.com/en/products/signature-pads/nextgen-pad-5/','StepOver: nextGen Pad 5','Tikro NG 5 modelio ir Ethernet priedo gamintojo aprašymas; ne mūsų sandėlio ar tiekimo įrodymas.'),
 eidas:source('https://eur-lex.europa.eu/eli/reg/2014/910/2024-10-18/eng','EUR-Lex: eIDAS reglamentas','25 straipsnis apie elektroninių ir kvalifikuotų parašų teisinę galią; konkretaus dokumento tinkamumas vertinamas atskirai.'),
 gdpr:source('https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng','EUR-Lex: Bendrasis duomenų apsaugos reglamentas','Duomenų tvarkymo principai ir biometrinių duomenų apibrėžimas; konkretaus proceso teisinio pagrindo čia nenustatome.'),
 adobe:source('https://helpx.adobe.com/acrobat/desktop/e-sign-documents/manage-digital-signatures/validate-digital-sign.html','Adobe Acrobat: digital signature validation','Oficiali parašų ir sertifikato detalių tikrinimo instrukcija; gautam jūsų failui galiojimo išvados nepateikia.')
};
export const articleSources={
 'PS-20':['eso'],'PS-21':['eso','cloud'],'PS-42':['eidas'],'PS-22':['eso'],'PS-23':['print'],
 'PS-27':['api','cloud'],'PS-28':['eso'],'PS-35':['cloud','eso'],'PS-44':['api'],'PS-29':['eso','api'],
 'PS-30':['eso','eidas'],'PS-31':['eso'],'PS-36':['eso','adobe'],'PS-37':['adobe','eidas'],
 'PS-39':['eso','gdpr'],'PS-43':['eso'],'PS-45':['api','ng5'],'PS-24':['office'],
 'PS-32':['eidas','gdpr'],'PS-33':['gdpr'],'PS-34':['cloud','api'],'PS-38':['gdpr','adobe'],
 'PS-40':['eso'],'PS-46':['api'],'PS-25':['cloud'],'PS-26':['ng5'],'PS-41':['gdpr']
};
// Link labels are literal prose fragments; future destinations stay private until due.
export const articleLinks={
 'PS-20':[['paraso-plansetes','StepOver modelių palyginimu'],['gidai/pasirasymo-pilotas','pasirašymo piloto sąrašu'],['kontaktai','kontaktų puslapį']],
 'PS-21':[['procesai/sutarciu-pasirasymas','Sutarčių pasirašymo gidas'],['procesai/perdavimo-priemimo-aktai','perdavimo aktų gidas'],['gidai/vietinis-ir-nuotolinis-pasirasymas','vietinio ir nuotolinio pasirašymo palyginime'],['kontaktai','kontaktų puslapį']],
 'PS-42':[['gidai/paraso-duomenys-ir-privatumas','parašo duomenų ir privatumo gidas'],['gidai/pdf-paraso-patikra','PDF tikrinimo']],
 'PS-22':[['gidai/pdf-pasirasymas-plansete','PDF'],['gidai/pasirasymo-pilotas','bandymui'],['kontaktai','užklausą']],
 'PS-23':[['programine-iranga/esignatureoffice','eSignatureOffice'],['produktas/paraso-plansete-stepover-durasign-pad-ng-10','NG'],['kontaktai','užklausoje']],
 'PS-27':[['paraso-plansetes','modelių'],['gidai/vietinis-ir-nuotolinis-pasirasymas','nuotolinio'],['gidai/pasirasymo-pilotas','bandymą']],
 'PS-28':[['gidai/paraso-plansetes-integracija','integracijos'],['kainos','kainos'],['kontaktai','užklausai']],
 'PS-35':[['programine-iranga/websignatureoffice','webSignatureOffice'],['pasirasymo-procesai','procesą'],['kontaktai','užklausoje']],
 'PS-44':[['gidai/paraso-plansete-narsykleje','Naršyklės kelias'],['integracija','bendras integracijos puslapis']],
 'PS-29':[['kainos','Kainos'],['gidai/paraso-plansetes-integracija','Integracijos'],['gidai/pasirasymo-pilotas','piloto gidai']],
 'PS-30':[['pasirasymo-procesai','Pasirašymo proceso apžvalga'],['gidai/dokumento-kopija-klientui','dokumento kopijos gidas']],
 'PS-31':[['gidai/keli-pasirasytojai','Kelių pasirašytojų'],['gidai/pasirasytu-dokumentu-saugojimas','dokumentų saugojimo gidai'],['kontaktai','kontaktų puslapį']],
 'PS-36':[['gidai/pdf-sablonai-ir-paraso-laukai','PDF šablonų'],['gidai/pdf-paraso-patikra','parašo patikros gidai']],
 'PS-37':[['gidai/paraso-galiojimas','parašo galiojimo gidas'],['gidai/pasirasytu-dokumentu-saugojimas','Dokumento saugojimo gidas']],
 'PS-39':[['gidai/pdf-pasirasymas-plansete','PDF darbo eigos'],['gidai/pasirasytu-dokumentu-saugojimas','saugojimo gidai']],
 'PS-43':[['gidai/keli-pasirasytojai','Kelių pasirašytojų gidas'],['programine-iranga/esignatureoffice','eSignatureOffice apžvalga']],
 'PS-45':[['gidai/stepover-api-pasirinkimas','StepOver API pasirinkimo'],['gidai/paraso-plansetes-integracija','bendras integracijos gidas']],
 'PS-24':[['gidai/pdf-pasirasymas-plansete','PDF'],['programine-iranga/print2ng','Print2NG gidai']],
 'PS-32':[['gidai/paraso-galiojimas','parašo'],['gidai/dokumento-kopija-klientui','kopijos'],['kontaktai','užklausoje']],
 'PS-33':[['gidai/paraso-duomenys-ir-privatumas','privatumo'],['gidai/pdf-sablonai-ir-paraso-laukai','šablonų'],['kontaktai','užklausoje']],
 'PS-34':[['gidai/vietinis-ir-nuotolinis-pasirasymas','nuotolinio'],['gidai/pasirasymo-klaidos-ir-atkurimas','klaidų'],['kontaktai','užklausoje']],
 'PS-38':[['gidai/pdf-paraso-patikra','PDF parašo patikros'],['gidai/dokumento-kopija-klientui','kopijos klientui gidai']],
 'PS-40':[['gidai/pasirasymo-pilotas','Piloto gidas'],['gidai/pasirasytu-dokumentu-saugojimas','dokumento saugojimo gidas']],
 'PS-46':[['paraso-plansetes','Modelių katalogas'],['gidai/pasirasymo-pilotas','pasirašymo piloto gidas']],
 'PS-25':[['gidai/vietinis-ir-nuotolinis-pasirasymas','Vietinio ir nuotolinio pasirašymo gidas'],['kontaktai','užklausoje']],
 'PS-26':[['paraso-plansetes','Modelių palyginimas'],['programine-iranga','programų apžvalga']],
 'PS-41':[['gidai/paraso-galiojimas','Parašo galiojimo'],['gidai/pasirasytu-dokumentu-saugojimas','saugojimo gidai']]
};
