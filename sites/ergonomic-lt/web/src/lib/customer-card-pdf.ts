import PDFDocument from 'pdfkit';
import {pdfAsset} from './pdf-assets';
import {customerConfiguration,resolveCustomerSnapshot} from './customer-configuration-server';
import {customerImageBytes} from './customer-image-bytes';
import {productPdfImage} from './product-pdf-image';
/** Public projection only: no supplier record reaches PDFKit or PDF metadata. */
export async function customerCardPdf(token:string){
 const resolved=await resolveCustomerSnapshot(token),{product,saved}=resolved,data=await customerConfiguration(product,token,undefined,resolved),sample=product.configurations.find(c=>c.id===saved.sample);
 const font=await pdfAsset('/fonts/manrope.ttf');let image:Buffer|undefined;
 if(sample&&/^\d+$/.test(sample.id))try{image=Buffer.from(customerImageBytes(await productPdfImage(product,sample,'/media/configurator/'+sample.id+'.jpg')));}catch{/* A model without an attributed PDF photo uses its text specification. */}
 return new Promise<Buffer>((resolve,reject)=>{const doc=new PDFDocument({size:'A4',margin:42,bufferPages:true,info:{Title:data.name+' — komplektacija',Author:'Ergonomic.lt',Subject:'Pasirinkta baldo komplektacija'}}),chunks:Buffer[]=[];
  doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  try{doc.registerFont('Manrope',font).font('Manrope');const width=511;
   function header(){doc.fillColor('#163c33').fontSize(15).text('ERGONOMIC.LT',42,36);doc.fillColor('#626762').fontSize(9).text('info@ergonomic.lt  |  ergonomic.lt',42,61);doc.moveTo(42,85).lineTo(553,85).strokeColor('#d6d9d2').stroke();}
   header();doc.fillColor('#232624').fontSize(23).text(data.name,42,108,{width,lineGap:4});let y=doc.y+24;
   if(image){doc.image(image,42,y,{fit:[width,220],align:'center',valign:'center'});y+=244;}
   doc.fontSize(14).text('Pasirinkta komplektacija',42,y,{width});y=doc.y+18;
   for(const row of data.details){doc.fontSize(10);const height=Math.max(doc.heightOfString(row.label,{width:170}),doc.heightOfString(row.value,{width:317}))+18;if(y+height>735){doc.addPage();header();y=108;}
    doc.moveTo(42,y-5).lineTo(553,y-5).strokeColor('#d6d9d2').stroke();doc.fillColor('#626762').text(row.label,42,y,{width:170});doc.fillColor('#232624').text(row.value,236,y,{width:317});y+=height;
   }
   if(y+70>750){doc.addPage();header();y=108;}doc.fillColor('#626762').fontSize(9).text((image?'Nuotrauka iliustracinė. ':'')+'Individualią komplektaciją aprašo pasirinkimų sąrašas. Galutinę specifikaciją ir kainą patvirtinsime pasiūlyme.',42,y+12,{width,lineGap:3});doc.end();
  }catch(error){doc.destroy();reject(error);}
 });
}
