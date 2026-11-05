type DescriptionBlock=
 | {type:'paragraph'|'h2'|'h3';text:string}
 | {type:'list';items:string[]};

export function hasDescriptionFormatting(text:string){
 return /(?:^|\n)[ \t]*(?:#{2,3}[ \t]+|[*-][ \t]+)|\r?\n[ \t]*\r?\n/.test(text);
}

/** A small text-only format. User input is never interpreted as HTML. */
export function productDescriptionBlocks(text:string):DescriptionBlock[]{
 if(!hasDescriptionFormatting(text))return text?[{type:'paragraph',text}]:[];
 const blocks:DescriptionBlock[]=[];
 let paragraph:string[]=[];
 const flush=()=>{
  if(paragraph.length)blocks.push({type:'paragraph',text:paragraph.join(' ')});
  paragraph=[];
 };
 for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
  const heading=line.match(/^[ \t]*(#{2,3})[ \t]+(.+?)\s*$/);
  const item=line.match(/^[ \t]*[*-][ \t]+(.+?)\s*$/);
  if(!line.trim()){flush();continue;}
  if(heading){flush();blocks.push({type:heading[1].length===2?'h2':'h3',text:heading[2]});continue;}
  if(item){
   flush();
   const previous=blocks.at(-1);
   if(previous?.type==='list')previous.items.push(item[1]);
   else blocks.push({type:'list',items:[item[1]]});
   continue;
  }
  paragraph.push(line.trim());
 }
 flush();
 return blocks;
}
