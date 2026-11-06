/** Aimo's official product photograph shows the same five-spoke base on both
 * versions. The supplier returns ST5STAR without a human-readable description.
 * The picture supports the shape only; no material or dimensions are inferred.
 */
export function verifiedChairBaseOption(model:string,field:string,value:string):{name:string;explanation:string;source:string;sourceTitle:string;english?:string;preserveSourceExplanation?:boolean}|undefined{
 if(!['KAII001WW001','KAII001WW002','KAII001WW003','KAII001WW004'].includes(model)||field!=='CBASE'||value!=='ST5STAR')return;
 return {name:'Penkių stipinų pagrindas',explanation:'Kėdės pagrindas su penkiais stipinais.',source:'https://www.nowystyl.com/en/aimo/swivel-chairs/',sourceTitle:'Gamintojo Aimo nuotrauka: pagrindas su penkiais stipinais'};
}
