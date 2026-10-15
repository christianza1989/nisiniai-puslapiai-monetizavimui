// Bounded bridge from Creator's plain section strings to existing native V2 links.
// No HTML, external URL permission, source fetch, publication or text rewriting.
import {normalizeV2Blocks} from './content-package-v2.mjs';

const pathOf=page=>page.type==='home'?'/':'/'+page.slug+'/';
const fail=()=>{throw Object.assign(new Error('internal_link_target_unavailable'),{code:'internal_link_target_unavailable'});};
export function resolveInternalRichLinks(body,pages,currentId,{onUnresolved}={}){
  const targets=new Map(pages.filter(page=>page.status!=='revoked').map(page=>[pathOf(page),page.id]));
  function inline(text){
    const content=[];let start=0;
    for(const match of text.matchAll(/\[([^\]\n]{1,300})\]\((\/[^)\s]*)\)/g)){
      // This is deliberately not a CommonMark parser. Preserve image, escaped
      // and code-literal examples; never reinterpret them as navigation.
      let code=0;
      for(const run of text.slice(0,match.index).matchAll(/`+/g)){
        if(!code)code=run[0].length;else if(code===run[0].length)code=0;
      }
      if(text[match.index-1]==='!'||text[match.index-1]==='\\'||code)continue;
      const target=targets.get(match[2]);
      if(!target||target===currentId){
        if(onUnresolved){onUnresolved(match[2]);continue;}
        fail();
      }
      if(match.index>start)content.push({type:'text',text:text.slice(start,match.index)});
      content.push({type:'link',text:match[1],target:{kind:'page',pageId:target}});
      start=match.index+match[0].length;
    }
    if(!content.length)return null;
    if(start<text.length)content.push({type:'text',text:text.slice(start)});
    return content;
  }
  return normalizeV2Blocks(body.map(block=>{
    if(block.type==='paragraph'||block.type==='heading'){
      const content=inline(block.text);
      return content?(block.type==='heading'?{type:'richHeading',level:block.level,content}
        :{type:'richParagraph',content}):block;
    }
    if(block.type==='list'){
      const rows=block.items.map(inline);
      return rows.some(Boolean)?{type:'richList',ordered:false,
        items:rows.map((row,index)=>row||[{type:'text',text:block.items[index]}])}:block;
    }
    if(block.content)return {...block,content:block.content.flatMap(node=>node.type==='text'?(inline(node.text)||[node]):[node])};
    if(block.type==='richList')return {...block,items:block.items.map(row=>row.flatMap(node=>node.type==='text'?(inline(node.text)||[node]):[node]))};
    return block;
  }));
}
