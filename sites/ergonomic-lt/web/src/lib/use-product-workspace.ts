'use client';
import {useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import {isolateWorkspace,workspaceFocusables} from './fullscreen-workspace';

/** Keep the real preview and its controls together, with focus restored on exit. */
export function useProductWorkspace(){
 const [fullscreen,setFullscreen]=useState(false),ref=useRef<HTMLDivElement>(null),closeRef=useRef<HTMLButtonElement>(null);
 const returnFocus=useRef<HTMLElement|null>(null),returnScroll=useRef(0);
 const open=()=>{returnFocus.current=document.activeElement as HTMLElement;returnScroll.current=window.scrollY;setFullscreen(true);};
 const close=()=>setFullscreen(false);
 useLayoutEffect(()=>{
  if(!fullscreen||!ref.current)return;
  const restore=isolateWorkspace(ref.current),overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';closeRef.current?.focus();
  return()=>{restore();document.body.style.overflow=overflow;window.scrollTo({top:returnScroll.current,behavior:'instant'});returnFocus.current?.focus({preventScroll:true});};
 },[fullscreen]);
 const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(!fullscreen)return;
  if(event.key==='Escape'){event.preventDefault();close();}
  if(event.key==='Tab'){
   const focusable=workspaceFocusables(ref.current!),first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 };
 return {fullscreen,ref,closeRef,open,close,onKeyDown};
}
