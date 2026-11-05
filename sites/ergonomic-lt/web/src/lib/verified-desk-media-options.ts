/** Source: Nowy Styl Office Furniture Technical Details, grommet/media-port matrices;
 * preserved configurator values and 2x QE English label confirm paired workbench variants.
 * Exact desk line + field + option identity only. No meaning inferred for unknown codes.
 */
type VerifiedDeskOption={name:string;explanation:string;source:string;sourceTitle:string;english?:string;preserveSourceExplanation?:boolean};
// These desk lines expose the same named catalogue accessory identities.
const deskAccessoryModel=/^(?:KEM2|KEM3|KEUP|KEPP|KECM|KERG|KPW2|KSQA|KC54|KXI2|KAER|KBSP|KESE|KLEV|KBRY|KCAF)/;
export function verifiedDeskMediaOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!deskAccessoryModel.test(model)||!/^FMEDIAPORT(?:LEFT|MIDDLE|RIGHT)?$/.test(field))return;
 const match=value.match(/^_*(2X)?(GROMMETQC|GROMMETQE|POWERFRAME3M)$/);if(!match)return;
 const paired=!!match[1],kind=match[2];
 const name=kind==='GROMMETQC'?(paired?'Du plastikiniai kabelių įvadai, Ø 80 mm':'Plastikinis kabelių įvadas, Ø 80 mm'):kind==='GROMMETQE'?(paired?'Du stačiakampiai kabelių įvadai su šepetėliu':'Stačiakampis kabelių įvadas su šepetėliu'):(paired?'Du „Power Frame 3M“ jungčių moduliai':'„Power Frame 3M“ jungčių modulis');
 const explanation=kind==='GROMMETQC'?(paired?'Du kvadratiniai plastikiniai įvadai su apvaliomis 80 mm skersmens angomis kabeliams.':'Kvadratinis plastikinis įvadas su apvalia 80 mm skersmens anga kabeliams.'):kind==='GROMMETQE'?(paired?'Du stačiakampiai metaliniai kabelių įvadai su šepetėliais.':'Stačiakampis metalinis kabelių įvadas su šepetėliu.'):(paired?'Du stalviršyje montuojami „Power Frame 3M“ jungčių moduliai.':'Stalviršyje montuojamas „Power Frame 3M“ jungčių modulis.');
 return {name,explanation,preserveSourceExplanation:!/^(?:KEM2|KEM3|KEUP|KBSP)/.test(model),source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf',sourceTitle:'Gamintojo techninis aprašas: kabelių įvadai ir jungčių moduliai'};
}

/** Exact Circle80 identity is captured in the supplier; the component maker documents its cable aperture. */
export function verifiedCircle80Option(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!deskAccessoryModel.test(model)||!/^FMEDIAPORT(?:LEFT|MIDDLE|RIGHT)?$/.test(field)||!['EVOLINECIRCLE801M','_4XEVOLINECIRCLE801M'].includes(value))return;
 const four=value==='_4XEVOLINECIRCLE801M';
 return {name:four?'Keturi jungčių moduliai su kabelių įvadais':'Jungčių modulis su kabelių įvadu',english:(four?'4x ':'')+'EVOline Circle80 1M',explanation:'Stalviršyje montuojamas jungčių modulis.',source:'https://www.evoline.com/en/products/systems/circle80',sourceTitle:'Komponento gamintojo aprašas: Circle80 jungčių modulis ir kabelių įvadas'};
}

/** The supplier socket table explicitly maps FR, GB and CH13 to country types (technical sheet p220). */
export function verifiedDeskMediaSocketOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!deskAccessoryModel.test(model)||!/^FSOCKETMEDIAPORT(?:LEFT|MIDDLE|RIGHT)?$/.test(field))return;
 const sockets:Record<string,{name:string;english:string;explanation:string}>={
  FR:{name:'Prancūziškojo tipo elektros lizdas',english:'FR – France',explanation:'Prancūziškojo tipo elektros lizdas.'},
  GB:{name:'Britiškojo tipo elektros lizdas',english:'GB – United Kingdom',explanation:'Britiškojo tipo elektros lizdas.'},
  CH13:{name:'Šveicariškojo tipo elektros lizdas',english:'CH13 – Switzerland',explanation:'Šveicariškojo tipo elektros lizdas.'},
 };
 const socket=sockets[value];if(!socket)return;
 return {...socket,source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf#page=220',sourceTitle:'Gamintojo techninis aprašas: jungčių modulių elektros lizdų tipai'};
}

