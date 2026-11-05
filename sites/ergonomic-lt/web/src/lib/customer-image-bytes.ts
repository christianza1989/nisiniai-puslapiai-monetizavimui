/** Remove descriptive metadata while preserving encoded pixels and colour profiles. */
export function customerImageBytes(input:Uint8Array):Uint8Array{
 const b=Buffer.from(input.buffer,input.byteOffset,input.byteLength);
 if(b[0]===0xff&&b[1]===0xd8){const parts=[b.subarray(0,2)];let i=2;
  while(i<b.length){const start=i;if(b[i++]!==0xff)throw Error('Invalid JPEG marker');while(b[i]===0xff)i++;const marker=b[i++];
   if(marker===0xda||marker===0xd9){parts.push(b.subarray(start));return Buffer.concat(parts);}
   if(marker===0x01||marker>=0xd0&&marker<=0xd7){parts.push(b.subarray(start,i));continue;}
   if(i+2>b.length)throw Error('Truncated JPEG');const length=b.readUInt16BE(i);if(length<2||i+length>b.length)throw Error('Truncated JPEG segment');
   const body=b.subarray(i+2,i+length),metadata=marker>=0xe0&&marker<=0xef||marker===0xfe;
   const preserve=marker===0xe0&&body.subarray(0,5).toString('binary')==='JFIF\0'||marker===0xe2&&body.subarray(0,12).toString('binary')==='ICC_PROFILE\0'||marker===0xee&&body.subarray(0,5).toString('ascii')==='Adobe';
   if(!metadata||preserve)parts.push(b.subarray(start,i+length));i+=length;
  }throw Error('Truncated JPEG image');
 }
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){const parts=[b.subarray(0,8)];let i=8;while(i<b.length){if(i+12>b.length)throw Error('Truncated PNG');const length=b.readUInt32BE(i),end=i+12+length;if(end>b.length)throw Error('Truncated PNG chunk');const type=b.toString('ascii',i+4,i+8);if(!['tEXt','zTXt','iTXt','eXIf'].includes(type))parts.push(b.subarray(i,end));
   if(type==='IEND'){const padding=b.subarray(end);if(padding.length<=3&&padding.every(n=>n===0))parts.push(padding);return Buffer.concat(parts);}i=end;
  }throw Error('Missing PNG end chunk');}
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  if(b.readUInt32LE(4)+8!==b.length)throw Error('Invalid WebP size');const parts:Buffer[]=[];let i=12;
  while(i<b.length){if(i+8>b.length)throw Error('Truncated WebP');const size=b.readUInt32LE(i+4),end=i+8+size+(size%2);if(end>b.length)throw Error('Truncated WebP chunk');const type=b.toString('ascii',i,i+4);if(!['EXIF','XMP '].includes(type)){const chunk=Buffer.from(b.subarray(i,end));if(type==='VP8X')chunk[8]&=~0x0c;parts.push(chunk);}i=end;}
  const result=Buffer.concat([b.subarray(0,12),...parts]);result.writeUInt32LE(result.length-8,4);return result;
 }return input;
}
