// Legal ancillary text chunk keeps a tiny PNG valid at exact encoded-byte sizes.
export function pngAtBytes(png,totalBytes) {
 const data=Buffer.alloc(totalBytes-png.length-12,120);data.write('padding\0');
 const chunk=Buffer.alloc(data.length+12);chunk.writeUInt32BE(data.length);chunk.write('tEXt',4);data.copy(chunk,8);
 let crc=0xffffffff;
 for(let i=4;i<chunk.length-4;i++){crc^=chunk[i];for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 chunk.writeUInt32BE((crc^0xffffffff)>>>0,chunk.length-4);
 return Buffer.concat([png.subarray(0,-12),chunk,png.subarray(-12)]);
}