/** The supplier technical sheet explicitly pairs each plug-standard name with its code. */
export function verifiedDeskSocketOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!/^(?:KEM2|KEM3|KECM|KERG|KEPP|KEUP|KPW2)/.test(model)||field!=='FSOCKETSTANDARD')return;
 const standards:Record<string,{name:string;english:string;explanation:string}>={
  EU:{name:'Europos standartas',english:'European (EU)',explanation:'Europos standarto elektros jungtis.'},
  GB:{name:'Britiškasis standartas',english:'British (GB)',explanation:'Britiškojo standarto elektros jungtis.'},
  CH:{name:'Šveicariškasis standartas',english:'Swiss (CH)',explanation:'Šveicariškojo standarto elektros jungtis.'},
 };
 const standard=standards[value];if(!standard)return;
 return {...standard,source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf#page=19',sourceTitle:'Gamintojo techninis aprašas: Europos, britiškojo ir šveicariškojo standarto elektros jungtys'};
}
/** Exact edge-option meanings are preserved in supplier English captures and the technical sheet. */
export function verifiedDeskEdgeOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!/^(?:KEM2|KEM3|KEPP|KEUP|KXI2|KSQA|KAER|KESE|KPW2|KC54|KCAF|KECM)/.test(model)||field!=='FTABLEEDGETHICKNESS')return;
 const edges:Record<string,{name:string;english:string;explanation:string}>={
  ABSSTANDARD2:{name:'Klijuota 2 mm briaunos juosta',english:'2 mm - glue technology',explanation:'Briaunos juostos storis – 2 mm. Briauna priklijuota.'},
  ABSLASER1:{name:'1 mm briaunos juosta, pritvirtinta lazeriniu būdu',english:'1 mm - laser',explanation:'Briaunos juostos storis – 1 mm. Briauna pritvirtinta lazeriniu būdu.'},
  NOEDGE:{name:'Be briaunos juostos, matomi faneros sluoksniai',english:'No edge (plywood structure visible)',explanation:'Atskira briaunos juosta nenaudojama; matoma faneros sluoksnių struktūra.'},
 };
 const edge=edges[value];if(!edge)return;
 return {...edge,source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf',sourceTitle:'Gamintojo techninis aprašas: stalviršių briaunos ir jų tvirtinimas'};
}
/** Supplier captures identify these exact cable-management options; the technical sheet confirms construction. */
export function verifiedDeskCableOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!/^(?:KEM2|KEM3|KEPP|KEUP|KXI2|KSQA|KC54|KESE|KBSP)/.test(model))return;
 const cables:Record<string,{name:string;english:string;explanation:string}>={
  'FHORWIRETRUNKING=STEELHORIZONTAL1':{name:'Plieninis kabelių lovelis, atveriamas iš vienos pusės',english:'Foldable on one side, steel',explanation:'Horizontalus lovelis kabeliams po stalviršiu; atveriamas iš vienos pusės.'},
  'FHORWIRETRUNKING=STEELHORIZONTAL2':{name:'Plieninis kabelių lovelis, atveriamas iš abiejų pusių',english:'Foldable on two side, steel',explanation:'Horizontalus lovelis kabeliams po stalviršiu; atveriamas iš abiejų pusių.'},
  'FVERWIRETRUNKING=VERTICALFLEXIBLEMODPLA':{name:'Lankstus modulinis plastikinis kabelių kanalas',english:'Flexible, modular, plastic',explanation:'Vertikalus kanalas kabeliams; lankstus; sudarytas iš modulių.'},
 };
 const cable=cables[field+'='+value];if(!cable)return;
 return {...cable,source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf#page=25',sourceTitle:'Gamintojo techninis aprašas: horizontalūs kabelių loveliai ir vertikalūs kabelių kanalai'};
}
export function verifiedDeskOption(model:string,field:string,value:string){return verifiedDeskMediaOption(model,field,value)||verifiedCircle80Option(model,field,value)||verifiedDeskMediaSocketOption(model,field,value)||verifiedDeskSocketOption(model,field,value)||verifiedDeskEdgeOption(model,field,value)||verifiedDeskCableOption(model,field,value);}
