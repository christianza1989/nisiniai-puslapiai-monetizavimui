'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {useQuote,entryKey} from './quote-provider';
import {validQuoteEntry} from '@/lib/quote-entry';
import type {Pc2Selection} from '@/lib/pc2-quote-selection';

export function Pc2QuoteButton({selection}:{selection:Pc2Selection}){
 const router=useRouter(),{add,items,ready}=useQuote();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function open(){
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/3d-perziura/uzklausos-preke/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(selection)});
   const entry=await res.json();
   if(!res.ok||!validQuoteEntry(entry))throw Error('Nepavyko perkelti komplektacijos. Atnaujinkite peržiūrą ir bandykite dar kartą.');
   if(items.length>=30&&!items.some(item=>entryKey(item)===entryKey(entry)))throw Error('Užklausoje jau yra 30 prekių. Atidarykite užklausą ir pašalinkite nereikalingą prekę.');
   add(entry);router.push('/uzklausa/');
  }catch(e){setError(e instanceof Error?e.message:'Nepavyko atidaryti užklausos.');}
  finally{setBusy(false);}
 }
 return <div className="pc2-quote-action">
  <button className="button dark" type="button" onClick={open} disabled={busy||!ready}>{busy?'Atidaroma užklausa…':'Siųsti užklausą'}<ArrowRight size={18} aria-hidden="true"/></button>
  <p className="form-note">Pasirinkta komplektacija bus perkelta į užklausos formą.</p>
  {error&&<p className="form-error" role="alert">{error}</p>}
 </div>;
}
