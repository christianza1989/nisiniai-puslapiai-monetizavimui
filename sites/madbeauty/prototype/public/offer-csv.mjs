const columns=['offerId','version','variantId','practitionerId','priceMinor','durationMin'];
const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
export function offerCsv(offers){const rows=[];for(const o of offers.filter(o=>o.state!=='archived'))for(const v of o.variants){for(const p of [{practitionerId:'*',priceMinor:v.priceMinor,durationMin:v.durationMin},...v.staffOptions])rows.push([o.id,o.version,v.id,p.practitionerId,p.priceMinor,p.durationMin]);}return [columns,...rows].map(r=>r.map(quote).join(';')).join('\r\n');}
export function parseOfferCsv(text){if(typeof text!=='string'||text.length>15000)throw Error('CSV partija per didelė (iki 40 eilučių / 15 KB).');const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!cell||quoted)quoted=!quoted;else throw Error('Netaisyklingos CSV kabutės.');}else if(c===';'&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw Error('Neužbaigtos CSV kabutės.');if(cell||row.length){row.push(cell);rows.push(row);}const header=rows.shift();if(!header||header.join(';')!==columns.join(';'))throw Error('Naudok eksportuoto CSV stulpelius ir kabliataškius.');if(!rows.length||rows.length>40)throw Error('Vienoje partijoje turi būti 1–40 eilučių.');
 return rows.map((row,i)=>{if(row.length!==columns.length)throw Error('Patikrink CSV eilutę '+(i+2)+'.');const value=Object.fromEntries(columns.map((k,j)=>[k,row[j].trim()]));for(const k of ['version','priceMinor','durationMin']){if(!/^\d+$/.test(value[k]))throw Error('Eilutėje '+(i+2)+' įrašyk versiją, kainą centais ir trukmę minutėmis.');value[k]=Number(value[k]);}return value;});
}

// Resolve against an ordinary, current organization workspace; the server still validates the final write atomically.
export function previewOfferCsv(text,workspace,organizationId){
 const rows=parseOfferCsv(text),seen=new Map(),errors=[],changes=[];
 for(const [i,row] of rows.entries()){
  const line=i+2,key=JSON.stringify([row.offerId,row.variantId,row.practitionerId]);
  if(seen.has(key))errors.push({line,message:'Dubliuojasi su CSV eilute '+seen.get(key)+'. Palik vieną šio varianto ir meistro eilutę.'});else seen.set(key,line);
  if(!Number.isSafeInteger(row.version)||row.version<1)errors.push({line,message:'Įrašyk galiojančią pasiūlymo versiją.'});
  if(!Number.isSafeInteger(row.priceMinor)||row.priceMinor<0||row.priceMinor>100000)errors.push({line,message:'Kaina turi būti 0–100000 centų (iki 1000 €).'});
  if(!Number.isSafeInteger(row.durationMin)||row.durationMin<15||row.durationMin>480)errors.push({line,message:'Trukmė turi būti 15–480 minučių.'});
  const offer=workspace.offers?.find(o=>o.id===row.offerId&&o.organizationId===organizationId);
  if(!offer){errors.push({line,message:'Pasiūlymo šioje darbo vietoje nėra. Naudok jos kainų eksportą.'});continue;}
  if(offer.state==='archived')errors.push({line,message:'Pasiūlymas archyvuotas. Pašalink šią eilutę.'});
  if(offer.version!==row.version)errors.push({line,message:'Pasiūlymo versija pasikeitė. Atsisiųsk naują CSV ir peržiūrėk pakeitimus.'});
  const variant=offer.variants.find(v=>v.id===row.variantId);
  if(!variant){errors.push({line,message:'Varianto pasiūlyme nėra. Naudok naują kainų eksportą.'});continue;}
  const target=row.practitionerId==='*'?variant:variant.staffOptions?.find(p=>p.practitionerId===row.practitionerId);
  if(!target){errors.push({line,message:'Meistras šiam variantui nepriskirtas. Naudok naują kainų eksportą.'});continue;}
  changes.push({line,offerLabel:offer.label,variantLabel:variant.label,version:offer.version,practitionerLabel:row.practitionerId==='*'?'Bazinė varianto reikšmė':workspace.practitioners?.find(p=>p.id===row.practitionerId)?.name||'Priskirtas meistras',before:{priceMinor:target.priceMinor??variant.priceMinor,durationMin:target.durationMin??variant.durationMin},after:{priceMinor:row.priceMinor,durationMin:row.durationMin}});
 }
 return {rows,changes,errors};
}
