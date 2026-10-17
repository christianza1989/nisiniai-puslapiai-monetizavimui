'use client';

// editorial-copy-wired
import {copyText,copyValue} from '@/lib/editorial-copy';
import {useEffect,useId,useRef,useState,type CSSProperties,type KeyboardEvent} from 'react';
import {ChevronDown,Check,ImageOff} from 'lucide-react';

export type FinishOption={value:string;label:string;image?:string;color?:string};
function Sample({option}:{option:FinishOption}){
 return option.image?<img className="finish-select-sample" src={option.image} width={40} height={40} alt="" loading="lazy"/>:
  <span className="finish-select-sample" style={option.color?{backgroundColor:option.color}:undefined}>{!option.color&&<ImageOff size={18} aria-hidden="true"/>}</span>;
}
export default function FinishSelect({label,value,options,onChange}:{label:string;value:string;options:FinishOption[];onChange:(value:string)=>void}){
 const id=useId(),button=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null),root=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[active,setActive]=useState(0),[placement,setPlacement]=useState<CSSProperties>({});
 const typed=useRef({text:'',at:0}),selected=options.find(o=>o.value===value)||options[0];
 useEffect(()=>{setActive(Math.max(0,options.findIndex(o=>o.value===value)));},[value,options]);
 useEffect(()=>{
  if(!open)return;
  const position=()=>{const rect=button.current!.getBoundingClientRect(),height=Math.min(360,options.length*56,window.innerHeight-24),below=window.innerHeight-rect.bottom;
   setPlacement({left:Math.max(8,Math.min(rect.left,window.innerWidth-rect.width-8)),top:below>=height+8?rect.bottom+6:Math.max(8,rect.top-height-6),width:rect.width,maxHeight:height});};
  position();
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const scroll=(event:Event)=>{if(!list.current?.contains(event.target as Node))position();};
  document.addEventListener('pointerdown',outside);document.addEventListener('scroll',scroll,true);window.addEventListener('resize',position);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',position);};
 },[open,options.length]);
 useEffect(()=>{const menu=list.current,option=menu?.children[active] as HTMLElement|undefined;if(!open||!menu||!option)return;
  const frame=menu.getBoundingClientRect(),row=option.getBoundingClientRect();
  if(row.top<frame.top+1)menu.scrollTop+=row.top-frame.top-1;
  else if(row.bottom>frame.bottom-1)menu.scrollTop+=row.bottom-frame.bottom+1;
 },[active,open,placement]);
 function choose(index:number){if(!options[index])return;onChange(options[index].value);setOpen(false);button.current?.focus();}
 function key(event:KeyboardEvent<HTMLButtonElement>){
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);return;}
  if(event.key==='Tab'){setOpen(false);return;}
  if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)){
   event.preventDefault();
   if((event.key==='Enter'||event.key===' ')&&open){choose(active);return;}
   if(!open){setOpen(true);setActive(Math.max(0,options.findIndex(o=>o.value===value)));return;}
   setActive(n=>event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,n+(event.key==='ArrowUp'?-1:1))));return;
  }
  if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   const now=Date.now();typed.current={text:(now-typed.current.at<700?typed.current.text:'')+event.key.toLowerCase(),at:now};
   const index=options.findIndex(o=>o.label.toLowerCase().startsWith(typed.current.text)||o.value.toLowerCase().startsWith(typed.current.text));
   if(index>=0){event.preventDefault();setOpen(true);setActive(index);}
  }
 }
 return <div className="finish-select" ref={root}>
  <span id={id+'-label'} className="finish-select-label">{label}</span>
  <button ref={button} type="button" className="finish-select-trigger" role="combobox" aria-labelledby={id+'-label'} aria-expanded={open} aria-controls={id+'-list'} aria-haspopup="listbox" aria-activedescendant={open?id+'-option-'+active:undefined} onKeyDown={key} onClick={()=>setOpen(v=>!v)} onBlur={e=>{if(!root.current?.contains(e.relatedTarget))setOpen(false);}}>
   {selected&&<><Sample option={selected}/><span>{copyValue(selected.label)}</span></>}<ChevronDown size={16} aria-hidden="true"/>
  </button>
  {open&&<div className="finish-select-list" ref={list} style={placement} id={id+'-list'} role="listbox" aria-labelledby={id+'-label'}>
   {options.map((option,index)=><div key={option.value} id={id+'-option-'+index} role="option" aria-selected={option.value===value} className={'finish-select-option'+(active===index?' active':'')} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(index)} onMouseEnter={()=>setActive(index)}>
    <Sample option={option}/><span>{copyValue(option.label)}</span>{option.value===value&&<Check size={16} aria-hidden="true"/>}
   </div>)}
  </div>}
 </div>;
}
