/** Source: Nowy Styl Office Furniture Technical Details, grommet/media-port matrices;
 * preserved configurator values and 2x QE English label confirm paired workbench variants.
 * Exact desk line + field + option identity only. No meaning inferred for unknown codes.
 */
type VerifiedDeskOption={name:string;explanation:string;source:string;sourceTitle:string;english?:string};
export function verifiedDeskMediaOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!/^(?:KEM2|KEM3|KEUP|KBSP)/.test(model)||!/^FMEDIAPORT(?:LEFT|MIDDLE|RIGHT)?$/.test(field))return;
 const match=value.match(/^_*(2X)?(GROMMETQC|GROMMETQE|POWERFRAME3M)$/);if(!match)return;
 const paired=!!match[1],kind=match[2];
 const name=kind==='GROMMETQC'?(paired?'Du plastikiniai kabelių įvadai, Ø 80 mm':'Plastikinis kabelių įvadas, Ø 80 mm'):kind==='GROMMETQE'?(paired?'Du stačiakampiai kabelių įvadai su šepetėliu':'Stačiakampis kabelių įvadas su šepetėliu'):(paired?'Du „Power Frame 3M“ jungčių moduliai':'„Power Frame 3M“ jungčių modulis');
 const explanation=kind==='GROMMETQC'?(paired?'Du kvadratiniai plastikiniai įvadai su apvaliomis 80 mm skersmens angomis kabeliams.':'Kvadratinis plastikinis įvadas su apvalia 80 mm skersmens anga kabeliams.'):kind==='GROMMETQE'?(paired?'Du stačiakampiai metaliniai kabelių įvadai su šepetėliais.':'Stačiakampis metalinis kabelių įvadas su šepetėliu.'):(paired?'Du stalviršyje montuojami „Power Frame 3M“ jungčių moduliai.':'Stalviršyje montuojamas „Power Frame 3M“ jungčių modulis.');
 return {name,explanation,source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf',sourceTitle:'Gamintojo techninis aprašas: kabelių įvadai ir jungčių moduliai'};
}

/** The supplier technical sheet explicitly pairs each plug-standard name with its code. */
export function verifiedDeskSocketOption(model:string,field:string,value:string):VerifiedDeskOption|undefined{
 if(!/^(?:KEM2|KEM3|KECM|KERG|KEPP|KEUP|KPW2)/.test(model)||field!=='FSOCKETSTANDARD')return;
 const standards:Record<string,{name:string;english:string;explanation:string}>={
  EU:{name:'Europos standartas',english:'European (EU)',explanation:'Pasirinkta Europos standarto elektros jungtis.'},
  GB:{name:'Britiškasis standartas',english:'British (GB)',explanation:'Pasirinkta britiškojo standarto elektros jungtis.'},
  CH:{name:'Šveicariškasis standartas',english:'Swiss (CH)',explanation:'Pasirinkta šveicariškojo standarto elektros jungtis.'},
 };
 const standard=standards[value];if(!standard)return;
 return {...standard,source:'https://www.nowystyl.com/files/doc/WWW_Office-Furniture_Technical-details_EXP.pdf#page=19',sourceTitle:'Gamintojo techninis aprašas: Europos, britiškojo ir šveicariškojo standarto elektros jungtys'};
}
export function verifiedDeskOption(model:string,field:string,value:string){return verifiedDeskMediaOption(model,field,value)||verifiedDeskSocketOption(model,field,value);}
