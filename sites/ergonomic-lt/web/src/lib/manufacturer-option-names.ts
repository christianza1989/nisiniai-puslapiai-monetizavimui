/** Translate explicit supplier words; never assign a colour from a finish code. */
export function manufacturerOptionName(binding:string,english:string):string|undefined{
 const field=binding.match(/^value:([^=]+)=/)?.[1];if(!field)return;
 const s=english.trim().replace(/\s+/g,' '),lower=s.toLowerCase();
 if(/^(?:G?D|GD)/.test(field)&&/^\d+(?:[.,]\d+)?\s*(?:mm|cm)$/i.test(s))return s;
 if(/SOCKET/.test(field))return /european/.test(lower)?'Europos standartas':/german/.test(lower)?'Vokiškasis standartas':undefined;
 if(!/COLOR|COL$|CHCOL/.test(field))return;
 const colours:[RegExp,string][]=[
  [/acacia light|light acacia/,'Šviesi akacija'],[/natural american walnut/,'Natūralus amerikinis riešutmedis'],[/natural oak/,'Natūralus ąžuolas'],[/brown oak/,'Rudas ąžuolas'],[/natural beech/,'Natūralus bukas'],
  [/black grey/,'Juodai pilka'],[/basalt grey/,'Bazalto pilka'],[/anthracite/,'Antracito pilka'],[/light grey/,'Šviesiai pilka'],[/dark grey/,'Tamsiai pilka'],[/white grey/,'Baltai pilka'],[/white aluminium/,'Balto aliuminio spalva'],
  [/platinum/,'Platinos spalva'],[/cashmere/,'Kašmyro spalva'],[/slate/,'Šiferio pilka'],[/aluminium|aluminum/,'Aliuminio spalva'],[/black/,'Juoda'],[/white/,'Balta'],[/grey|gray/,'Pilka'],[/blue/,'Mėlyna'],[/green/,'Žalia'],[/red/,'Raudona'],[/yellow/,'Geltona'],[/orange/,'Oranžinė'],[/beige/,'Smėlio spalva'],[/brown/,'Ruda'],
 ];
 return colours.find(([pattern])=>pattern.test(lower))?.[1];
}
