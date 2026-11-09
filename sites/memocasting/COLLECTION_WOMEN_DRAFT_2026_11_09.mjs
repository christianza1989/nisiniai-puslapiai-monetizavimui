// Private studio draft only. No review, approval or release is generated.
// Run only against an isolated STUDIO_DATA_DIR and the pinned PUBLIC package.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const root='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees';
const pub=`${root}/memo-googlepay-privacy-public-20261105`;
const core=`${root}/memo-content-recovery-core-20261105`;
const work=`${root}/memo-collection-draft-data-20261109`;
process.env.STUDIO_DATA_DIR=`${work}/studio-data`;
process.env.STUDIO_OUTPUT_DIR=`${work}/studio-output`;
process.env.STUDIO_NETWORK_SETTINGS=`${pub}/config/niche-network.json`;
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import(pathToFileURL(`${core}/content-studio/src/model.mjs`));
const basePackagePath=`${pub}/content-packages/memocasting/content-package.json`;
const expectedPackageSha256='019e5950fca629b1bb8942ced9b7f2db3c0d33cdbe67720cf990bcb59df2e6ca';
const baseline=JSON.parse(await readFile(basePackagePath,'utf8'));
const anchor=baseline.pages.find(p=>p.slug==='pristatymas');
assert.ok(anchor && anchor.media.length===0);
await model.initialize();
// The deployed version was checked through Wrangler on 2026-11-09 07:47 UTC;
// this observation must be revalidated before any future release.
await model.recoverSiteFromPublicBaseline({siteId:'memocasting',canonicalHost:'memocasting.lt',basePackagePath,expectedPackageSha256,pageIds:[anchor.id],expectedRevisionHashes:{[anchor.id]:anchor.revisionHash},baselineEvidence:{sourceVersion:'PUBLIC a22bfd96b4d6787ab3cd3c0a9a1d4e415510f98e',deploymentId:'bb62bd89-460d-40fc-bba8-c71d3194dbe7 / Worker a224a0fb-8648-4ea0-943d-5aece52d1b48',observedAt:'2026-11-09T07:47:01.000Z'}});
const site=await model.getSite('memocasting');
const bySlug=s=>{const p=site.pages.find(x=>x.slug===s);assert.ok(p,`Missing target ${s}`);return p.id;};
const page=await model.addPage('memocasting',{
  type:'service',slug:'dovanos/moterims',
  title:'Dovanos moterims: rankų liejimo rinkiniai bendram prisiminimui',
  description:'Ieškote asmeniškos dovanos moteriai? Palyginkite „Memory Casting“ rankų liejimo rinkinius porai ir šeimai bei pasirinkite bendros kūrybos dovaną.',
  intent:'Išsirinkti Memory Casting rankų liejimo rinkinį kaip bendros patirties dovaną moteriai ir suprasti, kuo pasirinkimai skiriasi.',
  cluster:'dovanos pagal gavėją',
  body:[
    {type:'paragraph',text:'Rankų liejimo rinkinys – dovana moteriai, su kuria kartu kursite prisiminimą. Pasirinkite poros arba šeimos rinkinį pagal tai, kas dalyvaus, ir suplanuokite laiką, kurį norėsite praleisti kartu.'},
    {type:'heading',level:2,text:'Kokį rinkinį pasirinkti dovanai?'},
    {type:'paragraph',text:'Poros rinkinį verta rinktis, kai norite kurti dviese: partneriams, mamai ir suaugusiam vaikui ar dviem artimiems žmonėms. Šeimos rinkinys skirtas šeimos bendrai kūrybai – prieš pasirinkdami peržiūrėkite jo aprašymą ir instrukciją, kad kompozicija atitiktų rinkinio galimybes.'},
    {type:'paragraph',text:'Abiejuose rinkiniuose yra balti dažai. Išsamią sudėtį, dabartinę kainą ir prieinamumą rasite pasirinkto rinkinio puslapyje.'},
    {type:'heading',level:2,text:'Kada tokia dovana tinka?'},
    {type:'paragraph',text:'Bendra kūryba gali tikti gimtadieniui, Kalėdoms, sukakčiai ar tiesiog progai susitikti. Svarbiausia – ne šventės pavadinimas, o tai, ar dovanos gavėjai būtų malonu dalyvauti kūrybinėje veikloje ir ar rasite laiko tai padaryti kartu.'},
    {type:'heading',level:2,text:'Trys klausimai prieš pasirenkant'},
    {type:'list',items:['Ar jai patiktų kartu kurti, o ne iškart gauti jau pagamintą daiktą?','Kas dalyvaus: du artimi žmonės ar šeima? Pagal tai palyginkite rinkinių aprašymus.','Ar galite iš anksto susitarti dėl ramaus laiko ir tinkamos vietos liejimui? Prieš pradėdami perskaitykite rinkinio instrukciją.']},
    {type:'heading',level:2,text:'Kaip įteikti dovaną asmeniškiau?'},
    {type:'paragraph',text:'Pridėkite trumpą raštelį, kodėl norite šį prisiminimą sukurti kartu. Jei nežinote, kada gavėjai bus patogu, vietoje iš anksto nustatytos datos pasiūlykite laiką pasirinkti drauge.'},
    {type:'heading',level:2,text:'Jei dar svarstote kitas idėjas'},
    {type:'paragraph',text:'Rankų liejimas yra viena iš galimų dovanų, o geriausias pasirinkimas priklauso nuo žmogaus pomėgių. Daugiau idėjų ir patarimų rasite gide „dovanos moterims“.'}
  ]
});
await model.editPage('memocasting',page.id,{links:[
  {targetPageId:bySlug('rinkinys-porai'),label:'Rankų liejimo rinkinys porai'},
  {targetPageId:bySlug('seimos-rinkinys'),label:'Rankų liejimo rinkinys šeimai'},
  {targetPageId:bySlug('gidai/dovanos-moterims'),label:'dovanos moterims'},
  {targetPageId:bySlug('instrukcijos/poros-rinkiniui'),label:'Poros rinkinio instrukcija'},
  {targetPageId:bySlug('instrukcijos/seimos-rinkiniui'),label:'Šeimos rinkinio instrukcija'}
]});
const saved=(await model.getSite('memocasting')).pages.find(p=>p.id===page.id);
assert.equal(saved.approval,null);
console.log(JSON.stringify({state:'private-draft-not-reviewed-or-approved',id:saved.id,slug:saved.slug,type:saved.type,revisionHash:model.revisionHash(saved),studioData:work}));
