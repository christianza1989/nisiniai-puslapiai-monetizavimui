'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Check} from 'lucide-react';
export function HomeInquiry(){
  const started=useRef(0),key=useRef('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
  useEffect(()=>{started.current=Date.now();key.current=crypto.randomUUID();},[]);
  return <section className="home-inquiry-wrap" aria-labelledby="inquiry-heading"><div className="home-inquiry home-width"><div className="home-inquiry-copy"><h2 id="inquiry-heading">{copyText("ui.44a0083c902f5c45f483","Papasakokite")}<br/>{copyText("ui.1302e7a89b877d5a11b2","apie savo erdvę.")}</h2><p>{copyText("ui.0362b670fbba8909a82f","Planuojate naują biurą ar atnaujinate darbo vietas? Pateikite užklausą — aptarkime baldus, komplektacijas ir jūsų projekto apimtį.")}</p><Link className="selected-text-link" href="/uzklausa/">{copyText("ui.05668bb998f0b55cb035","Pateikti projekto užklausą ")}<ArrowUpRight size={18}/></Link><div className="home-original-contacts"><h2 id="kontaktai-0">{copyText("ui.f30832526b86f2a53ca5","KONTAKTAI")}</h2><h2 id="uab-a-z-prekyba-1">UAB A-Z Prekyba</h2><address><span>Buivydiškių g. 22, Vilnius, LT- 07195</span><a href="tel:+37069199833">+37069199833</a><a href="mailto:ergonomic@azprekyba.lt">ergonomic@azprekyba.lt</a></address><div className="home-social"><a href="https://www.facebook.com/ergonomic.lt">{copyText("ui.5d9c638e1123d3ef444d","Facebook ")}<ArrowUpRight size={15}/></a><a href="https://www.instagram.com/ergonomic.lt/">{copyText("ui.cf449c7571a2c5110e72","Instagram ")}<ArrowUpRight size={15}/></a></div></div></div>
    {saved?<div className="home-inquiry-success" role="status"><Check size={32}/><h3>{copyText("ui.59b3fa7f26795818b88f","Užklausa išsaugota.")}</h3><p>{copyText("ui.15b848fe7e3c84a263a0","Užklausos numeris: ")}{saved.slice(0,8)}.</p><Link className="button outline" href="/produktai/">{copyText("ui.8a4fff477f7d1883efd8","Toliau tyrinėti baldus ")}<ArrowUpRight size={17}/></Link></div>:<form onSubmit={async e=>{
      e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);
      try{const response=await fetch('/api/quotes/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.get('name'),email:f.get('email'),phone:f.get('phone'),company:f.get('company'),message:f.get('message'),items:[],consent:f.get('consent')==='on',website:f.get('website'),startedAt:started.current,submissionKey:key.current})});const result=await response.json();if(!response.ok)throw new Error(result.error||copyText("ui.eea36ed4474b232f0d3d","Nepavyko išsaugoti užklausos. Bandykite dar kartą."));setSaved(result.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
    }}>
      <div className="form-grid"><label className="field"><span>{copyText("ui.41eaa064401d2a4ccfd2","Vardas *")}</span><input name="name" placeholder={copyText("ui.ad4adc514fe84345c62e","Jūsų vardas")} autoComplete="name" required minLength={2} maxLength={100}/></label><label className="field"><span>{copyText("ui.60c39dde4162fc935263","Įmonė")}</span><input name="company" placeholder={copyText("ui.918d34d3cfeb4aca9dc3","Įmonės pavadinimas")} autoComplete="organization" maxLength={200}/></label></div>
      <div className="form-grid"><label className="field"><span>{copyText("ui.a773850e5bc87b5f38ac","El. paštas *")}</span><input name="email" placeholder="vardas@imone.lt" type="email" required autoComplete="email" maxLength={200}/></label><label className="field"><span>{copyText("ui.816ab44efeea501fc064","Telefonas")}</span><input name="phone" placeholder="+370" type="tel" autoComplete="tel" maxLength={40}/></label></div>
      <label className="field"><span>{copyText("ui.2fcfc6118ae978189397","Žinutė *")}</span><textarea name="message" placeholder={copyText("ui.1a14d41b6cf8b51023c6","Kiek darbo vietų planuojate? Kokie baldai jus domina?")} required minLength={10} maxLength={5000} rows={4}/></label>
      <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" aria-label={copyText("ui.ec03604462764417e41c","Interneto svetainė")}/></div>
      <label className="consent"><input type="checkbox" name="consent" required/><span>{copyText("ui.914b782b171d160cea74","Susipažinau su ")}<Link href="/privatumas/">{copyText("ui.8bdcdc3e42cabe921e01","privatumo informacija")}</Link> {copyText("ui.0f3b23d557d74b4c9564","ir sutinku, kad susisiektumėte dėl užklausos.")}</span></label>
      {error&&<p role="alert" className="form-error">{error}</p>}
      <div className="home-submit"><button type="submit" className="button dark" disabled={busy}>{busy?copyText("ui.afcc08464f50bcae5b17","Siunčiama…"):copyText("ui.1206958e46faa88ab0d6","siųsti užklausą")}<ArrowUpRight size={18}/></button><span>{copyText("ui.2a49c5fb6b61619c1174","* Privalomi laukai")}</span></div>
    </form>}
  </div></section>;
}
