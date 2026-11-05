import {productDescriptionBlocks} from '@/lib/product-description';

export function ProductDescription({text,lead=false}:{text:string;lead?:boolean}){
 return <div className="product-description-blocks">{productDescriptionBlocks(text).map((block,index)=>{
  if(block.type==='list')return <ul key={index}>{block.items.map((item,i)=><li key={i}>{item}</li>)}</ul>;
  if(block.type==='h2')return <h2 key={index}>{block.text}</h2>;
  if(block.type==='h3')return <h3 key={index}>{block.text}</h3>;
  return <p key={index} className={lead&&index===0?'studio-intro-lead':undefined}>{block.text}</p>;
 })}</div>;
}
