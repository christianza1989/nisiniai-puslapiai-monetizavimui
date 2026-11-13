/** Roko terminology decision 2026-11-06. Presentation only: source originals,
 * identifiers, dimensions and review hashes remain unchanged. */
export function furnitureTerminology(text:string){
 const cases:Record<string,[string,string]>={as:['penkiažvaigždė','bazė'],o:['penkiažvaigždės','bazės'],ui:['penkiažvaigždei','bazei'],'ą':['penkiažvaigždę','bazę'],u:['penkiažvaigžde','baze'],e:['penkiažvaigždėje','bazėje']};
 let result=text.replace(/([Pp])enkių (?:šakų|stipinų) ((?:poliruoto aliuminio |aliumininis )?)pagrind(as|ui|o|ą|u|e)(?=$|[^\p{L}])/gu,(_all,capital:string,material:string,ending:string)=>{
  const [adjective,noun]=cases[ending];return (capital==='P'?adjective[0].toUpperCase()+adjective.slice(1):adjective)+' '+material.replace('aliumininis ','aliumininė ')+noun;
 });
 result=result.replace(/\b([Jj])uodas (?=penkiažvaigždė)/g,(_all,capital:string)=>capital==='J'?'Juoda ':'juoda ');
 result=result.replace(/([Pp])agrindas su penkiais stipinais/g,(_all,capital:string)=>capital==='P'?'Penkiažvaigždė bazė':'penkiažvaigždė bazė');
 if(/^[Pp]enkių (?:šakų|stipinų)$/.test(result))result=result[0]==='P'?'Penkiažvaigždė bazė':'penkiažvaigždė bazė';
 return result;
}
