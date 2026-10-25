'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {validQuoteEntry,type QuoteEntry} from '@/lib/quote-entry';
import {correctedItemPresentation} from '@/lib/quote-presentation';
export type {QuoteEntry} from '@/lib/quote-entry';
type QuoteState={items:QuoteEntry[];add:(p:QuoteEntry)=>void;remove:(key:string)=>void;update:(key:string,edit:Partial<QuoteEntry>)=>void;clear:()=>void;ready:boolean};
const Context=createContext<QuoteState|null>(null);
export const entryKey=(p:Pick<QuoteEntry,'productId'|'configurationId'|'configurationState'>)=>p.productId+':'+(p.configurationId||'default')+(p.configurationState?':'+JSON.stringify([p.configurationState.family,p.configurationState.anchor,Object.entries(p.configurationState.values).sort(([a],[b])=>a.localeCompare(b))]):'');
export function QuoteProvider({children}:{children:ReactNode}){
  const [items,setItems]=useState<QuoteEntry[]>([]),[ready,setReady]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('ergonomic-quote')||'[]');if(Array.isArray(saved)){const seen=new Set<string>();setItems(saved.filter(validQuoteEntry).filter(x=>{const key=entryKey(x);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,30));}}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem('ergonomic-quote',JSON.stringify(items));}catch{}},[items,ready]);
  const value:QuoteState={items,ready,
    add:p=>setItems(old=>{const found=old.find(x=>entryKey(x)===entryKey(p));return found?old.map(x=>entryKey(x)===entryKey(p)?{...x,quantity:Math.min(1000,x.quantity+p.quantity)}:x):old.length<30?[...old,p]:old;}),
    remove:key=>setItems(old=>old.filter(x=>entryKey(x)!==key)),
    update:(key,edit)=>setItems(old=>old.map(x=>entryKey(x)===key?{...x,...edit,productId:x.productId,configurationId:x.configurationId,configurationState:x.configurationState}:x)),
    clear:()=>setItems([])};
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useQuote(){const ctx=useContext(Context);if(!ctx)throw new Error(copyText("ui.7391bd701c677b9d8753","QuoteProvider required"));return {...ctx,items:ctx.items.map(correctedItemPresentation)};}
