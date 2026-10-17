
// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import PDFDocument from 'pdfkit';
import {pdfAsset} from './pdf-assets';
import type {Product,Configuration} from './types';
import type {PilotVariant} from './configurator';
import {fieldLabels,choiceLabel} from './expanded-configurator';
import type {ResolvedConfigurationArticle} from './configuration-article';
import {articleFieldLabels} from './configuration-article';
import type {CatalogRuntime} from './catalog-configurator';

export async function productCardPdf(product:Product,configuration:Configuration,variant:PilotVariant,individual=false,article?:ResolvedConfigurationArticle,articleLabel?:(field:string,value:string)=>string|undefined,labels?:{palettes?:CatalogRuntime['palettes'];family?:string}):Promise<Buffer>{
  const optionLabels={...fieldLabels,...Object.fromEntries(Object.entries(labels?.palettes?._fieldLabels||{}).map(([k,v])=>[k,v.text])),...articleFieldLabels(product)};
  if(!/^\/media\/configurator\/\d+\.jpg$/.test(variant.image))throw Error(copyText("ui.6c1acd725c966f609aa2","Invalid local product image"));
  const [font,image]=await Promise.all([pdfAsset('/fonts/manrope.ttf'),pdfAsset(variant.image)]);
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:42,bufferPages:true,
      info:{Title:copyText("ui.90f1cb5ecb2c38a01a9b","{{p0}} - produkto kortelė",{p0:(product.name)}),Author:'Ergonomic.lt',Subject:variant.label}});
    const chunks:Buffer[]=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    try{
      doc.registerFont('Manrope',font).font('Manrope');
      const ink='#232624',muted='#626762',line='#d6d9d2',width=511;
      const text=(value:string,x:number,y:number,size=10,options:PDFKit.Mixins.TextOptions={})=>doc.fillColor(ink).fontSize(size).text(value.replace(/[\u2010-\u2015\u2212]/g,'-'),x,y,options);
      function header(subtitle:string){
        text('ERGONOMIC.LT',42,36,16);doc.fillColor(muted).fontSize(9).text('info@ergonomic.lt  |  ergonomic.lt',42,61);
        doc.moveTo(42,85).lineTo(553,85).strokeColor(line).lineWidth(.6).stroke();
        text(subtitle,42,107,22,{width});
      }
      header(copyText("ui.4a32e46477e36cf75418","Produkto kortelė"));
      text(product.name,42,151,28);
      doc.rect(42,218,252,260).fill('#f3f4f1');doc.image(image,51,227,{fit:[234,242],align:'center',valign:'center'});
      text(copyText("ui.97a87464937f6a16a8c8","Pasirinkta komplektacija"),316,218,13,{width:237});
      text(variant.label,316,246,12,{width:237,lineGap:4});
      let y=doc.y+21;
      doc.fillColor(muted).fontSize(9).text(copyText("ui.f65b70cd29350a5ca2eb","Gamintojo bazinis kodas"),316,y,{width:237});
      text(configuration.code||variant.supplierCode,316,y+18,12,{width:237});y+=61;
      doc.fillColor(muted).fontSize(9).text(copyText("ui.bd4471a8384fff6a89d9","Komplektacijos ID"),316,y,{width:237});text(variant.id,316,y+18,11);y+=56;
      text(copyText("ui.78d2499daa5e8623867e","Kaina pagal užklausą"),316,y,12,{width:237});
      doc.fillColor(muted).fontSize(9).text('Pasiūlymui parašykite info@ergonomic.lt arba pateikite užklausą svetainėje.',316,y+26,{width:237,lineGap:3});
      y=535;
      const important=(configuration.details||[]).filter(d=>['Galvos atrama','Porankiai','Pagrindas','Mechanizmas','Ratukai','Atlošas'].includes(d.label));
      const firstPageRows=(important.length?important:configuration.details||[]).slice(0,6);
      if(firstPageRows.length)text(copyText("ui.2ec4100b784991aa13bc","Pagrindiniai pasirinkimai"),42,501,15);
      for(const row of firstPageRows){
        doc.moveTo(42,y-4).lineTo(553,y-4).strokeColor(line).lineWidth(.5).stroke();
        doc.fillColor(muted).fontSize(9).text(row.label,42,y,{width:142});text(row.value,190,y,9,{width:363});y+=29;
      }
      doc.fillColor(muted).fontSize(9).text(individual?copyText("ui.6bc61813f5fcbd00835b","Nuotrauka iliustracinė - gamintojo modelio pavyzdys. Individualų pasirinkimą aprašo šios kortelės specifikacija ir kodai. Apdailas bei kainą patvirtiname pasiūlyme."):copyText("ui.70127760e853714c3803","Nuotraukoje - gamintojo paskelbtas pasirinktos komplektacijos pavyzdys. 3D vaizdas yra orientacinis. Užsakymo specifikaciją ir kainą patvirtiname pasiūlyme."),42,Math.max(720,y+6),{width,lineGap:2});
      doc.addPage();header(copyText("ui.550448c61db72b76170f","Komplektacijos specifikacija"));
      text(product.name+' / '+variant.supplierCode,42,154,13,{width});
      text(individual?copyText("ui.8ff43641e82cd1e5d7ea","Pasirinkimai ir gamintojo kodai"):copyText("ui.0824721117228ec9ba5d","Gamintojo pasirinkimų kodai"),42,187,10);
      y=218;
      for(const option of variant.supplierOptions){
        const index=option.indexOf('='),key=option.slice(0,index).split('.').pop()!,value=option.slice(index+1);
        const left=individual&&optionLabels[key]?optionLabels[key]+' ('+key+')':key;
        const translated=individual&&optionLabels[key]?(articleLabel?.(key,value)||choiceLabel(key,/^[1-6]$/.test(value)?'_'+value:value,labels?.palettes,labels?.family)):value;
        const right=translated===value?value:translated+' ('+value+')';
        doc.fontSize(8.5);
        const height=Math.max(doc.heightOfString(left,{width:292}),doc.heightOfString(right,{width:195}))+9;
        if(y+height>719){doc.addPage();header(copyText("ui.415de6999ee6d2bd32d6","Specifikacijos tęsinys"));y=157;}
        doc.moveTo(42,y-4).lineTo(553,y-4).strokeColor(line).lineWidth(.5).stroke();
        doc.fillColor(muted).fontSize(8.5).text(left,42,y,{width:292});text(right,350,y,8.5,{width:203});y+=height;
      }
      doc.fillColor(muted).fontSize(8).text(individual?'Šaltinis: viešo gamintojo konfigūratoriaus pasirinkimų sąrašai. Individuali komplektacija sudaryta Ergonomic.lt.':copyText("ui.72b7e6cb67b646e6ea67","Šaltinis: gamintojo viešai paskelbta komplektacija. Kodai išsaugoti nepakeisti."),42,Math.max(y+15,727),{width});
      if(article){
        const newArticlePage=()=>{doc.addPage();header('Aprašymas ir techniniai duomenys');y=157;};
        const room=(height:number)=>{if(y+height>719)newArticlePage();};
        const paragraph=(value:string,size=10)=>{doc.fontSize(size);const h=doc.heightOfString(value,{width,lineGap:3});room(h+14);text(value,42,y,size,{width,lineGap:3});y+=h+14;};
        newArticlePage();paragraph(product.name,15);
        for(const p of article.intro)paragraph(p);
        for(const section of article.sections){
          room(95);paragraph(section.heading,13);
          for(const p of section.paragraphs)paragraph(p);
          for(const row of section.rows){
            doc.fontSize(9);const h=Math.max(doc.heightOfString(row.label,{width:173,lineGap:2}),doc.heightOfString(row.value,{width:318,lineGap:2}))+14;
            room(h);doc.moveTo(42,y-4).lineTo(553,y-4).strokeColor(line).lineWidth(.5).stroke();
            doc.fillColor(muted).fontSize(9).text(row.label,42,y,{width:173,lineGap:2});text(row.value,235,y,9,{width:318,lineGap:2});y+=h;
          }
          y+=18;
        }
        // The interactive update notice belongs on the live page. This PDF is
        // a snapshot, already identified by its exact selection and order codes.
      }
      const pages=doc.bufferedPageRange();
      for(let i=0;i<pages.count;i++){
        doc.switchToPage(i);doc.moveTo(42,765).lineTo(553,765).strokeColor(line).lineWidth(.5).stroke();
        doc.fillColor(muted).fontSize(8).text('Ergonomic.lt  |  '+new Date().toLocaleDateString('lt-LT',{timeZone:'Europe/Vilnius'}),42,774,{lineBreak:false});
        doc.text(`${i+1} / ${pages.count}`,515,774,{width:38,align:'right',lineBreak:false});
      }
      doc.end();
    }catch(error){doc.destroy();reject(error);}
  });
}
